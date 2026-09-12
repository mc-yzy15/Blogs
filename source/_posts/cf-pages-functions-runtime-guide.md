---
title: Pages Functions 实战：在静态站点里安全地嵌入动态能力
date: 2026-09-13 11:06:00
categories: 云计算
tags:
  - Pages Functions
  - 边缘计算
  - 绑定管理
description: Pages Functions 让静态站点获得动态能力，但它不是「免费的后端」。本文从绑定管理、敏感信息隔离、请求生命周期与错误处理四个角度，讲解如何在不破坏静态站点简单性的前提下引入动态逻辑，并给出可复用的中间件写法。
keywords: Pages Functions, 边缘运行时, 环境变量, 中间件, 绑定, 错误处理
---

# Pages Functions 实战：在静态站点里安全地嵌入动态能力

静态站点的最大优点是简单：没有运行时、没有状态、没有失败模式。引入 Pages Functions 的那一刻，这三样东西全部回来了。于是问题变成：如何只取走动态能力，而不把后端的复杂度一并接管。

答案在于克制。Functions 适合做"薄"的事情——鉴权、代理、重写、聚合，而不适合承载业务流程。本文讨论这条线该怎么画，以及画好之后代码该怎么写。

## 绑定：能力与约束的同一枚硬币

Functions 通过绑定访问外部资源：KV 做缓存、D1 做关系数据、R2 做对象存储、队列做异步。绑定是平台给能力的方式，同时也是约束的来源：

- **绑定是环境级的**。预览与生产可以使用不同的绑定，这是做数据隔离的基础。
- **绑定是声明式的**。你需要显式声明用到哪些资源，未声明的资源无法访问——这其实是好事，它让依赖关系可见。
- **绑定有配额**。读写次数、存储量、请求数都有上限，静态站点突然"变贵"往往是因为某段代码在高频路径上访问了付费资源。

一个常见反模式是：在 Functions 里用 KV 做"每次请求都读一次"的配置存储。请求量上来后，KV 读次数会以请求量级增长。正确做法是在模块作用域内做一次性缓存，或者干脆把配置内联。

```js
// 模块作用域缓存：同一个 isolate 内只解析一次
let cachedConfig = null;

async function getConfig(env) {
  if (cachedConfig) return cachedConfig;
  const raw = await env.CONFIG_KV.get("site-config", "json");
  cachedConfig = raw ?? { featureFlags: {} };
  return cachedConfig;
}

export async function onRequestGet({ env, request }) {
  const cfg = await getConfig(env);
  if (!cfg.featureFlags.beta) {
    return new Response("not found", { status: 404 });
  }
  return env.ASSETS.fetch(request);
}
```

注意 `cachedConfig` 的生命周期：它存在多久取决于 isolate 是否被回收，因此**只能用于"最终一致即可"的配置**，不能用于权限判断这类强一致场景。

## 敏感信息：运行期注入，永不进产物

这是安全边界上最容易犯错的地方。需要记住一个硬规则：

> **任何进入构建产物的值都应当被视为公开值。** 构建后的静态文件会被分发到边缘节点、会被缓存、会被下载，没有任何"前端私有变量"这种东西。

因此：

- 对外可暴露的配置（站点名、公开 API 基址）可以走构建期变量。
- 凭据、密钥、上游 token 一律走运行期变量（secret），只在 Functions 中读取。
- 不要在 Functions 里把 secret 拼进响应体，哪怕是为了调试。
- 不要用 secret 作为缓存键的一部分。

```js
// 正确：只在服务端使用凭据，并且不把它写进日志
export async function onRequestPost({ request, env }) {
  const token = env.UPSTREAM_TOKEN;
  if (!token) {
    // 失败要 fail fast，而不是回退到某个默认值
    return new Response("server misconfigured", { status: 500 });
  }

  const body = await request.text();
  const res = await fetch("https://upstream.example.com/ingest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body,
  });

  // 不要把上游原始响应直接透传，避免泄露内部错误细节
  return new Response(res.ok ? "ok" : "upstream error", {
    status: res.ok ? 200 : 502,
  });
}
```

这里刻意做了两件事：**缺配置就 500**（而不是静默降级），以及**不透传上游响应体**（避免内部信息泄露）。这两点在生产环境里能挡掉大量事故。

## 请求生命周期：中间件该怎么组织

Functions 支持基于文件路径的路由，也支持 `_middleware` 形式的中间件。中间件的价值在于把横切关注点从业务代码里抽出来：

1. **安全响应头**：统一加 `X-Content-Type-Options`、`Referrer-Policy`、CSP。
2. **鉴权**：校验会话或签名，未通过直接短路。
3. **可观测性**：注入请求 ID、记录耗时、采样上报。
4. **重写与规范化**：尾斜杠、大小写、旧路径跳转。

中间件的顺序很重要，推荐从"最便宜且最严格"的检查开始：先做静态拦截（大小写、路径规范性），再做鉴权，最后才做需要外部依赖的事。

```js
// functions/_middleware.js：一个精简但完整的中间件骨架
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 1. 规范化：路径大小写与尾斜杠
  if (url.pathname !== url.pathname.toLowerCase()) {
    return Response.redirect(new URL(url.pathname.toLowerCase(), url).toString(), 308);
  }

  // 2. 鉴权（示意：真实场景应校验签名或会话）
  const authed = request.headers.has("authorization");
  if (url.pathname.startsWith("/admin") && !authed) {
    return new Response("unauthorized", { status: 401 });
  }

  // 3. 交给后续处理
  const res = await next();

  // 4. 统一安全响应头
  const headers = new Headers(res.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return new Response(res.body, { status: res.status, headers });
}
```

中间件的一个副作用是它会影响**所有**匹配路径，包括静态资源。对静态资源做鉴权通常不是你想要的；因此要么把中间件放在更深的目录，要么在代码里显式跳过 `/_assets/*` 之类的路径。

## 错误处理：静态站点的失败模式

静态站点几乎不会失败，Functions 会。失败模式大致有三类：

| 失败类型 | 典型原因 | 应对方式 |
|---|---|---|
| 配置缺失 | 绑定了不存在的 secret/env | 启动即失败，返回 5xx 而非降级 |
| 上游超时 | 外部 API 慢或不可达 | 设置超时 + 有限重试 + 降级响应 |
| 运行时异常 | 代码 bug、类型错误 | 全局 try/catch，返回通用错误 |

关键设计原则是：**不要让 Functions 的失败影响静态内容**。如果某个动态接口挂了，页面主体应该照常渲染。这需要在架构上做隔离——把动态接口放在独立路径（`/api/*`）下，静态页面不要依赖它的同步返回。

```js
// 全局异常兜底：返回通用错误，细节留在服务端日志
export async function onRequest(context) {
  try {
    return await context.next();
  } catch (err) {
    console.error("unhandled", err && err.message);
    return new Response("internal error", { status: 500 });
  }
}
```

注意 `console.error` 只输出 `message` 而非整个错误对象——错误对象可能携带请求上下文甚至凭据。日志脱敏不是可选项。

## 什么时候不该用 Functions

最后给出一条边界建议。以下场景不建议用 Functions 承载：

- 需要超过单次请求时长上限的耗时任务（应改用队列或长任务编排）。
- 需要强一致事务的多步写入（应使用数据库能力并做幂等设计）。
- 需要大量并发扇出的聚合请求（容易触及子请求限制）。
- 有复杂依赖树的业务逻辑（边缘运行时不适合跑重依赖）。

判断标准可以简化为一句话：**Functions 适合做"在请求路径上必须同步完成"的少量工作**。任何"可以晚一点再做"的事情，都应该放到队列或定时任务里。这条线守住了，静态站点的简单性就能保住大半。

> **说明：** 本文代码片段为工程示意写法，具体 API 名称、绑定类型与限制条件请以 Cloudflare 官方最新文档为准；文中关于配额与失败模式的描述为经验性总结，不同套餐与运行环境可能存在差异。观点部分为笔者主观判断。
