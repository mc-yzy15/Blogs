# Tasks

- [ ] Task 1: 修复 Butterfly 主题 git submodule 问题（最关键）
  - [ ] SubTask 1.1: 从 git 索引中移除 themes/butterfly 的 submodule 引用（`git rm --cached themes/butterfly`）
  - [ ] SubTask 1.2: 删除 themes/butterfly/.git 目录
  - [ ] SubTask 1.3: 将 themes/butterfly 所有文件添加到主仓库（`git add themes/butterfly/`）
  - [ ] SubTask 1.4: 验证主题文件已被 git 正确跟踪

- [ ] Task 2: 删除根目录冗余 CNAME 文件
  - [ ] SubTask 2.1: 删除根目录的 CNAME 文件（保留 source/CNAME）

- [ ] Task 3: 修复 favicon 和图标路径
  - [ ] SubTask 3.1: 检查主题 source/img/ 中可用的图标文件
  - [ ] SubTask 3.2: 修改 _config.butterfly.yml 中的 favicon 路径为实际存在的文件
  - [ ] SubTask 3.3: 修改 _config.yml 中 feed icon 路径为实际存在的文件

- [ ] Task 4: 删除默认 Hello World 文章
  - [ ] SubTask 4.1: 删除 source/_posts/hello-world.md

- [ ] Task 5: 清理未使用的 Landscape 主题相关内容
  - [ ] SubTask 5.1: 删除 _config.landscape.yml
  - [ ] SubTask 5.2: 从 package.json 移除 hexo-theme-landscape 依赖

- [ ] Task 6: 创建缺失的 tags 和 categories 页面
  - [ ] SubTask 6.1: 创建 source/tags/index.md（type: "tags"）
  - [ ] SubTask 6.2: 创建 source/categories/index.md（type: "categories"）

- [ ] Task 7: 完善 .gitignore
  - [ ] SubTask 7.1: 添加 sync.js、wordpress_sync.json 等 WordPress 同步临时文件
  - [ ] SubTask 7.2: 添加 _config.butterfly.yml 的备份文件等

- [ ] Task 8: 优化 Dependabot 配置
  - [ ] SubTask 8.1: 将 interval 从 daily 改为 weekly
  - [ ] SubTask 8.2: 将 open-pull-requests-limit 从 20 改为 5

- [ ] Task 9: 启用 404 页面
  - [ ] SubTask 9.1: 修改 _config.butterfly.yml 中 error_404.enable 为 true

- [ ] Task 10: 配置 lightbox 图片灯箱
  - [ ] SubTask 10.1: 在 _config.butterfly.yml 中设置 lightbox 为 fancybox 或 medium_zoom

- [ ] Task 11: 补全 post_copyright 的 author_href
  - [ ] SubTask 11.1: 设置 author_href 为 https://github.com/mc-yzy15

- [ ] Task 12: 优化 sync-wordpress workflow
  - [ ] SubTask 12.1: 在 Commit and Push 步骤前添加清理临时文件的步骤
  - [ ] SubTask 12.2: 确保 sync.js 和 wordpress_sync.json 不会被提交

- [ ] Task 13: 本地验证构建
  - [ ] SubTask 13.1: 运行 hexo clean && hexo generate 验证构建成功
  - [ ] SubTask 13.2: 运行 hexo server 验证本地预览正常

- [ ] Task 14: 提交并推送到远程仓库
  - [ ] SubTask 14.1: git add 所有更改
  - [ ] SubTask 14.2: git commit 并推送

# Task Dependencies
- [Task 1] 必须最先完成，其他任务依赖主题文件正确可用
- [Task 2-12] 相互独立，可并行执行
- [Task 13] 依赖 Task 1-12 全部完成
- [Task 14] 依赖 Task 13 验证通过
