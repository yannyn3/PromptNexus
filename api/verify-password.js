/**
 * PromptNexus密码验证API
 * 用于验证管理员密码
 */
export default function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 获取环境变量中设置的管理员密码
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    // 如果没有设置管理员密码，返回错误
    if (!adminPassword) {
      return res.status(400).json({ 
        success: false, 
        message: '未设置管理员密码。请在环境变量中设置ADMIN_PASSWORD。' 
      });
    }
    
    // 获取请求体中的密码
    const { password } = req.body;
    
    // 验证密码
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供密码' 
      });
    }
    
    // 比较密码
    if (password === adminPassword) {
      return res.status(200).json({ 
        success: true, 
        message: '密码验证成功' 
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: '密码不正确' 
      });
    }
  } catch (error) {
    console.error('验证密码失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
} 