# GeoTools 检测问题修复 Spec

## Why
GeoTools 检测报告显示博客综合评分仅 46 分（F 级），存在多个严重和警告级别的问题。其中 JSON-LD 语法错误和 AI 爬虫屏蔽是严重问题，缺少 llms.txt、结构化数据不完整等问题也显著影响博客在 AI 搜索引擎中的可见性。这些问题在 Hexo 框架内均可修复。同时，通过 GPT-4o API 自动化更新可自动化的文件，确保内容持续保持最新。

## What Changes
- **修复 JSON-LD 语法错误**：修复 `structured_data.pug` 中非文章/非首页页面输出空 JSON-LD 的 bug
- **更新 robots.txt**：合并重复的 `User-agent: *` 块，添加 AI 搜索爬虫（GPTBot、ClaudeBot、PerplexityBot）的显式 Allow 规则
- **创建 llms.txt 文件**：按照 llmstxt.org 规范在 `source/` 目录下创建 llms.txt
- **扩展结构化数据**：添加 Organization、BreadcrumbList Schema 类型
- **添加 About 页面到导航菜单**：将已有的关于页面加入导航栏
- **添加 FAQ Schema 支持**：为文章中的 FAQ 内容添加 FAQPage Schema 生成能力
- **创建 GPT-4o 自动化工作流**：在 push 时自动调用 GPT-4o API 更新 llms.txt、FAQ Schema、结构化数据描述等可自动化内容

## Impact
- Affected specs: SEO 优化、结构化数据、AI 可见性、CI/CD 工作流
- Affected code: `source/robots.txt`、`themes/butterfly/layout/includes/head/structured_data.pug`、`_config.butterfly.yml`、`source/llms.txt`（新建）、`.github/workflows/`（新建/修改）

## ADDED Requirements

### Requirement: 修复 JSON-LD 语法错误
系统 SHALL 确保所有页面输出的 JSON-LD 数据均为有效的 JSON，不再出现空或截断的 JSON-LD 脚本标签。

#### Scenario: 非文章非首页页面不输出空 JSON-LD
- **WHEN** 用户访问归档页、分类页、标签页等非文章非首页页面
- **THEN** 页面不包含空的或无效的 `<script type="application/ld+json">` 标签

#### Scenario: 文章页输出有效 BlogPosting JSON-LD
- **WHEN** 用户访问博客文章页面
- **THEN** 页面包含完整的 BlogPosting 类型 JSON-LD，且 JSON 可正确解析

#### Scenario: 首页输出有效 WebSite JSON-LD
- **WHEN** 用户访问博客首页
- **THEN** 页面包含完整的 WebSite 类型 JSON-LD，且 JSON 可正确解析

### Requirement: robots.txt 允许 AI 爬虫访问
系统 SHALL 在 robots.txt 中显式允许主要 AI 搜索引擎爬虫（GPTBot、ClaudeBot、PerplexityBot）访问网站内容，同时保持对训练用爬虫的合理控制。

#### Scenario: AI 搜索爬虫可以抓取内容
- **WHEN** GPTBot、ClaudeBot 或 PerplexityBot 访问 robots.txt
- **THEN** 爬虫看到 `Allow: /` 规则，可以正常抓取网站内容

#### Scenario: robots.txt 格式规范
- **WHEN** 检查 robots.txt 文件
- **THEN** 不存在重复的 `User-agent: *` 块，规则组织清晰

### Requirement: 创建 llms.txt 文件
系统 SHALL 按照 llmstxt.org 规范在网站根目录提供 llms.txt 文件，帮助大语言模型理解网站内容。

#### Scenario: LLM 访问 llms.txt
- **WHEN** LLM 爬虫访问 `/llms.txt`
- **THEN** 返回包含网站标题、描述和主要内容链接的 llms.txt 文件

### Requirement: 扩展结构化数据 Schema 类型
系统 SHALL 在现有 BlogPosting 和 WebSite 基础上，添加 Organization 和 BreadcrumbList Schema 类型。

#### Scenario: 首页包含 Organization Schema
- **WHEN** 用户访问博客首页
- **THEN** 页面 JSON-LD 中包含 Organization 类型的结构化数据

#### Scenario: 文章页包含 BreadcrumbList Schema
- **WHEN** 用户访问博客文章页面
- **THEN** 页面 JSON-LD 中包含 BreadcrumbList 类型的面包屑导航数据

### Requirement: About 页面加入导航菜单
系统 SHALL 在导航菜单中添加"关于"页面链接，方便用户和爬虫发现关于页面。

#### Scenario: 导航菜单包含关于链接
- **WHEN** 用户查看博客导航菜单
- **THEN** 菜单中包含指向 `/about/` 的"关于"链接

### Requirement: FAQ Schema 支持
系统 SHALL 为文章中的 FAQ 内容提供 FAQPage Schema 生成能力，当文章 Front Matter 中标记 `faq: true` 时自动生成 FAQPage 结构化数据。

#### Scenario: FAQ 文章生成 FAQPage Schema
- **WHEN** 文章 Front Matter 包含 `faq: true`
- **THEN** 页面 JSON-LD 中包含 FAQPage 类型的结构化数据

#### Scenario: 非 FAQ 文章不受影响
- **WHEN** 文章 Front Matter 不包含 `faq: true`
- **THEN** 页面仅输出 BlogPosting 类型 JSON-LD，不包含 FAQPage

### Requirement: GPT-4o 自动化工作流
系统 SHALL 在每次推送到 master 分支时，通过 GitHub Actions 自动调用 GPT-4o API 更新以下可自动化文件：
1. **llms.txt** — GPT-4o 分析博客文章列表，生成/更新 llms.txt
2. **FAQ Schema 数据** — GPT-4o 分析文章内容，为含问答内容的文章自动添加 `faq: true` 标记和 FAQ 结构化数据
3. **结构化数据描述** — GPT-4o 为缺少 description 的文章自动生成描述

API 密钥 SHALL 存储在 GitHub Secrets 中，不得明文提交到仓库。

#### Scenario: Push 触发自动更新
- **WHEN** 代码推送到 master 分支
- **THEN** GitHub Actions 工作流自动执行，调用 GPT-4o API 更新 llms.txt 和其他可自动化文件

#### Scenario: API 密钥安全存储
- **WHEN** 工作流执行时
- **THEN** API 密钥从 GitHub Secrets 读取，不出现在代码或日志中

#### Scenario: 自动更新不阻塞部署
- **WHEN** 自动更新工作流完成
- **THEN** 更新的文件被提交并推送，触发部署工作流

## MODIFIED Requirements

### Requirement: robots.txt 配置
合并重复的 `User-agent: *` 块为一个统一块，添加 AI 搜索爬虫专用规则块，保持 Sitemap 链接和 Crawl-delay 设置。

## REMOVED Requirements

### Requirement: 无移除项
本次修改不涉及移除任何现有功能。
