/**
 * 应用程序配置API端点
 */

export default async function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    // 返回所有配置环境变量
    const config = {
      storageProvider: process.env.STORAGE_PROVIDER || 'local',
      notionApiKey: process.env.NOTION_API_KEY,
      notionDatabaseId: process.env.NOTION_DATABASE_ID,
      githubToken: process.env.GITHUB_TOKEN,
      githubRepo: process.env.GITHUB_REPO,
      githubOwner: process.env.GITHUB_OWNER,
      githubPath: process.env.GITHUB_PATH,
      requirePasswordForAdd: process.env.REQUIRE_PASSWORD === 'true',
      adminPassword: process.env.ADMIN_PASSWORD ? '已设置' : '未设置'
    };

    // 在控制台打印配置（不包含敏感信息）用于调试
    console.log('应用配置已加载:', {
      storageProvider: config.storageProvider,
      notionDatabaseId: config.notionDatabaseId ? '已设置' : '未设置',
      notionApiKey: config.notionApiKey ? '已设置' : '未设置', 
      requirePasswordForAdd: config.requirePasswordForAdd
    });

    res.status(200).json(config);
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ error: '获取配置时出错' });
  }
} 
