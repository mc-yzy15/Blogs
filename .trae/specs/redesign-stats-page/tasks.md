# Tasks

- [ ] Task 1: 重构 stats-renderer.js 数据获取逻辑
  - [ ] SubTask 1.1: 移除从 webinfo DOM 获取 PV/UV 的逻辑
  - [ ] SubTask 1.2: 改为直接从 offset.json 获取全站 PV/UV
  - [ ] SubTask 1.3: 合并 views.json 的文章元信息与 offset.json 的 PV 数据
  - [ ] SubTask 1.4: 移除 _normalizeMetric 等混淆逻辑，展示真实数据

- [ ] Task 2: 重新设计 stats 页面 UI
  - [ ] SubTask 2.1: 设计核心指标卡片区域（PV/UV/文章数/分类数）
  - [ ] SubTask 2.2: 优化分类浏览量条形图样式
  - [ ] SubTask 2.3: 优化文章排行榜样式（前三名特殊样式）
  - [ ] SubTask 2.4: 添加数据来源说明和更新时间展示

- [ ] Task 3: 同步 webinfo 卡片数据源
  - [ ] SubTask 3.1: 创建 JavaScript 脚本从 offset.json 获取 PV/UV
  - [ ] SubTask 3.2: 替换 busuanzi/umami 实时数据为 offset.json 数据
  - [ ] SubTask 3.3: 确保 webinfo 卡片与 stats 页面数据一致

- [ ] Task 4: 本地构建验证
  - [ ] SubTask 4.1: 运行 `hexo clean && hexo generate` 验证构建成功
  - [ ] SubTask 4.2: 本地预览验证 stats 页面 UI 正常
  - [ ] SubTask 4.3: 验证 stats 页面与 webinfo 卡片数据一致

# Task Dependencies
- Task 2 依赖 Task 1 完成
- Task 4 依赖 Task 1, 2, 3 全部完成
- Task 3 可与 Task 2 并行
