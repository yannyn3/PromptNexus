/**
 * PromptNexus存储管理器
 * 支持本地存储、GitHub Gist同步和Notion/GitHub数据库
 */
class StorageManager {
    constructor() {
        this.storageKey = 'promptnexus_data';
        this.settingsKey = 'promptnexus_settings';
        this.usageStatsKey = 'promptnexus_usage_stats';
        this.githubTokenKey = 'promptnexus_github_token';
        this.gistIdKey = 'promptnexus_gist_id';
        this.adminPasswordKey = 'promptnexus_admin_password';
        
        // 存储提供者 - 'local', 'notion', 'github'
        this.storageProvider = 'local';
        
        // 后端API配置
        this.backendConfig = {
            apiUrl: null,
            notionApiKey: null,
            notionDatabaseId: null,
            githubToken: null,
            githubRepo: null,
            githubOwner: null,
            githubPath: null
        };
        
        // 默认数据结构
        this.defaultData = {
            prompts: [],
            categories: [],
            version: '1.1.0',
            lastUpdated: new Date().toISOString()
        };
        
        // 默认设置
        this.defaultSettings = {
            theme: 'light',
            sortOrder: 'lastModified',
            viewMode: 'grid',
            requirePasswordForAdd: true // 默认启用密码保护
        };
        
        // 默认使用统计
        this.defaultUsageStats = {
            totalUses: 0,
            lastSevenDays: [0, 0, 0, 0, 0, 0, 0], // 最近7天的使用次数
            lastUsedDate: null
        };
    }
    
    /**
     * 初始化存储
     */
    async init() {
        // 检查并确保数据存在
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify(this.defaultData));
        }
        
        // 检查并确保设置存在
        if (!localStorage.getItem(this.settingsKey)) {
            localStorage.setItem(this.settingsKey, JSON.stringify(this.defaultSettings));
        }
        
        // 检查并确保使用统计存在
        if (!localStorage.getItem(this.usageStatsKey)) {
            localStorage.setItem(this.usageStatsKey, JSON.stringify(this.defaultUsageStats));
        }
        
        // 检查默认管理员密码
        if (!localStorage.getItem(this.adminPasswordKey)) {
            // 默认密码为"admin"
            this.setAdminPassword("admin");
        }
        
        // 检查环境变量和Vercel配置
        await this.loadBackendConfig();
        
        // 尝试迁移旧版数据
        await this.migrateData();
        
        return true;
    }
    
    /**
     * 加载后端配置
     */
    async loadBackendConfig() {
        // 检查是否在Vercel环境中
        const isVercelEnv = window.location.hostname.includes('vercel.app') || 
                          window.location.hostname.includes('.now.sh');
                          
        if (isVercelEnv) {
            try {
                // 尝试从API获取配置
                const response = await fetch('/api/config');
                if (response.ok) {
                    const config = await response.json();
                    
                    // 设置存储提供者
                    if (config.storageProvider) {
                        this.storageProvider = config.storageProvider;
                    }
                    
                    // 保存配置
                    this.backendConfig = {
                        apiUrl: config.apiUrl || null,
                        notionApiKey: config.notionApiKey || null,
                        notionDatabaseId: config.notionDatabaseId || null,
                        githubToken: config.githubToken || null,
                        githubRepo: config.githubRepo || null,
                        githubOwner: config.githubOwner || null,
                        githubPath: config.githubPath || null
                    };
                    
                    console.log(`使用${this.storageProvider}作为数据存储`);
                }
            } catch (error) {
                console.error('无法加载后端配置:', error);
                // 回退到本地存储
                this.storageProvider = 'local';
            }
        } else {
            // 本地开发环境使用本地存储
            this.storageProvider = 'local';
        }
    }
    
    /**
     * 迁移旧版数据结构到新版
     */
    async migrateData() {
        try {
            const data = await this.getData();
            let needsUpdate = false;
            
            // 检查并添加版本号
            if (!data.version) {
                data.version = '1.1.0';
                needsUpdate = true;
            }
            
            // 检查并添加lastUpdated字段
            if (!data.lastUpdated) {
                data.lastUpdated = new Date().toISOString();
                needsUpdate = true;
            }
            
            // 确保所有提示词有所需字段
            if (data.prompts && data.prompts.length > 0) {
                data.prompts.forEach(prompt => {
                    if (!prompt.id) {
                        prompt.id = this.generateId();
                        needsUpdate = true;
                    }
                    
                    if (!prompt.lastModified) {
                        prompt.lastModified = new Date().toISOString();
                        needsUpdate = true;
                    }
                    
                    if (!prompt.createdAt) {
                        prompt.createdAt = new Date().toISOString();
                        needsUpdate = true;
                    }
                    
                    if (!prompt.lastUsed) {
                        prompt.lastUsed = null;
                        needsUpdate = true;
                    }
                    
                    if (typeof prompt.usageCount === 'undefined') {
                        prompt.usageCount = 0;
                        needsUpdate = true;
                    }
                    
                    if (!prompt.tags && !Array.isArray(prompt.tags)) {
                        prompt.tags = [];
                        needsUpdate = true;
                    }
                    
                    if (!prompt.note) {
                        prompt.note = '';
                        needsUpdate = true;
                    }
                });
            }
            
            if (needsUpdate) {
                await this.saveData(data);
            }
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }
    
    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * 获取所有数据
     */
    async getData() {
        try {
            switch (this.storageProvider) {
                case 'notion':
                    return await this.getDataFromNotion();
                case 'github':
                    return await this.getDataFromGitHub();
                case 'local':
                default:
                    return this.getDataFromLocal();
            }
        } catch (error) {
            console.error('获取数据失败:', error);
            // 回退到本地存储
            return this.getDataFromLocal();
        }
    }
    
    /**
     * 从本地存储获取数据
     */
    getDataFromLocal() {
        try {
            const data = JSON.parse(localStorage.getItem(this.storageKey));
            return data || this.defaultData;
        } catch (error) {
            console.error('从本地获取数据失败:', error);
            return this.defaultData;
        }
    }
    
    /**
     * 从Notion获取数据
     */
    async getDataFromNotion() {
        if (!this.backendConfig.notionApiKey || !this.backendConfig.notionDatabaseId) {
            throw new Error('Notion API密钥或数据库ID未配置');
        }
        
        try {
            const response = await fetch('/api/notion/getData', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Notion API返回状态码 ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('从Notion获取数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 从GitHub获取数据
     */
    async getDataFromGitHub() {
        if (!this.backendConfig.githubToken || !this.backendConfig.githubRepo || !this.backendConfig.githubOwner) {
            throw new Error('GitHub配置不完整');
        }
        
        try {
            const response = await fetch('/api/github/getData', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API返回状态码 ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('从GitHub获取数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 保存数据
     */
    async saveData(data) {
        try {
            // 更新lastUpdated字段
            data.lastUpdated = new Date().toISOString();
            
            switch (this.storageProvider) {
                case 'notion':
                    return await this.saveDataToNotion(data);
                case 'github':
                    return await this.saveDataToGitHub(data);
                case 'local':
                default:
                    return this.saveDataToLocal(data);
            }
        } catch (error) {
            console.error('保存数据失败:', error);
            // 尝试回退到本地存储
            return this.saveDataToLocal(data);
        }
    }
    
    /**
     * 保存数据到本地存储
     */
    saveDataToLocal(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('保存数据到本地失败:', error);
            return false;
        }
    }
    
    /**
     * 保存数据到Notion
     */
    async saveDataToNotion(data) {
        if (!this.backendConfig.notionApiKey || !this.backendConfig.notionDatabaseId) {
            throw new Error('Notion API密钥或数据库ID未配置');
        }
        
        try {
            const response = await fetch('/api/notion/saveData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Notion API返回状态码 ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('保存数据到Notion失败:', error);
            throw error;
        }
    }
    
    /**
     * 保存数据到GitHub
     */
    async saveDataToGitHub(data) {
        if (!this.backendConfig.githubToken || !this.backendConfig.githubRepo || !this.backendConfig.githubOwner) {
            throw new Error('GitHub配置不完整');
        }
        
        try {
            const response = await fetch('/api/github/saveData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API返回状态码 ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('保存数据到GitHub失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取所有提示词
     */
    async getPrompts() {
        const data = await this.getData();
        return data.prompts || [];
    }
    
    /**
     * 按ID获取提示词
     */
    async getPromptById(id) {
        const prompts = await this.getPrompts();
        return prompts.find(prompt => prompt.id === id) || null;
    }
    
    /**
     * 保存提示词
     */
    async savePrompt(prompt) {
        const data = await this.getData();
        const prompts = data.prompts || [];
        
        // 检查是否存在相同ID的提示词
        const existingIndex = prompts.findIndex(p => p.id === prompt.id);
        
        if (existingIndex >= 0) {
            // 更新现有提示词
            prompt.lastModified = new Date().toISOString();
            prompts[existingIndex] = prompt;
        } else {
            // 添加新提示词
            if (!prompt.id) {
                prompt.id = this.generateId();
            }
            prompt.createdAt = new Date().toISOString();
            prompt.lastModified = new Date().toISOString();
            prompt.lastUsed = null;
            prompt.usageCount = 0;
            
            prompts.push(prompt);
        }
        
        data.prompts = prompts;
        return await this.saveData(data);
    }
    
    /**
     * 删除提示词
     */
    async deletePrompt(id) {
        const data = await this.getData();
        const prompts = data.prompts || [];
        
        data.prompts = prompts.filter(prompt => prompt.id !== id);
        return await this.saveData(data);
    }
    
    /**
     * 增加提示词使用次数
     */
    async incrementPromptUsage(id) {
        const data = await this.getData();
        const prompts = data.prompts || [];
        const promptIndex = prompts.findIndex(p => p.id === id);
        
        if (promptIndex >= 0) {
            if (!prompts[promptIndex].usageCount) {
                prompts[promptIndex].usageCount = 0;
            }
            
            prompts[promptIndex].usageCount += 1;
            prompts[promptIndex].lastUsed = new Date().toISOString();
            
            // 更新使用统计
            this.updateUsageStats();
            
            data.prompts = prompts;
            return await this.saveData(data);
        }
        
        return false;
    }
    
    /**
     * 更新使用统计
     */
    updateUsageStats() {
        try {
            const stats = this.getUsageStats();
            stats.totalUses += 1;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // 如果是新的一天，移动数组
            if (!stats.lastUsedDate || new Date(stats.lastUsedDate).getTime() < today.getTime()) {
                stats.lastSevenDays.push(1);
                stats.lastSevenDays.shift();
                stats.lastUsedDate = today.toISOString();
            } else {
                // 同一天，增加最后一天的计数
                stats.lastSevenDays[6] += 1;
            }
            
            localStorage.setItem(this.usageStatsKey, JSON.stringify(stats));
        } catch (error) {
            console.error('更新使用统计失败:', error);
        }
    }
    
    /**
     * 获取使用统计
     */
    getUsageStats() {
        try {
            const stats = JSON.parse(localStorage.getItem(this.usageStatsKey));
            return stats || this.defaultUsageStats;
        } catch (error) {
            console.error('获取使用统计失败:', error);
            return this.defaultUsageStats;
        }
    }
    
    /**
     * 获取所有分类
     */
    async getCategories() {
        const data = await this.getData();
        return data.categories || [];
    }
    
    /**
     * 添加分类
     */
    async addCategory(categoryName) {
        if (!categoryName || categoryName.trim() === '') {
            return false;
        }
        
        const data = await this.getData();
        const categories = data.categories || [];
        
        // 检查分类是否已存在
        if (categories.includes(categoryName)) {
            return false;
        }
        
        categories.push(categoryName);
        data.categories = categories;
        
        return await this.saveData(data);
    }
    
    /**
     * 删除分类
     */
    async deleteCategory(categoryId) {
        const data = await this.getData();
        const categories = data.categories || [];
        
        // 过滤掉要删除的分类
        data.categories = categories.filter(cat => cat !== categoryId);
        
        // 从提示词中移除该分类
        if (data.prompts && data.prompts.length > 0) {
            data.prompts.forEach(prompt => {
                if (prompt.category === categoryId) {
                    prompt.category = '';
                    prompt.lastModified = new Date().toISOString();
                }
            });
        }
        
        return await this.saveData(data);
    }
    
    /**
     * 更新分类名称
     */
    async updateCategoryName(oldName, newName) {
        if (!newName || newName.trim() === '') {
            return false;
        }
        
        const data = await this.getData();
        const categories = data.categories || [];
        
        // 检查新分类名是否已存在
        if (categories.includes(newName)) {
            return false;
        }
        
        // 更新分类列表
        const index = categories.indexOf(oldName);
        if (index >= 0) {
            categories[index] = newName;
        } else {
            return false;
        }
        
        // 更新所有使用该分类的提示词
        if (data.prompts && data.prompts.length > 0) {
            data.prompts.forEach(prompt => {
                if (prompt.category === oldName) {
                    prompt.category = newName;
                    prompt.lastModified = new Date().toISOString();
                }
            });
        }
        
        data.categories = categories;
        return await this.saveData(data);
    }
    
    /**
     * 保存后端存储配置
     * @param {Object} config - 配置对象
     */
    async saveBackendConfig(config) {
        try {
            const { provider, apiKey, databaseId, token, repo, owner, path } = config;
            
            // 验证配置
            if (provider === 'notion' && (!apiKey || !databaseId)) {
                throw new Error('需要Notion API密钥和数据库ID');
            }
            if (provider === 'github' && (!token || !repo || !owner)) {
                throw new Error('需要GitHub令牌、仓库和所有者信息');
            }
            
            // 在Vercel环境中保存配置
            const isVercelEnv = window.location.hostname.includes('vercel.app') || 
                              window.location.hostname.includes('.now.sh');
                              
            if (isVercelEnv) {
                const response = await fetch('/api/config/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(config)
                });
                
                if (!response.ok) {
                    throw new Error('保存配置失败');
                }
                
                // 更新本地配置
                this.storageProvider = provider;
                this.backendConfig = {
                    apiUrl: config.apiUrl || null,
                    notionApiKey: apiKey || null,
                    notionDatabaseId: databaseId || null,
                    githubToken: token || null,
                    githubRepo: repo || null,
                    githubOwner: owner || null,
                    githubPath: path || null
                };
                
                return true;
            } else {
                // 本地环境，只保存到localStorage用于开发测试
                localStorage.setItem('promptnexus_backend_config', JSON.stringify({
                    provider,
                    apiKey,
                    databaseId,
                    token,
                    repo,
                    owner,
                    path
                }));
                
                this.storageProvider = provider;
                return true;
            }
        } catch (error) {
            console.error('保存后端配置失败:', error);
            return false;
        }
    }
    
    /**
     * 设置管理员密码
     * @param {string} password - 新密码
     */
    setAdminPassword(password) {
        if (!password || password.trim() === '') {
            return false;
        }
        
        try {
            // 简单加密密码（实际应用中应使用更安全的加密方式）
            const hashedPassword = btoa(password + '_promptnexus');
            localStorage.setItem(this.adminPasswordKey, hashedPassword);
            return true;
        } catch (error) {
            console.error('保存密码失败:', error);
            return false;
        }
    }
    
    /**
     * 验证管理员密码 - 使用API验证环境变量中的密码
     * @param {string} password - 要验证的密码
     * @returns {Promise<boolean>} - 验证是否成功的Promise
     */
    async verifyAdminPassword(password) {
        try {
            // 检查是否在Vercel环境中
            const isVercelEnv = window.location.hostname.includes('vercel.app') || 
                            window.location.hostname.includes('.now.sh');
            
            if (isVercelEnv) {
                // 通过API验证密码
                const response = await fetch('/api/verify-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password })
                });
                
                const result = await response.json();
                return result.success === true;
            } else {
                // 本地开发环境下使用本地存储的密码（用于测试）
                const storedPassword = localStorage.getItem(this.adminPasswordKey);
                if (!storedPassword) {
                    return false;
                }
                
                // 加密输入的密码并比较
                const hashedInput = btoa(password + '_promptnexus');
                return storedPassword === hashedInput;
            }
        } catch (error) {
            console.error('验证密码失败:', error);
            return false;
        }
    }
    
    /**
     * 获取设置
     */
    getSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem(this.settingsKey));
            return settings || this.defaultSettings;
        } catch (error) {
            console.error('获取设置失败:', error);
            return this.defaultSettings;
        }
    }
    
    /**
     * 保存设置
     * @param {Object} settings - 设置对象
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }
    
    /**
     * 是否需要密码验证添加提示词
     */
    async isPasswordRequiredForAdd() {
        try {
            // 检查是否在Vercel环境中
            const isVercelEnv = window.location.hostname.includes('vercel.app') || 
                            window.location.hostname.includes('.now.sh');
            
            if (isVercelEnv) {
                // 从API获取配置
                const response = await fetch('/api/config');
                if (response.ok) {
                    const config = await response.json();
                    return config.requirePasswordForAdd === true;
                }
                return false;
            } else {
                // 本地开发环境使用本地设置
                const settings = this.getSettings();
                return settings.requirePasswordForAdd === true;
            }
        } catch (error) {
            console.error('检查密码需求失败:', error);
            return false;
        }
    }

    // 导出数据
    exportData() {
        try {
            const data = this.getDataFromLocal();
            const fileName = `promptnexus_export_${new Date().toISOString().split('T')[0]}.json`;
            const json = JSON.stringify(data, null, 2);
            
            // 创建下载链接
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            return true;
        } catch (error) {
            console.error('导出数据失败:', error);
            return false;
        }
    }

    // 导入数据
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // 简单验证是否是有效的数据结构
            if (!data.prompts || !Array.isArray(data.prompts)) {
                throw new Error('无效的数据格式');
            }
            
            // 保存到本地存储
            return this.saveDataToLocal(data);
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    }

    // 获取GitHub设置
    getGitHubSettings() {
        try {
            const settings = localStorage.getItem(this.githubTokenKey);
            if (settings) {
                return JSON.parse(settings);
            }
            return { token: null, gistId: null };
        } catch (error) {
            console.error('获取GitHub设置失败:', error);
            return { token: null, gistId: null };
        }
    }

    // 保存GitHub设置
    saveGitHubSettings(token, gistId) {
        try {
            const settings = { token, gistId };
            localStorage.setItem(this.githubTokenKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('保存GitHub设置失败:', error);
            return false;
        }
    }

    /**
     * 与GitHub Gist同步数据
     * @returns {Promise<Object>} - 同步结果
     */
    async syncWithGist() {
        try {
            // 检查GitHub Token
            if (!this.backendConfig.githubToken) {
                return {
                    success: false,
                    message: 'GitHub Token未设置，无法同步。请在设置中配置GitHub Token。'
                };
            }

            // 准备数据
            const localData = await this.getData();
            const gistId = await this.getGistId();

            // 准备headers
            const headers = {
                'Authorization': `token ${this.backendConfig.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            };

            let gistData = null;
            let remoteData = null;
            let syncResult = { downloaded: 0, uploaded: 0 };

            // 检查是否有现有的Gist
            if (gistId) {
                try {
                    // 获取Gist
                    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                        method: 'GET',
                        headers: headers
                    });

                    if (!response.ok) {
                        // Gist可能已被删除，创建新的
                        console.warn(`无法获取Gist(${gistId})，将创建新的。错误: ${response.statusText}`);
                    } else {
                        gistData = await response.json();
                        // 解析数据
                        if (gistData.files['promptnexus.json']) {
                            const content = gistData.files['promptnexus.json'].content;
                            try {
                                remoteData = JSON.parse(content);
                            } catch (e) {
                                console.error('解析Gist数据失败:', e);
                            }
                        }
                    }
                } catch (error) {
                    console.error('获取Gist失败:', error);
                }
            }

            // 如果没有获取到Gist或者没有Gist ID，创建一个新的
            if (!gistData) {
                try {
                    const createResponse = await fetch('https://api.github.com/gists', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            description: 'PromptNexus数据备份',
                            public: false,
                            files: {
                                'promptnexus.json': {
                                    content: JSON.stringify(localData, null, 2)
                                }
                            }
                        })
                    });

                    if (!createResponse.ok) {
                        throw new Error(`创建Gist失败: ${createResponse.statusText}`);
                    }

                    const newGist = await createResponse.json();
                    await this.saveGistId(newGist.id);

                    syncResult.uploaded = 1;
                    return {
                        success: true,
                        message: '成功创建并上传数据到新的GitHub Gist',
                        gistId: newGist.id,
                        syncResult
                    };
                } catch (error) {
                    console.error('创建Gist失败:', error);
                    return {
                        success: false,
                        message: `创建GitHub Gist失败: ${error.message}`
                    };
                }
            }

            // 比较本地和远程数据的最后更新时间
            const localTime = new Date(localData.lastUpdated || 0).getTime();
            const remoteTime = new Date(remoteData?.lastUpdated || 0).getTime();

            // 如果远程数据较新，更新本地数据
            if (remoteTime > localTime) {
                await this.saveDataToLocal(remoteData);
                syncResult.downloaded = 1;
                return {
                    success: true,
                    message: '已从GitHub Gist更新本地数据',
                    gistId: gistId,
                    syncResult
                };
            } 
            // 如果本地数据较新，更新Gist
            else if (localTime > remoteTime) {
                try {
                    const updateResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
                        method: 'PATCH',
                        headers: headers,
                        body: JSON.stringify({
                            files: {
                                'promptnexus.json': {
                                    content: JSON.stringify(localData, null, 2)
                                }
                            }
                        })
                    });

                    if (!updateResponse.ok) {
                        throw new Error(`更新Gist失败: ${updateResponse.statusText}`);
                    }

                    syncResult.uploaded = 1;
                    return {
                        success: true,
                        message: '已成功将本地数据上传到GitHub Gist',
                        gistId: gistId,
                        syncResult
                    };
                } catch (error) {
                    console.error('更新Gist失败:', error);
                    return {
                        success: false,
                        message: `更新GitHub Gist失败: ${error.message}`
                    };
                }
            } 
            // 数据相同，无需更新
            else {
                return {
                    success: true,
                    message: '数据已同步，无需更新',
                    gistId: gistId,
                    syncResult
                };
            }
        } catch (error) {
            console.error('GitHub同步失败:', error);
            return {
                success: false,
                message: `GitHub同步失败: ${error.message}`
            };
        }
    }

    /**
     * 保存GitHub Gist ID
     * @param {string} gistId - Gist ID
     * @returns {Promise<void>}
     */
    async saveGistId(gistId) {
        const settings = await this.getGitHubSettings();
        settings.gistId = gistId;
        await this.saveGitHubSettings(settings);
    }

    /**
     * 获取GitHub Gist ID
     * @returns {Promise<string|null>} - Gist ID
     */
    async getGistId() {
        const settings = await this.getGitHubSettings();
        return settings.gistId || null;
    }

    /**
     * 同步数据到选定的存储提供商
     * @returns {Promise<Object>} - 同步结果
     */
    async syncToSelectedProvider() {
        try {
            // 检查存储提供者
            switch (this.storageProvider) {
                case 'github':
                    return await this.syncWithGist();
                case 'notion':
                    return await this.syncWithNotion();
                case 'local':
                default:
                    return { success: true, message: '已使用本地存储，无需同步', noSync: true };
            }
        } catch (error) {
            console.error('同步数据失败:', error);
            return {
                success: false,
                message: `同步失败: ${error.message}`
            };
        }
    }

    /**
     * 与Notion同步数据
     * @returns {Promise<Object>} - 同步结果
     */
    async syncWithNotion() {
        try {
            // 检查配置
            if (!this.backendConfig.notionApiKey || !this.backendConfig.notionDatabaseId) {
                return {
                    success: false,
                    message: 'Notion配置不完整。请确保已设置API密钥和数据库ID。'
                };
            }
            
            // 如果在Vercel部署，使用API端点
            if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('.now.sh')) {
                try {
                    // 获取数据
                    const getResponse = await fetch('/api/notion/getData');
                    if (!getResponse.ok) {
                        const error = await getResponse.text();
                        throw new Error(`从Notion获取数据失败: ${error}`);
                    }
                    
                    const notionData = await getResponse.json();
                    const localData = await this.getData();
                    
                    // 比较本地和远程数据的最后更新时间
                    const localTime = new Date(localData.lastUpdated || 0).getTime();
                    const remoteTime = new Date(notionData.lastUpdated || 0).getTime();
                    
                    if (remoteTime > localTime) {
                        // Notion数据较新，更新本地数据
                        await this.saveDataToLocal(notionData);
                        return {
                            success: true,
                            message: '已从Notion更新本地数据',
                            syncResult: {
                                downloaded: 1,
                                uploaded: 0
                            }
                        };
                    } else if (localTime > remoteTime) {
                        // 本地数据较新，更新Notion
                        const saveResponse = await fetch('/api/notion/saveData', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(localData)
                        });
                        
                        if (!saveResponse.ok) {
                            const error = await saveResponse.text();
                            throw new Error(`保存数据到Notion失败: ${error}`);
                        }
                        
                        return {
                            success: true,
                            message: '已将本地数据保存到Notion',
                            syncResult: {
                                downloaded: 0,
                                uploaded: 1
                            }
                        };
                    } else {
                        // 数据相同，无需更新
                        return {
                            success: true,
                            message: '数据已同步，无需更新',
                            syncResult: {
                                downloaded: 0,
                                uploaded: 0
                            }
                        };
                    }
                } catch (error) {
                    console.error('Notion同步失败:', error);
                    return {
                        success: false,
                        message: `Notion同步失败: ${error.message}`
                    };
                }
            } else {
                // 本地开发环境
                return {
                    success: false,
                    message: '本地环境不支持Notion同步。请部署到Vercel并配置环境变量。'
                };
            }
        } catch (error) {
            console.error('Notion同步失败:', error);
            return {
                success: false,
                message: `Notion同步失败: ${error.message}`
            };
        }
    }

    /**
     * 修改setupAutoSync方法，确保正确同步
     */
    setupAutoSync() {
        // 清除现有的同步定时器（如果有）
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // 设置定时器，每5分钟同步一次
        this.syncInterval = setInterval(async () => {
            try {
                const result = await this.syncToSelectedProvider();
                console.log('自动同步结果:', result);
            } catch (error) {
                console.error('自动同步失败:', error);
            }
        }, 5 * 60 * 1000); // 5分钟
        
        console.log(`自动同步已启用，每5分钟同步一次到${this.storageProvider}`);
        
        // 立即执行一次同步
        this.syncToSelectedProvider().then(result => {
            console.log('初始同步结果:', result);
        }).catch(error => {
            console.error('初始同步失败:', error);
        });
    }
}

// 导出实例
const storage = new StorageManager(); 