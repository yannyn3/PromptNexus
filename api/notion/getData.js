/**
 * 从Notion数据库获取数据的API端点
 */

import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    // 获取Notion API配置
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      return res.status(400).json({ error: 'Notion API配置不完整' });
    }

    // 初始化Notion客户端
    const notion = new Client({ auth: notionApiKey });

    // 查询数据库
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      sorts: [
        {
          property: 'lastModified',
          direction: 'descending',
        },
      ],
    });

    // 转换Notion数据格式为应用所需格式
    const data = {
      prompts: [],
      categories: [],
      version: '1.1.0',
      lastUpdated: new Date().toISOString()
    };

    // 提取唯一分类
    const categoriesSet = new Set();

    // 处理返回的页面数据
    for (const page of response.results) {
      const properties = page.properties;

      try {
        // 读取属性（根据Notion数据库的实际结构进行调整）
        const title = properties.Title?.title?.[0]?.plain_text || '';
        const content = properties.Content?.rich_text?.[0]?.plain_text || '';
        const category = properties.Category?.select?.name || '';
        const tags = properties.Tags?.multi_select?.map(tag => tag.name) || [];
        const usageCount = properties.UsageCount?.number || 0;
        const lastModified = properties.LastModified?.date?.start || new Date().toISOString();
        const createdAt = properties.CreatedAt?.date?.start || new Date().toISOString();
        const lastUsed = properties.LastUsed?.date?.start || null;
        const note = properties.Note?.rich_text?.[0]?.plain_text || '';

        // 如果有分类，添加到分类集合
        if (category) {
          categoriesSet.add(category);
        }

        // 创建提示词对象
        const prompt = {
          id: page.id,
          title,
          content,
          category,
          tags,
          usageCount,
          lastModified,
          createdAt,
          lastUsed,
          note
        };

        data.prompts.push(prompt);
      } catch (error) {
        console.error('处理Notion页面时出错:', error);
        // 继续处理其他页面
      }
    }

    // 转换分类集合为数组
    data.categories = Array.from(categoriesSet);

    res.status(200).json(data);
  } catch (error) {
    console.error('从Notion获取数据失败:', error);
    res.status(500).json({ error: '从Notion获取数据时出错' });
  }
} 