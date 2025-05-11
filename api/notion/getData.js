/**
 * 从Notion数据库获取数据的API端点
 */

const { Client } = require('@notionhq/client');

// 初始化Notion客户端
const initNotionClient = () => {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('未设置NOTION_API_KEY环境变量');
  }
  return new Client({ auth: apiKey });
};

// 从Notion数据库获取提示词
const getPromptsFromNotion = async (databaseId) => {
  const notion = initNotionClient();
  
  try {
    // 查询数据库
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    
    // 处理结果
    const prompts = response.results.map(page => {
      const properties = page.properties;
      
      // 提取属性 - 根据Notion数据库的实际结构调整这些属性名
      const promptId = page.id;
      const title = properties.Title?.title[0]?.plain_text || '';
      const content = properties.Content?.rich_text[0]?.plain_text || '';
      const category = properties.Category?.select?.name || '未分类';
      const tags = properties.Tags?.multi_select?.map(tag => tag.name) || [];
      const useCount = properties.UseCount?.number || 0;
      const createdTime = page.created_time;
      const lastUpdated = page.last_edited_time;
      
      return {
        id: promptId,
        title,
        content,
        category,
        tags,
        useCount,
        createdTime,
        lastUpdated
      };
    });
    
    const lastUpdated = new Date().toISOString();
    
    return {
      prompts,
      categories: [...new Set(prompts.map(p => p.category))],
      tags: [...new Set(prompts.flatMap(p => p.tags))],
      lastUpdated
    };
  } catch (error) {
    console.error('从Notion获取数据失败:', error);
    throw new Error(`从Notion获取数据失败: ${error.message}`);
  }
};

module.exports = async (req, res) => {
  try {
    // 获取数据库ID
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
      return res.status(400).json({ error: '未设置NOTION_DATABASE_ID环境变量' });
    }
    
    // 获取数据
    const data = await getPromptsFromNotion(databaseId);
    return res.status(200).json(data);
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({ error: error.message });
  }
}; 