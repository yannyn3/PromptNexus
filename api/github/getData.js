/**
 * 从GitHub仓库获取数据的API端点
 */
import { Octokit } from '@octokit/rest';

export default async function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    // 获取GitHub配置
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubPath = process.env.GITHUB_PATH || 'promptnexus_data.json';

    if (!githubToken || !githubOwner || !githubRepo) {
      return res.status(400).json({ error: 'GitHub配置不完整' });
    }

    // 初始化GitHub客户端
    const octokit = new Octokit({ auth: githubToken });

    // 尝试从GitHub获取文件
    try {
      const response = await octokit.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: githubPath,
      });

      // 确保是文件而不是目录
      if (Array.isArray(response.data)) {
        throw new Error('指定的路径是一个目录，而不是文件');
      }

      // 获取内容并解码
      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      const data = JSON.parse(content);

      // 验证数据格式
      if (!data.prompts || !Array.isArray(data.prompts)) {
        throw new Error('GitHub仓库中的数据格式无效');
      }

      // 返回数据
      res.status(200).json(data);
    } catch (error) {
      // 检查是否是文件不存在的错误
      if (error.status === 404) {
        // 返回默认空数据结构
        const defaultData = {
          prompts: [],
          categories: [],
          version: '1.1.0',
          lastUpdated: new Date().toISOString()
        };
        
        res.status(200).json(defaultData);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('从GitHub获取数据失败:', error);
    res.status(500).json({ error: '从GitHub获取数据时出错' });
  }
} 