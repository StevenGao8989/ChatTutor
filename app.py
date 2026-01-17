import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Optional

import pytz
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
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

credentials = json.load(open("credentials.json"))
API_KEY = credentials["API_KEY"]
BASE_URL = credentials.get("BASE_URL", "")
MODEL = credentials.get("MODEL", "gemini-2.5-pro")

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

class ChatDetail(ChatSummary):
    messages: List[ChatMessage]

class NewChatRequest(BaseModel):
    title: Optional[str] = None

class ChatMessageRequest(BaseModel):
    role: str
    content: str

class RenameChatRequest(BaseModel):
    title: str

class NewProjectRequest(BaseModel):
    name: str

class RenameProjectRequest(BaseModel):
    name: str

def now_iso() -> str:
    return datetime.now(shanghai_tz).isoformat()

PROJECTS: List[Project] = []

CHAT_STORE: dict = {}

@app.on_event("startup")
async def reset_project_store():
    PROJECTS.clear()

# -----------------------------------------------------------------------
# 2. 核心：流式生成器 (现在会使用 history)
# -----------------------------------------------------------------------
async def llm_event_stream(
    topic: str,
    history: Optional[List[dict]] = None,
    model: str = None, # Will use MODEL from config if not specified
) -> AsyncGenerator[str, None]:
    history = history or []
    
    # Use configured model if not specified
    if model is None:
        model = MODEL
    
    # The system prompt is now more focused
    system_prompt = f"""请你生成一个非常精美的动态动画,讲讲 {topic}
要动态的,要像一个完整的,正在播放的视频。包含一个完整的过程，能把知识点讲清楚。
页面极为精美，好看，有设计感，同时能够很好的传达知识。知识和图像要准确
附带一些旁白式的文字解说,从头到尾讲清楚一个小的知识点
不需要任何互动按钮,直接开始播放
使用和谐好看，广泛采用的浅色配色方案，使用很多的，丰富的视觉元素。双语字幕
**布局要求：使用全屏或接近全屏的布局，主容器应该占据至少80%的视口宽度和70%以上的视口高度，减少不必要的边距和空白，让内容充满整个显示区域，提供沉浸式的视觉体验。主内容区域应该是一个大的、居中的白色或浅色卡片，占据屏幕的大部分空间。**
**字幕要求：字幕必须放置在动画内容的下方，使用固定定位或绝对定位在容器底部，确保字幕清晰可见且不会遮挡任何动画元素。字幕区域应该有足够的背景色或半透明背景，确保文字可读性。字幕与动画内容之间要有明确的视觉分隔。**
**请保证任何一个元素都在一个2k分辨率的容器中被摆在了正确的位置，避免穿模，字幕遮挡，图形位置错误等等问题影响正确的视觉传达**
html+css+js+svg，放进一个html里"""

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
            chunk_size = 50
            
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                payload = json.dumps({"token": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.05)
                
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return
    else:
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
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        async for chunk in response:
            token = chunk.choices[0].delta.content or ""
            if token:
                payload = json.dumps({"token": token}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.001)

    yield 'data: {"event":"[DONE]"}\n\n'

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
            async for chunk in llm_event_stream(chat_request.topic, chat_request.history):
                accumulated_response += chunk
                if await request.is_disconnected():
                    break
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"


    async def wrapped_stream():
        async for chunk in event_generator():
            yield chunk

    headers = {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(wrapped_stream(), headers=headers)

@app.get("/api/projects", response_model=List[Project])
async def list_projects():
    return PROJECTS

@app.post("/api/projects", response_model=Project)
async def create_project(payload: NewProjectRequest):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    project = Project(id=uuid.uuid4().hex, name=name, updated_at=now_iso())
    PROJECTS.insert(0, project)
    return project

@app.patch("/api/projects/{project_id}", response_model=Project)
async def rename_project(project_id: str, payload: RenameProjectRequest):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    for project in PROJECTS:
        if project.id == project_id:
            project.name = name
            project.updated_at = now_iso()
            return project
    raise HTTPException(status_code=404, detail="Project not found")

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    for index, project in enumerate(PROJECTS):
        if project.id == project_id:
            PROJECTS.pop(index)
            return {"status": "ok"}
    raise HTTPException(status_code=404, detail="Project not found")

@app.post("/api/projects/{project_id}/rename", response_model=Project)
async def rename_project_post(project_id: str, payload: RenameProjectRequest):
    return await rename_project(project_id, payload)

@app.post("/api/projects/{project_id}/delete")
async def delete_project_post(project_id: str):
    return await delete_project(project_id)

@app.get("/api/projects/{project_id}/share")
async def share_project(project_id: str, request: Request):
    exists = any(project.id == project_id for project in PROJECTS)
    if not exists:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"url": str(request.base_url).rstrip("/") + f"/chat?project_id={project_id}"}

@app.get("/api/chats", response_model=List[ChatSummary])
async def list_chats(request: Request):
    query = (request.query_params.get("q") or "").strip().lower()
    chats = list(CHAT_STORE.values())
    if query:
        def match_chat(chat):
            title = (chat["title"] or "").lower()
            if query in title:
                return True
            return any(query in (msg["content"] or "").lower() for msg in chat["messages"])
        chats = [chat for chat in chats if match_chat(chat)]
    chats.sort(key=lambda c: c["updated_at"], reverse=True)
    return [ChatSummary(id=chat["id"], title=chat["title"], updated_at=chat["updated_at"]) for chat in chats]

@app.post("/api/chats", response_model=ChatSummary)
async def create_chat(payload: NewChatRequest):
    chat_id = uuid.uuid4().hex
    title = payload.title.strip() if payload.title else ""
    chat = {
        "id": chat_id,
        "title": title or None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "messages": [],
    }
    CHAT_STORE[chat_id] = chat
    return ChatSummary(id=chat_id, title=chat["title"], updated_at=chat["updated_at"])

@app.get("/api/chats/{chat_id}", response_model=ChatDetail)
async def get_chat(chat_id: str):
    chat = CHAT_STORE.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return ChatDetail(
        id=chat["id"],
        title=chat["title"],
        updated_at=chat["updated_at"],
        messages=[ChatMessage(**msg) for msg in chat["messages"]],
    )

@app.post("/api/chats/{chat_id}/messages", response_model=ChatDetail)
async def append_message(chat_id: str, payload: ChatMessageRequest):
    chat = CHAT_STORE.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    content = payload.content.strip()
    chat["messages"].append({"role": payload.role, "content": content})
    if not chat["title"] and payload.role == "user":
        chat["title"] = content[:28] if content else "New Chat"
    chat["updated_at"] = now_iso()
    return ChatDetail(
        id=chat["id"],
        title=chat["title"],
        updated_at=chat["updated_at"],
        messages=[ChatMessage(**msg) for msg in chat["messages"]],
    )

@app.patch("/api/chats/{chat_id}", response_model=ChatSummary)
async def rename_chat(chat_id: str, payload: RenameChatRequest):
    chat = CHAT_STORE.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    title = payload.title.strip()
    chat["title"] = title or chat["title"]
    chat["updated_at"] = now_iso()
    return ChatSummary(id=chat["id"], title=chat["title"], updated_at=chat["updated_at"])

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    if chat_id not in CHAT_STORE:
        raise HTTPException(status_code=404, detail="Chat not found")
    CHAT_STORE.pop(chat_id, None)
    return {"status": "ok"}

@app.get("/api/chats/{chat_id}/share")
async def share_chat(chat_id: str, request: Request):
    if chat_id not in CHAT_STORE:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"url": str(request.base_url).rstrip("/") + f"/chat?chat_id={chat_id}"}

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

# -----------------------------------------------------------------------
# 4. 本地启动命令
# -----------------------------------------------------------------------
# uvicorn app:app --reload --host 0.0.0.0 --port 8000


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
