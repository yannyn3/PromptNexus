/**
 * 应用程序配置API端点
 */

export default async function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    // 返回环境变量
    const config = {
      storageProvider: process.env.STORAGE_PROVIDER || 'local',
      notionApiKey: process.env.NOTION_API_KEY,
      notionDatabaseId: process.env.NOTION_DATABASE_ID,
      requirePasswordForAdd: process.env.REQUIRE_PASSWORD === 'true',
      showGitHubSettings: process.env.SHOW_GITHUB_SETTINGS === 'true'
    };

    res.status(200).json(config);
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ error: '获取配置时出错' });
  }
}
