/**
 * PromptNexus配置API
 * 用于在Vercel环境下获取存储配置
 */
export default function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    // 获取环境变量中的配置
    const config = {
      storageProvider: process.env.STORAGE_PROVIDER || 'local',
      
      // Notion相关配置
      notionApiKey: process.env.NOTION_API_KEY,
      notionDatabaseId: process.env.NOTION_DATABASE_ID,
      
      // GitHub相关配置
      githubToken: process.env.GITHUB_TOKEN,
      githubRepo: process.env.GITHUB_REPO,
      githubOwner: process.env.GITHUB_OWNER,
      githubPath: process.env.GITHUB_PATH || 'promptnexus_data.json',
      
      // API URL
      apiUrl: process.env.API_URL || '',
      
      // 安全配置
      adminPassword: process.env.ADMIN_PASSWORD,
      requirePasswordForAdd: process.env.REQUIRE_PASSWORD_FOR_ADD === 'true',
    };

    // 返回配置（但不返回敏感信息的实际值，只返回是否有配置）
    res.status(200).json({
      storageProvider: config.storageProvider,
      hasNotionConfig: !!config.notionApiKey && !!config.notionDatabaseId,
      hasGithubConfig: !!config.githubToken && !!config.githubRepo && !!config.githubOwner,
      githubPath: config.githubPath,
      apiUrl: config.apiUrl,
      hasAdminPassword: !!config.adminPassword,
      requirePasswordForAdd: config.requirePasswordForAdd
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
} 