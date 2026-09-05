# AGENTS.md

个人博客仓库：Hexo 8 + Butterfly 主题，部署在 GitHub Pages（自定义域名 https://blogs.yzy15.dpdns.org，`source/CNAME`）。主分支是 `master`（不是 main），生产站点由 CI 构建推送到 `gh-pages` 分支。

## 常用命令（包管理器是 pnpm，Node 20）

```bash
pnpm install          # 安装依赖（首次或依赖变更后）
pnpm server           # 本地预览 http://localhost:4000
pnpm build            # hexo generate 生成静态文件到 public/
pnpm clean            # 清空 public/ 和 db.json
```

- `public/`、`db.json`、`.deploy_git/` 均已 gitignore，**不要提交**。
- 生成时 `scripts/obfuscate-js.js` 会对 `source/js/webinfo-stats.js` 和 `stats-renderer.js` 做混淆，只影响 public/ 产物，源码不受影响。
- `tools/` 下的 Python 脚本需要 Python 3.12 + `pyyaml`、`openai`、`deep-translator`（仅 CI 使用，本地改 posts 不需要跑它们）。

## 发布流程（重要）

**推送 `source/_posts/` 下任何改动到 master，会自动触发一系列工作流并回写 master**，请勿与它们并行抢改同一批文件：

| 工作流 | 触发条件 | 行为 |
|---|---|---|
| `deploy.yml` | push master / workflow_dispatch / sync-analytics 完成后 | `hexo clean && hexo generate`（先跑 `detect_langs.py` 重写 `_config.yml` 的 `language:` 列表），部署到 gh-pages |
| `translate.yml` | push master 且改动 `source/_posts/**/*.md` | 用 Google 翻译把新帖翻成 37 种语言，写入 `source/_posts/<lang>/` 子目录，自动 commit push |
| `ai-auto-update.yml` | push master + 每日 3:00 | 用 GPT 重写 `source/llms.txt`、frontmatter description、FAQ 标签，自动 commit push |
| `seo-optimization.yml` | push master + 每日 2:00 | 自动改写 frontmatter meta/tags，提交 IndexNow |
| `fetch-busuanzi.yml` | 每 2 小时 | 更新 `source/stats/views.json`、`history.json`（流量统计） |
| `sync-wordpress.yml` | 每日 2:00 | 从 WordPress.com 同步新帖到 `source/_posts/WordPress/` |

所有这些工作流都会以 `github-actions[bot]` 身份自动 commit 回 master——推送后一两分钟内 repo 可能自己发生变化，属正常现象。

## 文章约定

- 原文（简体中文）放 `source/_posts/*.md`（根目录）；`source/_posts/<lang-code>/` 下的译文是机器生成的，**只改中文原文，不要手改译文目录**。
- Frontmatter 惯例：`title` / `date: YYYY-MM-DD HH:mm:ss` / `sticky`（置顶）/ `categories` / `tags` / `cover`。`updated_option: 'mtime'`，URL 使用 `:title/`。
- `source/stats/views.json`、`offset.json`、`history.json` 由自动化维护，不要手工编辑。
- 新建文章建议用 scaffold：`hexo new post "标题"`（scaffolds/post.md）。

## 本地工具与安全

- `stats-manager.ps1` / `.bat` 是本地流量统计管理工具，**已 gitignore**。⚠️ 文件里硬编码了 GitHub PAT 和 sync key——严禁提交或分享该文件。
- `sync-wordpress.yml` 依赖的 `source/_posts/wordpress_sync.json`（已同步的 WordPress 文章 ID 记录）也被 gitignore——全新 clone 后首次同步会重复拉取历史文章（仓库里已存在 URL 编码的重复文件如 `%e5%85%ac%e5%91%8a.md` 与 `公告.md` 并存），属已知现象，清理时要小心。
