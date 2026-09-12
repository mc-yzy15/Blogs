---
title: 从 Netlify 迁移到 Cloudflare：静态站与函数的分手清单
date: 2026-09-13 15:02:00
categories: 云计算
tags:
  - 迁移
  - Netlify
  - Cloudflare
  - 静态站点
description: 针对以静态站点和 Netlify Functions 为主的项目，梳理迁移到 Cloudflare Pages 与 Workers 的具体清单：构建命令、重定向规则、表单、边缘函数与身份鉴权的逐项替换方案，并给出迁移顺序与验收标准。
keywords: Netlify 迁移, Cloudflare Pages, Netlify Functions, 静态站点, 重定向, 迁移清单
---

# 从 Netlify 迁移到 Cloudflare：静态站与函数的分手清单

如果你的站点是 Astro、Hugo、Jekyll 或其他 SSG 产物，挂在 Netlify 上，迁移到 Cloudflare 的难度远低于从 Vercel 迁移。原因很简单：静态站的抽象层最薄，平台差异主要体现在构建配置和几个附加服务的命名上。真正会卡住人的，往往是那些"Netlify 替你默默做了"的隐形能力。

## 迁移前的能力盘点

Netlify 把构建、部署、重定向、表单、身份、边缘函数打包成了一个整体体验。Cloudflare 把对应能力拆成了 Pages、Workers、Access、Turnstile 等独立产品。拆开之后你可以只用需要的部分，但也意味着要多做几次配置。

| Netlify 能力 | Cloudflare 对应 | 需要额外做的事 |
|---|---|---|
| Build & Deploy | Pages 构建流水线 | 指定构建镜像与 Node 版本 |
| `_redirects` 文件 | `_redirects` 兼容支持 | 优先级与通配略有差异 |
| Netlify Functions | Pages Functions / Workers | 目录约定不同 |
| Netlify Identity | Cloudflare Access | 定价模型与用户体系需重建 |
| Netlify Forms | Workers + 邮件/存储服务 | 需要自己写接收端点 |
| Netlify Edge Handlers | Workers | 需改写为 fetch 处理器 |
| Deploy Previews | Pages 预览部署 | 几乎等价，成本更低 |

其中表单和身份是最容易低估的两项。Netlify Forms 是"零代码"能力，换成 Cloudflare 后你必须自己拿一个 Worker 接住 POST、做校验、落库或发信。

## 构建配置的逐项对齐

Netlify 用 `netlify.toml` 描述构建；Pages 用 `wrangler.toml` 加面板或 Git 集成。把这两者对齐是迁移的第一步。

```toml
# wrangler.toml —— Pages 项目的最小配置
name = "blog-static-site"
pages_build_output_dir = "dist"
compatibility_date = "2026-09-01"

[vars]
SITE_ENV = "production"

# 本地开发时的绑定
[[kv_namespaces]]
binding = "CACHE_KV"
id = "REPLACE_WITH_REAL_ID"
```

对应地，构建命令要在 Pages 面板里显式声明，例如 `pnpm build`，并在环境变量里锁定 `NODE_VERSION`。这一步看起来琐碎，但它是"构建在 CI 上失败、本地却成功"类问题的最大来源。

重定向规则的差异值得单独提。Netlify 的 `_redirects` 支持 `/*` 通配和 `200` 强制改写；Pages 对 `_redirects` 的支持覆盖了常见语法，但通配符的贪婪匹配顺序仍按行序，遇到多条规则命中时要按"更具体在前"的原则排列。

```text
# public/_redirects
/old-blog/*    /posts/:splat    301
/api/legacy/*  /api/v2/:splat   200
```

## 边缘函数与表单的替代实现

Netlify Functions 的目录约定是 `netlify/functions/`，Pages Functions 是 `functions/`，且通过文件路径映射路由。迁移时不要试图做"一对一自动转换"，而是按路由重新设计。

```ts
// functions/api/contact.ts —— 替代 Netlify Forms 的接收端点
interface Env {
  CONTACT_QUEUE: Queue;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get("email") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();

  // 基础校验：拒绝空值与超长输入
  if (!email || email.length > 254 || message.length > 5000) {
    return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  await context.env.CONTACT_QUEUE.send({
    email,
    message,
    receivedAt: new Date().toISOString(),
  });

  return Response.json({ ok: true }, { status: 202 });
};
```

要点有三个：一是入参必须做长度与格式校验，因为边缘端点直接暴露在公网；二是把耗时逻辑丢进队列而不是在请求里同步处理，避免 CPU 时间超限；三是返回结构化错误码，方便前端做差异化提示。

如果你原本依赖 Netlify Identity 做登录，迁移到 Cloudflare Access 意味着用户体系要重建。Access 更偏向"企业内部应用的门禁"，而非面向消费者的注册登录。面向公众的站点如果用它，通常需要配合自己的用户表，把 Access 当作一层边缘鉴权，而不是完整的身份系统。

## 迁移顺序与验收标准

推荐按下面顺序推进，每一步都有明确的验收项：

1. **静态产物上线**：Pages 预览部署能正常渲染，验收项是首屏 LCP 与 Netlify 版本差异在可接受范围内。
2. **重定向等价性**：抓取站点全部内链与已知外链，逐条比对状态码，验收项是零意外的 404。
3. **函数端点切换**：先切只读接口，验收项是错误率与 P95 延迟不劣化。
4. **写路径与表单**：最后切，验收项是端到端提交链路可用且有告警。
5. **DNS 切换**：降低 TTL 后再切，验收项是解析全球生效。
6. **旧平台观察期**：保留一个发布周期，验收项是无流量后下线。

> 提醒：Netlify 的 Deploy Previews 与 Pages 预览部署在体验上很接近，但预览环境的环境变量隔离策略不同。别在预览环境里放生产机密，否则迁移过程本身就是一次泄露风险。

## 常见坑与应对

- **构建缓存路径不同**：依赖缓存的命中率下降会导致构建变慢，必要时在 CI 里显式缓存 `node_modules`。
- **Node 版本漂移**：Netlify 会自动选版本，Pages 需要显式声明，建议在 `package.json` 的 `engines` 与面板变量里双重锁定。
- **大文件与 LFS**：静态资源超过单文件限制时要改用 R2 直链，而不是硬塞进构建产物。
- **SEO 与 sitemap 域名**：切换后 sitemap 与 canonical 必须同步更新，否则会在搜索侧产生重复内容。
- **Webhook 与回调地址**：任何注册在 Netlify 域名下的第三方回调都要重新登记。

整体而言，静态站迁移 Netlify 到 Cloudflare 的性价比很高：风险面窄、回退容易（DNS 层即可），成本通常更低。真正需要投入的是表单、身份与边缘逻辑这三块，它们不是"配置差异"，而是需要重新实现的业务能力。

> **说明：** 本文为个人技术分析，涉及的产品能力与配置项基于公开文档整理，可能随版本更新而变化。文中代码为示意性实现，未包含生产所需的鉴权、限流与审计逻辑，请以 Cloudflare 与 Netlify 官方最新文档为准。
