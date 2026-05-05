# 流量统计页面重新设计 Spec

## Why

当前流量统计页面存在数据不一致问题：
1. `views.json` 显示 `total.pv: 124, total.uv: 109`（来自 Umami API 同步）
2. `offset.json` 显示 `total_pv: 96031, total_uv: 6523`（手动校准数据）
3. webinfo 卡片使用 busuanzi 实时数据
4. stats-renderer.js 尝试从 webinfo DOM 获取数据再加 offset，但逻辑混乱

三个数据源互不相同，导致用户困惑，影响博客专业性和广告合作的说服力。

## What Changes

- **统一数据源架构**：使用 offset.json 作为唯一真实数据源，views.json 仅用于分类/文章排行
- **重新设计 stats 页面 UI**：采用现代化仪表盘设计，清晰展示核心指标
- **移除混乱的数据获取逻辑**：不再从 DOM 读取 webinfo 卡片数据
- **添加数据来源说明**：让用户了解数据统计方式和更新频率

## Impact

- Affected specs: `fix-stats-data-consistency`（将被此 spec 取代）
- Affected code: `source/js/stats-renderer.js`, `source/stats/index.md`, `source/stats/views.json`, `source/stats/offset.json`

## ADDED Requirements

### Requirement: 统一数据源架构

系统 SHALL 使用 offset.json 作为全站 PV/UV 的唯一真实数据源。

#### Scenario: 全站 PV/UV 展示
- **WHEN** 用户访问任意页面
- **THEN** 全站总 PV 从 `offset.json.total_pv` 读取
- **AND** 全站总 UV 从 `offset.json.total_uv` 读取
- **AND** 数据在 stats 页面和 webinfo 卡片保持一致

#### Scenario: 分类和文章排行数据
- **WHEN** 用户访问 stats 页面
- **THEN** 分类 PV 从 `offset.json.categories` 读取
- **AND** 文章 PV 从 `offset.json.posts` 读取
- **AND** `views.json` 仅作为 Umami 同步的中间数据，不再用于总 PV/UV 计算

### Requirement: 现代化仪表盘设计

系统 SHALL 提供现代化的流量统计仪表盘界面。

#### Scenario: 核心指标卡片
- **WHEN** 用户访问 stats 页面
- **THEN** 页面顶部展示 4 个核心指标卡片：总浏览量(PV)、总访客数(UV)、文章总数、分类总数
- **AND** 每个卡片使用大字体数字 + 图标 + 标签的设计
- **AND** 数字加载时有平滑动画效果

#### Scenario: 分类浏览量排行
- **WHEN** 用户查看分类排行区域
- **THEN** 以水平条形图展示各分类 PV 占比
- **AND** 显示分类名称和具体 PV 数值
- **AND** 按浏览量降序排列

#### Scenario: 文章浏览量排行
- **WHEN** 用户查看文章排行区域
- **THEN** 以列表形式展示 Top 10 热门文章
- **AND** 每项显示排名、标题、浏览量
- **AND** 前三名使用特殊样式突出显示

#### Scenario: 数据更新时间
- **WHEN** 页面加载完成
- **THEN** 显示数据最后更新时间
- **AND** 说明数据来源（如"数据来源于 Umami 统计，每日自动同步"）

### Requirement: webinfo 卡片数据同步

系统 SHALL 确保 stats 页面与 webinfo 卡片数据一致。

#### Scenario: webinfo 卡片读取 offset.json
- **WHEN** webinfo 卡片渲染
- **THEN** PV/UV 数据从 offset.json 获取（通过 JavaScript fetch）
- **AND** 不再依赖 busuanzi 或 umami 的实时 API
- **AND** 与 stats 页面展示的数值完全一致

## MODIFIED Requirements

### Requirement: stats-renderer.js 重构

原有逻辑完全重写，简化为：
1. 从 offset.json 读取全站 PV/UV
2. 从 offset.json 读取分类/文章排行数据
3. views.json 仅用于获取文章元信息（标题、日期等）

## REMOVED Requirements

### Requirement: 从 webinfo DOM 获取数据
**Reason**: 这种方式依赖 DOM 元素加载顺序，且 busuanzi/umami 数据与 offset.json 不一致
**Migration**: 直接从 offset.json 文件获取数据

### Requirement: views.json 用于总 PV/UV 计算
**Reason**: views.json 是 Umami 同步的原始数据，不包含历史校准值
**Migration**: 使用 offset.json 作为唯一数据源
