---
title: 从 Vercel 迁移到 Cloudflare：一条可回退的完整路径
date: 2026-09-13 15:00:00
categories: 云计算
tags:
  - 迁移
  - Vercel
  - Cloudflare
  - 边缘计算
description: 面向已经跑在 Vercel 上的 Next.js 团队，拆解迁移到 Cloudflare Workers 的完整路径：为什么迁移、能力差异矩阵、代码改造清单、分阶段切换节奏与回退开关。读完你能拿到一份可执行的迁移检查表，而不是一句"换平台就行"。
keywords: Vercel 迁移, Cloudflare Workers, 边缘计算, Next.js, 迁移方案, 回退策略
---

# 从 Vercel 迁移到 Cloudflare：一条可回退的完整路径

Vercel 和 Cloudflare 都是"前端优先"的平台，但它们的底层假设完全不同：Vercel 假设你的应用是一个构建产物 + Serverless Function 的集合，Cloudflare 假设你的应用是一段跑在边缘的 JavaScript/Wasm 程序。这个差异决定了迁移不是"换个 Git 远程"，而是一次架构上的重新归档。

本文只谈路径与取舍，不谈营销。目标读者是已经把 Next.js 应用跑在 Vercel 上、正在评估成本与可控性的团队。

## 为什么要迁移：先把动机说清楚

迁移的动机通常只有三类，且必须至少命中两类才值得动手。

第一类是**成本结构**。Vercel 的计费颗粒度偏向"函数调用 + 边缘请求 + 构建时长"，流量上量后账单曲线较陡。Cloudflare 的 Workers 模型以请求数和 CPU 时间为计量核心，静态资源与出网流量在多数套餐里更宽松。量级上，中高流量站的月度差额可能到数倍，但具体以两家官方定价页为准。

第二类是**控制力**。Cloudflare 允许你在请求进入应用之前插入自定义路由、缓存规则、WAF 与 Bot 管理，且这些能力在同一套配置体系里。Vercel 的中间件虽然能改写请求，但它在平台抽象层之内，遇到"我想在边缘直接操作 TLS 或做 IP 级策略"时会撞到天花板。

第三类是**架构收敛**。如果你已经用了 R2、D1、KV、Durable Objects，把计算放在 Cloudflare 上能显著减少跨云往返延迟，这是纯粹的性能收益。

> 经验法则：如果迁移动机里只有"便宜"，先别迁。成本差异往往会被重写成本和运维复杂度吃掉。

## 能力差异矩阵：哪些能平移，哪些要重写

| 能力维度 | Vercel 上的形态 | Cloudflare 上的对应物 | 迁移难度 |
|---|---|---|---|
| 静态托管 | 构建产物自动 CDN 分发 | Pages 或 Workers Static Assets | 低 |
| SSR / API | Node.js Serverless Function | Workers（V8 isolate，非 Node） | 中高 |
| 中间件 | `middleware.ts` | Workers 本身的请求处理链 | 中 |
| 增量缓存 | ISR / Data Cache | Cache API + KV 手动实现 | 高 |
| 定时任务 | Cron Jobs | Cron Triggers | 低 |
| 对象存储 | Blob | R2 | 低（API 需适配） |
| 数据库 | Postgres / KV 市场集成 | D1 / Hyperdrive / 外部库 | 中高 |
| 长连接 | 受限 | Durable Objects / WebSocket | 中 |

最需要警惕的是运行时的差异。Workers 用的是 V8 isolate，不是完整 Node.js：没有 `fs`、没有原生 `net`、`process` 是受限 shim。任何依赖原生模块（图片处理、PDF 生成、加密库绑定）的路径都要重新实现或改为调用外部服务。

## 代码改造的三个高频点

**第一，运行时检测与垫片。** 很多库在加载时会探测 `typeof window`、`process.version`。在 Workers 里这类探测会误判，需要显式指定边缘目标。

```ts
// next.config.ts —— 明确告知构建器运行环境
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 让依赖按 edge runtime 解析，避免被打包成 Node 目标
  experimental: {
    serverComponentsExternalPackages: [],
  },
  env: {
    RUNTIME_FLAVOR: "workers",
  },
};

export default nextConfig;
```

**第二，缓存语义重写。** Vercel 的 `revalidate` 是平台替你管理的；Workers 里你得自己决定写哪一层缓存。

```ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cache = caches.default;
    const hit = await cache.match(request);
    if (hit) return hit;

    const res = await fetch(request);
    const cached = new Response(res.body, res);
    // 只在 GET 且响应可缓存时才写入
    if (request.method === "GET" && res.status === 200) {
      cached.headers.set("Cache-Control", "public, max-age=60");
      ctx.waitUntil(cache.put(request, cached.clone()));
    }
    return cached;
  },
};
```

**第三，环境变量的读取方式。** Vercel 的 `process.env` 在构建期与运行期都可读；Workers 用 `env` 绑定对象，且机密是运行时注入，不会进入 bundle。这实际上是好事，但也意味着任何"构建期读取机密"的写法都要改掉。

## 分阶段切换：别想着一次切完

推荐的四阶段节奏：

1. **旁路验证**：把 Cloudflare 版本部署到独立子域，用生产流量的影子副本压测，观察错误率与 P95 延迟差异。
2. **静态优先切换**：先把静态资源与图片托管切过去，DNS 用低 TTL 记录，验证 CDN 命中率。
3. **读接口切换**：API 的只读部分切到边缘，写路径仍回源到旧平台，此时两套并存。
4. **全量切换**：写路径切换，旧平台降级为冷备，保留至少一个发布周期再下线。

关键设计是**一个可控的回退开关**。最可靠的做法不是"再改一次 DNS"，而是在 Cloudflare 侧配置一条路由规则，按请求头把流量打回旧源站：

```toml
# wrangler.toml 片段
[[routes]]
pattern = "api.example.com/*"
zone_name = "example.com"

[vars]
FALLBACK_ORIGIN = "https://legacy.example.com"
ROLLBACK_HEADER = "x-force-legacy"
```

当 P95 延迟劣化或错误率超过阈值时，只需在网关层统一注入 `x-force-legacy: 1`，即可秒级把流量导回旧平台，而不用等待 DNS 传播。

## 风险清单：迁移前必须逐条确认

- **冷启动与并发模型**：Workers 的 isolate 冷启动通常在毫秒到数十毫秒量级，远优于容器，但首次请求仍可能触发模块初始化。
- **子请求上限**：单次请求内的 `fetch` 数量有上限，扇出型聚合接口需要改造为批量或串行。
- **CPU 时间配额**：计费基于 CPU 时间而非墙上时间，CPU 密集任务（如图片转码）必须外移。
- **本地开发一致性**：`wrangler dev` 的模拟与生产仍有差异，尤其是 D1 与队列的边界行为。
- **可观测性迁移**：日志、Trace、告警要重新接线，别等出事才发现没有 dashboard。
- **回退窗口**：旧平台的数据写入在切换期间如何处理，必须有明确的"单一写入方"规则，否则会出现双写冲突。

## 结论与决策建议

从 Vercel 迁移到 Cloudflare，本质上不是"换供应商"，而是从"平台托管应用"切换到"你自己编排边缘程序"。如果团队里有能读懂 isolate 限制、愿意自己实现缓存和增量逻辑的工程师，迁移是划算的；如果团队追求的是"零运维"，那留在原平台、只把重流量路径（图片、静态、防护）外包给 Cloudflare，往往是更好的折中。

> **说明：** 本文为个人技术分析，基于两家平台公开的产品模型与笔者实践经验整理。文中提到的配额、延迟与成本量级均为示意，具体数值随套餐与版本变化，请以 Cloudflare 与 Vercel 官方最新定价及文档为准。迁移决策请结合自身流量特征与团队能力评估。
