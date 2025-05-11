/**
 * 保存数据到GitHub仓库的API端点
 */
import { Octokit } from '@octokit/rest';

export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
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

    // 获取请求体数据
    const data = req.body;
    if (!data || !data.prompts) {
      return res.status(400).json({ error: '无效的数据格式' });
    }

    // 初始化GitHub客户端
    const octokit = new Octokit({ auth: githubToken });

    // 准备要保存的内容
    const content = JSON.stringify(data, null, 2);
    let sha;

    // 检查文件是否已存在
    try {
      const fileResponse = await octokit.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: githubPath,
      });

      // 获取SHA值用于更新
      if (!Array.isArray(fileResponse.data)) {
        sha = fileResponse.data.sha;
      }
    } catch (error) {
      // 如果文件不存在（404错误），则不需要SHA
      if (error.status !== 404) {
        throw error;
      }
    }

    // 创建或更新文件
    const updateResponse = await octokit.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: githubPath,
      message: `更新PromptNexus数据 - ${new Date().toISOString()}`,
      content: Buffer.from(content).toString('base64'),
      sha: sha
    });

    res.status(200).json({
      success: true,
      commit: {
        sha: updateResponse.data.commit.sha,
        message: updateResponse.data.commit.message,
        url: updateResponse.data.commit.html_url
      }
    });
  } catch (error) {
    console.error('保存数据到GitHub失败:', error);
    res.status(500).json({ error: '保存数据到GitHub时出错' });
  }
} 