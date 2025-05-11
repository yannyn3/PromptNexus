/**
 * 保存数据到Notion数据库的API端点
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

// 将提示词数据保存到Notion
const savePromptsToNotion = async (data, databaseId) => {
  const notion = initNotionClient();
  
  try {
    // 获取当前数据库中的所有页面
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    
    // 创建现有页面ID映射
    const existingPages = {};
    response.results.forEach(page => {
      existingPages[page.id] = page;
    });
    
    const results = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };
    
    // 更新或创建提示词
    for (const prompt of data.prompts) {
      try {
        if (prompt.id && existingPages[prompt.id]) {
          // 更新现有页面
          await notion.pages.update({
            page_id: prompt.id,
            properties: {
              Title: {
                title: [{ text: { content: prompt.title } }]
              },
              Content: {
                rich_text: [{ text: { content: prompt.content } }]
              },
              Category: {
                select: { name: prompt.category }
              },
              Tags: {
                multi_select: prompt.tags.map(tag => ({ name: tag }))
              },
              UseCount: {
                number: prompt.useCount
              }
            }
          });
          results.updated++;
          
          // 从映射中删除，剩下的将被视为已删除
          delete existingPages[prompt.id];
        } else {
          // 创建新页面
          const response = await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
              Title: {
                title: [{ text: { content: prompt.title } }]
              },
              Content: {
                rich_text: [{ text: { content: prompt.content } }]
              },
              Category: {
                select: { name: prompt.category }
              },
              Tags: {
                multi_select: prompt.tags.map(tag => ({ name: tag }))
              },
              UseCount: {
                number: prompt.useCount || 0
              }
            }
          });
          results.created++;
        }
      } catch (error) {
        console.error(`处理提示词${prompt.id}时出错:`, error);
        results.errors.push({
          id: prompt.id,
          error: error.message
        });
      }
    }
    
    // 处理已删除的提示词
    for (const pageId in existingPages) {
      try {
        await notion.pages.update({
          page_id: pageId,
          archived: true  // 在Notion中归档页面相当于删除
        });
        results.deleted++;
      } catch (error) {
        console.error(`删除提示词${pageId}时出错:`, error);
        results.errors.push({
          id: pageId,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('保存到Notion失败:', error);
    throw new Error(`保存到Notion失败: ${error.message}`);
  }
};

module.exports = async (req, res) => {
  // 仅接受POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许，只接受POST请求' });
  }
  
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
      return res.status(400).json({ error: '未设置NOTION_DATABASE_ID环境变量' });
    }
    
    const data = req.body;
    if (!data || !data.prompts) {
      return res.status(400).json({ error: '无效的数据格式' });
    }
    
    const results = await savePromptsToNotion(data, databaseId);
    return res.status(200).json({
      success: true,
      message: `成功更新Notion数据库，创建了${results.created}条记录，更新了${results.updated}条记录，删除了${results.deleted}条记录。`,
      results
    });
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({ error: error.message });
  }
}; 