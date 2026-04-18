# GitHub 博客全面检查与修复 Spec

## Why
博客项目存在多个关键问题，最严重的是 Butterfly 主题作为损坏的 git submodule 被引用，导致 GitHub Actions 构建时无法获取主题文件，网站无法正常部署。此外还有配置不一致、冗余文件、缺失页面等问题需要修复。

## What Changes
- **修复 Butterfly 主题的 git submodule 问题**：移除主题的 `.git` 目录，将主题文件直接纳入主仓库管理
- **删除根目录冗余 CNAME 文件**：Hexo 只需 `source/CNAME`，根目录的 CNAME 是多余的
- **修复 favicon 路径**：主题配置引用了不存在的 `/img/favicon.png`，需修正为实际存在的文件
- **修复 RSS feed 图标路径**：`_config.yml` 中的 feed icon 引用了不存在的文件
- **删除默认 Hello World 文章**：这是 Hexo 的占位文章，应移除
- **删除未使用的 landscape 主题配置**：`_config.landscape.yml` 和 `hexo-theme-landscape` 依赖均未使用
- **创建缺失的 tags 和 categories 页面**：导航菜单链接了这两个页面但源文件不存在
- **完善 `.gitignore`**：添加 WordPress 同步产生的临时文件
- **优化 Dependabot 配置**：从每日更新改为每周更新，减少 PR 噪音
- **启用 404 页面**：当前 404 页面被禁用
- **配置 lightbox**：文章中的图片无法点击放大查看
- **补全 post_copyright 的 author_href**：版权信息中作者链接为空
- **优化 sync-wordpress workflow**：确保临时文件不会被提交

## Impact
- Affected specs: 主题管理、部署流程、站点配置、文章管理
- Affected code: `.gitmodules`、`themes/butterfly/`、`_config.yml`、`_config.butterfly.yml`、`.gitignore`、`.github/workflows/`、`source/` 目录

## ADDED Requirements

### Requirement: 主题文件纳入主仓库
系统 SHALL 将 Butterfly 主题的所有文件直接纳入主仓库 git 管理，而非作为 git submodule 引用。

#### Scenario: GitHub Actions 构建成功
- **WHEN** GitHub Actions 执行 `hexo generate`
- **THEN** 主题文件可用，站点正常生成静态文件

#### Scenario: 克隆仓库后主题可用
- **WHEN** 用户执行 `git clone` 克隆仓库
- **THEN** `themes/butterfly/` 目录包含完整的主题文件

### Requirement: 站点图标正确显示
系统 SHALL 确保站点 favicon 和 RSS feed 图标路径指向实际存在的文件。

#### Scenario: 浏览器正确加载 favicon
- **WHEN** 用户访问博客
- **THEN** 浏览器标签页显示正确的站点图标

### Requirement: 导航菜单链接有效
系统 SHALL 确保导航菜单中的所有链接指向存在的页面。

#### Scenario: 访问标签页
- **WHEN** 用户点击导航菜单中的"标签"
- **THEN** 页面正确显示标签云页面

#### Scenario: 访问分类页
- **WHEN** 用户点击导航菜单中的"分类"
- **THEN** 页面正确显示分类列表页面

### Requirement: 404 页面可用
系统 SHALL 启用自定义 404 页面，当用户访问不存在的路径时显示友好的错误提示。

#### Scenario: 访问不存在的路径
- **WHEN** 用户访问一个不存在的 URL
- **THEN** 显示自定义 404 页面而非默认错误

### Requirement: 图片灯箱效果
系统 SHALL 配置 lightbox 插件，使文章中的图片可以点击放大查看。

#### Scenario: 点击文章图片
- **WHEN** 用户点击文章中的图片
- **THEN** 图片以灯箱效果放大显示

## MODIFIED Requirements

### Requirement: Git 仓库结构
移除损坏的 git submodule 引用，将主题文件直接纳入主仓库。删除根目录冗余 CNAME。完善 `.gitignore` 规则。

### Requirement: Dependabot 配置
将 Dependabot 更新频率从每日改为每周，减少 PR 噪音，同时将 PR 数量限制从 20 降为 5。

## REMOVED Requirements

### Requirement: 默认 Hello World 文章
**Reason**: 这是 Hexo 自动生成的占位文章，不包含有价值的内容
**Migration**: 直接删除该文件

### Requirement: Landscape 主题相关配置
**Reason**: 项目使用 Butterfly 主题，Landscape 主题的配置和依赖均未使用
**Migration**: 删除 `_config.landscape.yml` 文件，从 `package.json` 移除 `hexo-theme-landscape` 依赖
