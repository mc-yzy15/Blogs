---
title: 从 0 到 1 搭博客：域名、HTTPS、CI 自动部署，一次说清
date: 2026-08-30 09:00:00
tags:
  - Hexo
  - Butterfly
  - GitHub Pages
  - CI
  - 博客搭建
  - 域名
  - 教程
categories:
  - 技术教程
description: 本博客从零到上线的完整过程复盘：为什么选 Hexo + Butterfly、自定义域名如何解析、HTTPS 怎么免费搞定、以及如何用 GitHub Actions 实现「推代码自动发布」，适合想自建博客又不想被各路旧教程带偏的读者。
keywords: Hexo教程, Butterfly主题, GitHub Pages部署, 自定义域名, GitHub Actions, CI部署, 博客搭建, hexo new, pnpm
---

# 从 0 到 1 搭博客：域名、HTTPS、CI 自动部署，一次说清

> 这篇是本站的「搭建复盘」。如果你也想搭一个自己的博客，希望这篇能让你少走几个我走过的弯路。教程里给到的命令以写作当天为准，具体版本号请以官网为准。

先说结论：**静态博客 + GitHub Pages + GitHub Actions，依然是一个人低成本拥有「完全属于自己」的写作空间的最优解。** 不是因为这套方案多先进，而是因为它足够无聊、足够稳定，几乎不会半夜把你叫起来修。

---

## 为什么是 Hexo，而不是别的东西

2026 年搭博客的可选项其实很多：VuePress、Astro、Hugo、Next.js 全家桶，甚至直接用语雀、Notion 套个域名。我最后选了 Hexo，理由很朴素：

1. **Node 生态，改起来不心虚。** 我是前端出身，遇到主题要魔改，至少能看懂在改什么。
2. **Markdown 即内容。** 源文件就是 `.md`，哪天 Hexo 不维护了，换个静态生成器把文件搬走就行——内容永远不锁死。
3. **主题成熟。** Butterfly 的配置项覆盖了日常几乎一切需求：标签页、分类页、友链、评论区、字数统计、暗色模式，开箱即用，不用自己造轮子。
4. **插件生态够老也够稳。** 语法高亮、sitemap、feed、离线搜索，都有现成方案。

如果你更看重构建速度和极简配置，Hugo 和 Astro 也完全值得试；但「想改就能改」这件事，在 Hexo 上对我这种人是最大加分项。

---

## 第一步：本地把博客跑起来

环境准备就一句话：**装好 Node.js 20+，包管理器用 pnpm**（npm 也行，只是 pnpm 更快更省磁盘）。

```bash
# 全局安装 hexo 命令行工具
npm install -g hexo-cli

# 初始化站点（my-blog 是目录名，可随便改）
hexo init my-blog
cd my-blog

# 换用 pnpm 管理依赖
rm pnpm-lock.yaml package-lock.json 2>/dev/null
pnpm install

# 本地预览
pnpm server
```

打开 `http://localhost:4000` 看到默认页面，就说明骨架通了。

几个我当时踩过的坑：

- **别在 Windows 上用 cmd 跑 `pnpm server` 后关不掉进程。** 按 `Ctrl+C` 不行就 `Ctrl+C` 两次，或者直接 `npx kill-port 4000`。后来我干脆装了 Windows Terminal，体验正常很多。
- **`hexo init` 拉的是默认主题 landscape，丑是正常的。** 下一步换主题就行。
- **Node 版本别太新也别太旧。** 太新的 Node 偶发原生模块编译问题，太旧跑不动新版 Hexo，LTS 最稳。

---

## 第二步：换上 Butterfly，改出「自己」的样子

主题安装很简单，把主题目录 clone 进 `themes/` 就行：

```bash
git clone https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
```

然后把站点根目录 `_config.yml` 里的 `theme: landscape` 改成 `theme: butterfly`。

重点来了：**Hexo 的配置分两层，别改错文件。**

- 站点根目录 `_config.yml`：管站点信息、语言、URL、插件。
- 主题目录 `themes/butterfly/_config.yml`：管外观、侧边栏、评论区、CDN 等。

主题配置直接改 `themes/` 里的文件有个坏处：**以后 `git pull` 更新主题会冲突。** 我的做法是复制一份主题配置到根目录，命名成 `_config.butterfly.yml`，Hexo 会优先合并它。这样主题升级时根目录这份配置不会丢。

推荐优先配置的几项：

- `nav` 菜单：首页、归档、分类、标签、友链。
- `avatar` 和 `blog_title`：先放个占位，后面再换真图。
- `comment`：挑一个评论系统。国内访问稳定性和配置成本要一起考虑。
- `lazyload` + `image CDN`：图片压一压，首屏会快很多。

配色和字体不用一步到位，博客是长期工程，**先用起来，再慢慢美化成自己喜欢的样子**，比憋大招然后烂尾强一百倍。

---

## 第三步：把博客从 localhost 送上公网

### 注册域名

在域名注册商买一个顺眼的域名，一年几十块到一百块不等。`.com` 最稳，个性化后缀便宜但续费可能很贵，买之前一定看清续费价。

### 把仓库推到 GitHub

新建一个仓库，比如 `username.github.io`（用户名仓库可以直接获得同名 Pages 域名），然后把本地仓库推上去：

```bash
git init
git add .
git commit -m "init blog"
git branch -M master
git remote add origin git@github.com:username/username.github.io.git
git push -u origin master
```

> 小知识：GitHub Pages 支持两种仓库来源——用户名仓库的 `master` 分支，或任意仓库的 `gh-pages` 分支。我现在用的就是「`master` 存源码 + Actions 构建到 `gh-pages`」这套，源码和产物彻底分开。

### 自定义域名 + HTTPS

在仓库 `Settings → Pages` 里填自定义域名，然后去 DNS 加一条 CNAME 记录指向 `username.github.io`。同时在仓库源码根目录放一个 `CNAME` 文件（内容就是你的域名），这样每次部署域名配置都不会丢。

**HTTPS 这块当年是老大难，现在简单多了：** 如果你的域名 DNS 托管在 Cloudflare，免费版就能开全站代理（橙色云朵），HTTPS 自动搞定，还能白嫖一层 CDN 和防 DDoS。GitHub Pages 官方给的证书对自定义域名也支持得越来越好了，但 Cloudflare 方案对国内访问速度的改善是实打实的。

我第一次部署后 HTTPS 迟迟不生效，排查了半天发现是 **DNS 解析还没全球生效**。不同地区 DNS 刷新速度差异很大，等半小时到几小时再去检查，别急着重试把缓存搞乱。

---

## 第四步：用 GitHub Actions 实现「推代码就自动发布」

手动构建、手动 push `public/` 是初期的常态，但人总会忘，而且 `public/` 和 `db.json` 本来就不该进 git。正确的姿势是：**源码进 git，产物交给 CI。**

我的工作流大致长这样（`.github/workflows/deploy.yml`）：

```yaml
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm build
      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

一个很关键的点：**推送用的 token 用 `GITHUB_TOKEN` 就够了**，不要图省事往 secrets 里塞一个写死的大权限 PAT，权限最小化是基本修养。

部署完成后，写文章就变成一件很舒服的事：

```bash
hexo new post "标题"
# 打开文件开始写
pnpm build   # 本地先预览确认
git add . && git commit && git push
```

剩下的交给 Actions，一两分钟后线上就是新的了。

---

## 折腾完之后，我后悔没早知道的事

1. **图片和静态资源越早定规矩越好。** 我一开始随手贴图，导致后来图片散落在各目录、体积失控，逼着加了压缩和 CDN。新站建议一开始就定好图片目录和引用方式。
2. **`db.json`、`public/` 一定要 gitignore。** 忘了的话每次提交都在制造冲突和噪音。
3. **备份是刚需，但没必要过度设计。** GitHub 本身就是分布式备份，关键是要保证「仓库里有且只有源码」——这样无论换电脑还是换生成器，恢复成本都极低。
4. **别在刚建站时就追求「完美」。** 主题、评论区、统计代码都可以后补。先写够 10 篇像样的文章，比先打磨 10 天 UI 有价值得多。

---

## 写在最后

搭博客最难的从来不是技术，而是**决定开始写，并且持续写**。这套流水线跑通之后，写博客的成本会低到「打开编辑器就能写」，这才是它能坚持下来的原因。

如果看完还是觉得麻烦——那也正常，说明你还没被某个平台折腾够。等你被折腾够了，欢迎回来翻这篇。

本站的完整源码就在 GitHub 上，主题、配置、工作流都可以直接看。祝你早日拥有一个完全属于自己的角落。

*（文中版本号与操作路径以 2026 年 8 月为准，如官方有更新以官方文档为准。）*
