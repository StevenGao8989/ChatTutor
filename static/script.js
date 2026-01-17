document.addEventListener('DOMContentLoaded', () => {
    const config = {
        apiBaseUrl: '', 
        defaultLang: 'zh',
    };

    const translations = {
        heroTitle: { zh: "在此赋予概念以生命，转瞬之间", en: "Bring Concepts to Life Here" },
        startCreatingTitle: { zh: "开始创作", en: "Start Creating" },
        githubrepo: { zh: "Github 开源仓库", en: "Fogsight Github Repo" },
        officialWebsite: { zh: "通向 AGI 之路社区", en: "WaytoAGI Open Source Community" },
        groupChat: { zh: "联系我们/加入交流群", en: "Contact Us" },
        placeholders: {
            zh: ["微积分的几何原理", "冒泡排序","热寂", "黑洞是如何形成的"],
            en: ["What is Heat Death?", "How are black holes formed?", "What is Bubble Sort?"]
        },
        newChat: { zh: "新对话", en: "New Chat" },
        newChatTitle: { zh: "新对话", en: "New Chat" },
        searchChats: { zh: "搜索对话", en: "Search chats" },
        projects: { zh: "项目", en: "Projects" },
        recentChats: { zh: "对话", en: "Chats" },
        chatEmpty: { zh: "暂无对话", en: "No chats yet" },
        projectEmpty: { zh: "暂无项目", en: "No projects yet" },
        shareChat: { zh: "分享对话", en: "Share chat" },
        renameChat: { zh: "重命名对话", en: "Rename chat" },
        deleteChat: { zh: "删除对话", en: "Delete chat" },
        confirmDelete: { zh: "确定删除该对话？", en: "Delete this chat?" },
        renamePlaceholder: { zh: "输入新的对话名称", en: "Enter a new chat name" },
        shareProject: { zh: "分享项目", en: "Share project" },
        renameProject: { zh: "重命名项目", en: "Rename project" },
        deleteProject: { zh: "删除项目", en: "Delete project" },
        confirmDeleteProject: { zh: "确定删除该项目？", en: "Delete this project?" },
        renameProjectPlaceholder: { zh: "输入新的项目名称", en: "Enter a new project name" },
        createProject: { zh: "新建项目", en: "New project" },
        projectName: { zh: "项目名称", en: "Project name" },
        projectHint: { zh: "用于归档对话与文件。", en: "Keep related chats and files together." },
        createProjectAction: { zh: "创建项目", en: "Create project" },
        projectNamePlaceholder: { zh: "例如：市场调研", en: "e.g. Market research" },
        addFiles: { zh: "添加文件", en: "Add files" },
        projectChatPlaceholder: { zh: "在 {project} 中新建对话", en: "New chat in {project}" },
        projectChatEmpty: { zh: "暂无项目对话", en: "No project chats yet" },
        projectRecent: { zh: "最近", en: "Recent" },
        chatPlaceholder: {
            zh: "Ask anything",
            en: "Ask anything"
        },
        sendTitle: { zh: "发送", en: "Send" },
        agentThinking: { zh: "ChatTutor 正在进行思考与规划，请稍后。这可能需要数十秒至数分钟...", en: "ChatTutor is thinking and planning, please wait..." },
        generatingCode: { zh: "生成代码中...", en: "Generating code..." },
        codeComplete: { zh: "代码已完成", en: "Code generated" },
        openInNewWindow: { zh: "在新窗口中打开", en: "Open in new window" },
        saveAsHTML: { zh: "保存为 HTML", en: "Save as HTML" },
        exportAsVideo: { zh: "导出为视频", en: "Export as Video" },
        featureComingSoon: { zh: "该功能正在开发中，将在不久的将来推出。\n 请关注我们的官方 GitHub 仓库以获取最新动态！", en: "This feature is under development and will be available soon.\n Follow our official GitHub repository for the latest updates!" },
        visitGitHub: { zh: "访问 GitHub", en: "Visit GitHub" },
        errorMessage: { zh: "抱歉，服务出现了一点问题。请稍后重试。", en: "Sorry, something went wrong. Please try again later." },
        errorFetchFailed: {zh: "LLM服务不可用，请稍后再试", en: "LLM service is unavailable. Please try again later."},
        errorTooManyRequests: {zh: "今天已经使用太多，请明天再试", en: "Too many requests today. Please try again tomorrow."},
        errorLLMParseError: {zh: "返回的动画代码解析失败，请调整提示词重新生成。", en: "Failed to parse the returned animation code. Please adjust your prompt and try again."},
    };

    let currentLang = config.defaultLang;
    const body = document.body;
    const initialForm = document.getElementById('initial-form');
    const initialInput = document.getElementById('initial-input');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatLog = document.getElementById('chat-log');
    const newChatButton = document.getElementById('new-chat-button');
    const languageSwitcher = document.getElementById('language-switcher');
    const placeholderContainer = document.getElementById('animated-placeholder');
    const featureModal = document.getElementById('feature-modal');
    const modalGitHubButton = document.getElementById('modal-github-button');
    const modalCloseButton = document.getElementById('modal-close-button');
    const projectModal = document.getElementById('project-modal');
    const projectModalClose = document.getElementById('project-modal-close');
    const projectCreateButton = document.getElementById('project-create-button');
    const projectNameInput = document.getElementById('project-name-input');
    const projectCreateSubmit = document.getElementById('project-create-submit');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const chatSidebar = document.querySelector('.chat-sidebar');
    const chatSearchInput = document.getElementById('chat-search-input');
    const chatListSection = document.getElementById('chat-list-section');
    const chatListTitle = document.getElementById('chat-list-title');
    const chatList = document.getElementById('chat-list');
    const projectList = document.getElementById('project-list');
    const headerAppTitle = document.getElementById('header-app-title');
    const headerProject = document.getElementById('header-project');
    const headerProjectName = document.getElementById('header-project-name');
    const chatMain = document.querySelector('.chat-main');
    const projectView = document.getElementById('project-view');
    const projectTitleText = document.getElementById('project-title-text');
    const projectChatForm = document.getElementById('project-chat-form');
    const projectChatInput = document.getElementById('project-chat-input');
    const projectChatList = document.getElementById('project-chat-list');

    const templates = {
        user: document.getElementById('user-message-template'),
        status: document.getElementById('agent-status-template'),
        code: document.getElementById('agent-code-template'),
        player: document.getElementById('animation-player-template'),
        error: document.getElementById('agent-error-template'),
    };

    class LLMParseError extends Error {
        constructor(message, code = 'LLM_UNKNOWN_ERROR') {
            super(message);
            this.name = 'LLMParseError';
            this.code = code;
        }
    }

    // 统一状态管理对象
    const appState = {
        conversationHistory: [],
        accumulatedCode: '',
        placeholderInterval: null,
        activeChatId: null,
        highlightedChatId: null,
        activeProjectId: null,
        activeProjectName: '',
        openMenuId: null,
        openMenuType: null,
        cachedProjects: [],
        activeProjectChats: [],
        expandedProjectIds: new Set()
    };

    // 通用API调用函数，统一错误处理
    const apiCall = async (url, options = {}) => {
        const {
            method = 'GET',
            body = null,
            fallbackUrl = null,
            fallbackMethod = null,
            errorMessage = '操作失败'
        } = options;

        const makeRequest = async (requestUrl, requestMethod) => {
            try {
                const requestOptions = {
                    method: requestMethod,
                    headers: { 'Content-Type': 'application/json' },
                };
                if (body) {
                    requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                }
                const response = await fetch(requestUrl, requestOptions);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || errorData.detail || `${errorMessage}: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error(`API call failed: ${requestUrl}`, error);
                throw error;
            }
        };

        try {
            return await makeRequest(url, method);
        } catch (error) {
            // 如果有fallback，尝试fallback
            if (fallbackUrl && fallbackMethod) {
                try {
                    return await makeRequest(fallbackUrl, fallbackMethod);
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    throw error; // 抛出原始错误
                }
            }
            throw error;
        }
    };

    async function handleFormSubmit(e) {
        e.preventDefault();
        const isInitial = e.currentTarget.id === 'initial-form';
        const submitButton = isInitial
            ? initialForm?.querySelector('button')
            : chatForm?.querySelector('button');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('disabled');
        }
        const input = isInitial ? initialInput : chatInput;
        const topic = input.value.trim();
        if (!topic) return;

        if (isInitial) switchToChatView();

        if (!appState.activeChatId) {
            const newChat = await createChat(topic, appState.activeProjectId);
            appState.activeChatId = newChat?.id || null;
            appState.highlightedChatId = appState.activeChatId;
            if (appState.activeProjectId) {
                fetchProjectChats();
            }
            refreshChats();
        }

        appState.conversationHistory.push({ role: 'user', content: topic });
        appendMessageToChat(appState.activeChatId, 'user', topic);
        startGeneration(topic, appState.activeChatId);
        input.value = '';
        if (isInitial) placeholderContainer?.classList?.remove('hidden');
    }

    async function handleProjectChatSubmit(e) {
        e.preventDefault();
        if (!projectChatInput || !appState.activeProjectId) return;
        const topic = projectChatInput.value.trim();
        if (!topic) return;
        const newChat = await createChat(topic, appState.activeProjectId);
        appState.activeChatId = newChat?.id || null;
        projectChatInput.value = '';
        if (!appState.activeChatId) return;
        fetchProjectChats();
        const renderUI = window.location.pathname !== '/project';
        if (renderUI) {
            refreshChats();
            showChatView();
        }
        startGeneration(topic, appState.activeChatId, { renderUI });
    }

    async function startGeneration(topic, chatId, options = {}) {
        const { renderUI = true } = options;
        console.log('Getting generation from backend.');
        const welcomeMessage = document.getElementById('chat-welcome');
        if (renderUI && welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        if (renderUI) appendUserMessage(topic);
        const agentThinkingMessage = renderUI ? appendAgentStatus(translations.agentThinking[currentLang]) : null;
        const submitButton = document.querySelector('.submit-button');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('disabled');
        }
        appState.accumulatedCode = '';
        let inCodeBlock = false;
        let codeBlockElement = null;

        try {
            const response = await fetch(`${config.apiBaseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: topic, history: appState.conversationHistory })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;

                        const jsonStr = line.substring(6);
                    if (jsonStr.includes('[DONE]')) {
                        console.log('Streaming complete');
                        appState.conversationHistory.push({ role: 'assistant', content: appState.accumulatedCode });
                        appendMessageToChat(chatId, 'assistant', appState.accumulatedCode);
                            if (renderUI) {
                                refreshChats();
                            }

                            if (renderUI && !codeBlockElement) {
                                console.warn('No code block element created. Full response:', appState.accumulatedCode);
                                throw new LLMParseError('LLM did not return a complete code block.');
                            }

                            if (renderUI && !isHtmlContentValid(appState.accumulatedCode)) {
                                console.warn('Invalid HTML received:\n', appState.accumulatedCode);
                                throw new LLMParseError('Invalid HTML content received.');
                            }

                            if (renderUI && codeBlockElement) {
                                markCodeAsComplete(codeBlockElement);
                            }

                            try {
                                if (renderUI && appState.accumulatedCode) {
                                    appendAnimationPlayer(appState.accumulatedCode, topic);
                                }
                            } catch (err) {
                                console.error('appendAnimationPlayer failed:', err);
                                throw new LLMParseError('Animation rendering failed.');
                            }
                            scrollToBottom();
                            return;
                        }

                        let data;
                        try {
                            data = JSON.parse(jsonStr);
                        } catch (err) {
                            console.error('Failed to parse JSON:', jsonStr);
                            throw new LLMParseError('Invalid response format from server.');
                        }

                        if (data.error) {
                            const errorMessage = data.message || data.error || '未知错误';
                            throw new LLMParseError(errorMessage, data.type || 'SERVER_ERROR');
                        }
                        const token = data.token || '';

                        if (!inCodeBlock && token.includes('```')) {
                            inCodeBlock = true;
                            if (agentThinkingMessage) agentThinkingMessage.remove();
                            if (renderUI) {
                                codeBlockElement = appendCodeBlock();
                            }
                            const contentAfterMarker = token.substring(token.indexOf('```') + 3).replace(/^html\n/, '');
                            appState.accumulatedCode += contentAfterMarker;
                            if (renderUI) updateCodeBlock(codeBlockElement, contentAfterMarker);
                        } else if (inCodeBlock) {
                            if (token.includes('```')) {
                                inCodeBlock = false;
                                const contentBeforeMarker = token.substring(0, token.indexOf('```'));
                                appState.accumulatedCode += contentBeforeMarker;
                                if (renderUI) updateCodeBlock(codeBlockElement, contentBeforeMarker);
                            } else {
                                appState.accumulatedCode += token;
                                if (renderUI) updateCodeBlock(codeBlockElement, token);
                            }
                        }
                }
            }
        } finally {
            // 确保释放ReadableStream资源
            reader.releaseLock();
        }
        } catch (error) {
            console.error("Streaming failed:", error);
            if (agentThinkingMessage) agentThinkingMessage.remove();

            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                showWarning(translations.errorFetchFailed[currentLang]);
            } else if (error.message.includes('status: 429')) {
                showWarning(translations.errorTooManyRequests[currentLang]);
            } else if (error instanceof LLMParseError) {
                showWarning(translations.errorLLMParseError[currentLang]);
            } else {
                showWarning(translations.errorFetchFailed[currentLang]); // 默认 fallback
            }

            appendErrorMessage(translations.errorMessage[currentLang]);  // 保留 chat-log 中的提示
        } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('disabled');
        }
    }
    }

    function switchToChatView() {
        body.classList.remove('show-initial-view');
        body.classList.add('show-chat-view');
        languageSwitcher.style.display = 'none';
        updateHeaderProject();
        updateChatListTitle();
        refreshSidebarLists();
        // 更新URL为 /chat，但不刷新页面
        if (window.location.pathname !== '/chat') {
            window.history.pushState({ view: 'chat' }, '', '/chat');
        }
    }

    function appendFromTemplate(template, text) {
        const node = template.content.cloneNode(true);
        const element = node.firstElementChild;
        if (text) element.innerHTML = element.innerHTML.replace('${text}', text);
        element.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.dataset.translateKey;
            const translation = translations[key]?.[currentLang];
            if (translation) el.textContent = translation;
        });
        chatLog.appendChild(element);
        scrollToBottom();
        return element;
    }

    const appendUserMessage = (text) => appendFromTemplate(templates.user, text);
    const appendAgentStatus = (text) => appendFromTemplate(templates.status, text);
    const appendErrorMessage = (text) => appendFromTemplate(templates.error, text);
    const appendCodeBlock = () => appendFromTemplate(templates.code);

    function updateCodeBlock(codeBlockElement, text) {
        const codeElement = codeBlockElement.querySelector('code');
        if (!text || !codeElement) return;
        const span = document.createElement('span');
        span.textContent = text;
        codeElement.appendChild(span);
        // 注意：accumulatedCode 已经在调用处更新，这里不需要重复累加

        const codeContent = codeElement.closest('.code-content');
        if (codeContent) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    codeContent.scrollTop = codeContent.scrollHeight;
                });
            });
        }
    }

    function markCodeAsComplete(codeBlockElement) {
        codeBlockElement.querySelector('[data-translate-key="generatingCode"]').textContent = translations.codeComplete[currentLang];
        codeBlockElement.querySelector('.code-details').removeAttribute('open');
    }

    function appendAnimationPlayer(htmlContent, topic) {
        console.log('Appending animation player with topic:', topic);
        const node = templates.player.content.cloneNode(true);
        const playerElement = node.firstElementChild;
        playerElement.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.dataset.translateKey;
            el.textContent = translations[key]?.[currentLang] || el.textContent;
        });
        const iframe = playerElement.querySelector('.animation-iframe');
        iframe.srcdoc = htmlContent;

        playerElement.querySelector('.open-new-window').addEventListener('click', () => {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            window.open(URL.createObjectURL(blob), '_blank');
        });
        playerElement.querySelector('.save-html').addEventListener('click', () => {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = Object.assign(document.createElement('a'), { href: url, download: `${topic.replace(/\s/g, '_') || 'animation'}.html` });
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
        });
        playerElement.querySelector('.export-video')?.addEventListener('click', () => {
            featureModal.querySelector('p').textContent = translations.featureComingSoon[currentLang];
            modalGitHubButton.textContent = translations.visitGitHub[currentLang];
            featureModal.classList.add('visible');
        });
        chatLog.appendChild(playerElement);
        scrollToBottom();
    }

    function isHtmlContentValid(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");

        // 检查是否存在解析错误
        const parseErrors = doc.querySelectorAll("parsererror");
        if (parseErrors.length > 0) {
            console.warn("HTML 解析失败：", parseErrors[0].textContent);
            return false;
        }

        // 可选：检测是否有 <html><body> 结构或是否为空
        if (!doc.body || doc.body.innerHTML.trim() === "") {
            console.warn("HTML 内容为空");
            return false;
        }

        return true;
    }

    const scrollToBottom = () => chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' });

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const renderEmptyState = (container, key) => {
        container.innerHTML = `<div class="sidebar-empty">${translations[key]?.[currentLang] || ''}</div>`;
    };

    const updateHeaderProject = () => {
        if (!headerProject || !headerAppTitle || !headerProjectName) return;
        if (appState.activeProjectId) {
            headerAppTitle.style.display = 'none';
            headerProject.classList.remove('hidden');
            headerProjectName.textContent = appState.activeProjectName || '';
        } else {
            headerProject.classList.add('hidden');
            headerAppTitle.style.display = 'inline-flex';
        }
    };

    const renderProjectEmptyState = () => {
        if (!projectChatList) return;
        projectChatList.classList.add('is-empty');
        projectChatList.innerHTML = `<div class="project-chat-empty">${translations.projectChatEmpty?.[currentLang] || ''}</div>`;
    };

    const updateProjectPlaceholder = () => {
        if (!projectChatInput) return;
        const template = translations.projectChatPlaceholder?.[currentLang] || '';
        projectChatInput.placeholder = template.replace('{project}', appState.activeProjectName || '');
    };

    const updateChatListTitle = () => {
        if (!chatListTitle) return;
        chatListTitle.textContent = translations.recentChats?.[currentLang] || '';
    };

    const updateChatListVisibility = () => {
        if (!chatListSection) return;
        chatListSection.style.display = 'block';
    };

    const getChatSearchQuery = () => (chatSearchInput?.value || '').trim();
    const refreshChats = (query) => fetchChats(query ?? getChatSearchQuery());
    const refreshSidebarLists = () => {
        fetchProjects();
        refreshChats();
    };

    const showProjectView = () => {
        if (chatMain) chatMain.classList.add('show-project');
        updateHeaderProject();
        updateChatListTitle();
        updateChatListVisibility();
        if (projectTitleText) {
            projectTitleText.textContent = appState.activeProjectName || '';
        }
        updateProjectPlaceholder();
        renderProjectChatList(appState.activeProjectChats);
    };

    const showChatView = () => {
        if (chatMain) chatMain.classList.remove('show-project');
        updateHeaderProject();
        updateChatListTitle();
        updateChatListVisibility();
    };

    const syncProjectContext = (projectId, projectName = '') => {
        appState.activeProjectId = projectId;
        if (!projectName && appState.cachedProjects.length) {
            const match = appState.cachedProjects.find(project => project.id === projectId);
            projectName = match?.name || '';
        }
        appState.activeProjectName = projectName || '';
        updateHeaderProject();
        updateChatListTitle();
        updateChatListVisibility();
        renderProjectList(appState.cachedProjects);
    };

    const setActiveProject = (projectId, projectName = '', options = {}) => {
        const { updateHistory = true } = options;
        syncProjectContext(projectId, projectName);
        closeMenus();
        appState.highlightedChatId = null;
        const isProjectRoute = window.location.pathname === '/project';
        if (isProjectRoute) {
            renderChatList([]);
        }
        showProjectView();
        fetchProjectChats();
        refreshChats();
        if (updateHistory && (window.location.pathname === '/chat' || window.location.pathname === '/project')) {
            const url = new URL(window.location.href);
            url.searchParams.set('project_id', projectId);
            url.searchParams.delete('chat_id');
            if (isProjectRoute) {
                window.history.pushState({ view: 'project', project_id: projectId }, '', url.toString());
            } else {
                url.pathname = '/chat';
                window.history.pushState({ view: 'chat', project_id: projectId }, '', url.toString());
            }
        }
    };

    const renderProjectList = (projects = []) => {
        if (!projectList) return;
        if (!projects.length) {
            projectList.innerHTML = '';
            return;
        }
        projectList.innerHTML = '';
        projects.forEach(project => {
            const item = document.createElement('div');
            item.className = 'sidebar-list-item project-item';
            if (project.id === appState.activeProjectId) item.classList.add('active');
            item.dataset.projectId = project.id;
            item.dataset.projectName = project.name;
            const isExpanded = appState.expandedProjectIds.has(project.id);
            const recentHtml = project.id === appState.activeProjectId && isExpanded
                ? `
                    <div class="project-recent">
                        <div class="project-recent-title">${translations.projectRecent?.[currentLang] || ''}</div>
                        <div class="project-recent-list">
                            ${appState.activeProjectChats.length
                                ? appState.activeProjectChats.map(chat => `
                                    <button class="project-recent-item" data-chat-id="${chat.id}">
                                        <span class="project-recent-name">${chat.title || translations.newChat[currentLang]}</span>
                                        <span class="project-recent-time">${formatTime(chat.updated_at)}</span>
                                    </button>
                                `).join('')
                                : `<div class="project-recent-empty">${translations.projectChatEmpty?.[currentLang] || ''}</div>`
                            }
                        </div>
                    </div>
                `
                : '';
            item.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 6h16M4 10h16M4 14h10"/><path d="M4 18h6"/>
                </svg>
                <span class="sidebar-title">${project.name}</span>
                <button class="project-toggle ${isExpanded ? 'expanded' : ''}" title="折叠/展开" data-action="toggle-project">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
                    </svg>
                </button>
                <button class="sidebar-item-menu project-menu" title="更多" data-action="menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="6" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18" r="1.8"/>
                    </svg>
                </button>
                <div class="sidebar-item-dropdown ${appState.openMenuType === 'project' && appState.openMenuId === project.id ? 'open' : ''}">
                    <button data-action="share">${translations.shareProject[currentLang]}</button>
                    <button data-action="rename">${translations.renameProject[currentLang]}</button>
                    <button data-action="delete" class="danger">${translations.deleteProject[currentLang]}</button>
                </div>
                ${recentHtml}
            `;
            projectList.appendChild(item);
        });
    };

    const renderProjectChatList = (chats = []) => {
        if (!projectChatList) return;
        if (!chats.length) {
            renderProjectEmptyState();
            return;
        }
        projectChatList.classList.remove('is-empty');
        projectChatList.innerHTML = '';
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'project-chat-item';
            item.dataset.chatId = chat.id;
            item.innerHTML = `
                <div class="project-chat-content">
                    <div class="project-chat-title">${chat.title || translations.newChat[currentLang]}</div>
                    <div class="project-chat-subtitle">${translations.projectHint?.[currentLang] || ''}</div>
                </div>
                <div class="project-chat-meta">
                    <span class="project-chat-time">${formatTime(chat.updated_at)}</span>
                    <button class="sidebar-item-menu" title="更多" data-action="menu">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="6" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18" r="1.8"/>
                        </svg>
                    </button>
                    <div class="sidebar-item-dropdown ${appState.openMenuType === 'project-chat' && appState.openMenuId === chat.id ? 'open' : ''}">
                        <button data-action="share">${translations.shareChat[currentLang]}</button>
                        <button data-action="rename">${translations.renameChat[currentLang]}</button>
                        <button data-action="delete" class="danger">${translations.deleteChat[currentLang]}</button>
                    </div>
                </div>
            `;
            projectChatList.appendChild(item);
        });
    };

    const renderChatList = (chats = []) => {
        if (!chatList) return;
        if (!chats.length) {
            renderEmptyState(chatList, 'chatEmpty');
            return;
        }
        chatList.innerHTML = '';
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'sidebar-list-item';
            if (chat.id === appState.highlightedChatId) item.classList.add('active');
            item.dataset.chatId = chat.id;
            item.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
                </svg>
                <span class="sidebar-title">${chat.title || translations.newChat[currentLang]}</span>
                <span class="sidebar-time">${formatTime(chat.updated_at)}</span>
                <button class="sidebar-item-menu" title="更多" data-action="menu">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="6" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18" r="1.8"/>
                    </svg>
                </button>
                <div class="sidebar-item-dropdown ${appState.openMenuType === 'chat' && appState.openMenuId === chat.id ? 'open' : ''}">
                    <button data-action="share">${translations.shareChat[currentLang]}</button>
                    <button data-action="rename">${translations.renameChat[currentLang]}</button>
                    <button data-action="delete" class="danger">${translations.deleteChat[currentLang]}</button>
                </div>
            `;
            chatList.appendChild(item);
        });
    };


    const fetchProjects = async () => {
        try {
            const data = await apiCall(`${config.apiBaseUrl}/api/projects`, {
                errorMessage: '加载项目列表失败'
            });
            appState.cachedProjects = data;
            renderProjectList(data);
            if (appState.activeProjectId) {
                const match = appState.cachedProjects.find(project => project.id === appState.activeProjectId);
                if (match) {
                    appState.activeProjectName = match.name;
                    updateHeaderProject();
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            appState.cachedProjects = [];
            renderProjectList([]);
        }
    };

    const fetchProjectChats = async () => {
        if (!appState.activeProjectId) {
            appState.activeProjectChats = [];
            renderProjectList(appState.cachedProjects);
            return;
        }
        try {
            const data = await apiCall(`${config.apiBaseUrl}/api/projects/${appState.activeProjectId}/chats`, {
                errorMessage: '加载项目对话失败'
            });
            appState.activeProjectChats = data;
            renderProjectList(appState.cachedProjects);
            renderProjectChatList(appState.activeProjectChats);
        } catch (error) {
            console.error('Failed to fetch project chats:', error);
            appState.activeProjectChats = [];
            renderProjectList(appState.cachedProjects);
            renderProjectChatList(appState.activeProjectChats);
        }
    };

    const createProject = async (name) => {
        try {
            return await apiCall(`${config.apiBaseUrl}/api/projects`, {
                method: 'POST',
                body: { name },
                errorMessage: '创建项目失败'
            });
        } catch (error) {
            console.error('Failed to create project:', error);
            showWarning(error.message || translations.errorMessage[currentLang]);
            return null;
        }
    };

    const renameProject = async (projectId, name) => {
        try {
            return await apiCall(`${config.apiBaseUrl}/api/projects/${projectId}`, {
                method: 'PATCH',
                body: { name },
                fallbackUrl: `${config.apiBaseUrl}/api/projects/${projectId}/rename`,
                fallbackMethod: 'POST',
                errorMessage: '重命名项目失败'
            });
        } catch (error) {
            console.error('Failed to rename project:', error);
            showWarning(error.message || translations.errorMessage[currentLang]);
            return null;
        }
    };

    const deleteProject = async (projectId) => {
        try {
            await apiCall(`${config.apiBaseUrl}/api/projects/${projectId}`, {
                method: 'DELETE',
                fallbackUrl: `${config.apiBaseUrl}/api/projects/${projectId}/delete`,
                fallbackMethod: 'POST',
                errorMessage: '删除项目失败'
            });
            return true;
        } catch (error) {
            console.error('Failed to delete project:', error);
            showWarning(error.message || translations.errorMessage[currentLang]);
            return false;
        }
    };

    const shareProject = async (projectId) => {
        try {
            return await apiCall(`${config.apiBaseUrl}/api/projects/${projectId}/share`, {
                errorMessage: '获取分享链接失败'
            });
        } catch (error) {
            console.error('Failed to share project:', error);
            showWarning(error.message || translations.errorMessage[currentLang]);
            return null;
        }
    };

    const fetchChats = async (query = '') => {
        try {
            const url = new URL(`${window.location.origin}${config.apiBaseUrl}/api/chats`);
            if (query) url.searchParams.set('q', query);
            const data = await apiCall(url.toString(), {
                errorMessage: '加载对话列表失败'
            });
            renderChatList(data);
        } catch (error) {
            console.error('Failed to fetch chats:', error);
            renderChatList([]);
        }
    };

    const fetchChatDetail = async (chatId) => {
        if (!chatId) return;
        try {
            return await apiCall(`${config.apiBaseUrl}/api/chats/${chatId}`, {
                errorMessage: '加载对话详情失败'
            });
        } catch (error) {
            console.error('Failed to fetch chat detail:', error);
            return null;
        }
    };

    const renameChat = async (chatId, title) => {
        try {
            return await apiCall(`${config.apiBaseUrl}/api/chats/${chatId}`, {
                method: 'PATCH',
                body: { title },
                errorMessage: '重命名对话失败'
            });
        } catch (error) {
            console.error('Failed to rename chat:', error);
            showWarning(error.message || translations.errorMessage[currentLang]);
            return null;
        }
    };

    const deleteChat = async (chatId) => {
        try {
            const response = await fetch(`${config.apiBaseUrl}/api/chats/${chatId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete chat');
            return true;
        } catch (error) {
            return false;
        }
    };

    const shareChat = async (chatId) => {
        try {
            return await apiCall(`${config.apiBaseUrl}/api/chats/${chatId}/share`, {
                errorMessage: '获取分享链接失败'
            });
        } catch (error) {
            console.error('Failed to share chat:', error);
            showWarning(error.message || translations.errorMessage[currentLang]);
            return null;
        }
    };

    const createChat = async (title = '', projectId = null) => {
        try {
            return await apiCall(`${config.apiBaseUrl}/api/chats`, {
                method: 'POST',
                body: { title, project_id: projectId },
                errorMessage: '创建对话失败'
            });
        } catch (error) {
            console.error('Failed to create chat:', error);
            showWarning(error.message || translations.errorMessage[currentLang]);
            return null;
        }
    };

    const appendMessageToChat = async (chatId, role, content) => {
        if (!chatId) return;
        try {
            await fetch(`${config.apiBaseUrl}/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, content })
            });
        } catch (error) {
            // Ignore to keep UI responsive
        }
    };

    const clearChatLog = () => {
        chatLog.innerHTML = '';
        const welcome = document.createElement('div');
        welcome.id = 'chat-welcome';
        welcome.className = 'chat-welcome';
        welcome.innerHTML = '<h2>What are you working on?</h2>';
        chatLog.appendChild(welcome);
    };

    const addCodeBlockFromContent = (content, title = '') => {
        const codeBlockElement = appendCodeBlock();
        const codeElement = codeBlockElement.querySelector('code');
        if (codeElement) codeElement.textContent = content;
        markCodeAsComplete(codeBlockElement);
        if (content) appendAnimationPlayer(content, title);
    };

    const loadChatById = async (chatId) => {
        const detail = await fetchChatDetail(chatId);
        if (!detail) return;
        appState.activeChatId = chatId;
        appState.highlightedChatId = chatId;
        appState.openMenuId = null;
        if (detail.project_id) {
            const match = appState.cachedProjects.find(project => project.id === detail.project_id);
            syncProjectContext(detail.project_id, match?.name || '');
            fetchProjectChats();
        } else if (appState.activeProjectId) {
            appState.activeProjectId = null;
            appState.activeProjectName = '';
            appState.highlightedChatId = chatId;
            updateHeaderProject();
            updateChatListTitle();
            updateChatListVisibility();
            renderProjectList(appState.cachedProjects);
        }
        showChatView();
        appState.conversationHistory = detail.messages || [];
        clearChatLog();
        if (appState.conversationHistory.length) {
            const welcomeMessage = document.getElementById('chat-welcome');
            if (welcomeMessage) welcomeMessage.style.display = 'none';
            appState.conversationHistory.forEach(message => {
                if (message.role === 'user') {
                    appendUserMessage(message.content);
                } else if (message.role === 'assistant') {
                    addCodeBlockFromContent(message.content, detail.title || '');
                }
            });
        }
        refreshChats();
        if (window.location.pathname === '/chat' || window.location.pathname === '/project') {
            const url = new URL(window.location.href);
            if (window.location.pathname !== '/chat') {
                url.pathname = '/chat';
            }
            url.searchParams.set('chat_id', chatId);
            if (detail.project_id) {
                url.searchParams.set('project_id', detail.project_id);
            } else {
                url.searchParams.delete('project_id');
            }
            window.history.pushState({ view: 'chat', chat_id: chatId }, '', url.toString());
        }
    };

    const closeMenus = () => {
        appState.openMenuId = null;
        appState.openMenuType = null;
        document.querySelectorAll('.sidebar-item-dropdown.open').forEach(el => el.classList.remove('open'));
    };

    function setNextPlaceholder() {
        const placeholderTexts = translations.placeholders[currentLang];
        const newSpan = document.createElement('span');
        newSpan.textContent = placeholderTexts[placeholderIndex];
        placeholderContainer.innerHTML = '';
        placeholderContainer.appendChild(newSpan);
        placeholderIndex = (placeholderIndex + 1) % placeholderTexts.length;
    }

    function startPlaceholderAnimation() {
        if (appState.placeholderInterval) clearInterval(appState.placeholderInterval);
        const placeholderTexts = translations.placeholders[currentLang];
        if (placeholderTexts && placeholderTexts.length > 0) {
            placeholderIndex = 0;
            setNextPlaceholder();
            appState.placeholderInterval = setInterval(setNextPlaceholder, 4000);
        }
    }

    function setLanguage(lang) {
        if (!['zh', 'en'].includes(lang)) return;
        currentLang = lang;
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.dataset.translateKey;
            const translation = translations[key]?.[lang];
            if (!translation) return;
            if (el.hasAttribute('placeholder')) el.placeholder = translation;
            else if (el.hasAttribute('title')) el.title = translation;
            else el.textContent = translation;
        });
        languageSwitcher.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        startPlaceholderAnimation();
        updateHeaderProject();
        updateChatListTitle();
        updateChatListVisibility();
        if (appState.activeProjectId) {
            updateProjectPlaceholder();
            renderProjectChatList(activeProjectChats);
        }
        localStorage.setItem('preferredLanguage', lang);
        if (body.classList.contains('show-chat-view')) {
            refreshSidebarLists();
        }
    }

    let placeholderIndex = 0;

    function init() {
        // 根据URL路径决定显示哪个视图
        const path = window.location.pathname;
        if (path === '/chat' || path === '/project') {
            // 如果是 /chat 或 /project 路由，直接显示聊天视图
            body.classList.remove('show-initial-view');
            body.classList.add('show-chat-view');
            languageSwitcher.style.display = 'none';
            refreshSidebarLists();
            const searchParams = new URLSearchParams(window.location.search);
            const chatId = searchParams.get('chat_id');
            const projectId = searchParams.get('project_id');
            if (chatId) {
                loadChatById(chatId);
                showChatView();
            } else if (projectId) {
                setActiveProject(projectId, '', { updateHistory: false });
            }
        } else {
            // 默认显示初始视图
            body.classList.add('show-initial-view');
            body.classList.remove('show-chat-view');
        }

        initialInput.addEventListener('input', () => {
            placeholderContainer.classList.toggle('hidden', initialInput.value.length > 0);
        });
        initialInput.addEventListener('focus', () => clearInterval(placeholderInterval));
        initialInput.addEventListener('blur', () => {
            if (initialInput.value.length === 0) startPlaceholderAnimation();
        });

        initialForm.addEventListener('submit', handleFormSubmit);
        chatForm.addEventListener('submit', handleFormSubmit);
        projectChatForm?.addEventListener('submit', handleProjectChatSubmit);
        newChatButton.addEventListener('click', async () => {
            if (window.location.pathname !== '/chat') {
                window.location.href = '/chat';
                return;
            }
            appState.activeProjectId = null;
            appState.activeProjectName = '';
            showChatView();
            appState.activeChatId = null;
            appState.highlightedChatId = null;
            appState.conversationHistory = [];
            clearChatLog();
            const newChat = await createChat();
            appState.activeChatId = newChat?.id || null;
            appState.highlightedChatId = appState.activeChatId;
            refreshChats();
            const url = new URL(window.location.href);
            url.searchParams.delete('project_id');
            url.searchParams.delete('chat_id');
            window.history.pushState({ view: 'chat' }, '', url.toString());
        });
        
        // 侧边栏折叠/展开功能
        if (sidebarToggle && chatSidebar) {
            sidebarToggle.addEventListener('click', () => {
                chatSidebar.classList.toggle('collapsed');
            });
        }
        if (chatSearchInput) {
            let searchTimer;
            chatSearchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => refreshChats(query), 200);
            });
        }
        if (chatList) {
            chatList.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                const item = e.target.closest('.sidebar-list-item');
                if (!item?.dataset?.chatId) return;
                const chatId = item.dataset.chatId;

                if (actionBtn) {
                    const action = actionBtn.dataset.action;
                    if (action === 'menu') {
                        e.stopPropagation();
                        if (appState.openMenuType === 'chat' && appState.openMenuId === chatId) {
                            closeMenus();
                            return;
                        }
                        closeMenus();
                        appState.openMenuId = chatId;
                        appState.openMenuType = 'chat';
                        item.querySelector('.sidebar-item-dropdown')?.classList.add('open');
                        return;
                    }
                    if (action === 'share') {
                        e.stopPropagation();
                        shareChat(chatId).then(data => {
                            if (!data?.url) return;
                            if (navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(data.url);
                            }
                        });
                        closeMenus();
                        return;
                    }
                    if (action === 'rename') {
                        e.stopPropagation();
                        const newTitle = prompt(translations.renamePlaceholder[currentLang]);
                        if (newTitle) {
                            renameChat(chatId, newTitle).then(() => refreshChats());
                        }
                        closeMenus();
                        return;
                    }
                    if (action === 'delete') {
                        e.stopPropagation();
                        if (!confirm(translations.confirmDelete[currentLang])) return;
                        deleteChat(chatId).then(success => {
                            if (success) {
                                if (chatId === appState.activeChatId) {
                                    appState.activeChatId = null;
                                    appState.highlightedChatId = null;
                                    appState.conversationHistory = [];
                                    clearChatLog();
                                }
                                item.remove();
                                if (!chatList.children.length) {
                                    renderEmptyState(chatList, 'chatEmpty');
                                }
                                refreshChats();
                            }
                        });
                        closeMenus();
                        return;
                    }
                }

                appState.activeProjectChats = [];
                loadChatById(chatId);
            });
        }
        if (projectList) {
            projectList.addEventListener('click', (e) => {
                const recentItem = e.target.closest('.project-recent-item');
                if (recentItem?.dataset?.chatId) {
                    loadChatById(recentItem.dataset.chatId);
                    return;
                }
                const actionBtn = e.target.closest('[data-action]');
                const item = e.target.closest('.sidebar-list-item');
                if (!item?.dataset?.projectId) return;
                const projectId = item.dataset.projectId;
                const projectName = item.dataset.projectName || '';

                if (actionBtn) {
                    const action = actionBtn.dataset.action;
                    if (action === 'toggle-project') {
                        e.stopPropagation();
                        if (appState.expandedProjectIds.has(projectId)) {
                            appState.expandedProjectIds.delete(projectId);
                        } else {
                            appState.expandedProjectIds.add(projectId);
                        }
                        renderProjectList(appState.cachedProjects);
                        return;
                    }
                    if (action === 'menu') {
                        e.stopPropagation();
                        if (appState.openMenuType === 'project' && appState.openMenuId === projectId) {
                            closeMenus();
                            return;
                        }
                        closeMenus();
                        appState.openMenuId = projectId;
                        appState.openMenuType = 'project';
                        item.querySelector('.sidebar-item-dropdown')?.classList.add('open');
                        return;
                    }
                    if (action === 'share') {
                        e.stopPropagation();
                        shareProject(projectId).then(data => {
                            if (!data?.url) return;
                            if (navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(data.url);
                            }
                        });
                        closeMenus();
                        return;
                    }
                    if (action === 'rename') {
                        e.stopPropagation();
                        const newName = prompt(translations.renameProjectPlaceholder[currentLang]);
                        if (newName) {
                            renameProject(projectId, newName).then((updated) => {
                                if (updated?.name && projectId === appState.activeProjectId) {
                                    appState.activeProjectName = updated.name;
                                    updateHeaderProject();
                                }
                                fetchProjects();
                            });
                        }
                        closeMenus();
                        return;
                    }
                    if (action === 'delete') {
                        e.stopPropagation();
                        if (!confirm(translations.confirmDeleteProject[currentLang])) return;
                            deleteProject(projectId).then(success => {
                            if (success) {
                                if (projectId === appState.activeProjectId) {
                                    appState.activeProjectId = null;
                                    appState.activeProjectName = '';
                                    appState.activeProjectChats = [];
                                    showChatView();
                                }
                                item.remove();
                                fetchProjects();
                            }
                        });
                        closeMenus();
                        return;
                    }
                }

                setActiveProject(projectId, projectName);
                appState.expandedProjectIds.add(projectId);
            });
        }
        if (projectChatList) {
            projectChatList.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                const item = e.target.closest('.project-chat-item');
                if (!item?.dataset?.chatId) return;
                const chatId = item.dataset.chatId;

                if (actionBtn) {
                    const action = actionBtn.dataset.action;
                    if (action === 'menu') {
                        e.stopPropagation();
                        if (appState.openMenuType === 'project-chat' && appState.openMenuId === chatId) {
                            closeMenus();
                            return;
                        }
                        closeMenus();
                        appState.openMenuId = chatId;
                        appState.openMenuType = 'project-chat';
                        item.querySelector('.sidebar-item-dropdown')?.classList.add('open');
                        return;
                    }
                    if (action === 'share') {
                        e.stopPropagation();
                        shareChat(chatId).then(data => {
                            if (!data?.url) return;
                            if (navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(data.url);
                            }
                        });
                        closeMenus();
                        return;
                    }
                    if (action === 'rename') {
                        e.stopPropagation();
                        const newTitle = prompt(translations.renamePlaceholder[currentLang]);
                        if (newTitle) {
                            renameChat(chatId, newTitle).then(() => fetchProjectChats());
                        }
                        closeMenus();
                        return;
                    }
                    if (action === 'delete') {
                        e.stopPropagation();
                        if (!confirm(translations.confirmDelete[currentLang])) return;
                        deleteChat(chatId).then(success => {
                            if (success) {
                                item.remove();
                                fetchProjectChats();
                            }
                        });
                        closeMenus();
                        return;
                    }
                }

                loadChatById(chatId);
            });
        }
        languageSwitcher.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (target) setLanguage(target.dataset.lang);
        });

        function hideModal() {
            featureModal.classList.remove('visible');
        }

        modalCloseButton.addEventListener('click', hideModal);
        featureModal.addEventListener('click', (e) => {
            if (e.target === featureModal) hideModal();
        });

        modalGitHubButton.addEventListener('click', () => {
            window.open('https://github.com/fogsightai/fogsightai', '_blank');
            hideModal();
        });

        const hideProjectModal = () => {
            projectModal?.classList.remove('visible');
        };

        if (projectCreateButton) {
            projectCreateButton.addEventListener('click', () => {
                if (!projectModal) return;
                projectModal.classList.add('visible');
                if (projectNameInput) {
                    projectNameInput.value = '';
                    projectNameInput.focus();
                }
            });
        }

        projectModalClose?.addEventListener('click', hideProjectModal);
        projectModal?.addEventListener('click', (e) => {
            if (e.target === projectModal) hideProjectModal();
        });

        const submitProject = async () => {
            const name = projectNameInput?.value.trim() || '';
            if (!name) {
                projectNameInput?.focus();
                return;
            }
            const created = await createProject(name);
            if (created) {
                hideProjectModal();
                fetchProjects();
                setActiveProject(created.id, created.name);
            }
        };

        projectCreateSubmit?.addEventListener('click', submitProject);
        projectNameInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitProject();
        });

        const savedLang = localStorage.getItem('preferredLanguage');
        const browserLang = navigator.language?.toLowerCase() || ''; // e.g. 'zh-cn'

        let initialLang = 'en'; 
        if (['zh', 'en'].includes(savedLang)) {
            initialLang = savedLang;
        } else if (browserLang.startsWith('zh')) {
            initialLang = 'zh';
        } else if (browserLang.startsWith('en')) {
            initialLang = 'en';
        }

        setLanguage(initialLang);

        // 处理浏览器前进/后退按钮
        window.addEventListener('popstate', (e) => {
            const path = window.location.pathname;
        if (path === '/chat' || path === '/project') {
            body.classList.remove('show-initial-view');
            body.classList.add('show-chat-view');
            languageSwitcher.style.display = 'none';
            refreshSidebarLists();
            const searchParams = new URLSearchParams(window.location.search);
            const chatId = searchParams.get('chat_id');
            const projectId = searchParams.get('project_id');
            if (chatId) {
                loadChatById(chatId);
                showChatView();
            } else if (projectId) {
                setActiveProject(projectId, '', { updateHistory: false });
            } else {
                showChatView();
            }
        } else {
                body.classList.add('show-initial-view');
                body.classList.remove('show-chat-view');
                languageSwitcher.style.display = 'flex';
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-item-dropdown') || e.target.closest('.sidebar-item-menu')) {
                return;
            }
            closeMenus();
        });
    }

    init();
});

function showWarning(message) {
    const box = document.getElementById('warning-box');
    const overlay = document.getElementById('overlay');
    const text = document.getElementById('warning-message');
    text.textContent = message;
    box.style.display = 'flex';
    overlay.style.display = 'block';

    setTimeout(() => {
        hideWarning();
    }, 10000);
}

function hideWarning() {
    document.getElementById('warning-box').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}
