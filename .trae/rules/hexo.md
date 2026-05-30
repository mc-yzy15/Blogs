项目使用HEXO框架，请你注意以下几点：
1. 项目使用HEXO框架，请你注意在项目中使用HEXO的语法。
2. 项目使用HEXO框架，请你注意在项目中使用HEXO的插件。
3. 项目使用HEXO框架，请你注意在项目中使用HEXO的主题。
4. 项目部署在GitHub上面，访问域名为https://blogs.yzy15.dpdns.org/ or https://mc-yzy15.github.io/blogs
5. 项目使用Markdown语法，请你注意在项目中使用Markdown语法。
6. 由于是GitHub Pages，所以说CNAME必须在根目录下，不能在子目录下。

## 多语言(i18n)部署流程

### 架构概述

项目使用 `hexo-generator-i18n` 插件 + 自定义 Google Translate 翻译脚本实现 133 种语言的自动翻译博客。

### 关键文件

| 文件 | 作用 |
|------|------|
| `_config.yml` | `language` 数组包含全部 133 种语言代码，`i18n` 配置块控制生成器行为 |
| `_config.butterfly.yml` | `translate` 配置启用简繁转换功能 |
| `tools/translate_posts.py` | Python 翻译脚本，使用 `deep-translator` 库调用 Google Translate |
| `.github/workflows/translate.yml` | GitHub Action 自动翻译工作流 |
| `.github/workflows/deploy.yml` | GitHub Action 部署工作流 |

### 翻译策略（枢轴翻译 + 质量检查）

1. **Step 1**: 中文 → 英文（枢轴语言），确保英文翻译准确
2. **Step 2a**: 英文 → 其他语言（非 CJK，130+ 种），使用英文作为源语言翻译质量更高
3. **Step 2b**: CJK 语言（日/韩/繁中）特殊处理：
   - 同时做直接翻译（中文→目标语言）和枢轴翻译（英文→目标语言）
   - 将两个结果回译为中文，用 Jaccard 相似度比较
   - 如果枢轴版本质量明显更好（相似度差 > 0.1），则用枢轴版本
   - 否则使用直接翻译版本

### 翻译文件组织

- 源文章：`source/_posts/*.md`（中文）
- 翻译文章：`source/_posts/{lang_code}/*.md`（各语言子目录）
- `hexo-generator-i18n` 根据 URL 路径前缀（如 `/en/`、`/ja/`）识别语言版本
- 已存在的翻译文件会被跳过，不会重复翻译

### GitHub Actions 工作流

#### translate.yml（自动翻译）

- **触发条件**：推送到 master 且 `source/_posts/**/*.md` 有变更
- **手动触发**：支持 `translate_all: yes` 翻译所有文章
- **流程**：安装 deep-translator → 检测变更文件 → 执行翻译 → 提交推送
- **超时**：180 分钟（133 种语言翻译耗时较长）
- **防循环**：`if: github.actor != 'github-actions[bot]'` 避免翻译提交再次触发

#### deploy.yml（自动部署）

- **触发条件**：推送到 master
- **流程**：安装依赖 → `hexo clean` → `hexo generate` → 部署到 gh-pages 分支

### 完整部署流程

```
1. 写中文文章 → 保存到 source/_posts/
2. git push origin master
3. translate.yml 触发：
   a. 检测新增/修改的 .md 文件
   b. 中文 → 英文（枢轴翻译）
   c. 英文 → 130+ 种非 CJK 语言
   d. 中文 → CJK 语言（直接+枢轴，质量比较）
   e. 翻译文件保存到 source/_posts/{lang}/
   f. 自动提交并推送
4. deploy.yml 触发：
   a. hexo clean && hexo generate（生成 3900+ 页面）
   b. 部署到 gh-pages 分支
5. 多语言博客上线！
```

### 环境变量（GitHub Actions）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEFAULT_LANG` | `zh-CN` | 源语言 |
| `TARGET_LANGS` | 全部 133 种 | 目标语言列表 |
| `SIMILARITY_THRESHOLD` | `0.4` | 回译质量检查阈值 |

### 注意事项

- 翻译脚本位于 `tools/` 目录而非 `scripts/`，因为 Hexo 会自动加载 `scripts/` 下的所有文件
- `deep-translator` 无需 API Key，免费使用 Google Translate
- 代码块（` ```...``` ` 和 `` `...` ``）会被保护，不会被翻译
- 长文章自动分块翻译（每块 ≤ 4500 字符）
- Front Matter 中的 `title` 和 `description` 也会翻译
- 翻译后的文章 Front Matter 会添加 `lang: <语言代码>` 字段

## SEO 与结构化数据

### JSON-LD 结构化数据

项目使用 Butterfly 主题内置的 `structured_data.pug` 模板生成 JSON-LD 结构化数据，位于 `themes/butterfly/layout/includes/head/structured_data.pug`。

#### 支持的 Schema 类型

| Schema 类型 | 适用页面 | 说明 |
|-------------|---------|------|
| `BlogPosting` | 文章页 | 包含 headline、url、image、datePublished、dateModified、author |
| `WebSite` | 首页 | 包含 name、alternateName、url |
| `Organization` | 首页 | 包含 name、url、logo、sameAs（从主题 social 配置提取） |
| `BreadcrumbList` | 文章页 | 面包屑导航：首页 > 分类链 > 文章标题 |
| `FAQPage` | 文章页（条件） | 仅当文章 Front Matter 包含 `faq: true` 时生成 |

#### FAQ Schema 使用方式

在文章 Front Matter 中添加 `faq: true` 即可启用 FAQPage Schema：

```yaml
---
title: 文章标题
faq: true
---
```

FAQ 内容提取规则：
1. 优先查找 `## FAQ` 区域内的问答内容
2. 匹配 `### Q: 问题` 或 `### Question: 问题` 格式（h3-h6 均支持）
3. 回退匹配 `**Q:** 问题` 或 `**Question:** 问题` 格式
4. 仅当提取到有效 FAQ 项时才输出 FAQPage Schema

#### 配置

在 `_config.butterfly.yml` 中启用：

```yaml
structured_data:
  enable: true
  alternate_name:
    - Yzy15博客
    - "Yzy15's Blog"
```

### robots.txt

`source/robots.txt` 已配置 AI 搜索爬虫允许规则：
- GPTBot、ClaudeBot、PerplexityBot 均为 `Allow: /`
- 通用爬虫 `Allow: /`，但 `Disallow: /js/` 和 `Disallow: /css/`

### llms.txt

`source/llms.txt` 遵循 llmstxt.org 规范，帮助 LLM 理解网站内容。该文件由 GPT-4o 自动化工作流自动更新。

## AI 自动化工作流

### 架构概述

项目使用 GPT-4o API 自动更新博客相关文件，通过 GitHub Actions 实现。

### 关键文件

| 文件 | 作用 |
|------|------|
| `tools/ai_auto_update.py` | Python 脚本，封装 GPT-4o API 调用逻辑 |
| `.github/workflows/ai-auto-update.yml` | GitHub Action 自动更新工作流 |
| `source/llms.txt` | 自动生成的 LLM 发现文件 |

### 自动更新功能

1. **更新 llms.txt** — 扫描文章列表，调用 GPT-4o 生成符合 llmstxt.org 规范的文件
2. **补充缺失描述** — 为缺少 `description` 的文章自动生成描述（≤160 字符）
3. **检测 FAQ 文章** — 分析文章内容，为含 FAQ 内容的文章自动添加 `faq: true` 标记

### GitHub Secrets 配置

| Secret 名称 | 说明 |
|-------------|------|
| `OPENAI_API_KEY` | GPT-4o API 密钥 |
| `OPENAI_BASE_URL` | API 基础 URL（默认：https://ai.yzy15.dpdns.org/v1） |

### 工作流触发条件

- 推送到 master 且 `source/_posts/**/*.md` 有变更
- 每日 3:00 UTC 定时执行
- 手动触发（`workflow_dispatch`）
- 防循环：`if: github.actor != 'github-actions[bot]'`

### 注意事项

- API 调用支持指数退避重试（最多 3 次）
- 仅处理 `source/_posts/` 根目录下的 `.md` 文件，跳过翻译子目录
- 提交信息包含 `[skip ci]` 标记，避免触发其他工作流
- Front Matter 更新会保留原有字段格式和顺序