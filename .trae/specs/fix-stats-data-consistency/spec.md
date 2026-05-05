# 流量统计页数据一致性修复 Spec

## Why

流量统计页面（`/stats/`）中展示的PV和UV数据是通过`views.json`和`offset.json`计算得出的，而页面底部侧边栏的webinfo卡片使用的是Umami API或Busuanzi的实时数据。两者数据来源不同导致数值不一致，影响用户体验和广告合作的说服力。

## What Changes

- 修改 `source/stats/index.md` — 添加全局webinfo数据容器DOM元素
- 修改 `source/js/stats-renderer.js` — 移除独立的PV/UV计算逻辑，复用webinfo卡片的Umami/Busuanzi数据
- 保留原有的offset.json和自定义API校准逻辑，仅用于底部网站信息同步

## Impact

- Affected specs: 无既有 spec 受影响
- Affected code: `source/js/stats-renderer.js`, `source/stats/index.md`

## MODIFIED Requirements

### Requirement: 流量统计展示页面
系统 SHALL 在流量统计页面复用全站统一的webinfo卡片PV/UV数据，确保数据一致性。

#### Scenario: 用户访问统计页面
- **WHEN** 用户访问 `/stats/` 页面
- **THEN** 总PV和总UV数据从webinfo卡片的DOM元素（`#umami-site-pv`/`#umami-site-uv` 或 `#busuanzi_value_site_pv`/`#busuanzi_value_site_uv`）获取
- **AND** 分类和文章排行数据仍从 `/stats/views.json` 和 `/stats/offset.json` 计算
- **AND** 数据展示与底部侧边栏webinfo卡片保持一致

#### Scenario: 数据校准逻辑保留
- **WHEN** 页面加载完成
- **THEN** 保留原有的offset.json数据校准逻辑（用于底部网站信息同步）
- **AND** 校准结果同步应用到webinfo卡片的PV/UV展示

## REMOVED Requirements

### Requirement: 独立PV/UV计算
**Reason**: 统计页面原通过views.json的posts累加计算总PV，与webinfo卡片数据源不一致
**Migration**: 改为直接读取webinfo卡片DOM元素值，移除views.json的PV累加逻辑
