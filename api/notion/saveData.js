/**
 * 保存数据到Notion数据库的API端点
 */

import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 获取Notion API配置
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      return res.status(400).json({ error: 'Notion API配置不完整' });
    }

    // 获取请求体数据
    const data = req.body;
    if (!data || !data.prompts) {
      return res.status(400).json({ error: '无效的数据格式' });
    }

    // 初始化Notion客户端
    const notion = new Client({ auth: notionApiKey });

    // 1. 首先获取数据库中的所有页面
    const existingPages = await notion.databases.query({
      database_id: notionDatabaseId,
    });

    // 创建ID到页面的映射
    const pagesMap = {};
    existingPages.results.forEach(page => {
      pagesMap[page.id] = page;
    });

    // 处理结果统计
    const results = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0
    };

    // 2. 更新或创建提示词
    for (const prompt of data.prompts) {
      try {
        if (pagesMap[prompt.id]) {
          // 更新现有页面
          await notion.pages.update({
            page_id: prompt.id,
            properties: {
              Title: {
                title: [
                  {
                    type: 'text',
                    text: { content: prompt.title }
                  }
                ]
              },
              Content: {
                rich_text: [
                  {
                    type: 'text',
                    text: { content: prompt.content }
                  }
                ]
              },
              Category: {
                select: prompt.category ? { name: prompt.category } : null
              },
              Tags: {
                multi_select: prompt.tags.map(tag => ({ name: tag }))
              },
              UsageCount: {
                number: prompt.usageCount || 0
              },
              LastModified: {
                date: { start: prompt.lastModified || new Date().toISOString() }
              },
              LastUsed: prompt.lastUsed ? {
                date: { start: prompt.lastUsed }
              } : null,
              Note: prompt.note ? {
                rich_text: [
                  {
                    type: 'text',
                    text: { content: prompt.note }
                  }
                ]
              } : null
            }
          });
          
          results.updated++;
          
          // 从映射中删除已处理的页面
          delete pagesMap[prompt.id];
        } else {
          // 创建新页面
          const response = await notion.pages.create({
            parent: { database_id: notionDatabaseId },
            properties: {
              Title: {
                title: [
                  {
                    type: 'text',
                    text: { content: prompt.title }
                  }
                ]
              },
              Content: {
                rich_text: [
                  {
                    type: 'text',
                    text: { content: prompt.content }
                  }
                ]
              },
              Category: {
                select: prompt.category ? { name: prompt.category } : null
              },
              Tags: {
                multi_select: prompt.tags.map(tag => ({ name: tag }))
              },
              UsageCount: {
                number: prompt.usageCount || 0
              },
              CreatedAt: {
                date: { start: prompt.createdAt || new Date().toISOString() }
              },
              LastModified: {
                date: { start: prompt.lastModified || new Date().toISOString() }
              },
              LastUsed: prompt.lastUsed ? {
                date: { start: prompt.lastUsed }
              } : null,
              Note: prompt.note ? {
                rich_text: [
                  {
                    type: 'text',
                    text: { content: prompt.note }
                  }
                ]
              } : null
            }
          });
          
          results.created++;
        }
      } catch (error) {
        console.error(`处理提示词时出错 (${prompt.id}):`, error);
        results.errors++;
      }
    }

    // 3. 处理已删除的提示词（可选）
    // 根据应用需求，可以选择删除或归档在本地已删除的提示词
    const shouldDeleteRemovedItems = true; // 设置为false则保留Notion中的数据
    
    if (shouldDeleteRemovedItems) {
      for (const pageId in pagesMap) {
        try {
          // 删除或归档页面
          await notion.pages.update({
            page_id: pageId,
            archived: true
          });
          
          results.deleted++;
        } catch (error) {
          console.error(`删除提示词时出错 (${pageId}):`, error);
          results.errors++;
        }
      }
    }

    res.status(200).json({ 
      success: true,
      results
    });
  } catch (error) {
    console.error('保存数据到Notion失败:', error);
    res.status(500).json({ error: '保存数据到Notion时出错' });
  }
} 