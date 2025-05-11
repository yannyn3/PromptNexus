# PromptNexus - 提示词管理工具

一个现代化的提示词管理工具，支持多种存储方式，优美的3D效果UI，轻松管理和组织你的AI提示词。

## 特性

- 💾 **灵活的存储选项**：支持本地存储、GitHub仓库和Notion数据库
- 🔄 **数据同步**：自动备份和同步提示词到云端
- 🏷️ **分类和标签**：轻松组织和管理提示词
- 📈 **使用统计**：跟踪提示词使用频率
- 🎨 **3D美观界面**：现代化的用户界面，包含3D效果
- 📱 **响应式设计**：适配桌面和移动设备
- 🔍 **全局搜索**：快速查找提示词
- 🌈 **主题定制**：切换深色/浅色模式和颜色主题

## 部署指南

### 本地部署

1. 克隆仓库：
   ```bash
   git clone https://github.com/yourusername/promptnexus.git
   cd promptnexus
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 运行本地服务器：
   ```bash
   npm run dev
   ```

4. 打开浏览器访问 `http://localhost:3000`

### Vercel部署

1. Fork本仓库或创建一个新仓库推送代码

2. 在Vercel上创建新项目并选择你的仓库

3. 配置环境变量：
   - `STORAGE_PROVIDER`: 选择存储提供商 (`local`, `github`, 或 `notion`)
   - `ADMIN_PASSWORD`: 设置管理员密码，用于验证添加/编辑提示词的权限
   - `REQUIRE_PASSWORD_FOR_ADD`: 设置为 `true` 启用密码保护，`false` 禁用

   如果使用GitHub作为数据库：
   - `GITHUB_TOKEN`: GitHub个人访问令牌
   - `GITHUB_OWNER`: GitHub用户名或组织名
   - `GITHUB_REPO`: 用于存储数据的仓库名
   - `GITHUB_PATH`: 数据文件路径 (默认: `promptnexus_data.json`)

   如果使用Notion作为数据库：
   - `NOTION_API_KEY`: Notion API密钥
   - `NOTION_DATABASE_ID`: Notion数据库ID

4. 部署项目

## 安全设置

### 密码保护

PromptNexus提供密码保护功能，可以限制谁能添加或编辑提示词：

1. **设置管理员密码**：
   - 本地环境：在设置页面的"安全设置"中设置密码
   - Vercel部署：通过环境变量 `ADMIN_PASSWORD` 设置密码

2. **启用/禁用密码保护**：
   - 本地环境：在设置页面的"安全设置"中勾选或取消勾选
   - Vercel部署：设置环境变量 `REQUIRE_PASSWORD_FOR_ADD` 为 `true` 或 `false`

3. **更改密码**：
   - 本地环境：在设置页面的"安全设置"中输入新密码
   - Vercel部署：更新环境变量 `ADMIN_PASSWORD` 的值

## 使用GitHub作为数据库

1. 在GitHub上创建一个仓库用于存储提示词数据

2. 生成个人访问令牌（Settings > Developer settings > Personal access tokens > Fine-grained tokens）:
   - 设置仓库权限为要使用的仓库
   - 确保有 `Contents` 的读写权限

3. 在Vercel环境变量中设置:
   ```
   STORAGE_PROVIDER=github
   GITHUB_TOKEN=你的访问令牌
   GITHUB_OWNER=你的GitHub用户名
   GITHUB_REPO=你的仓库名
   ```

## 使用Notion作为数据库

1. 创建一个Notion集成 (https://www.notion.so/my-integrations)
   - 获取API密钥

2. 创建一个Notion数据库，包含以下属性:
   - `Title` (标题): 提示词标题
   - `Content` (富文本): 提示词内容
   - `Category` (选择): 提示词分类
   - `Tags` (多选): 提示词标签
   - `UsageCount` (数字): 使用次数
   - `CreatedAt` (日期): 创建日期
   - `LastModified` (日期): 最后修改日期
   - `LastUsed` (日期): 最后使用日期
   - `Note` (富文本): 笔记

3. 与你的集成共享数据库

4. 在Vercel环境变量中设置:
   ```
   STORAGE_PROVIDER=notion
   NOTION_API_KEY=你的API密钥
   NOTION_DATABASE_ID=你的数据库ID
   ```

## 贡献指南

欢迎贡献！请随时提交问题或拉取请求。

## 许可证

MIT 

## 生产环境优化

### Tailwind CSS优化

当前项目在`index.html`中通过CDN使用Tailwind CSS，这在开发中很方便，但不推荐用于生产环境。您可以看到以下警告：

```
cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI.
```

对于生产环境，请按照以下步骤优化：

1. 安装Tailwind CSS：
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   ```

2. 初始化Tailwind配置：
   ```bash
   npx tailwindcss init
   ```

3. 创建一个`styles.css`文件，包含以下内容：
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. 构建生产版CSS：
   ```bash
   npx tailwindcss -i ./styles.css -o ./css/tailwind.css --minify
   ```

5. 修改`index.html`，使用构建后的CSS文件：
   ```html
   <!-- 将这一行删除 -->
   <script src="https://cdn.tailwindcss.com"></script>
   
   <!-- 替换为 -->
   <link rel="stylesheet" href="css/tailwind.css">
   ```

这将显著提高页面加载性能和减小文件大小。 