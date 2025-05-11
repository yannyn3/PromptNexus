// 初始化应用程序
document.addEventListener('DOMContentLoaded', () => {
    // 创建应用程序实例
    window.app = {
        storage: new StorageManager(),
        currentView: 'dashboard',
        
        // 初始化
        async init() {
            // 加载存储配置
            await this.loadStorageConfig();
            
            // 获取管理员密码配置
            await this.checkAdminPassword();
            
            // 获取提示词数据
            await this.loadData();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 渲染UI
            this.renderUI();
            
            // 启动自动同步
            this.storage.setupAutoSync();
            
            // 更新同步状态
            const lastSyncTime = localStorage.getItem('lastSyncTime');
            this.updateSyncStatus(lastSyncTime);
            
            console.log('PromptNexus初始化完成.');
        },
        
        // 初始化DOM元素引用
        initElements() {
            // 视图和标签
            this.dashboardTab = document.getElementById('dashboard-tab');
            this.promptsTab = document.getElementById('prompts-tab');
            this.settingsTab = document.getElementById('settings-tab');
            
            this.dashboardView = document.getElementById('dashboard-view');
            this.promptsView = document.getElementById('prompts-view');
            this.settingsView = document.getElementById('settings-view');
            
            // 提示词表单和模态框
            this.promptModal = document.getElementById('prompt-modal');
            this.promptForm = document.getElementById('prompt-form');
            this.promptIdInput = document.getElementById('prompt-id');
            this.promptTitleInput = document.getElementById('prompt-title');
            this.promptCategoryInput = document.getElementById('prompt-category');
            this.promptTagsInput = document.getElementById('prompt-tags');
            this.promptContentInput = document.getElementById('prompt-content');
            this.promptNoteInput = document.getElementById('prompt-note');
            this.modalTitle = document.getElementById('prompt-modal-title');
            
            // 确认模态框
            this.confirmModal = document.getElementById('confirm-modal');
            this.confirmTitle = document.getElementById('confirm-title');
            this.confirmMessage = document.getElementById('confirm-message');
            this.confirmActionBtn = document.getElementById('confirm-action-btn');
            
            // 其他元素
            this.promptsContainer = document.getElementById('prompts-container');
            this.noPrompts = document.getElementById('no-prompts');
            this.noSearchResults = document.getElementById('no-search-results');
            
            this.categoryFilter = document.getElementById('category-filter');
            this.sortOrder = document.getElementById('sort-order');
            this.searchInput = document.getElementById('search-input');
            
            this.totalPromptsCount = document.getElementById('total-prompts-count');
            this.totalCategoriesCount = document.getElementById('total-categories-count');
            this.totalUsageCount = document.getElementById('total-usage-count');
            
            this.categoriesChart = document.getElementById('categories-chart');
            this.usageChart = document.getElementById('usage-chart');
            this.recentPromptsList = document.getElementById('recent-prompts-list');
            
            // 密码验证模态框
            this.passwordModal = document.getElementById('password-modal');
            this.passwordForm = document.getElementById('password-form');
            this.passwordInput = document.getElementById('admin-password');
            
            // 安全设置
            this.requirePasswordCheckbox = document.getElementById('require-password');
            this.adminPasswordSetting = document.getElementById('admin-password-setting');
        },
        
        // 初始化事件监听器
        initEventListeners() {
            // 导航标签
            this.dashboardTab.addEventListener('click', () => this.changeView('dashboard'));
            this.promptsTab.addEventListener('click', () => this.changeView('prompts'));
            this.settingsTab.addEventListener('click', () => this.changeView('settings'));
            
            // 添加提示词
            document.getElementById('add-prompt-btn').addEventListener('click', () => this.openNewPromptForm());
            document.getElementById('add-first-prompt-btn')?.addEventListener('click', () => this.openNewPromptForm());
            
            // 顶部添加提示词按钮
            document.getElementById('header-add-prompt-btn')?.addEventListener('click', () => {
                this.openNewPromptForm();
                // 如果当前不在提示词视图，则切换到提示词视图
                if (this.currentView !== 'prompts') {
                    this.changeView('prompts');
                }
            });
            
            // 全局搜索
            const globalSearchInput = document.getElementById('global-search-input');
            if (globalSearchInput) {
                globalSearchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.trim();
                    
                    // 如果有搜索词，切换到提示词视图并设置搜索框值
                    if (searchTerm.length > 0) {
                        // 如果当前不在提示词视图，则切换
                        if (this.currentView !== 'prompts') {
                            this.changeView('prompts');
                        }
                        
                        // 设置提示词视图的搜索框
                        const promptSearchInput = document.getElementById('search-input');
                        if (promptSearchInput) {
                            promptSearchInput.value = searchTerm;
                            // 触发搜索事件
                            promptSearchInput.dispatchEvent(new Event('input'));
                        }
                    }
                });
            }
            
            // 表单操作
            document.getElementById('cancel-prompt-btn').addEventListener('click', () => this.closePromptModal());
            this.promptForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePrompt();
            });
            
            // 确认框
            document.getElementById('cancel-confirm-btn').addEventListener('click', () => this.closeConfirmModal());
            
            // 筛选和排序
            this.categoryFilter.addEventListener('change', () => this.filterPrompts());
            this.sortOrder.addEventListener('change', () => this.filterPrompts());
            
            // 搜索
            this.searchInput.addEventListener('input', () => this.searchPrompts());
            
            // 视图切换
            document.getElementById('view-toggle').addEventListener('click', () => this.toggleView());
            
            // 分类管理
            document.getElementById('add-category-btn').addEventListener('click', () => this.addCategory());
            
            // 数据管理
            document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
            document.getElementById('import-data').addEventListener('change', (e) => this.importData(e));
            
            // GitHub同步
            document.getElementById('save-github-settings')?.addEventListener('click', () => {
                this.saveGitHubSettings();
                // 定期自动同步设置，每10分钟同步一次
                this.setupAutoSync();
            });
            
            // 密码验证表单
            document.getElementById('cancel-password-btn').addEventListener('click', () => this.closePasswordModal());
            this.passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.verifyPassword();
            });
            
            // 安全设置
            document.getElementById('save-security-settings').addEventListener('click', () => this.saveSecuritySettings());
            
            // 加载安全设置
            this.loadSecuritySettings();

            // 同步按钮点击事件
            document.getElementById('sync-now').addEventListener('click', () => {
                this.triggerSync();
            });
        },
        
        // 加载数据
        async loadData() {
            try {
                await this.loadCategories();
                await this.loadPrompts();
                await this.updateDashboard();
                await this.loadGitHubSettings();
                
                // 初始化自动同步
                this.setupAutoSync();
                
                // 触发提示词加载完成事件
                document.dispatchEvent(new Event('promptsLoaded'));
            } catch (error) {
                console.error('加载数据失败:', error);
                window.showNotification('error', '加载数据失败', error.message);
            }
        },
        
        // 切换视图
        changeView(view) {
            this.currentView = view;
            
            // 更新标签状态
            [this.dashboardTab, this.promptsTab, this.settingsTab].forEach(tab => tab.classList.remove('active'));
            [this.dashboardView, this.promptsView, this.settingsView].forEach(view => view.classList.add('hidden'));
            
            // 切换添加提示词按钮的可见性
            const addPromptBtn = document.getElementById('add-prompt-btn');
            if (addPromptBtn) {
                if (view === 'prompts') {
                    addPromptBtn.classList.remove('hidden');
                } else {
                    addPromptBtn.classList.add('hidden');
                }
            }
            
            if (view === 'dashboard') {
                this.dashboardTab.classList.add('active');
                this.dashboardView.classList.remove('hidden');
                this.updateDashboard();
            } else if (view === 'prompts') {
                this.promptsTab.classList.add('active');
                this.promptsView.classList.remove('hidden');
                this.loadPrompts();
            } else if (view === 'settings') {
                this.settingsTab.classList.add('active');
                this.settingsView.classList.remove('hidden');
            }
        },
        
        // 打开/关闭提示词模态框
        openPromptModal() {
            this.promptModal.classList.remove('hidden');
        },
        
        closePromptModal() {
            this.promptModal.classList.add('hidden');
            this.promptForm.reset();
            this.promptIdInput.value = '';
        },
        
        // 打开/关闭确认模态框
        openConfirmModal() {
            this.confirmModal.classList.remove('hidden');
        },
        
        closeConfirmModal() {
            this.confirmModal.classList.add('hidden');
            this.confirmCallback = null;
        },
        
        // 打开新建提示词表单
        async openNewPromptForm() {
            // 检查是否需要密码验证
            const requirePassword = await this.storage.isPasswordRequiredForAdd();
            if (requirePassword) {
                // 打开密码验证模态框
                this.openPasswordModal(() => {
                    // 密码验证成功后的回调
                    this._openPromptForm();
                });
            } else {
                // 不需要密码验证，直接打开表单
                this._openPromptForm();
            }
        },
        
        // 内部方法：打开提示词表单
        _openPromptForm() {
            this.promptIdInput.value = '';
            this.promptTitleInput.value = '';
            this.promptCategoryInput.value = '';
            this.promptTagsInput.value = '';
            this.promptContentInput.value = '';
            if (this.promptNoteInput) this.promptNoteInput.value = '';
            
            this.modalTitle.textContent = '添加新提示词';
            this.openPromptModal();
        },
        
        savePrompt: async function() {
            const id = this.promptIdInput.value;
            const title = this.promptTitleInput.value.trim();
            const content = this.promptContentInput.value.trim();
            const category = this.promptCategoryInput.value;
            const tagsString = this.promptTagsInput.value.trim();
            const note = this.promptNoteInput ? this.promptNoteInput.value.trim() : '';

            if (!title || !content) {
                window.showNotification('error', '表单不完整', '请填写标题和内容字段。');
                return;
            }

            const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

            const promptData = {
                title,
                content,
                category,
                tags,
                note
            };

            if (id) {
                promptData.id = id;
            }

            // this.storage.savePrompt will handle generating ID for new prompts
            // and setting/updating createdAt, lastModified, usageCount, lastUsed
            const success = this.storage.savePrompt(promptData);

            if (success) {
                const message = id ? `"${title}" 已成功更新。` : `"${title}" 已成功保存。`;
                window.showNotification('success', '操作成功', message);
                this.closePromptModal();
                await this.loadPrompts();
                await this.updateDashboard();
                
                // 同步数据
                this.triggerSync();
            } else {
                window.showNotification('error', '保存失败', '保存提示词时出错。');
            }
        },
        
        // 加载分类
        async loadCategories() {
            try {
                const categories = await this.storage.getCategories();
                
                // 更新分类筛选器
                this.categoryFilter.innerHTML = '<option value="">全部</option>';
                
                // 更新提示词表单的分类选择器
                this.promptCategoryInput.innerHTML = '<option value="">无分类</option>';
                
                // 更新分类列表
                const categoriesList = document.getElementById('categories-list');
                if (categoriesList) categoriesList.innerHTML = '';
                
                if (categories.length > 0) {
                    document.getElementById('no-categories')?.classList.add('hidden');
                    
                    // 排序分类
                    categories.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
                    
                    categories.forEach(category => {
                        // 添加到筛选器
                        this.categoryFilter.innerHTML += `<option value="${category.id}">${category.name}</option>`;
                        
                        // 添加到表单选择器
                        this.promptCategoryInput.innerHTML += `<option value="${category.id}">${category.name}</option>`;
                        
                        // 添加到分类列表
                        if (categoriesList) {
                            const categoryItem = document.createElement('div');
                            categoryItem.className = 'flex justify-between items-center glass glass-light dark:glass-dark rounded-xl px-4 py-2';
                            categoryItem.innerHTML = `
                                <span>${category.name}</span>
                                <button class="text-red-500 hover:text-red-700 transition-colors category-delete-btn">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `;
                            
                            // 添加删除事件
                            categoryItem.querySelector('.category-delete-btn').addEventListener('click', () => {
                                this.confirmDeleteCategory(category.id, category.name);
                            });
                            
                            categoriesList.appendChild(categoryItem);
                        }
                    });
                } else if (document.getElementById('no-categories')) {
                    document.getElementById('no-categories').classList.remove('hidden');
                }
                
                return categories;
            } catch (error) {
                console.error('加载分类失败:', error);
                window.showNotification('error', '加载分类失败', error.message);
                return [];
            }
        },
        
        // 加载提示词
        async loadPrompts() {
            try {
                const prompts = await this.storage.getPrompts();
                this.promptsContainer.innerHTML = '';
                
                if (prompts.length === 0) {
                    this.noPrompts.classList.remove('hidden');
                    return [];
                }
                
                this.noPrompts.classList.add('hidden');
                
                // 筛选和排序
                let filteredPrompts = this.filterAndSortPrompts(prompts);
                
                // 渲染提示词
                this.renderPrompts(filteredPrompts);
                
                return filteredPrompts;
            } catch (error) {
                console.error('加载提示词失败:', error);
                window.showNotification('error', '加载提示词失败', error.message);
                return [];
            }
        },
        
        // 筛选和排序提示词
        filterAndSortPrompts(prompts) {
            const categoryId = this.categoryFilter.value;
            const sortBy = this.sortOrder.value;
            const searchTerm = this.searchInput.value.toLowerCase().trim();
            
            // 筛选
            let filteredPrompts = prompts;
            
            if (categoryId) {
                filteredPrompts = filteredPrompts.filter(p => p.category === categoryId);
            }
            
            if (searchTerm) {
                filteredPrompts = filteredPrompts.filter(p => {
                    return p.title.toLowerCase().includes(searchTerm) || 
                           p.content.toLowerCase().includes(searchTerm) || 
                           (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
                           (p.note && p.note.toLowerCase().includes(searchTerm));
                });
            }
            
            // 显示/隐藏"无结果"提示
            if (filteredPrompts.length === 0 && searchTerm) {
                this.noSearchResults.classList.remove('hidden');
            } else {
                this.noSearchResults.classList.add('hidden');
            }
            
            // 排序
            filteredPrompts.sort((a, b) => {
                if (sortBy === 'title') {
                    return a.title.localeCompare(b.title, 'zh-CN');
                } else if (sortBy === 'lastModified') {
                    return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
                } else if (sortBy === 'lastUsed') {
                    return new Date(b.lastUsed || 0) - new Date(a.lastUsed || 0);
                } else if (sortBy === 'usageCount') {
                    return (b.usageCount || 0) - (a.usageCount || 0);
                }
                return 0;
            });
            
            return filteredPrompts;
        },
        
        // 渲染提示词列表
        renderPrompts(prompts) {
            this.promptsContainer.innerHTML = '';
            
            prompts.forEach((prompt, index) => {
                const promptEl = document.createElement('div');
                promptEl.className = 'prompt-item glass-card p-5 cursor-pointer prompt-card hover-3d';
                // 添加交错的悬浮动画
                if (index % 3 === 0) {
                    promptEl.classList.add('float-animation');
                }
                promptEl.setAttribute('data-id', prompt.id);
                
                // 获取分类名称
                let categoryName = '无分类';
                if (prompt.category) {
                    const categoryOption = this.promptCategoryInput.querySelector(`option[value="${prompt.category}"]`);
                    if (categoryOption) categoryName = categoryOption.textContent;
                }
                
                // 格式化标签
                const tagsHtml = prompt.tags && prompt.tags.length > 0
                    ? prompt.tags.map(tag => `<span class="prompt-tag">${tag}</span>`).join('')
                    : '';
                
                // 格式化最后使用时间
                const lastUsed = prompt.lastUsed
                    ? new Date(prompt.lastUsed).toLocaleDateString('zh-CN')
                    : '从未使用';
                
                // 格式化使用次数
                const usageCount = prompt.usageCount || 0;
                
                // 是否有备注
                const noteHtml = prompt.note
                    ? `<div class="prompt-note"><i class="fas fa-sticky-note mr-2"></i>${prompt.note}</div>`
                    : '';
                
                promptEl.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="prompt-title">${prompt.title}</h3>
                        <div class="flex space-x-2">
                            <button class="prompt-btn prompt-use-btn" title="使用提示词">
                                <i class="fas fa-copy"></i>使用
                            </button>
                            <button class="prompt-btn prompt-edit-btn" title="编辑提示词">
                                <i class="fas fa-edit"></i>编辑
                            </button>
                            <button class="prompt-btn prompt-delete-btn" title="删除提示词">
                                <i class="fas fa-trash"></i>删除
                            </button>
                        </div>
                    </div>
                    <div class="prompt-meta">
                        <div class="prompt-meta-item" title="分类">
                            <i class="fas fa-folder"></i> ${categoryName}
                        </div>
                        <div class="prompt-meta-item" title="最后使用时间">
                            <i class="fas fa-clock"></i> ${lastUsed}
                        </div>
                        <div class="prompt-meta-item" title="使用次数">
                            <i class="fas fa-sync-alt"></i> ${usageCount} 次
                        </div>
                    </div>
                    <div class="prompt-content">${prompt.content}</div>
                    <div class="prompt-tags mt-3">${tagsHtml}</div>
                    ${noteHtml}
                `;
                
                // 添加事件监听器
                promptEl.querySelector('.prompt-use-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.usePrompt(prompt.id);
                });
                
                promptEl.querySelector('.prompt-edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editPrompt(prompt.id);
                });
                
                promptEl.querySelector('.prompt-delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.confirmDeletePrompt(prompt.id, prompt.title);
                });
                
                this.promptsContainer.appendChild(promptEl);
            });
            
            // 如果没有提示词，显示空状态
            if (prompts.length === 0) {
                const noPromptsEl = document.createElement('div');
                noPromptsEl.className = 'no-prompts-container';
                noPromptsEl.innerHTML = `
                    <div class="no-prompts-icon">
                        <i class="fas fa-comment-slash"></i>
                    </div>
                    <h3 class="no-prompts-title">暂无提示词</h3>
                    <p class="no-prompts-description">开始添加您的第一个提示词吧</p>
                    <button class="add-first-prompt-btn" id="add-first-prompt-btn">
                        <i class="fas fa-plus"></i> 添加提示词
                    </button>
                `;
                
                noPromptsEl.querySelector('#add-first-prompt-btn').addEventListener('click', () => {
                    this.openNewPromptForm();
                });
                
                this.promptsContainer.appendChild(noPromptsEl);
            }
        },
        
        // 搜索提示词
        searchPrompts() {
            this.loadPrompts();
        },
        
        // 筛选提示词
        filterPrompts() {
            this.loadPrompts();
        },
        
        // 切换视图模式
        toggleView() {
            const viewToggle = document.getElementById('view-toggle');
            const isListView = viewToggle.innerHTML.includes('网格视图');
            
            if (isListView) {
                this.promptsContainer.classList.remove('grid-cols-1');
                this.promptsContainer.classList.add('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
                viewToggle.innerHTML = '<i class="fas fa-th-list mr-2"></i>列表视图';
            } else {
                this.promptsContainer.classList.remove('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
                this.promptsContainer.classList.add('grid-cols-1');
                viewToggle.innerHTML = '<i class="fas fa-th-large mr-2"></i>网格视图';
            }
            
            this.loadPrompts();
        },
        
        // 更新仪表盘
        async updateDashboard() {
            try {
                // 获取数据
                const prompts = await this.storage.getPrompts();
                const categories = await this.storage.getCategories();
                
                // 统计数据
                const totalPrompts = prompts.length;
                const totalCategories = categories.length;
                const totalUsage = prompts.reduce((sum, p) => sum + (p.usageCount || 0), 0);
                
                // 更新统计卡片
                animateCountUpdate(this.totalPromptsCount, totalPrompts);
                animateCountUpdate(this.totalCategoriesCount, totalCategories);
                animateCountUpdate(this.totalUsageCount, totalUsage);
                
                // 更新最近使用的提示词
                this.recentPromptsList.innerHTML = '';
                
                // 按最后使用时间排序
                const recentPrompts = [...prompts]
                    .filter(p => p.lastUsed)
                    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
                    .slice(0, 6);
                
                if (recentPrompts.length > 0) {
                    recentPrompts.forEach((prompt, index) => {
                        const promptEl = document.createElement('div');
                        promptEl.className = 'glass-card p-4 prompt-card hover-3d';
                        
                        // 添加延迟动画效果
                        promptEl.style.animation = `fadeIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.1}s forwards`;
                        promptEl.style.opacity = '0';
                        promptEl.style.transform = 'translateY(20px)';
                        
                        // 格式化标签
                        const tagsHtml = prompt.tags && prompt.tags.length > 0
                            ? prompt.tags.map(tag => `<span class="prompt-tag">${tag}</span>`).join('')
                            : '';
                        
                        promptEl.innerHTML = `
                            <h3 class="font-bold mb-2">${prompt.title}</h3>
                            <p class="text-sm mb-2 line-clamp-2">${prompt.content}</p>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <i class="fas fa-clock mr-1"></i> 最后使用: ${new Date(prompt.lastUsed).toLocaleDateString('zh-CN')}
                            </div>
                            <div>${tagsHtml}</div>
                        `;
                        
                        promptEl.addEventListener('click', () => {
                            this.viewPromptDetails(prompt.id);
                        });
                        
                        this.recentPromptsList.appendChild(promptEl);
                    });
                }
                
                // 更新图表
                this.updateCategoriesChart(prompts, categories);
                this.updateUsageChart(prompts);
            } catch (error) {
                console.error('更新仪表盘失败:', error);
                window.showNotification('error', '更新仪表盘失败', error.message);
            }
        },
        
        // 更新分类图表
        updateCategoriesChart(prompts, categories) {
            const ctx = this.categoriesChart.getContext('2d');
            
            // 统计每个分类的提示词数量
            const categoryCounts = {};
            let uncategorizedCount = 0;
            
            prompts.forEach(prompt => {
                if (prompt.category) {
                    categoryCounts[prompt.category] = (categoryCounts[prompt.category] || 0) + 1;
                } else {
                    uncategorizedCount++;
                }
            });
            
            const categoryData = [];
            
            // 将分类ID映射到名称
            for (const [categoryId, count] of Object.entries(categoryCounts)) {
                const category = categories.find(c => c.id === categoryId);
                if (category) {
                    categoryData.push({
                        name: category.name,
                        count: count
                    });
                }
            }
            
            // 按数量排序
            categoryData.sort((a, b) => b.count - a.count);
            
            const categoryNames = categoryData.map(item => item.name);
            const categoryCounts2 = categoryData.map(item => item.count);
            
            if (uncategorizedCount > 0) {
                categoryNames.push('未分类');
                categoryCounts2.push(uncategorizedCount);
            }
            
            if (categoryNames.length === 0) {
                categoryNames.push('无数据');
                categoryCounts2.push(1);
            }
            
            // 生成渐变颜色
            const colors = categoryNames.map((_, i) => {
                const hue = (180 + i * 40) % 360;
                return `hsla(${hue}, 70%, 60%, 0.8)`;
            });
            
            // 创建图表
            if (window.categoriesChartInstance) {
                window.categoriesChartInstance.destroy();
            }
            
            const isDark = document.documentElement.classList.contains('dark');
            
            window.categoriesChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categoryNames,
                    datasets: [{
                        data: categoryCounts2,
                        backgroundColor: colors,
                        borderColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                        borderWidth: 2,
                        borderRadius: 4,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: isDark ? '#f0f0f0' : '#333',
                                font: {
                                    size: 12
                                },
                                boxWidth: 15,
                                padding: 15
                            }
                        },
                        tooltip: {
                            displayColors: false,
                            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            titleColor: isDark ? '#fff' : '#333',
                            bodyColor: isDark ? '#fff' : '#333',
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.raw} 个提示词`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        },
        
        // 更新使用情况图表
        updateUsageChart(prompts) {
            const ctx = this.usageChart.getContext('2d');
            
            // 获取过去7天的数据
            const days = [];
            const counts = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);
                
                // 统计当天使用量
                const dayUsage = prompts.filter(prompt => {
                    if (!prompt.lastUsed) return false;
                    const usedDate = new Date(prompt.lastUsed);
                    return usedDate >= date && usedDate < nextDate;
                }).length;
                
                days.push(date.toLocaleDateString('zh-CN', { weekday: 'short' }));
                counts.push(dayUsage);
            }
            
            // 创建图表
            if (window.usageChartInstance) {
                window.usageChartInstance.destroy();
            }
            
            const isDark = document.documentElement.classList.contains('dark');
            
            // 创建渐变背景
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(93, 92, 222, 0.3)');
            gradient.addColorStop(1, 'rgba(93, 92, 222, 0.0)');
            
            window.usageChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: '使用次数',
                        data: counts,
                        backgroundColor: gradient,
                        borderColor: 'rgba(93, 92, 222, 1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: 'rgba(93, 92, 222, 1)',
                        pointBorderColor: isDark ? '#181818' : '#FFFFFF',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: '#FF5C8D',
                        pointHoverBorderColor: isDark ? '#181818' : '#FFFFFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                color: isDark ? '#f0f0f0' : '#333',
                                stepSize: 1,
                                font: {
                                    size: 12
                                },
                                padding: 10
                            }
                        },
                        x: {
                            grid: {
                                display: false,
                                drawBorder: false
                            },
                            ticks: {
                                color: isDark ? '#f0f0f0' : '#333',
                                font: {
                                    size: 12
                                },
                                padding: 10
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            titleColor: isDark ? '#f0f0f0' : '#333',
                            bodyColor: isDark ? '#f0f0f0' : '#333',
                            padding: 12,
                            displayColors: false
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        },

        confirmDeleteCategory: function(categoryId, categoryName) {
            this.confirmTitle.textContent = '确认删除分类';
            this.confirmMessage.textContent = `您确定要删除分类 "${categoryName}" 吗？这不会删除该分类下的提示词，但它们将变为未分类状态。`;
            this.openConfirmModal();

            this.confirmActionBtn.onclick = async () => {
                const success = await this.storage.deleteCategory(categoryId);
                if (success) {
                    window.showNotification('success', '已删除', `分类 "${categoryName}" 已被删除。`);
                    await this.loadCategories();
                    await this.loadPrompts(); // Prompts might have their category removed
                    await this.updateDashboard();
                } else {
                    window.showNotification('error', '删除失败', '删除分类时出错。');
                }
                this.closeConfirmModal();
            };
        },

        addCategory: async function() {
            // ... existing code ...
        },

        exportData: function() {
            try {
                const success = this.storage.exportData();
                if (success) {
                    window.showNotification('success', '导出成功', '数据已开始下载。');
                } else {
                    // This case might be rare if exportData itself doesn't throw but returns false
                    window.showNotification('error', '导出失败', '无法导出数据。');
                }
            } catch (error) {
                console.error('导出数据时出错:', error);
                window.showNotification('error', '导出失败', `导出数据时发生错误: ${error.message}`);
            }
        },

        confirmDeletePrompt: function(promptId, promptTitle) {
            this.confirmTitle.textContent = '确认删除提示词';
            this.confirmMessage.textContent = `您确定要删除提示词 "${promptTitle}" 吗？`;
            this.openConfirmModal();

            this.confirmActionBtn.onclick = async () => {
                const success = await this.storage.deletePrompt(promptId);
                if (success) {
                    window.showNotification('success', '已删除', `提示词 "${promptTitle}" 已被删除。`);
                    await this.loadPrompts();
                    await this.updateDashboard();
                } else {
                    window.showNotification('error', '删除失败', '删除提示词时出错。');
                }
                this.closeConfirmModal();
            };
        },

        importData: function(event) {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const success = this.storage.importData(e.target.result);
                    if (success) {
                        window.showNotification('success', '导入成功', '数据已成功导入。');
                        await this.loadData(); // Reload all data and views
                    } else {
                        window.showNotification('error', '导入失败', '无法导入数据。请检查文件格式是否正确。');
                    }
                } catch (error) {
                    console.error('导入数据时出错:', error);
                    window.showNotification('error', '导入失败', `导入数据时发生错误: ${error.message}`);
                }
                // Reset file input to allow re-importing the same file if needed
                event.target.value = null;
            };
            reader.onerror = () => {
                window.showNotification('error', '读取文件失败', '无法读取所选文件。');
                event.target.value = null;
            };

            reader.readAsText(file);
        },

        loadGitHubSettings: function() {
            const githubTokenInput = document.getElementById('github-token');
            const gistIdInput = document.getElementById('gist-id');

            if (githubTokenInput && gistIdInput) {
                const settings = this.storage.getGitHubSettings();
                githubTokenInput.value = settings.token || '';
                gistIdInput.value = settings.gistId || '';
            }
        },

        saveGitHubSettings: function() {
            const githubTokenInput = document.getElementById('github-token');
            const gistIdInput = document.getElementById('gist-id');

            if (githubTokenInput && gistIdInput) {
                const token = githubTokenInput.value.trim();
                const gistId = gistIdInput.value.trim();

                const success = this.storage.saveGitHubSettings(token, gistId);
                if (success) {
                    window.showNotification('success', '设置已保存', 'GitHub 同步设置已更新。');
                } else {
                    window.showNotification('error', '保存失败', '无法保存 GitHub 同步设置。');
                }
            }
        },
        
        setupAutoSync() {
            // 清除现有的同步定时器（如果有）
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }
            
            // 获取GitHub设置
            const settings = this.storage.getGitHubSettings();
            
            // 如果有GitHub令牌和Gist ID，则设置自动同步
            if (settings.token && settings.gistId) {
                // 设置定时器，每10分钟同步一次
                this.syncInterval = setInterval(async () => {
                    try {
                        await this.syncWithGitHub(true); // true表示静默模式
                    } catch (error) {
                        console.error('自动同步失败:', error);
                    }
                }, 10 * 60 * 1000); // 10分钟
                
                console.log('自动同步已启用，每10分钟同步一次');
            }
        },

        // 修改syncWithGitHub以支持静默模式
        syncWithGitHub: async function(silent = false) {
            // 显示loading状态，除非是静默模式
            if (!silent) {
                window.showNotification('info', '正在同步', '正在尝试与GitHub Gist同步数据...', 0); // 0 duration = sticky
            }

            try {
                const result = await this.storage.syncWithGist();
                
                // 关闭通知，除非是静默模式
                if (!silent) {
                    // 关闭"正在同步"通知
                    const stickyNotification = document.querySelector('.notification-info');
                    if (stickyNotification && stickyNotification.querySelector('.notification-title').textContent === '正在同步') {
                        appUI.closeNotification(stickyNotification);
                    }

                    if (result.success) {
                        let message = result.message || '数据已成功与GitHub Gist同步。';
                        if (result.gistId) {
                            message += ` Gist ID: ${result.gistId}`;
                        }
                        window.showNotification('success', '同步成功', message);
                    } else {
                        window.showNotification('error', '同步失败', result.message || '与GitHub Gist同步数据时发生错误。');
                    }
                }
                
                // 如果是新Gist ID，刷新设置
                if (result.gistId && result.gistId !== this.storage.getGitHubSettings().gistId) {
                    this.loadGitHubSettings();
                }
                
                // 如果数据有更新，重新加载
                if (result.syncResult && result.syncResult.downloaded > 0) {
                    await this.loadData();
                }

                return result;
            } catch (error) {
                // 只在非静默模式下显示错误
                if (!silent) {
                    // 关闭"正在同步"通知
                    const stickyNotification = document.querySelector('.notification-info');
                    if (stickyNotification && stickyNotification.querySelector('.notification-title').textContent === '正在同步') {
                        appUI.closeNotification(stickyNotification);
                    }
                    console.error('GitHub同步错误:', error);
                    window.showNotification('error', '同步异常', `与GitHub Gist同步时发生严重错误: ${error.message}`);
                }
                
                throw error;
            }
        },

        viewPromptDetails: function(promptId) {
            // For now, viewing details will open the edit modal for that prompt.
            // This could be expanded later to a dedicated read-only detail view if needed.
            this.editPrompt(promptId);
        },

        editPrompt: async function(promptId) {
            const prompt = await this.storage.getPromptById(promptId);
            if (prompt) {
                // 检查是否需要密码验证
                const requirePassword = await this.storage.isPasswordRequiredForAdd();
                if (requirePassword) {
                    // 打开密码验证模态框
                    this.openPasswordModal(() => {
                        // 密码验证成功后的回调
                        this._loadPromptToForm(prompt);
                    });
                } else {
                    // 不需要密码验证，直接加载表单
                    this._loadPromptToForm(prompt);
                }
            } else {
                window.showNotification('error', '加载失败', '无法找到要编辑的提示词。');
            }
        },
        
        // 内部方法：加载提示词到表单
        _loadPromptToForm(prompt) {
            this.promptIdInput.value = prompt.id;
            this.promptTitleInput.value = prompt.title;
            this.promptCategoryInput.value = prompt.category || '';
            this.promptTagsInput.value = prompt.tags ? prompt.tags.join(', ') : '';
            this.promptContentInput.value = prompt.content;
            if (this.promptNoteInput) {
                this.promptNoteInput.value = prompt.note || '';
            }
            this.modalTitle.textContent = '编辑提示词';
            this.openPromptModal();
        },

        usePrompt: async function(promptId) {
            const prompt = await this.storage.getPromptById(promptId);
            if (prompt) {
                try {
                    await navigator.clipboard.writeText(prompt.content);
                    window.showNotification('success', '已复制', '提示词内容已复制到剪贴板。');
                    await this.storage.incrementPromptUsage(promptId);
                    // Optionally, update the UI immediately if needed, or wait for next full load/dashboard update
                    if (this.currentView === 'prompts') {
                        await this.loadPrompts(); // Refresh usage count on card
                    }
                    if (this.currentView === 'dashboard') {
                        await this.updateDashboard(); // Refresh usage stats and recent prompts
                    }
                    
                    // 同步数据（使用次数变更）
                    this.triggerSync();
                } catch (err) {
                    console.error('无法复制提示词: ', err);
                    window.showNotification('error', '复制失败', '无法将提示词内容复制到剪贴板。');
                }
            } else {
                window.showNotification('error', '操作失败', '无法找到要使用的提示词。');
            }
        },

        // 加载安全设置
        loadSecuritySettings() {
            // 获取设置
            const settings = this.storage.getSettings();
            this.requirePasswordCheckbox.checked = settings.requirePasswordForAdd === true;
        },
        
        // 保存安全设置
        saveSecuritySettings() {
            // 获取当前设置
            const settings = this.storage.getSettings();
            
            // 更新密码保护设置
            settings.requirePasswordForAdd = this.requirePasswordCheckbox.checked;
            
            // 如果有新密码，则更新密码
            const newPassword = this.adminPasswordSetting.value.trim();
            if (newPassword) {
                this.storage.setAdminPassword(newPassword);
                // 清空密码输入框
                this.adminPasswordSetting.value = '';
            }
            
            // 保存设置
            const success = this.storage.saveSettings(settings);
            
            if (success) {
                window.showNotification('success', '设置已保存', '安全设置已更新。');
            } else {
                window.showNotification('error', '保存失败', '无法保存安全设置。');
            }
        },
        
        // 打开/关闭密码验证模态框
        openPasswordModal(callback) {
            this.passwordCallback = callback;
            this.passwordInput.value = '';
            this.passwordModal.classList.remove('hidden');
            this.passwordInput.focus();
        },
        
        closePasswordModal() {
            this.passwordModal.classList.add('hidden');
            this.passwordCallback = null;
        },
        
        // 验证密码
        async verifyPassword() {
            const password = this.passwordInput.value;
            
            try {
                const isValid = await this.storage.verifyAdminPassword(password);
                
                if (isValid) {
                    // 密码正确
                    window.showNotification('success', '验证成功', '密码验证成功');
                    this.closePasswordModal();
                    
                    // 执行回调函数
                    if (typeof this.passwordCallback === 'function') {
                        this.passwordCallback();
                    }
                } else {
                    // 密码错误
                    window.showNotification('error', '验证失败', '密码不正确');
                    this.passwordInput.value = '';
                    this.passwordInput.focus();
                }
            } catch (error) {
                console.error('验证密码时出错:', error);
                window.showNotification('error', '验证失败', '验证过程中发生错误');
            }
        },

        // 添加一个触发同步的方法
        async triggerSync() {
            try {
                const syncResult = await this.storage.syncToSelectedProvider();
                
                if (syncResult.success) {
                    // 更新同步时间
                    const now = new Date().toISOString();
                    localStorage.setItem('lastSyncTime', now);
                    this.updateSyncStatus(now);
                    
                    if (syncResult.noSync) {
                        this.showMessage(syncResult.message, 'info');
                    } else {
                        const downloadCount = syncResult.syncResult?.downloaded || 0;
                        const uploadCount = syncResult.syncResult?.uploaded || 0;
                        
                        let message = '同步成功: ';
                        if (downloadCount > 0) message += `下载了${downloadCount}条记录 `;
                        if (uploadCount > 0) message += `上传了${uploadCount}条记录 `;
                        if (downloadCount === 0 && uploadCount === 0) message += '无需更新 ';
                        
                        this.showMessage(message, 'success');
                        
                        // 如果有数据变更，重新加载数据
                        if (downloadCount > 0) {
                            await this.loadData();
                            this.renderUI();
                        }
                    }
                } else {
                    this.showMessage(`同步失败: ${syncResult.message}`, 'error');
                }
            } catch (error) {
                console.error('同步时出错:', error);
                this.showMessage(`同步出错: ${error.message}`, 'error');
            }
        },

        // 在deletePrompt方法结束时添加同步调用
        async deletePrompt(id) {
            // ... 原有代码 ...
            
            await this.storage.deletePrompt(id);
            await this.loadData();
            this.renderPrompts();
            this.showMessage('提示词已删除', 'success');
            
            // 同步数据
            this.triggerSync();
        },

        // 在usePrompt方法结束时添加同步调用
        async usePrompt(id) {
            // ... 原有代码 ...
            
            await this.storage.incrementUseCount(id);
            this.showMessage('提示词已复制到剪贴板', 'success');
            
            // 同步数据（使用次数变更）
            this.triggerSync();
        },

        // 在设置保存方法中添加同步触发
        async saveStorageConfig() {
            // ... 原有代码 ...
            
            // 重新设置自动同步
            this.storage.setupAutoSync();
            
            // 立即触发同步
            this.triggerSync();
        },

        // 添加更新同步状态的方法
        updateSyncStatus(syncTime = null) {
            const lastSyncElement = document.getElementById('last-sync-time');
            if (lastSyncElement) {
                if (syncTime) {
                    const date = new Date(syncTime);
                    lastSyncElement.textContent = date.toLocaleString();
                } else {
                    lastSyncElement.textContent = '从未';
                }
            }
        }
    };
    
    // 初始化应用程序
    window.app.init();
}); 