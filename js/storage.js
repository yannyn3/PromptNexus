/**
 * PromptNexus存储管理器
 * 支持本地存储、GitHub Gist同步和Notion/GitHub数据库
 */
class StorageManager {
  constructor() {
    this.storageKey = "promptnexus_data";
    this.settingsKey = "promptnexus_settings";
    this.usageStatsKey = "promptnexus_usage_stats";
    this.githubTokenKey = "promptnexus_github_token";
    this.gistIdKey = "promptnexus_gist_id";
    this.adminPasswordKey = "promptnexus_admin_password";

    // 存储提供者 - 'local', 'notion', 'github'
    this.storageProvider = "local";

    // 后端API配置
    this.backendConfig = {
      apiUrl: null,
      notionApiKey: null,
      notionDatabaseId: null,
      githubToken: null,
      githubRepo: null,
      githubOwner: null,
      githubPath: null,
    };

    // 默认数据结构
    this.defaultData = {
      prompts: [],
      categories: [],
      version: "1.1.0",
      lastUpdated: new Date().toISOString(),
    };

    // 默认设置
    this.defaultSettings = {
      theme: "light",
      sortOrder: "lastModified",
      viewMode: "grid",
      requirePasswordForAdd: true, // 默认启用密码保护
    };

    // 默认使用统计
    this.defaultUsageStats = {
      totalUses: 0,
      lastSevenDays: [0, 0, 0, 0, 0, 0, 0], // 最近7天的使用次数
      lastUsedDate: null,
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
      localStorage.setItem(
        this.settingsKey,
        JSON.stringify(this.defaultSettings),
      );
    }

    // 检查并确保使用统计存在
    if (!localStorage.getItem(this.usageStatsKey)) {
      localStorage.setItem(
        this.usageStatsKey,
        JSON.stringify(this.defaultUsageStats),
      );
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
    const isVercelEnv =
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes(".now.sh");

    if (isVercelEnv) {
      try {
        // 尝试从API获取配置
        console.log('正在尝试从/api/config获取配置...');
        const response = await fetch("/api/config");
        
        if (response.ok) {
          const config = await response.json();
          console.log('成功获取配置:', {
            storageProvider: config.storageProvider,
            hasNotionConfig: !!config.notionApiKey && !!config.notionDatabaseId,
            hasGithubConfig: !!config.githubToken && !!config.githubRepo,
            requirePasswordForAdd: config.requirePasswordForAdd
          });

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
            githubPath: config.githubPath || null,
          };

          console.log(`使用${this.storageProvider}作为数据存储`);
          
          // 尝试显示GitHub设置界面（如果需要）
          if (config.storageProvider === 'github' || config.showGitHubSettings === true) {
            setTimeout(() => {
              try {
                const githubSettings = document.getElementById('github-settings-container');
                const vercelEnvSettings = document.getElementById('vercel-env-settings');
                
                if (githubSettings) {
                  githubSettings.classList.remove('hidden');
                }
                
                if (vercelEnvSettings) {
                  vercelEnvSettings.classList.add('hidden');
                }
                
                console.log('GitHub设置界面已显示');
              } catch (err) {
                console.error('无法显示GitHub设置界面:', err);
              }
            }, 500);
          }
          
          return;
        } else {
          console.error('获取配置失败，状态码:', response.status);
          if (response.status === 404) {
            console.warn('配置API端点不存在，请确保创建了api/config.js文件');
          }
        }
      } catch (error) {
        console.error("无法加载后端配置:", error);
      }
      
      // 如果没有成功获取配置，尝试一些备用方法
      console.warn('未能从API获取配置，尝试使用备用方法...');
      
      // 尝试从URL参数获取存储提供者
      const urlParams = new URLSearchParams(window.location.search);
      const storageParam = urlParams.get('storage');
      if (storageParam === 'notion' || storageParam === 'github') {
        this.storageProvider = storageParam;
        console.log(`从URL参数设置存储提供者: ${this.storageProvider}`);
      } else {
        // 回退到本地存储
        this.storageProvider = "local";
        console.log('使用本地存储作为备用');
      }
    } else {
      // 本地开发环境使用本地存储
      this.storageProvider = "local";
      console.log('本地开发环境使用本地存储');
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
        data.version = "1.1.0";
        needsUpdate = true;
      }

      // 检查并添加lastUpdated字段
      if (!data.lastUpdated) {
        data.lastUpdated = new Date().toISOString();
        needsUpdate = true;
      }

      // 确保所有提示词有所需字段
      if (data.prompts && data.prompts.length > 0) {
        data.prompts.forEach((prompt) => {
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

          if (typeof prompt.usageCount === "undefined") {
            prompt.usageCount = 0;
            needsUpdate = true;
          }

          if (!prompt.tags && !Array.isArray(prompt.tags)) {
            prompt.tags = [];
            needsUpdate = true;
          }

          if (!prompt.note) {
            prompt.note = "";
            needsUpdate = true;
          }
        });
      }

      if (needsUpdate) {
        await this.saveData(data);
      }
    } catch (error) {
      console.error("数据迁移失败:", error);
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * 获取数据
   */
  async getData() {
    try {
      const settings = this.getGitHubSettings();

      // 先从本地加载数据
      let data = this.getDataFromLocal();

      // 如果配置了GitHub并且是自动加载模式，尝试从GitHub加载数据
      if (settings.token && settings.gistId && settings.autoLoad !== false) {
        try {
          const githubData = await this.getDataFromGist();
          if (githubData) {
            return githubData;
          }
        } catch (error) {
          console.warn("从GitHub Gist加载数据失败:", error);
          // 继续使用本地数据
        }
      }

      // 如果没有GitHub或获取GitHub数据失败，使用本地数据
      return data;
    } catch (error) {
      console.error("获取数据失败:", error);
      return { prompts: [], categories: [] };
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
      console.error("从本地获取数据失败:", error);
      return this.defaultData;
    }
  }

  /**
   * 从Notion获取数据
   */
  async getDataFromNotion() {
    if (
      !this.backendConfig.notionApiKey ||
      !this.backendConfig.notionDatabaseId
    ) {
      throw new Error("Notion API密钥或数据库ID未配置");
    }

    try {
      const response = await fetch("/api/notion/getData", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Notion API返回状态码 ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("从Notion获取数据失败:", error);
      throw error;
    }
  }

  /**
   * 从GitHub获取数据
   */
  async getDataFromGitHub() {
    if (
      !this.backendConfig.githubToken ||
      !this.backendConfig.githubRepo ||
      !this.backendConfig.githubOwner
    ) {
      throw new Error("GitHub配置不完整");
    }

    try {
      const response = await fetch("/api/github/getData", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API返回状态码 ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("从GitHub获取数据失败:", error);
      throw error;
    }
  }

  /**
   * 从GitHub Gist获取数据
   */
  async getDataFromGist() {
    const settings = this.getGitHubSettings();

    if (!settings.token || !settings.gistId) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.github.com/gists/${settings.gistId}`,
        {
          method: "GET",
          headers: {
            Authorization: `token ${settings.token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API返回状态码 ${response.status}`);
      }

      const gistData = await response.json();

      if (gistData.files && gistData.files["promptnexus_data.json"]) {
        const content = gistData.files["promptnexus_data.json"].content;
        const data = JSON.parse(content);

        // 确保数据格式有效
        if (!data.prompts || !Array.isArray(data.prompts)) {
          throw new Error("GitHub Gist中的数据格式无效");
        }

        // 将远程数据保存到本地
        this.saveDataToLocal(data);

        return data;
      }

      return null;
    } catch (error) {
      console.error("从GitHub Gist获取数据失败:", error);
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
        case "notion":
          return await this.saveDataToNotion(data);
        case "github":
          return await this.saveDataToGitHub(data);
        case "local":
        default:
          return this.saveDataToLocal(data);
      }
    } catch (error) {
      console.error("保存数据失败:", error);
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
      console.error("保存数据到本地失败:", error);
      return false;
    }
  }

  /**
   * 保存数据到Notion
   */
  async saveDataToNotion(data) {
    if (
      !this.backendConfig.notionApiKey ||
      !this.backendConfig.notionDatabaseId
    ) {
      throw new Error("Notion API密钥或数据库ID未配置");
    }

    try {
      const response = await fetch("/api/notion/saveData", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Notion API返回状态码 ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("保存数据到Notion失败:", error);
      throw error;
    }
  }

  /**
   * 保存数据到GitHub
   */
  async saveDataToGitHub(data) {
    if (
      !this.backendConfig.githubToken ||
      !this.backendConfig.githubRepo ||
      !this.backendConfig.githubOwner
    ) {
      throw new Error("GitHub配置不完整");
    }

    try {
      const response = await fetch("/api/github/saveData", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`GitHub API返回状态码 ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("保存数据到GitHub失败:", error);
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
    return prompts.find((prompt) => prompt.id === id) || null;
  }

  /**
   * 保存提示词
   */
  async savePrompt(prompt) {
    const data = await this.getData();
    const prompts = data.prompts || [];

    // 检查是否存在相同ID的提示词
    const existingIndex = prompts.findIndex((p) => p.id === prompt.id);

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

    data.prompts = prompts.filter((prompt) => prompt.id !== id);
    return await this.saveData(data);
  }

  /**
   * 增加提示词使用次数
   */
  async incrementPromptUsage(id) {
    const data = await this.getData();
    const prompts = data.prompts || [];
    const promptIndex = prompts.findIndex((p) => p.id === id);

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
      if (
        !stats.lastUsedDate ||
        new Date(stats.lastUsedDate).getTime() < today.getTime()
      ) {
        stats.lastSevenDays.push(1);
        stats.lastSevenDays.shift();
        stats.lastUsedDate = today.toISOString();
      } else {
        // 同一天，增加最后一天的计数
        stats.lastSevenDays[6] += 1;
      }

      localStorage.setItem(this.usageStatsKey, JSON.stringify(stats));
    } catch (error) {
      console.error("更新使用统计失败:", error);
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
      console.error("获取使用统计失败:", error);
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
    if (!categoryName || categoryName.trim() === "") {
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
    data.categories = categories.filter((cat) => cat !== categoryId);

    // 从提示词中移除该分类
    if (data.prompts && data.prompts.length > 0) {
      data.prompts.forEach((prompt) => {
        if (prompt.category === categoryId) {
          prompt.category = "";
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
    if (!newName || newName.trim() === "") {
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
      data.prompts.forEach((prompt) => {
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
      if (provider === "notion" && (!apiKey || !databaseId)) {
        throw new Error("需要Notion API密钥和数据库ID");
      }
      if (provider === "github" && (!token || !repo || !owner)) {
        throw new Error("需要GitHub令牌、仓库和所有者信息");
      }

      // 在Vercel环境中保存配置
      const isVercelEnv =
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes(".now.sh");

      if (isVercelEnv) {
        const response = await fetch("/api/config/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          throw new Error("保存配置失败");
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
          githubPath: path || null,
        };

        return true;
      } else {
        // 本地环境，只保存到localStorage用于开发测试
        localStorage.setItem(
          "promptnexus_backend_config",
          JSON.stringify({
            provider,
            apiKey,
            databaseId,
            token,
            repo,
            owner,
            path,
          }),
        );

        this.storageProvider = provider;
        return true;
      }
    } catch (error) {
      console.error("保存后端配置失败:", error);
      return false;
    }
  }

  /**
   * 设置管理员密码
   * @param {string} password - 新密码
   */
  setAdminPassword(password) {
    if (!password || password.trim() === "") {
      return false;
    }

    try {
      // 简单加密密码（实际应用中应使用更安全的加密方式）
      const hashedPassword = btoa(password + "_promptnexus");
      localStorage.setItem(this.adminPasswordKey, hashedPassword);
      return true;
    } catch (error) {
      console.error("保存密码失败:", error);
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
      console.log('尝试验证管理员密码...');
      
      // 检查是否在Vercel环境中
      const isVercelEnv =
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes(".now.sh");

      if (isVercelEnv) {
        // 通过API验证密码
        console.log('使用API验证密码...');
        try {
          const response = await fetch("/api/verify-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password }),
          });
          
          if (!response.ok) {
            console.error('密码验证API返回错误状态码:', response.status);
            if (response.status === 404) {
              console.warn('密码验证API端点不存在，请确保创建了api/verify-password.js文件');
              // 如果API不存在，尝试本地验证
              return this._verifyPasswordLocally(password);
            }
            return false;
          }

          const result = await response.json();
          console.log('密码验证结果:', result.success ? '成功' : '失败');
          return result.success === true;
        } catch (error) {
          console.error('调用密码验证API时出错:', error);
          // 如果API调用失败，尝试使用本地验证
          return this._verifyPasswordLocally(password);
        }
      } else {
        // 本地开发环境下使用本地存储的密码
        return this._verifyPasswordLocally(password);
      }
    } catch (error) {
      console.error("验证密码失败:", error);
      return false;
    }
  }
  
  /**
   * 在本地验证密码（备用方法）
   * @private
   */
  _verifyPasswordLocally(password) {
    try {
      console.log('使用本地方法验证密码...');
      const storedPassword = localStorage.getItem(this.adminPasswordKey);
      if (!storedPassword) {
        console.warn('本地未存储密码');
        return password === 'admin'; // 如果没有存储密码，使用默认密码'admin'
      }

      // 加密输入的密码并比较
      const hashedInput = btoa(password + "_promptnexus");
      const result = storedPassword === hashedInput;
      console.log('本地密码验证结果:', result ? '成功' : '失败');
      return result;
    } catch (error) {
      console.error('本地密码验证失败:', error);
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
      console.error("获取设置失败:", error);
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
      console.error("保存设置失败:", error);
      return false;
    }
  }

  /**
   * 是否需要密码验证添加提示词
   */
  async isPasswordRequiredForAdd() {
    try {
      console.log('检查是否需要密码验证...');
      
      // 检查是否在Vercel环境中
      const isVercelEnv =
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes(".now.sh");

      if (isVercelEnv) {
        try {
          // 从API获取配置
          const response = await fetch("/api/config");
          if (response.ok) {
            const config = await response.json();
            const requirePassword = config.requirePasswordForAdd === true;
            console.log('从API获取密码验证配置:', requirePassword);
            return requirePassword;
          } else {
            console.warn('获取配置失败，使用本地设置');
          }
        } catch (error) {
          console.error('获取配置API出错:', error);
        }
        
        // 如果API获取失败，使用本地设置
        const settings = this.getSettings();
        const requirePassword = settings.requirePasswordForAdd === true;
        console.log('使用本地设置的密码验证配置:', requirePassword);
        return requirePassword;
      } else {
        // 本地开发环境使用本地设置
        const settings = this.getSettings();
        const requirePassword = settings.requirePasswordForAdd === true;
        console.log('本地环境使用密码验证配置:', requirePassword);
        return requirePassword;
      }
    } catch (error) {
      console.error("检查密码需求失败:", error);
      // 出错时默认不需要密码验证
      return false;
    }
  }

  // 导出数据
  exportData() {
    try {
      const data = this.getDataFromLocal();
      const fileName = `promptnexus_export_${new Date().toISOString().split("T")[0]}.json`;
      const json = JSON.stringify(data, null, 2);

      // 创建下载链接
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
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
      console.error("导出数据失败:", error);
      return false;
    }
  }

  // 导入数据
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // 简单验证是否是有效的数据结构
      if (!data.prompts || !Array.isArray(data.prompts)) {
        throw new Error("无效的数据格式");
      }

      // 保存到本地存储
      return this.saveDataToLocal(data);
    } catch (error) {
      console.error("导入数据失败:", error);
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
      console.error("获取GitHub设置失败:", error);
      return { token: null, gistId: null };
    }
  }

  // 保存GitHub设置
  saveGitHubSettings(token, gistId, autoLoad = true) {
    try {
      const settings = { token, gistId, autoLoad };
      localStorage.setItem(this.githubTokenKey, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error("保存GitHub设置失败:", error);
      return false;
    }
  }

  // 与GitHub Gist同步数据
  async syncWithGist(silent = false) {
    try {
      const settings = this.getGitHubSettings();

      // 如果没有GitHub Token，则返回错误
      if (!settings.token) {
        return {
          success: false,
          message: "未设置GitHub令牌。请在设置中配置GitHub访问令牌。",
        };
      }

      // 获取当前数据
      const data = await this.getData();
      const dataStr = JSON.stringify(data);

      // 准备请求参数
      let method, url, body;
      const token = settings.token;
      let gistId = settings.gistId;

      if (gistId) {
        // 尝试先获取现有Gist
        try {
          const checkResponse = await fetch(
            `https://api.github.com/gists/${gistId}`,
            {
              method: "GET",
              headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (checkResponse.ok) {
            const gistData = await checkResponse.json();

            // 检查远程数据是否比本地数据更新
            if (gistData.files && gistData.files["promptnexus_data.json"]) {
              const remoteContent =
                gistData.files["promptnexus_data.json"].content;
              const remoteData = JSON.parse(remoteContent);

              // 如果远程数据更新，则合并数据
              if (remoteData.lastUpdated && data.lastUpdated) {
                const remoteDate = new Date(remoteData.lastUpdated);
                const localDate = new Date(data.lastUpdated);

                if (remoteDate > localDate) {
                  // 合并数据（以远程为主，保留本地特有项）
                  const mergedData = this.mergeData(remoteData, data);
                  await this.saveDataToLocal(mergedData);

                  return {
                    success: true,
                    message: "从Gist获取了更新的数据并合并",
                    gistId,
                    syncResult: {
                      uploaded: 0,
                      downloaded: 1,
                    },
                  };
                }
              }
            }
          }
        } catch (error) {
          console.warn("获取Gist时发生错误:", error);
          // 继续使用本地数据更新
        }

        // 更新现有gist
        method = "PATCH";
        url = `https://api.github.com/gists/${gistId}`;
        body = JSON.stringify({
          files: {
            "promptnexus_data.json": {
              content: dataStr,
            },
          },
        });
      } else {
        // 创建新gist
        method = "POST";
        url = "https://api.github.com/gists";
        body = JSON.stringify({
          description: "PromptNexus Data",
          public: false,
          files: {
            "promptnexus_data.json": {
              content: dataStr,
            },
          },
        });
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "同步失败");
      }

      const responseData = await response.json();

      if (!gistId && responseData.id) {
        // 保存新的gist ID
        this.saveGitHubSettings(settings.token, responseData.id);
        gistId = responseData.id;
      }

      return {
        success: true,
        message: "数据已成功同步到GitHub Gist",
        gistId,
        syncResult: {
          uploaded: 1,
          downloaded: 0,
        },
      };
    } catch (error) {
      console.error("GitHub同步失败:", error);
      return {
        success: false,
        message: `同步失败: ${error.message}`,
      };
    }
  }

  // 合并本地和远程数据
  mergeData(remoteData, localData) {
    const result = JSON.parse(JSON.stringify(remoteData)); // 深拷贝

    // 确保有提示词数组
    if (!result.prompts) result.prompts = [];

    // 创建远程提示词ID映射
    const remotePromptsMap = {};
    result.prompts.forEach((prompt) => {
      remotePromptsMap[prompt.id] = prompt;
    });

    // 添加本地特有的提示词
    if (localData.prompts) {
      localData.prompts.forEach((localPrompt) => {
        if (!remotePromptsMap[localPrompt.id]) {
          result.prompts.push(localPrompt);
        }
      });
    }

    // 确保有分类数组并合并
    if (!result.categories) result.categories = [];
    if (localData.categories) {
      const allCategories = new Set([
        ...result.categories,
        ...localData.categories,
      ]);
      result.categories = Array.from(allCategories);
    }

    // 更新lastUpdated
    result.lastUpdated = new Date().toISOString();

    return result;
  }
}

// 导出实例
const storage = new StorageManager();

