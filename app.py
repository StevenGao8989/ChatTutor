import asyncio
import json
import re
import os
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Optional

import pytz
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
try:
    import google.generativeai as genai
except ModuleNotFoundError:
    from google import genai
# -----------------------------------------------------------------------
# 0. 配置
# -----------------------------------------------------------------------
shanghai_tz = pytz.timezone("Asia/Shanghai")

with open("credentials.json", "r") as f:
    credentials = json.load(f)
API_KEY = credentials["API_KEY"]
BASE_URL = credentials.get("BASE_URL", "")
MODEL = credentials.get("MODEL", "gemini-3-pro-preview")
# Qwen TTS API 配置
QWEN_TTS_API_KEY = credentials.get("QWEN_TTS_API_KEY", "")
QWEN_TTS_BASE_URL = credentials.get("Base_TTS_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
# 使用 Qwen TTS
USE_QWEN_TTS = bool(QWEN_TTS_API_KEY)

if API_KEY.startswith("sk-"):
    # 为 OpenRouter 添加应用标识
    extra_headers = {}
    if "openrouter.ai" in BASE_URL.lower():
        extra_headers = {
            "HTTP-Referer": "https://github.com/fogsightai/fogsight",
            "X-Title": "Fogsight - AI Animation Generator"
        }
    
    client = AsyncOpenAI(
        api_key=API_KEY, 
        base_url=BASE_URL,
        default_headers=extra_headers
    )
    USE_GEMINI = False
else:
    os.environ["GEMINI_API_KEY"] = API_KEY
    gemini_client = genai.Client()
    USE_GEMINI = True

if API_KEY.startswith("sk-REPLACE_ME"):
    raise RuntimeError("请在环境变量里配置 API_KEY")

templates = Jinja2Templates(directory="templates")

# -----------------------------------------------------------------------
# 1. FastAPI 初始化
# -----------------------------------------------------------------------
app = FastAPI(title="AI Animation Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")

class ChatRequest(BaseModel):
    topic: str
    history: Optional[List[dict]] = None
    mode: Optional[str] = "animation"  # "animation" 或 "text"

class Project(BaseModel):
    id: str
    name: str
    updated_at: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatSummary(BaseModel):
    id: str
    title: Optional[str]
    updated_at: str
    project_id: Optional[str] = None

class ChatDetail(ChatSummary):
    messages: List[ChatMessage]

class NewChatRequest(BaseModel):
    title: Optional[str] = None
    project_id: Optional[str] = None

class ChatMessageRequest(BaseModel):
    role: str
    content: str

class RenameChatRequest(BaseModel):
    title: str

class NewProjectRequest(BaseModel):
    name: str

class RenameProjectRequest(BaseModel):
    name: str

class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "auto"  # "zh", "en", or "auto"
    speed: Optional[float] = 1.0

class ModelGenerateRequest(BaseModel):
    prompt: str

def now_iso() -> str:
    return datetime.now(shanghai_tz).isoformat()

def detect_language(text: str) -> str:
    """
    检测文本语言
    返回: 'zh' (中文) 或 'en' (英文)
    """
    if not text:
        return 'en'
    
    # 检测中文字符
    chinese_char_count = sum(1 for char in text if '\u4e00' <= char <= '\u9fff')
    total_char_count = sum(1 for char in text if char.isalpha())
    
    # 如果中文字符占比超过30%，认为是中文
    if total_char_count > 0 and chinese_char_count / total_char_count > 0.3:
        return 'zh'
    
    return 'en'

# 使用字典优化查找性能 O(1) 替代 O(n)
PROJECTS_DICT: dict[str, Project] = {}
CHAT_STORE: dict[str, dict] = {}

# 并发保护锁
_projects_lock = asyncio.Lock()
_chats_lock = asyncio.Lock()

@app.on_event("startup")
async def reset_project_store():
    async with _projects_lock:
        PROJECTS_DICT.clear()
    async with _chats_lock:
        CHAT_STORE.clear()

# -----------------------------------------------------------------------
# 2. 核心：流式生成器 (现在会使用 history)
# -----------------------------------------------------------------------
async def llm_event_stream(
    topic: str,
    history: Optional[List[dict]] = None,
    model: str = None, # Will use MODEL from config if not specified
    mode: str = "animation",  # "animation" 或 "text"
) -> AsyncGenerator[str, None]:
    history = history or []
    
    # Use configured model if not specified
    if model is None:
        model = MODEL
    
    # 根据模式选择不同的系统提示词
    if mode == "text":
        # 文字对话模式
        system_prompt = """你是一个友好的AI助手，擅长用清晰、易懂的方式回答问题。
请用中文回答用户的问题，回答要准确、详细、有条理。
如果问题涉及复杂概念，请用通俗易懂的语言解释，可以适当举例说明。
回答要自然流畅，就像在和朋友聊天一样。"""
    else:
        # 动画生成模式（默认）
        # 字幕语言要求：强制使用中文
        subtitle_requirement = """**字幕语言要求（严格）：字幕必须100%使用中文，绝对不允许出现任何英文单词、英文句子或混合语言。所有字幕内容必须完全用中文表达，包括专业术语也要用中文。无论用户输入什么语言，生成的字幕必须全部是中文，这是强制要求。**"""
        subtitle_lang_note = "（必须全部中文，禁止英文）"
        
        # The system prompt is now more focused
        system_prompt = f"""请你生成一个非常精美的动态动画,讲讲 {topic}
要动态的,要像一个完整的,正在播放的视频。包含一个完整的过程，能把知识点讲清楚。
页面极为精美，好看，有设计感，同时能够很好的传达知识。知识和图像要准确
附带一些旁白式的文字解说,从头到尾讲清楚一个小的知识点
不需要任何互动按钮,直接开始播放
使用和谐好看，广泛采用的浅色配色方案，使用很多的，丰富的视觉元素。
{subtitle_requirement}
**布局要求：使用全屏或接近全屏的布局，主容器应该占据至少80%的视口宽度和70%以上的视口高度，减少不必要的边距和空白，让内容充满整个显示区域，提供沉浸式的视觉体验。主内容区域应该是一个大的、居中的白色或浅色卡片，占据屏幕的大部分空间。**
**字幕要求：字幕必须放置在动画内容的下方，使用固定定位或绝对定位在容器底部，确保字幕清晰可见且不会遮挡任何动画元素。字幕区域应该有足够的背景色或半透明背景，确保文字可读性。字幕与动画内容之间要有明确的视觉分隔。字幕内容{subtitle_lang_note}**
**字幕元素标识要求：所有字幕文本必须包含在具有 class="subtitle-text" 或 id="subtitle" 的元素中，每个字幕段落应该是一个独立的元素，便于程序识别和朗读。如果有多段字幕，每个字幕元素都应该有 class="subtitle-text"。**
**请保证任何一个元素都在一个2k分辨率的容器中被摆在了正确的位置，避免穿模，字幕遮挡，图形位置错误等等问题影响正确的视觉传达**
html+css+js+svg，放进一个html里"""
    
    # 如果是文字模式，不需要代码块格式
    if mode == "text":
        # 文字模式：直接返回文字回复，不需要代码块
        pass

    if USE_GEMINI:
        try:
            full_prompt = system_prompt + "\n\n" + topic
            if history:
                history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
                full_prompt = history_text + "\n\n" + full_prompt
            
            response = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: gemini_client.models.generate_content(
                    model=model, 
                    contents=full_prompt
                )
            )
            
            text = response.text
            # 根据模式调整chunk_size和延迟
            if mode == "text":
                chunk_size = 200  # 文字模式：更大的块，更快
                sleep_time = 0.01  # 更短的延迟
            else:
                chunk_size = 50   # 动画模式：保持原有设置
                sleep_time = 0.05
            
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                payload = json.dumps({"token": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(sleep_time)
                
        except Exception as e:
            error_msg = {
                "error": str(e),
                "type": type(e).__name__,
                "message": "生成内容时发生错误，请稍后重试" if mode == "text" else "生成动画时发生错误，请稍后重试"
            }
            yield f"data: {json.dumps(error_msg, ensure_ascii=False)}\n\n"
            return
    else:
        if mode == "text":
            # 文字模式：使用对话格式，不要求代码块
            messages = [
                {"role": "system", "content": system_prompt},
                *history,
                {"role": "user", "content": topic},
            ]
        else:
            # 动画模式：原有逻辑
            messages = [
                {"role": "system", "content": system_prompt},
                *history,
                {"role": "user", "content": topic},
            ]

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.8, 
            )
        except OpenAIError as e:
            error_msg = {
                "error": str(e),
                "type": "OpenAIError",
                "message": "LLM服务调用失败，请检查API配置"
            }
            yield f"data: {json.dumps(error_msg, ensure_ascii=False)}\n\n"
            return

        async for chunk in response:
            token = chunk.choices[0].delta.content or ""
            if token:
                payload = json.dumps({"token": token}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                # 文字模式不需要延迟，直接流式输出；动画模式保持小延迟
                if mode != "text":
                    await asyncio.sleep(0.001)

    yield 'data: {"event":"[DONE]"}\n\n'

def extract_html_from_text(text: str) -> str:
    if not text:
        return ""
    match = re.search(r"```(?:html)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return text.strip()

async def generate_model_html(prompt: str, model: str = None) -> str:
    if model is None:
        model = MODEL
    system_prompt = """你是一个教育建模助手。请根据用户输入的知识点或模型名称，生成一个可交互式的数学/教育模型页面。
要求：
1) 只输出一个完整的 HTML（包含 CSS + JS），不要输出 markdown 或代码块。
2) 页面布局：左侧说明卡片（模型名称、定义、公式/参数说明），右侧为可交互的模型展示区域。
3) 交互：至少包含 2 个可调参数（滑块/输入框），参数变化实时影响图形/模型。
4) 语言：全部中文。
5) 只使用原生 HTML/CSS/JS，不使用外部库或远程资源。
6) 画面清爽，背景浅色，文字清晰，元素不拥挤。
7) 模型需与主题匹配（例如圆锥曲线、三角函数、立体几何等）。"""

    if USE_GEMINI:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: gemini_client.models.generate_content(
                model=model,
                contents=f"{system_prompt}\n\n用户需求：{prompt}"
            )
        )
        return extract_html_from_text(response.text)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
    )
    return extract_html_from_text(response.choices[0].message.content or "")

# -----------------------------------------------------------------------
# 3. 路由 (CHANGED: Now a POST request)
# -----------------------------------------------------------------------
@app.post("/generate")
async def generate(
    chat_request: ChatRequest, # CHANGED: Use the Pydantic model
    request: Request,
):
    """
    Main endpoint: POST /generate
    Accepts a JSON body with "topic" and optional "history".
    Returns an SSE stream.
    """
    accumulated_response = ""  # for caching flow results

    async def event_generator():
        nonlocal accumulated_response
        try:
            async for chunk in llm_event_stream(
                chat_request.topic, 
                chat_request.history,
                mode=chat_request.mode or "animation"
            ):
                accumulated_response += chunk
                if await request.is_disconnected():
                    break
                yield chunk
        except Exception as e:
            error_msg = {
                "error": str(e),
                "type": type(e).__name__,
                "message": "处理请求时发生错误"
            }
            yield f"data: {json.dumps(error_msg, ensure_ascii=False)}\n\n"


    async def wrapped_stream():
        async for chunk in event_generator():
            yield chunk

    headers = {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(wrapped_stream(), headers=headers)

@app.post("/api/model/generate")
async def generate_model(payload: ModelGenerateRequest):
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    if len(prompt) > 1000:
        raise HTTPException(status_code=400, detail="Prompt too long (max 1000 characters)")

    try:
        html = await generate_model_html(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model generation failed: {str(e)}")
    if not html:
        raise HTTPException(status_code=500, detail="Empty model response")
    return {"html": html}

@app.get("/api/projects", response_model=List[Project])
async def list_projects():
    async with _projects_lock:
        # 按更新时间倒序返回
        projects = list(PROJECTS_DICT.values())
        projects.sort(key=lambda p: p.updated_at, reverse=True)
        return projects

@app.post("/api/projects", response_model=Project)
async def create_project(payload: NewProjectRequest):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    project = Project(id=uuid.uuid4().hex, name=name, updated_at=now_iso())
    async with _projects_lock:
        PROJECTS_DICT[project.id] = project
    return project

@app.patch("/api/projects/{project_id}", response_model=Project)
async def rename_project(project_id: str, payload: RenameProjectRequest):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    async with _projects_lock:
        project = PROJECTS_DICT.get(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        project.name = name
        project.updated_at = now_iso()
        PROJECTS_DICT[project_id] = project
        return project

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    async with _projects_lock:
        if project_id not in PROJECTS_DICT:
            raise HTTPException(status_code=404, detail="Project not found")
        PROJECTS_DICT.pop(project_id, None)
    
    # 删除关联的chats
    async with _chats_lock:
        chat_ids_to_remove = [
            chat_id for chat_id, chat in CHAT_STORE.items()
            if (chat.get("project_id") or "") == project_id
        ]
        for chat_id in chat_ids_to_remove:
            CHAT_STORE.pop(chat_id, None)
    
    return {"status": "ok"}

@app.post("/api/projects/{project_id}/rename", response_model=Project)
async def rename_project_post(project_id: str, payload: RenameProjectRequest):
    return await rename_project(project_id, payload)

@app.post("/api/projects/{project_id}/delete")
async def delete_project_post(project_id: str):
    return await delete_project(project_id)

@app.get("/api/projects/{project_id}/share")
async def share_project(project_id: str, request: Request):
    async with _projects_lock:
        if project_id not in PROJECTS_DICT:
            raise HTTPException(status_code=404, detail="Project not found")
    return {"url": str(request.base_url).rstrip("/") + f"/chat?project_id={project_id}"}

@app.get("/api/chats", response_model=List[ChatSummary])
async def list_chats(request: Request):
    query = (request.query_params.get("q") or "").strip().lower()
    async with _chats_lock:
        chats = list(CHAT_STORE.values())
    if query:
        def match_chat(chat):
            title = (chat["title"] or "").lower()
            if query in title:
                return True
            return any(query in (msg["content"] or "").lower() for msg in chat["messages"])
        chats = [chat for chat in chats if match_chat(chat)]
    chats.sort(key=lambda c: c["updated_at"], reverse=True)
    return [
        ChatSummary(
            id=chat["id"],
            title=chat["title"],
            updated_at=chat["updated_at"],
            project_id=chat.get("project_id"),
        )
        for chat in chats
    ]

@app.get("/api/projects/{project_id}/chats", response_model=List[ChatSummary])
async def list_project_chats(project_id: str):
    async with _chats_lock:
        chats = [
            chat for chat in CHAT_STORE.values()
            if (chat.get("project_id") or "") == project_id
        ]
    chats.sort(key=lambda c: c["updated_at"], reverse=True)
    return [
        ChatSummary(
            id=chat["id"],
            title=chat["title"],
            updated_at=chat["updated_at"],
            project_id=chat.get("project_id"),
        )
        for chat in chats
    ]

@app.post("/api/chats", response_model=ChatSummary)
async def create_chat(payload: NewChatRequest):
    chat_id = uuid.uuid4().hex
    title = payload.title.strip() if payload.title else ""
    project_id = payload.project_id.strip() if payload.project_id else None
    chat = {
        "id": chat_id,
        "title": title or None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "project_id": project_id or None,
        "messages": [],
    }
    async with _chats_lock:
        CHAT_STORE[chat_id] = chat
    return ChatSummary(
        id=chat_id,
        title=chat["title"],
        updated_at=chat["updated_at"],
        project_id=chat["project_id"],
    )

@app.get("/api/chats/{chat_id}", response_model=ChatDetail)
async def get_chat(chat_id: str):
    async with _chats_lock:
        chat = CHAT_STORE.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        # 创建副本避免在锁内进行复杂操作
        chat_copy = dict(chat)
    return ChatDetail(
        id=chat_copy["id"],
        title=chat_copy["title"],
        updated_at=chat_copy["updated_at"],
        project_id=chat_copy.get("project_id"),
        messages=[ChatMessage(**msg) for msg in chat_copy["messages"]],
    )

@app.post("/api/chats/{chat_id}/messages", response_model=ChatDetail)
async def append_message(chat_id: str, payload: ChatMessageRequest):
    async with _chats_lock:
        chat = CHAT_STORE.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        content = payload.content.strip()
        chat["messages"].append({"role": payload.role, "content": content})
        if not chat["title"] and payload.role == "user":
            chat["title"] = content[:28] if content else "New Chat"
        chat["updated_at"] = now_iso()
        # 创建副本用于返回
        chat_copy = dict(chat)
    return ChatDetail(
        id=chat_copy["id"],
        title=chat_copy["title"],
        updated_at=chat_copy["updated_at"],
        project_id=chat_copy.get("project_id"),
        messages=[ChatMessage(**msg) for msg in chat_copy["messages"]],
    )

@app.patch("/api/chats/{chat_id}", response_model=ChatSummary)
async def rename_chat(chat_id: str, payload: RenameChatRequest):
    async with _chats_lock:
        chat = CHAT_STORE.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        title = payload.title.strip() if payload.title else ""
        # 如果提供了标题，则更新（即使为空字符串也要更新）
        if payload.title is not None:
            chat["title"] = title if title else None
        chat["updated_at"] = now_iso()
        chat_copy = dict(chat)
    return ChatSummary(
        id=chat_copy["id"],
        title=chat_copy["title"],
        updated_at=chat_copy["updated_at"],
        project_id=chat_copy.get("project_id"),
    )

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    async with _chats_lock:
        if chat_id not in CHAT_STORE:
            raise HTTPException(status_code=404, detail="Chat not found")
        CHAT_STORE.pop(chat_id, None)
    return {"status": "ok"}

@app.get("/api/chats/{chat_id}/share")
async def share_chat(chat_id: str, request: Request):
    async with _chats_lock:
        if chat_id not in CHAT_STORE:
            raise HTTPException(status_code=404, detail="Chat not found")
    return {"url": str(request.base_url).rstrip("/") + f"/chat?chat_id={chat_id}"}

@app.post("/api/tts/generate")
async def generate_tts(payload: TTSRequest):
    """
    生成 TTS 音频
    使用 Qwen TTS API
    注意：由于系统提示词要求字幕必须全部中文（subtitle_lang_note），
    所以 TTS 默认使用中文语音，确保与字幕语言一致
    """
    if not USE_QWEN_TTS or not QWEN_TTS_API_KEY:
        raise HTTPException(status_code=500, detail="Qwen TTS API key not configured. Please set QWEN_TTS_API_KEY and Base_TTS_URL in credentials.json")
    
    # 文本预处理
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    # 限制文本长度（避免超长文本）
    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Text too long (max 1000 characters)")
    
    # 限制速度范围
    speed = max(0.25, min(4.0, payload.speed))
    
    # 检测字幕语言并选择语音
    # 注意：由于系统提示词中 subtitle_lang_note 要求字幕必须全部中文，
    # 所以即使传入 "auto"，也默认使用中文，确保与字幕语言要求一致
    if payload.language == "auto":
        # 字幕强制使用中文（与 subtitle_lang_note 保持一致）
        detected_lang = "zh"
    else:
        detected_lang = payload.language
    
    try:
        # Qwen TTS API 端点
        # 从 Base_TTS_URL 中提取基础 URL（移除 compatible-mode/v1）
        base_url = QWEN_TTS_BASE_URL.replace("/compatible-mode/v1", "").rstrip("/")
        if not base_url:
            # 如果 Base_TTS_URL 就是 compatible-mode/v1，使用默认的 dashscope 域名
            base_url = "https://dashscope.aliyuncs.com"
        
        tts_url = f"{base_url}/api/v1/services/audio/tts/generation"
        
        # 根据语言选择 Qwen TTS 语音
        # Qwen TTS 支持的语音：Cherry, Breeze, 等
        # 中文推荐：Cherry, Breeze
        # 英文推荐：Cherry
        if detected_lang == "zh":
            voice = "Cherry"  # 中文语音
            language_type = "Chinese"
        else:
            voice = "Cherry"  # 英文语音
            language_type = "English"
        
        # 标准 Qwen TTS API 格式
        request_body = {
            "model": "qwen3-tts-flash",  # Qwen TTS 模型名称
            "input": {
                "text": text,
                "voice": voice,
                "language_type": language_type,
            },
            "parameters": {
                "speed": speed,
            }
        }
        
        # 调用 Qwen TTS API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                tts_url,
                headers={
                    "Authorization": f"Bearer {QWEN_TTS_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=request_body,
            )
            
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("message", error_json.get("error", {}).get("message", error_detail))
                except:
                    pass
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Qwen TTS API error: {error_detail}"
                )
            
            # Qwen TTS 返回 JSON 格式，包含 base64 编码的音频数据
            result = response.json()
            
            # 检查响应格式
            if "output" in result and "audio" in result["output"]:
                # 标准格式：output.audio 包含 base64 编码的音频
                import base64
                audio_data = base64.b64decode(result["output"]["audio"])
                return Response(
                    content=audio_data,
                    media_type="audio/mpeg",
                    headers={
                        "Cache-Control": "public, max-age=31536000",
                    }
                )
            elif "data" in result and "audio" in result["data"]:
                # 可能的其他格式
                import base64
                audio_data = base64.b64decode(result["data"]["audio"])
                return Response(
                    content=audio_data,
                    media_type="audio/mpeg",
                    headers={
                        "Cache-Control": "public, max-age=31536000",
                    }
                )
            else:
                # 如果返回的是直接音频流（某些情况下）
                content_type = response.headers.get("content-type", "")
                if "audio" in content_type:
                    return Response(
                        content=response.content,
                        media_type=content_type,
                        headers={
                            "Cache-Control": "public, max-age=31536000",
                        }
                    )
                else:
                    raise HTTPException(status_code=500, detail=f"Invalid Qwen TTS response format: {result}")
    
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Qwen TTS API request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Qwen TTS API request failed: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Qwen TTS error: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse(
        "index.html", {
            "request": request,
            "time": datetime.now(shanghai_tz).strftime("%Y%m%d%H%M%S"),
            "view": "initial"})

@app.get("/chat", response_class=HTMLResponse)
async def read_chat(request: Request):
    return templates.TemplateResponse(
        "index.html", {
            "request": request,
            "time": datetime.now(shanghai_tz).strftime("%Y%m%d%H%M%S"),
            "view": "chat"})

@app.get("/project", response_class=HTMLResponse)
async def read_project(request: Request):
    return templates.TemplateResponse(
        "index.html", {
            "request": request,
            "time": datetime.now(shanghai_tz).strftime("%Y%m%d%H%M%S"),
            "view": "project"})

@app.get("/model", response_class=HTMLResponse)
async def read_model(request: Request):
    return templates.TemplateResponse(
        "index.html", {
            "request": request,
            "time": datetime.now(shanghai_tz).strftime("%Y%m%d%H%M%S"),
            "view": "model"})

@app.get("/video", response_class=HTMLResponse)
async def read_video(request: Request):
    return templates.TemplateResponse(
        "index.html", {
            "request": request,
            "time": datetime.now(shanghai_tz).strftime("%Y%m%d%H%M%S"),
            "view": "video"})

# -----------------------------------------------------------------------
# 4. 本地启动命令
# -----------------------------------------------------------------------
# uvicorn app:app --reload --host 0.0.0.0 --port 8000


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
