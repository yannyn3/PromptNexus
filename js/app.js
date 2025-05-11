/**
 * PromptNexus App UI 工具类
 * 负责处理UI组件和交互
 */
class AppUI {
    constructor() {
        this.notificationQueue = [];
        this.activeNotifications = 0;
        this.maxNotifications = 3;
    }

    /**
     * 初始化UI组件
     */
    init() {
        // 设置暗色/亮色模式
        this.setThemeMode();
        
        // 添加主题切换事件监听
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            this.setThemeMode();
        });
        
        return this;
    }
    
    /**
     * 设置主题模式（暗色/亮色）
     */
    setThemeMode() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    
    /**
     * 切换视图
     * @param {string} viewId - 要显示的视图ID
     */
    showView(viewId) {
        // 隐藏所有视图
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.add('hidden');
        });
        
        // 移除所有活动标签状态
        document.querySelectorAll('.navlink').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 显示请求的视图
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.remove('hidden');
            
            // 设置对应标签为活动状态
            const tabId = viewId.replace('-view', '-tab');
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.add('active');
            }
        }
    }
    
    /**
     * 显示或隐藏元素
     * @param {string} selector - 元素选择器
     * @param {boolean} show - 是否显示
     */
    toggleElement(selector, show) {
        const element = document.querySelector(selector);
        if (element) {
            if (show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    }
    
    /**
     * 打开模态框
     * @param {string} modalId - 模态框ID
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * 关闭模态框
     * @param {string} modalId - 模态框ID
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            
            // 恢复背景滚动
            document.body.style.overflow = '';
        }
    }
    
    /**
     * 显示提示词表单对话框
     * @param {Object} prompt - 提示词对象（编辑时传入）
     */
    showPromptForm(prompt = null) {
        // 获取表单元素
        const titleInput = document.getElementById('prompt-title');
        const contentTextarea = document.getElementById('prompt-content');
        const categorySelect = document.getElementById('prompt-category');
        const tagsInput = document.getElementById('prompt-tags');
        const noteTextarea = document.getElementById('prompt-note');
        const idInput = document.getElementById('prompt-id');
        const modalTitle = document.getElementById('prompt-modal-title');
        
        // 重置表单
        document.getElementById('prompt-form').reset();
        
        // 填充分类下拉菜单
        this.fillCategorySelect(categorySelect);
        
        // 如果是编辑模式，填充表单数据
        if (prompt) {
            modalTitle.textContent = '编辑提示词';
            titleInput.value = prompt.title || '';
            contentTextarea.value = prompt.content || '';
            categorySelect.value = prompt.category || '';
            tagsInput.value = Array.isArray(prompt.tags) ? prompt.tags.join(', ') : '';
            noteTextarea.value = prompt.note || '';
            idInput.value = prompt.id;
        } else {
            modalTitle.textContent = '添加新提示词';
            idInput.value = '';
        }
        
        // 显示对话框
        this.openModal('prompt-modal');
        
        // 聚焦到标题输入框
        titleInput.focus();
    }
    
    /**
     * 填充分类下拉菜单
     * @param {HTMLElement} selectElement - 下拉菜单元素
     */
    fillCategorySelect(selectElement) {
        // 清除现有选项（除了第一个）
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        // 添加分类选项
        const categories = storage.getCategories();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selectElement.appendChild(option);
        });
    }
    
    /**
     * 显示确认对话框
     * @param {string} title - 对话框标题
     * @param {string} message - 消息内容
     * @param {Function} onConfirm - 确认回调函数
     */
    showConfirmDialog(title, message, onConfirm) {
        const titleElement = document.getElementById('confirm-title');
        const messageElement = document.getElementById('confirm-message');
        const confirmButton = document.getElementById('confirm-action-btn');
        
        // 设置标题和消息
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // 设置确认按钮事件
        const oldClickHandler = confirmButton.onclick;
        confirmButton.onclick = () => {
            this.closeModal('confirm-modal');
            onConfirm();
            // 移除事件处理程序
            confirmButton.onclick = oldClickHandler;
        };
        
        // 显示对话框
        this.openModal('confirm-modal');
    }
    
    /**
     * 显示通知
     * @param {string} title - 通知标题
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型（success, error, warning, info）
     */
    showNotification(title, message, type = 'info') {
        // 将通知添加到队列
        this.notificationQueue.push({ title, message, type });
        
        // 尝试显示通知
        this.processNotificationQueue();
    }
    
    /**
     * 处理通知队列
     */
    processNotificationQueue() {
        // 如果达到最大通知数或队列为空，返回
        if (this.activeNotifications >= this.maxNotifications || this.notificationQueue.length === 0) {
            return;
        }
        
        // 获取下一个通知
        const notification = this.notificationQueue.shift();
        this.activeNotifications++;
        
        // 克隆通知模板
        const template = document.getElementById('notification-template');
        const notificationElement = template.cloneNode(true);
        notificationElement.id = 'notification-' + Date.now();
        notificationElement.classList.remove('hidden');
        
        // 设置通知内容
        const titleElement = notificationElement.querySelector('.notification-title');
        const messageElement = notificationElement.querySelector('.notification-message');
        const iconElement = notificationElement.querySelector('.notification-icon');
        
        titleElement.textContent = notification.title;
        messageElement.textContent = notification.message;
        
        // 设置图标和样式
        switch (notification.type) {
            case 'success':
                notificationElement.classList.add('notification-success');
                iconElement.innerHTML = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                notificationElement.classList.add('notification-error');
                iconElement.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                notificationElement.classList.add('notification-warning');
                iconElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                notificationElement.classList.add('notification-info');
                iconElement.innerHTML = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        // 添加关闭按钮事件
        const closeButton = notificationElement.querySelector('.close');
        closeButton.addEventListener('click', () => {
            this.closeNotification(notificationElement);
        });
        
        // 添加到文档中
        document.body.appendChild(notificationElement);
        
        // 渐入动画
        setTimeout(() => {
            notificationElement.classList.add('notification-visible');
        }, 10);
        
        // 5秒后自动关闭
        setTimeout(() => {
            this.closeNotification(notificationElement);
        }, 5000);
    }
    
    /**
     * 关闭通知
     * @param {HTMLElement} notificationElement - 通知元素
     */
    closeNotification(notificationElement) {
        // 添加渐出动画
        notificationElement.classList.remove('notification-visible');
        
        // 完成动画后移除元素
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.parentNode.removeChild(notificationElement);
                this.activeNotifications--;
                
                // 处理队列中的下一个通知
                this.processNotificationQueue();
            }
        }, 300);
    }
    
    /**
     * 获取表单数据
     * @param {string} formId - 表单ID
     * @returns {Object} 表单数据对象
     */
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = {};
        const elements = form.elements;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.name && element.value) {
                formData[element.name] = element.value;
            }
        }
        
        return formData;
    }
    
    /**
     * 读取文件内容
     * @param {File} file - 文件对象
     * @returns {Promise<string>} 文件内容
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * 渲染提示词卡片
     * @param {Object} prompt - 提示词对象
     * @returns {HTMLElement} 提示词卡片元素
     */
    renderPromptCard(prompt) {
        // 创建卡片容器
        const card = document.createElement('div');
        card.className = 'glass-card prompt-card card-3d';
        card.dataset.id = prompt.id;
        
        // 卡片头部
        const header = document.createElement('div');
        header.className = 'p-4 border-b border-gray-200 dark:border-gray-700';
        
        const titleRow = document.createElement('div');
        titleRow.className = 'flex justify-between items-start';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-bold mb-1 prompt-title';
        title.textContent = prompt.title;
        
        const actionsMenu = document.createElement('div');
        actionsMenu.className = 'dropdown relative';
        
        const menuButton = document.createElement('button');
        menuButton.className = 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';
        menuButton.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        
        const menuContent = document.createElement('div');
        menuContent.className = 'dropdown-content hidden absolute right-0 mt-2 py-2 w-48 glass glass-light dark:glass-dark rounded-xl shadow-xl z-10';
        
        // 菜单项
        const menuItems = [
            { icon: 'fa-copy', text: '复制', action: 'copy' },
            { icon: 'fa-edit', text: '编辑', action: 'edit' },
            { icon: 'fa-trash-alt', text: '删除', action: 'delete' }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('a');
            menuItem.className = 'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
            menuItem.dataset.action = item.action;
            menuItem.innerHTML = `<i class="fas ${item.icon} mr-2"></i>${item.text}`;
            menuContent.appendChild(menuItem);
        });
        
        // 展开/收起下拉菜单
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menuContent.classList.toggle('hidden');
            
            // 点击其他地方关闭菜单
            const closeOnClick = () => {
                menuContent.classList.add('hidden');
                document.removeEventListener('click', closeOnClick);
            };
            
            document.addEventListener('click', closeOnClick);
        });
        
        actionsMenu.appendChild(menuButton);
        actionsMenu.appendChild(menuContent);
        
        titleRow.appendChild(title);
        titleRow.appendChild(actionsMenu);
        
        // 分类和标签
        const meta = document.createElement('div');
        meta.className = 'flex flex-wrap items-center text-sm';
        
        if (prompt.category) {
            const category = document.createElement('span');
            category.className = 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-full mr-2 mb-1';
            category.innerHTML = `<i class="fas fa-folder mr-1"></i>${prompt.category}`;
            meta.appendChild(category);
        }
        
        if (prompt.tags && prompt.tags.length > 0) {
            prompt.tags.forEach(tag => {
                if (tag && tag.trim() !== '') {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2 py-1 rounded-full mr-2 mb-1';
                    tagElement.innerHTML = `<i class="fas fa-tag mr-1"></i>${tag.trim()}`;
                    meta.appendChild(tagElement);
                }
            });
        }
        
        header.appendChild(titleRow);
        header.appendChild(meta);
        
        // 卡片内容
        const content = document.createElement('div');
        content.className = 'p-4';
        
        const promptContent = document.createElement('div');
        promptContent.className = 'text-sm mb-4 prompt-content line-clamp-3';
        promptContent.textContent = prompt.content;
        
        // 卡片底部
        const footer = document.createElement('div');
        footer.className = 'flex justify-between items-center text-xs text-gray-500 dark:text-gray-400';
        
        const usage = document.createElement('div');
        usage.innerHTML = `<i class="fas fa-clipboard-check mr-1"></i>使用: ${prompt.usageCount || 0}`;
        
        const lastUpdated = document.createElement('div');
        const date = prompt.lastModified ? new Date(prompt.lastModified) : new Date();
        lastUpdated.innerHTML = `<i class="fas fa-clock mr-1"></i>${this.formatDate(date)}`;
        
        footer.appendChild(usage);
        footer.appendChild(lastUpdated);
        
        content.appendChild(promptContent);
        content.appendChild(footer);
        
        // 使用按钮
        const useButton = document.createElement('button');
        useButton.className = 'w-full mt-2 py-2 text-center bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors duration-300';
        useButton.innerHTML = '<i class="fas fa-magic mr-2"></i>使用提示词';
        useButton.dataset.action = 'use';
        
        content.appendChild(useButton);
        
        // 将所有部分添加到卡片
        card.appendChild(header);
        card.appendChild(content);
        
        return card;
    }
    
    /**
     * 格式化日期
     * @param {Date} date - 日期对象
     * @returns {string} 格式化的日期字符串
     */
    formatDate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
        }
    }
    
    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {boolean} 是否成功复制
     */
    copyToClipboard(text) {
        try {
            navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            
            // 备用方法
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch (err) {
                console.error('备用复制方法失败:', err);
                document.body.removeChild(textarea);
                return false;
            }
        }
    }
}

// 导出实例
const appUI = new AppUI();

// 主应用逻辑
document.addEventListener('DOMContentLoaded', () => {
    // 检查深色模式偏好
    function updateTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    
    updateTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);

    // 通知系统
    window.showNotification = function(type, title, message, duration = 5000) {
        const template = document.getElementById('notification-template');
        const notification = template.cloneNode(true);
        notification.id = 'notification-' + Date.now();
        notification.classList.remove('hidden');
        
        const titleEl = notification.querySelector('.notification-title');
        const messageEl = notification.querySelector('.notification-message');
        const iconEl = notification.querySelector('.notification-icon');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        if (type === 'success') {
            iconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
            iconEl.className = iconEl.className + ' text-green-500';
        } else if (type === 'error') {
            iconEl.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            iconEl.className = iconEl.className + ' text-red-500';
        } else if (type === 'info') {
            iconEl.innerHTML = '<i class="fas fa-info-circle"></i>';
            iconEl.className = iconEl.className + ' text-blue-500';
        } else if (type === 'warning') {
            iconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            iconEl.className = iconEl.className + ' text-yellow-500';
        }
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        
        notification.querySelector('.close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        });
        
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, duration);
        }
        
        return notification;
    };

    // 检查是否在Vercel环境中运行
    const isVercelEnv = window.location.hostname.includes('vercel.app') || 
                        window.location.hostname.includes('.now.sh');

    // 更新环境显示
    if (isVercelEnv) {
        if (document.getElementById('environment-type')) {
            document.getElementById('environment-type').textContent = 'Vercel';
        }
        
        // 显示Vercel特定的UI元素并隐藏GitHub令牌输入
        if (document.getElementById('vercel-env-settings') && document.getElementById('github-settings-container')) {
            document.getElementById('vercel-env-settings').classList.remove('hidden');
            document.getElementById('github-settings-container').classList.add('hidden');
        }
        
        // 隐藏部署和同步信息
        const deploySyncSections = document.querySelectorAll('.deploy-sync-section');
        deploySyncSections.forEach(section => {
            section.style.display = 'none';
        });
    } else {
        // 显示Poe Canvas用户的部署按钮
        if (document.getElementById('deploy-button')) {
            document.getElementById('deploy-button').classList.remove('hidden');
        }
    }

    // 部署指南展开/折叠功能
    const deployToggle = document.querySelector('.deploy-toggle');
    const deployGuide = document.querySelector('.deploy-guide');
    
    if (deployToggle && deployGuide) {
        deployToggle.addEventListener('click', () => {
            deployGuide.classList.toggle('show');
            const isExpanded = deployGuide.classList.contains('show');
            deployToggle.querySelector('span').textContent = isExpanded ? '隐藏部署指南' : '查看部署指南';
            deployToggle.querySelector('i').className = isExpanded ? 'fas fa-chevron-up ml-2' : 'fas fa-chevron-down ml-2';
        });
    }

    // 搜索功能
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const promptCards = document.querySelectorAll('.prompt-item');
            
            promptCards.forEach(card => {
                const title = card.querySelector('.prompt-title').textContent.toLowerCase();
                const content = card.querySelector('.prompt-content').textContent.toLowerCase();
                const tags = card.querySelector('.prompt-tags') ? 
                    card.querySelector('.prompt-tags').textContent.toLowerCase() : '';
                const notes = card.querySelector('.prompt-note') ? 
                    card.querySelector('.prompt-note').textContent.toLowerCase() : '';
                
                if (title.includes(searchTerm) || content.includes(searchTerm) || 
                    tags.includes(searchTerm) || notes.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
            
            // 显示/隐藏"无结果"消息
            const noResults = document.getElementById('no-search-results');
            if (noResults) {
                const hasVisibleCards = Array.from(promptCards).some(card => card.style.display !== 'none');
                noResults.style.display = hasVisibleCards ? 'none' : 'block';
            }
        });
    }

    // 为统计卡和图表添加点击链接功能
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            // 切换到提示词列表
            navigateToPrompts();
        });
    });

    // 为分类图表添加点击事件
    if (window.categoriesChartInstance) {
        const canvas = document.getElementById('categories-chart');
        canvas.addEventListener('click', function(evt) {
            const points = window.categoriesChartInstance.getElementsAtEventForMode(
                evt, 'nearest', { intersect: true }, false
            );
            
            if (points.length) {
                const clickedIndex = points[0].index;
                const category = window.categoriesChartInstance.data.labels[clickedIndex];
                
                // 切换到提示词列表并过滤此分类
                navigateToPrompts(category);
            }
        });
    }

    // 导航函数
    function navigateToPrompts(category = null) {
        // 切换到提示词标签
        const promptsTab = document.getElementById('prompts-tab');
        if (promptsTab) {
            promptsTab.click();
            
            // 如果指定了分类，则设置过滤器
            if (category && category !== '未分类' && category !== '无数据') {
                const categoryFilter = document.getElementById('category-filter');
                if (categoryFilter) {
                    // 查找匹配的分类选项
                    for (let i = 0; i < categoryFilter.options.length; i++) {
                        if (categoryFilter.options[i].text === category) {
                            categoryFilter.selectedIndex = i;
                            // 触发change事件以应用过滤器
                            categoryFilter.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            }
        }
    }

    // 为使用量图表添加点击事件
    if (window.usageChartInstance) {
        const canvas = document.getElementById('usage-chart');
        canvas.addEventListener('click', function() {
            // 切换到提示词列表
            navigateToPrompts();
        });
    }
    
    // 添加备注功能到提示词表单
    const promptForm = document.getElementById('prompt-form');
    if (promptForm) {
        // 检查是否已经有备注字段，如果没有则添加
        if (!document.getElementById('prompt-note')) {
            // 在内容字段之后添加备注字段
            const contentField = promptForm.querySelector('.mb-6');
            if (contentField) {
                const noteField = document.createElement('div');
                noteField.className = 'mb-6';
                noteField.innerHTML = `
                    <label class="block text-sm font-medium mb-2">备注 (可选)</label>
                    <div class="relative">
                        <textarea id="prompt-note" rows="2" class="glass glass-light dark:glass-dark rounded-xl px-4 py-2 pl-10 outline-none w-full text-base" placeholder="添加关于此提示词的备注..."></textarea>
                        <div class="absolute left-3 top-4 text-gray-400">
                            <i class="fas fa-sticky-note"></i>
                        </div>
                    </div>
                `;
                contentField.insertAdjacentElement('afterend', noteField);
            }
        }
        
        // 修改提示词保存逻辑以包含备注
        const originalSubmitHandler = promptForm.onsubmit;
        promptForm.onsubmit = function(e) {
            e.preventDefault();
            
            // 获取表单数据
            const id = document.getElementById('prompt-id').value || `prompt_${Date.now()}`;
            const title = document.getElementById('prompt-title').value.trim();
            const category = document.getElementById('prompt-category').value;
            const content = document.getElementById('prompt-content').value.trim();
            const tagsStr = document.getElementById('prompt-tags').value;
            const note = document.getElementById('prompt-note') ? document.getElementById('prompt-note').value.trim() : '';
            
            // 验证必填字段
            if (!title || !content) {
                window.showNotification('error', '表单不完整', '请填写标题和内容字段');
                return;
            }
            
            // 处理标签
            const tags = tagsStr.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            
            // 创建或更新提示词
            const prompt = {
                id,
                title,
                content,
                tags,
                category,
                note,  // 添加备注字段
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            
            // 如果是编辑现有提示词，确保保留创建日期
            if (app && app.storage) {
                if (id.startsWith('prompt_')) {
                    // 新提示词
                    app.storage.savePrompt(prompt)
                        .then(() => {
                            window.showNotification('success', '提示词已保存', `"${title}" 已成功保存`);
                            app.closePromptModal();
                            app.loadPrompts();
                            app.updateDashboard();
                        })
                        .catch(error => {
                            console.error('Error saving prompt:', error);
                            window.showNotification('error', '保存提示词失败', error.message);
                        });
                } else {
                    // 获取现有提示词以保留创建日期
                    app.storage.getPromptById(id)
                        .then(existingPrompt => {
                            prompt.created = existingPrompt.created;
                            return app.storage.savePrompt(prompt);
                        })
                        .then(() => {
                            window.showNotification('success', '提示词已更新', `"${title}" 已成功更新`);
                            app.closePromptModal();
                            app.loadPrompts();
                            app.updateDashboard();
                        })
                        .catch(error => {
                            console.error('Error updating prompt:', error);
                            window.showNotification('error', '更新提示词失败', error.message);
                        });
                }
            }
        };
    }

    // 添加访问控制功能 - 防止未授权修改
    let isAuthorized = false;
    
    // 获取授权状态
    const authToken = localStorage.getItem('promptnexus_auth_token');
    if (authToken) {
        isAuthorized = true;
    }
    
    // 仅管理员可编辑模式
    const setupAccessControl = () => {
        // 如果部署在Vercel/GitHub上并且没有授权
        if ((isVercelEnv || window.location.hostname !== 'localhost') && !isAuthorized) {
            // 隐藏编辑按钮，但保留查看和复制
            const editButtons = document.querySelectorAll('.prompt-edit-btn');
            const deleteButtons = document.querySelectorAll('.prompt-delete-btn');
            const addPromptBtn = document.getElementById('add-prompt-btn');
            const addCategoryBtn = document.getElementById('add-category-btn');
            const categoryDeleteBtns = document.querySelectorAll('.category-delete-btn');
            
            // 隐藏编辑和删除按钮
            editButtons.forEach(btn => btn.style.display = 'none');
            deleteButtons.forEach(btn => btn.style.display = 'none');
            categoryDeleteBtns.forEach(btn => btn.style.display = 'none');
            
            // 隐藏添加按钮
            if (addPromptBtn) addPromptBtn.style.display = 'none';
            if (addCategoryBtn) addCategoryBtn.style.display = 'none';
            
            // 添加登录按钮
            const header = document.querySelector('header');
            if (header && !document.getElementById('login-btn')) {
                const loginBtn = document.createElement('button');
                loginBtn.id = 'login-btn';
                loginBtn.className = 'btn-primary rounded-xl px-4 py-2 flex items-center';
                loginBtn.innerHTML = '<i class="fas fa-lock mr-2"></i> 管理员登录';
                
                loginBtn.addEventListener('click', () => {
                    // 简单的密码验证对话框
                    const password = prompt('请输入管理员密码:');
                    if (password) {
                        // 这里应该使用更安全的方法，但为简单起见，我们使用一个简单的哈希比较
                        // 在实际应用中，应该使用适当的加密和服务器端验证
                        const hashedPassword = btoa(password); // 简单的base64编码
                        
                        // 从本地存储获取密码哈希，如果没有则创建一个
                        let storedHash = localStorage.getItem('promptnexus_admin_hash');
                        if (!storedHash) {
                            // 第一次访问时，设置密码
                            localStorage.setItem('promptnexus_admin_hash', hashedPassword);
                            storedHash = hashedPassword;
                            
                            // 创建并保存授权令牌
                            const authToken = 'token_' + Date.now();
                            localStorage.setItem('promptnexus_auth_token', authToken);
                            
                            window.showNotification('success', '已设置管理员密码', '您现在可以编辑提示词');
                            setTimeout(() => window.location.reload(), 1500);
                        } else if (storedHash === hashedPassword) {
                            // 密码匹配
                            const authToken = 'token_' + Date.now();
                            localStorage.setItem('promptnexus_auth_token', authToken);
                            
                            window.showNotification('success', '登录成功', '您现在可以编辑提示词');
                            setTimeout(() => window.location.reload(), 1500);
                        } else {
                            window.showNotification('error', '密码错误', '请输入正确的管理员密码');
                        }
                    }
                });
                
                header.appendChild(loginBtn);
            }
        }
    };
    
    // 设置访问控制
    setupAccessControl();
    
    // 在应用加载提示词后再次设置访问控制
    document.addEventListener('promptsLoaded', setupAccessControl);
});

// 全局变量，用于动画计数更新
function animateCountUpdate(element, targetValue) {
    if (!element) return;
    
    const duration = 1500; // 毫秒
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function updateCount(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用easeOutQuad以获得更平滑的动画效果
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateCount);
        }
    }
    
    requestAnimationFrame(updateCount);
} 