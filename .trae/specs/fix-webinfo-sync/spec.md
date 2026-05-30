# 网站信息板块数据同步修复 + Stats 页面增强 Spec

## Why

网站信息板块（侧边栏 card_webinfo）的访客数和总流量显示为固定值，与 Stats 页面数据不同步。根本原因是 Busuanzi 原生脚本（async 加载）与 webinfo-stats.js 之间存在竞态条件：两者同时写入同一个 DOM 元素，Busuanzi 可能在 webinfo-stats.js 写入合并数据后覆盖为真实小数据。当前 webinfo-stats.js 依赖静态 views.json 快照，数据始终滞后。所有前端展示数据应当动态拉取，不应依赖静态 JSON 文件作为主数据源。Stats 页面功能单薄，缺少分时段统计（24h/7d/30d）和可视化折线图。

## What Changes

- 修改 `source/js/webinfo-stats.js` — 改用 MutationObserver 等待 Busuanzi 实时填充 DOM 后叠加 offset，消除竞态条件；移除对 views.json 的依赖
- 修改 `source/js/stats-renderer.js` — 总 PV/UV 改为从 Busuanzi 实时 DOM 读取 + offset；新增折线图渲染（24h/7d/30d）；分类/文章排行仍从 views.json + offset 读取
- 修改 `source/stats/index.md` — 添加隐藏的 Busuanzi 数据容器；添加折线图容器 DOM；添加 Chart.js CDN 引用
- 新增 `source/stats/history.json` — 小时级 PV/UV 快照历史数据（由 GitHub Action 服务端写入，前端只读），供折线图使用
- 修改 `tools/fetch_busuanzi.py` — 每次拉取时追加当前时间戳快照到 history.json（小时级粒度）
- 修改 `.github/workflows/fetch-busuanzi.yml` — cron 改为每 2 小时运行一次；提交时包含 history.json
- 新增 `scripts/obfuscate-js.js` — Hexo after_generate 钩子，编译部署时对关键 JS 文件混淆加密
- 安装 `javascript-obfuscator` 开发依赖

## Impact

- Affected specs: `fix-stats-data-consistency`（前一版修复方案，本次替代其核心逻辑）
- Affected code: `source/js/webinfo-stats.js`, `source/js/stats-renderer.js`, `source/stats/index.md`, `source/stats/history.json`(新增), `tools/fetch_busuanzi.py`, `.github/workflows/fetch-busuanzi.yml`, `scripts/obfuscate-js.js`(新增), `package.json`

## ADDED Requirements

### Requirement: 动态 Busuanzi 数据读取 + Offset 叠加

系统 SHALL 在前端通过 MutationObserver 动态读取 Busuanzi 实时数据并叠加 offset，确保网站信息板块与 Stats 页面数据一致且实时。**站点 PV/UV 的主数据源为 Busuanzi 实时 DOM 数据，不依赖任何静态 JSON 文件。**

#### Scenario: Busuanzi 正常加载（主路径）
- **WHEN** Busuanzi 原生脚本加载完成并填充 DOM 元素（`#busuanzi_value_site_pv` / `#busuanzi_value_site_uv`）
- **THEN** webinfo-stats.js 通过 MutationObserver 检测到 DOM 变更
- **AND** 读取 Busuanzi 实时 PV/UV 值（纯数字，Busuanzi 已写入）
- **AND** 从 offset.json 读取偏移量，计算 displayValue = busuanziValue + offset
- **AND** 将 displayValue 写回 DOM 元素
- **AND** 断开 MutationObserver，防止 Busuanzi 后续再次覆盖

#### Scenario: Busuanzi 加载失败或超时（降级路径）
- **WHEN** Busuanzi 脚本在 10 秒内未填充 DOM 元素
- **THEN** 回退到 views.json + offset.json 的静态数据方案（仅作为降级，非主路径）
- **AND** 在控制台输出警告信息

#### Scenario: Stats 页面总 PV/UV 展示
- **WHEN** 用户访问 `/stats/` 页面
- **THEN** 页面包含隐藏的 Busuanzi 数据容器（`display:none` 的 span，ID 为 `busuanzi_value_site_pv` / `busuanzi_value_site_uv`）
- **AND** Busuanzi 脚本会自动填充这些隐藏元素
- **AND** stats-renderer.js 通过 MutationObserver 读取实时值 + offset.json，显示在概览卡片中
- **AND** 分类排行和文章排行仍从 views.json + offset.json 计算
- **AND** 数据更新时间标注为"Busuanzi 实时数据"

#### Scenario: 数据一致性保证
- **WHEN** 页面完全加载完成
- **THEN** 网站信息板块的 PV/UV 与 Stats 页面的总 PV/UV 显示相同数值
- **AND** 该数值 = Busuanzi 实时值 + offset 偏移量
- **AND** 数值随 Busuanzi 数据实时变化，非静态快照

### Requirement: Stats 页面分时段折线图

系统 SHALL 在 Stats 页面展示 PV/UV 的分时段趋势折线图，支持 24 小时（小时级）、7 天（日级）、30 天（日级）三种视图，使用 Chart.js 渲染。

#### Scenario: 折线图数据来源
- **WHEN** Stats 页面加载
- **THEN** 从 `/stats/history.json` 获取小时级 PV/UV 历史快照数据
- **AND** history.json 格式为：
  ```json
  {
    "snapshots": [
      { "ts": "2026-05-31T08:00:00Z", "pv": 7214108, "uv": 506025 },
      { "ts": "2026-05-31T10:00:00Z", "pv": 7214150, "uv": 506030 }
    ]
  }
  ```
- **AND** 每条快照的 pv/uv = Busuanzi 累计值 + offset（由 GitHub Action 在服务端计算并写入）
- **AND** 前端通过计算相邻快照的差值得到增量 PV/UV（如 10:00 的增量 PV = 10:00 累计 PV - 08:00 累计 PV）

#### Scenario: 24 小时视图
- **WHEN** 用户选择"24小时"视图
- **THEN** 折线图显示最近 24 小时的小时级增量 PV/UV
- **AND** X 轴为时间点（如 "08:00", "10:00"），Y 轴为增量值
- **AND** 数据粒度约 2 小时（取决于 GitHub Action 运行频率）

#### Scenario: 7 天视图
- **WHEN** 用户选择"7天"视图
- **THEN** 折线图显示最近 7 天的日级增量 PV/UV
- **AND** X 轴为日期（如 "05-25", "05-26"），Y 轴为当日增量值
- **AND** 当日增量 = 当日最后一个快照累计值 - 前一日最后一个快照累计值

#### Scenario: 30 天视图（默认）
- **WHEN** 用户选择"30天"视图或首次加载
- **THEN** 折线图显示最近 30 天的日级增量 PV/UV
- **AND** X 轴为日期，Y 轴为当日增量值

#### Scenario: 折线图样式
- **WHEN** 折线图渲染完成
- **THEN** PV 折线使用紫色渐变填充（#667eea → #764ba2）
- **AND** UV 折线使用绿色渐变填充（#11998e → #38ef7d）
- **AND** 支持暗色主题自动切换
- **AND** 鼠标悬停显示具体数值 tooltip

#### Scenario: 历史数据采集（服务端）
- **WHEN** fetch-busuanzi GitHub Action 每 2 小时执行
- **THEN** fetch_busuanzi.py 将当前时间戳的累计 PV/UV 快照追加到 history.json
- **AND** history.json 最多保留 30 天的小时级数据，超出自动裁剪
- **AND** 前端不参与 history.json 的写入，仅读取

### Requirement: 编译时 JS 混淆加密

系统 SHALL 在 `hexo generate` 编译部署时，对包含 offset 逻辑的关键 JS 文件进行混淆加密，防止用户通过查看源码发现数据叠加逻辑。

#### Scenario: hexo generate 执行
- **WHEN** 运行 `hexo generate` 编译站点
- **THEN** `after_generate` 钩子自动对 `public/js/webinfo-stats.js` 和 `public/js/stats-renderer.js` 进行 javascript-obfuscator 混淆
- **AND** 混淆配置包括：变量名混淆、控制流扁平化、字符串加密、死代码注入
- **AND** 混淆后的文件仍可正常执行，功能不受影响

#### Scenario: 本地开发模式
- **WHEN** 运行 `hexo server` 本地开发
- **THEN** 混淆钩子不执行，使用原始 JS 文件便于调试

## MODIFIED Requirements

### Requirement: webinfo-stats.js 数据获取方式

原方案：fetch views.json + offset.json，计算后写入 DOM（静态快照，数据滞后）
新方案：MutationObserver 等待 Busuanzi 实时填充 DOM → 读取实时值 → 叠加 offset → 写回 DOM（完全动态，无静态依赖）

### Requirement: stats-renderer.js 总 PV/UV 计算方式

原方案：从 views.json 的 total.pv/total.uv + offset.json 计算（静态快照）
新方案：从 Busuanzi 实时 DOM 数据 + offset.json 计算（完全动态）

### Requirement: Stats 页面展示内容

原方案：仅展示总 PV/UV/文章数/分类数 + 分类排行 + 文章排行
新方案：增加分时段 PV/UV 折线图（24h/7d/30d），使用 Chart.js 渲染

### Requirement: fetch-busuanzi GitHub Action 运行频率

原方案：每日 UTC 0:00 运行一次
新方案：每 2 小时运行一次（支持小时级数据采集），保留文章推送时触发

## REMOVED Requirements

### Requirement: webinfo-stats.js 直接 fetch views.json 获取站点 PV/UV
**Reason**: views.json 是每日快照，数据滞后且与 Busuanzi 实时数据不一致。站点 PV/UV 应完全动态获取
**Migration**: 改为 MutationObserver 读取 Busuanzi 实时 DOM 数据，views.json 仅用于 per-post/category 排行
