# Tasks

- [x] Task 1: 修复 JSON-LD 语法错误
  - [x] SubTask 1.1: 修改 `themes/butterfly/layout/includes/head/structured_data.pug`，将 `<script>` 标签移入条件分支内，确保仅在 `jsonLdScript` 有值时输出
  - [x] SubTask 1.2: 验证归档页、分类页、标签页不再输出空 JSON-LD

- [x] Task 2: 更新 robots.txt
  - [x] SubTask 2.1: 合并重复的 `User-agent: *` 块为一个统一块
  - [x] SubTask 2.2: 添加 GPTBot、ClaudeBot、PerplexityBot 的显式 Allow 规则
  - [x] SubTask 2.3: 保留 Sitemap 链接和 Crawl-delay 设置

- [x] Task 3: 创建 llms.txt 初始文件
  - [x] SubTask 3.1: 在 `source/` 目录下创建 `llms.txt`，包含网站标题、描述和主要内容链接分区
  - [x] SubTask 3.2: 确保文件在 `hexo generate` 后出现在网站根目录

- [x] Task 4: 扩展结构化数据 Schema 类型
  - [x] SubTask 4.1: 在 `structured_data.pug` 中为首页添加 Organization Schema
  - [x] SubTask 4.2: 在 `structured_data.pug` 中为文章页添加 BreadcrumbList Schema
  - [x] SubTask 4.3: 验证生成的 JSON-LD 可通过 Google Rich Results Test

- [x] Task 5: 添加 About 页面到导航菜单
  - [x] SubTask 5.1: 在 `_config.butterfly.yml` 的 menu 配置中添加 About 链接

- [x] Task 6: 添加 FAQ Schema 支持
  - [x] SubTask 6.1: 修改 `structured_data.pug`，当文章 Front Matter 包含 `faq: true` 时生成 FAQPage Schema
  - [x] SubTask 6.2: FAQ 内容从文章中提取 `## FAQ` 或 `### Q:` 格式的问答对

- [ ] Task 7: 创建 GPT-4o 自动化工作流
  - [ ] SubTask 7.1: 在 GitHub 仓库中设置 Secret `OPENAI_API_KEY` 和 `OPENAI_BASE_URL`
  - [ ] SubTask 7.2: 创建 `.github/workflows/ai-auto-update.yml` 工作流文件，在 push 到 master 时触发
  - [ ] SubTask 7.3: 工作流步骤：检出代码 → 安装 Python → 读取文章列表 → 调用 GPT-4o API 生成 llms.txt → 调用 GPT-4o 为缺少 description 的文章生成描述 → 调用 GPT-4o 分析文章是否包含 FAQ 内容并添加标记 → 提交并推送变更
  - [ ] SubTask 7.4: 添加防循环机制（`if: github.actor != 'github-actions[bot]'`）
  - [ ] SubTask 7.5: 创建 `tools/ai_auto_update.py` 脚本，封装 GPT-4o API 调用逻辑

- [ ] Task 8: 追加项目规则文件（FAQ 支持、JSON-LD 等规则）

# Task Dependencies
- Task 4 依赖 Task 1（需先修复 JSON-LD 基础结构再扩展 Schema 类型）
- Task 6 依赖 Task 1（需先修复 JSON-LD 基础结构再添加 FAQ Schema）
- Task 7 依赖 Task 3（需先创建初始 llms.txt 再实现自动更新）
- Task 7 依赖 Task 6（FAQ 自动标记依赖 FAQ Schema 支持已实现）
- Task 8 依赖 Task 1-7 全部完成
