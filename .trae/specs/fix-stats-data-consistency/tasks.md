# Tasks

- [x] Task 1: 修改统计页面数据源 - 复用webinfo卡片PV/UV
  - [x] SubTask 1.1: 修改stats-renderer.js，从webinfo卡片DOM元素获取PV/UV
  - [x] SubTask 1.2: 移除views.json的posts PV累加计算逻辑
  - [x] SubTask 1.3: 保留offset.json校准逻辑，同步到webinfo卡片DOM

- [ ] Task 2: 本地构建验证
  - [ ] SubTask 2.1: 运行 `hexo clean && hexo generate` 验证构建成功
  - [ ] SubTask 2.2: 验证统计页面PV/UV与webinfo卡片数据一致

# Task Dependencies
- Task 2 depends on Task 1 完成
