# Tasks

- [ ] Task 1: 重写 webinfo-stats.js — MutationObserver + 动态 Busuanzi 数据
  - [ ] SubTask 1.1: 使用 MutationObserver 监听 `#busuanzi_value_site_pv` 和 `#busuanzi_value_site_uv` 的 DOM 变更
  - [ ] SubTask 1.2: 当 Busuanzi 填充数据后，读取实时值 + offset.json 偏移量，写回 DOM
  - [ ] SubTask 1.3: 断开 MutationObserver 防止后续覆盖
  - [ ] SubTask 1.4: 添加 10 秒超时回退逻辑（回退到 views.json + offset.json，仅降级路径）
  - [ ] SubTask 1.5: 移除原有的 fetch views.json 逻辑（站点 PV/UV 主路径不再依赖 views.json）

- [ ] Task 2: 修改 Stats 页面 HTML — 添加折线图容器和隐藏 Busuanzi 元素
  - [ ] SubTask 2.1: 在 stats-dashboard 中添加隐藏的 Busuanzi 数据容器（`display:none` 的 span，ID 为 busuanzi_value_site_pv/uv）
  - [ ] SubTask 2.2: 在概览卡片和分类排行之间添加折线图区域（含 24h/7d/30d 切换按钮）
  - [ ] SubTask 2.3: 添加 Chart.js CDN 引用
  - [ ] SubTask 2.4: 添加折线图区域相关 CSS 样式（含暗色主题支持）

- [ ] Task 3: 重写 stats-renderer.js — 动态数据 + 折线图
  - [ ] SubTask 3.1: 总 PV/UV 改为从隐藏 Busuanzi 容器读取实时值 + offset（MutationObserver）
  - [ ] SubTask 3.2: 新增 history.json fetch 逻辑
  - [ ] SubTask 3.3: 新增增量 PV/UV 计算逻辑（相邻快照差值）
  - [ ] SubTask 3.4: 新增 Chart.js 折线图渲染函数（PV/UV 双折线，渐变填充）
  - [ ] SubTask 3.5: 新增时间范围切换逻辑（24h/7d/30d），默认 30d
  - [ ] SubTask 3.6: 保留分类排行和文章排行的 views.json + offset 逻辑不变
  - [ ] SubTask 3.7: 更新数据更新时间为"Busuanzi 实时数据"

- [ ] Task 4: 创建 history.json 并修改数据采集脚本
  - [ ] SubTask 4.1: 创建 `source/stats/history.json` 初始文件（空 snapshots 数组）
  - [ ] SubTask 4.2: 修改 `tools/fetch_busuanzi.py`，在更新 views.json 后追加当前时间戳快照到 history.json（含 offset）
  - [ ] SubTask 4.3: history.json 最多保留 30 天的小时级数据，超出自动裁剪
  - [ ] SubTask 4.4: 修改 `.github/workflows/fetch-busuanzi.yml`，cron 改为每 2 小时；git add 包含 history.json

- [ ] Task 5: 实现编译时 JS 混淆加密
  - [ ] SubTask 5.1: 安装 javascript-obfuscator 开发依赖
  - [ ] SubTask 5.2: 创建 `scripts/obfuscate-js.js`，注册 Hexo after_generate 钩子
  - [ ] SubTask 5.3: 钩子逻辑：检测 hexo.env.cmd，仅在 generate 时执行混淆
  - [ ] SubTask 5.4: 混淆配置：变量名混淆、控制流扁平化、字符串加密、死代码注入
  - [ ] SubTask 5.5: 对 `public/js/webinfo-stats.js` 和 `public/js/stats-renderer.js` 执行混淆

- [ ] Task 6: 构建验证
  - [ ] SubTask 6.1: 运行 `hexo clean && hexo generate` 验证构建成功
  - [ ] SubTask 6.2: 验证混淆后的 JS 文件功能正常
  - [ ] SubTask 6.3: 验证 Stats 页面折线图渲染正常
  - [ ] SubTask 6.4: 验证网站信息板块 PV/UV 与 Stats 页面数据一致

# Task Dependencies
- Task 3 depends on Task 2（需要 HTML 容器先就位）
- Task 2 depends on Task 1（需要确认 Busuanzi 数据读取方式）
- Task 4 独立，可与 Task 1-3 并行
- Task 5 depends on Task 1 + Task 3（需要 JS 文件先完成修改）
- Task 6 depends on Task 1-5 全部完成
