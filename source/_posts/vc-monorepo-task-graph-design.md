---
title: Turborepo 任务图怎么设计：从 workspace 拓扑到增量构建
date: 2026-09-13 20:00:00
categories: 云计算
tags:
  - Turborepo
  - Monorepo
  - 构建系统
  - 工程效能
description: 拆解 Turborepo 如何根据 workspace 依赖自动推导任务图，讲清 dependsOn、拓扑依赖与增量构建的协作机制，并给出在 Vercel 上合理设计任务图的实践建议。
keywords: Turborepo, 任务图, monorepo, dependsOn, 增量构建, Vercel, workspace
---

# Turborepo 任务图怎么设计：从 workspace 拓扑到增量构建

在 monorepo 里跑构建，最费时间的往往不是编译本身，而是「不知道该跑什么、该跑什么顺序」。Turborepo 的核心价值就是把这件事从人工脚本里抽出来，交给一个基于依赖关系的任务图（Task Graph）来自动决策。理解这张图是怎么被推导出来的，比记住几个命令重要得多。

## 任务图从哪里来：workspace 拓扑是地基

Turborepo 并不会猜测你的结构。它读取两样东西：`pnpm-workspace.yaml`（或 package.json 的 workspaces）声明的包列表，以及每个包 `package.json` 里的 `dependencies` / `devDependencies`。

当 `apps/web` 依赖 `packages/ui`，Turborepo 就知道：跑 `web` 的 build 之前，`ui` 的 build 必须完成。这种「包级别」的依赖构成了图的骨架，通常称为拓扑（topology）。

```bash
# 查看 Turborepo 推导出的完整任务图
turbo run build --graph

# 只看某个包及其依赖子图
turbo run build --graph=web.dot --filter=web
```

`--graph` 会导出一份 Graphviz dot 文件，把图渲染出来是排查「为什么某个包被重复构建」最直接的手段。很多团队觉得 CI 慢，实际是拓扑里藏了一条不该存在的依赖边。

## pipeline 与 dependsOn：把语义告诉构建器

`turbo.json` 的 `pipeline`（新版本里叫 `tasks`）字段用来声明「一个任务内部还要依赖哪些任务」。这层信息无法从 package.json 自动推导，必须手动声明。

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "dependsOn": [],
      "cache": true
    }
  }
}
```

这里有两个细节最容易出错：

- `"^build"` 中的 `^` 表示**上游依赖包的 build**，是拓扑方向；写成 `"build"` 则表示**同一个包内的 build**，是先后置任务。
- `outputs` 决定了缓存要保存什么。建得不对，缓存命中后目录是空的，构建照样重跑。

一句话经验：`^` 管跨包，无 `^` 管包内。

## 增量构建与缓存命中：图是静态的，缓存是动态的

任务图在一次运行内是相对静态的，但每个节点是否真正执行，取决于内容哈希。Turborepo 会为每个任务计算一个哈希，输入包括：任务命令、环境变量（`env` 声明的）、相关源文件内容、以及上游包的哈希。

| 变更类型 | 是否影响下游哈希 | 典型后果 |
|---|---|---|
| 修改 packages/ui 源码 | 是 | ui 与所有依赖它的应用全部重跑 |
| 只改 apps/web 的一个页面 | 否 | 仅 web 本身重跑 |
| 新增一个未声明的环境变量 | 否（除非列入 env） | 缓存命中但行为错误，属于隐性 bug |
| 改动 turbo.json 中 outputs | 是 | 全量失效，需要重建 |
| 升级共享的 tsconfig | 是 | 视是否被读取为输入而定 |

第三行是最危险的：环境变量如果不写进 `env` 或 `globalEnv`，本地构建出来的产物和 CI 上可能完全不同，而缓存会把这个错误稳定复现。

## 并行度与并发控制：图越宽越快，但别把机器打满

任务图的执行是并行化的：同层无依赖的节点可以同时跑。Turborepo 默认按 CPU 核数决定并发度，也可以用 `--concurrency` 手动指定。

需要注意 IO 密集与 CPU 密集任务混跑的问题。Next.js 构建会大量占用 CPU 和内存，同时跑五个应用级 build 往往让单机 swap，反而比串行更慢。更稳的做法是分组：

```bash
# 先并行跑所有库的构建（快、无服务依赖）
turbo run build --filter="./packages/*"

# 再按应用逐个跑，控制内存峰值
turbo run build --filter="./apps/*" --concurrency=2
```

在 Vercel 上，构建机规格由所选套餐决定，并发过高会导致 OOM 被杀。把并发当作需要观测的调参项，而不是越大越好。

## 常见图设计反模式

以下几种结构几乎一定会在规模上来后拖慢流水线：

1. **万能 shared 包**：把工具函数、类型、常量、组件全塞进一个 `packages/shared`，导致任何小改动都让整张图重跑。应按领域切分。
2. **应用之间互相依赖**：`apps/a` 依赖 `apps/b`，拓扑立刻退化成链，并行度归零。应用之间应通过接口而非源码依赖。
3. **循环依赖**：pnpm 会报警但未必阻断，Turborepo 可能报无法排序。必须在 CI 加检测。
4. **devDependencies 里放运行时依赖**：构建顺序看起来对，但裁剪产物时会缺依赖。
5. **只在根 package.json 里放脚本**：任务粒度太粗，缓存复用率直线下降。

## 取舍：任务图越精细越好吗

精细化能提高缓存命中率，但会带来维护成本。包切得越碎，`turbo.json` 越复杂，开发者越难判断「我改了这个文件到底会影响什么」。

笔者的建议是分层：稳定的基础设施（lint、typecheck）保持全局单任务；业务包按领域划分为 5~15 个；应用层作为图的出口，不反向被依赖。这个粒度在几十人团队里通常够用，再往上就该考虑远程缓存与分布式执行了。

> **说明：** 本文为原创技术分析，所述 Turborepo 行为基于其公开文档与常见实践归纳，具体字段名（如 `pipeline` 与 `tasks`）随版本演进以官方最新文档为准；文中性能表述为量级描述，非精确基准数据。观点部分为主观判断，不代表 Vercel 官方立场。
