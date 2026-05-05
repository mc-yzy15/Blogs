# 博客流量统计展示页 Spec

## Why
需要一个公开的流量统计展示页面，向潜在广告主展示博客的浏览量数据，提升广告合作的说服力。同时需要一个隐蔽的后门接口，允许通过 curl 命令和特定的 56 位 TOKEN 来修改展示的浏览量数据。

## What Changes
- 新增 `source/stats/index.md` — 流量统计展示页面的 Hexo 页面源文件
- 新增 `source/stats/views.json` — 存储所有浏览量数据（总量、分类、文章）
- 新增 `themes/butterfly/layout/includes/page/stats.pug` — 统计页面的自定义 Pug 布局模板
- 新增 `source/js/stats-renderer.js` — 统计页面前端渲染脚本（含隐蔽的数据校准逻辑）
- 新增 `.github/workflows/sync-analytics.yml` — GitHub Actions 工作流，处理浏览量数据同步
- 修改 `_config.butterfly.yml` — 在导航菜单中添加"流量统计"入口
- 修改 `themes/butterfly/layout/page.pug` — 添加 `stats` 页面类型的路由

## Impact
- Affected specs: 无既有 spec 受影响
- Affected code: `_config.butterfly.yml`, `themes/butterfly/layout/page.pug`, 新增多个文件

## ADDED Requirements

### Requirement: 流量统计展示页面
系统 SHALL 提供一个公开可访问的流量统计页面（`/stats/`），展示博客的浏览量数据。

#### Scenario: 用户访问统计页面
- **WHEN** 用户访问 `/stats/` 页面
- **THEN** 页面展示以下数据：
  - 博客总浏览量（PV）和总访客数（UV）
  - 各分类的浏览量排行
  - 各文章的浏览量排行（Top 20）
  - 数据更新时间
- **AND** 页面视觉效果美观专业，适合向广告主展示
- **AND** 页面使用图表可视化数据（柱状图/环形图）

#### Scenario: 浏览量数据来源
- **WHEN** 页面加载
- **THEN** 从 `/stats/views.json` 获取浏览量数据
- **AND** JSON 数据结构包含 total（pv/uv）、categories（各分类 pv）、posts（各文章 pv/title）、updated_at
- **AND** 页面渲染时执行数据校准逻辑（隐蔽功能）

### Requirement: 隐蔽的浏览量修改接口
系统 SHALL 提供一个通过 curl 命令修改浏览量数据的隐蔽接口。

#### Scenario: 通过 curl 修改总浏览量
- **WHEN** 执行以下 curl 命令：
  ```bash
  curl -X POST \
    -H "Authorization: token <GITHUB_PAT>" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/mc-yzy15/Blogs/dispatches \
    -d '{"event_type":"sync_analytics","client_payload":{"key":"<56位TOKEN>","target":"total","value":99999}}'
  ```
- **THEN** GitHub Actions 工作流被触发
- **AND** 工作流验证 `key` 与 GitHub Secret `ANALYTICS_SYNC_KEY` 匹配
- **AND** 若验证通过，更新 `source/stats/views.json` 中对应的值
- **AND** 自动提交更改并推送到 master 分支，触发站点重建

#### Scenario: 通过 curl 修改分类浏览量
- **WHEN** curl 命令中 `target` 为 `category:<分类名>`
- **THEN** 更新对应分类的 PV 值

#### Scenario: 通过 curl 修改文章浏览量
- **WHEN** curl 命令中 `target` 为 `post:<文章slug>`
- **THEN** 更新对应文章的 PV 值

#### Scenario: TOKEN 验证失败
- **WHEN** 提供的 `key` 与 `ANALYTICS_SYNC_KEY` 不匹配
- **THEN** 工作流静默退出，不执行任何修改

### Requirement: 隐蔽性保障
系统的浏览量修改能力 SHALL 对公众不可见。

#### Scenario: 公众查看代码仓库
- **WHEN** 任何人查看 GitHub 公共仓库代码
- **THEN** 工作流文件名和内容看起来像正常的数据同步操作（`sync-analytics.yml`）
- **AND** 前端 JS 中的校准逻辑使用混淆的变量名和看似正常的数据处理代码
- **AND** 56 位 TOKEN 存储在 GitHub Secrets 中，不在代码中出现
- **AND** views.json 看起来像正常的统计数据文件

### Requirement: 导航菜单集成
系统 SHALL 在博客导航菜单中添加统计页面入口。

#### Scenario: 用户查看导航菜单
- **WHEN** 用户查看博客顶部导航菜单
- **THEN** 可见"流量统计"菜单项，图标使用 `fas fa-chart-bar`
- **AND** 点击后跳转到 `/stats/` 页面

## MODIFIED Requirements
无

## REMOVED Requirements
无
