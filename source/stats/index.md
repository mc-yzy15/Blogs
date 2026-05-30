---
title: 流量统计
date: 2026-04-26 12:00:00
type: stats
---

<style>
.stats-dashboard{max-width:1200px;margin:0 auto;padding:20px 0}
.stats-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:40px}
@media(max-width:900px){.stats-cards{grid-template-columns:repeat(2,1fr)}}
@media(max-width:500px){.stats-cards{grid-template-columns:1fr}}
.stat-card{background:var(--card-bg,#fff);border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,.06);transition:all .3s ease;border:1px solid var(--card-border,#eee);position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px}
.stat-card.pv::before{background:linear-gradient(90deg,#667eea,#764ba2)}
.stat-card.uv::before{background:linear-gradient(90deg,#11998e,#38ef7d)}
.stat-card.posts::before{background:linear-gradient(90deg,#f093fb,#f5576c)}
.stat-card.cats::before{background:linear-gradient(90deg,#fa709a,#fee140)}
.stat-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,.1)}
.stat-card-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.stat-card-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
.stat-card.pv .stat-card-icon{background:linear-gradient(135deg,#667eea20,#764ba220);color:#667eea}
.stat-card.uv .stat-card-icon{background:linear-gradient(135deg,#11998e20,#38ef7d20);color:#11998e}
.stat-card.posts .stat-card-icon{background:linear-gradient(135deg,#f093fb20,#f5576c20);color:#f5576c}
.stat-card.cats .stat-card-icon{background:linear-gradient(135deg,#fa709a20,#fee14020);color:#fa709a}
.stat-card-value{font-size:32px;font-weight:800;color:var(--text-color,#1a1a2e);line-height:1.2;margin-bottom:4px}
.stat-card-label{font-size:14px;color:var(--text-secondary,#888);font-weight:500}
.stats-section{background:var(--card-bg,#fff);border-radius:16px;padding:28px;margin-bottom:30px;box-shadow:0 4px 20px rgba(0,0,0,.06);border:1px solid var(--card-border,#eee)}
.stats-section-header{display:flex;align-items:center;gap:10px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--section-border,#f0f0f0)}
.stats-section-header i{font-size:20px;color:#49b1f5}
.stats-section-title{font-size:20px;font-weight:700;color:var(--text-color,#1a1a2e)}
.cat-bar-item{margin-bottom:16px}
.cat-bar-item:last-child{margin-bottom:0}
.cat-bar-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.cat-bar-name{font-size:14px;font-weight:600;color:var(--text-color,#333)}
.cat-bar-value{font-size:14px;font-weight:700;color:#49b1f5}
.cat-bar-track{height:24px;background:var(--bar-bg,#f5f7fa);border-radius:12px;overflow:hidden}
.cat-bar-fill{height:100%;border-radius:12px;background:linear-gradient(90deg,#49b1f5,#7ec8f8);transition:width 1s cubic-bezier(.4,0,.2,1);position:relative}
.cat-bar-fill::after{content:'';position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,.3),transparent);border-radius:12px 12px 0 0}
.post-rank-item{display:flex;align-items:center;padding:14px 16px;margin-bottom:8px;border-radius:12px;transition:all .2s ease;background:var(--item-bg,transparent)}
.post-rank-item:hover{background:var(--hover-bg,#f8f9fa)}
.post-rank-num{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;margin-right:16px;flex-shrink:0}
.post-rank-num.top1{background:linear-gradient(135deg,#ffd700,#ffb300);color:#fff;box-shadow:0 4px 12px rgba(255,215,0,.3)}
.post-rank-num.top2{background:linear-gradient(135deg,#e8e8e8,#c0c0c0);color:#fff;box-shadow:0 4px 12px rgba(192,192,192,.3)}
.post-rank-num.top3{background:linear-gradient(135deg,#cd7f32,#b87333);color:#fff;box-shadow:0 4px 12px rgba(205,127,50,.3)}
.post-rank-num.normal{background:var(--bar-bg,#f0f0f0);color:var(--text-secondary,#999)}
.post-rank-info{flex:1;min-width:0}
.post-rank-title{font-size:15px;color:var(--text-color,#333);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.post-rank-views{font-size:14px;font-weight:700;color:#49b1f5;flex-shrink:0;margin-left:16px;padding:4px 12px;background:linear-gradient(135deg,#49b1f515,#7ec8f815);border-radius:20px}
.stats-footer{text-align:center;padding:24px;margin-top:20px}
.stats-updated{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--card-bg,#fff);border-radius:30px;font-size:13px;color:var(--text-secondary,#888);box-shadow:0 2px 12px rgba(0,0,0,.04);border:1px solid var(--card-border,#eee)}
.stats-updated i{color:#49b1f5}
.stats-source{margin-top:12px;font-size:12px;color:var(--text-secondary,#aaa)}
[data-theme="dark"] .stat-card,[data-theme="dark"] .stats-section{background:#1e2430;border-color:#2d3748}
[data-theme="dark"] .stat-card-value,[data-theme="dark"] .stats-section-title,[data-theme="dark"] .cat-bar-name,[data-theme="dark"] .post-rank-title{color:#e5e7eb}
[data-theme="dark"] .cat-bar-track,[data-theme="dark"] .post-rank-num.normal{background:#2d3748}
[data-theme="dark"] .post-rank-item:hover{background:#2d3748}
[data-theme="dark"] .stats-updated{background:#1e2430;border-color:#2d3748;color:#9ca3af}
.chart-toggle-row{display:flex;gap:8px;margin-bottom:20px}
.chart-toggle-btn{padding:8px 18px;border-radius:20px;border:1px solid var(--card-border,#eee);background:transparent;color:var(--text-secondary,#888);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s ease}
.chart-toggle-btn:hover{border-color:#49b1f5;color:#49b1f5}
.chart-toggle-btn.active{background:linear-gradient(135deg,#49b1f5,#7ec8f8);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(73,177,245,.3)}
.chart-container{position:relative;height:320px;width:100%}
[data-theme="dark"] .chart-toggle-btn{border-color:#2d3748;color:#9ca3af}
[data-theme="dark"] .chart-toggle-btn:hover{border-color:#49b1f5;color:#49b1f5}
</style>

<div class="stats-dashboard">
  <span id="busuanzi_value_site_pv" style="display:none"></span>
  <span id="busuanzi_value_site_uv" style="display:none"></span>
  <div class="stats-cards">
    <div class="stat-card pv">
      <div class="stat-card-header">
        <div class="stat-card-icon"><i class="fas fa-eye"></i></div>
      </div>
      <div class="stat-card-value" id="stat-total-pv">--</div>
      <div class="stat-card-label">总浏览量 (PV)</div>
    </div>
    <div class="stat-card uv">
      <div class="stat-card-header">
        <div class="stat-card-icon"><i class="fas fa-users"></i></div>
      </div>
      <div class="stat-card-value" id="stat-total-uv">--</div>
      <div class="stat-card-label">总访客数 (UV)</div>
    </div>
    <div class="stat-card posts">
      <div class="stat-card-header">
        <div class="stat-card-icon"><i class="fas fa-file-alt"></i></div>
      </div>
      <div class="stat-card-value" id="stat-total-posts">--</div>
      <div class="stat-card-label">文章总数</div>
    </div>
    <div class="stat-card cats">
      <div class="stat-card-header">
        <div class="stat-card-icon"><i class="fas fa-folder"></i></div>
      </div>
      <div class="stat-card-value" id="stat-total-cats">--</div>
      <div class="stat-card-label">分类总数</div>
    </div>
  </div>

  <div class="stats-section">
    <div class="stats-section-header">
      <i class="fas fa-chart-line"></i>
      <span class="stats-section-title">流量趋势</span>
    </div>
    <div class="chart-toggle-row">
      <button class="chart-toggle-btn" data-range="24h">今日</button>
      <button class="chart-toggle-btn" data-range="7d">近7天</button>
      <button class="chart-toggle-btn active" data-range="30d">近30天</button>
    </div>
    <div class="chart-container">
      <canvas id="traffic-chart"></canvas>
    </div>
  </div>

  <div class="stats-section">
    <div class="stats-section-header">
      <i class="fas fa-chart-bar"></i>
      <span class="stats-section-title">分类浏览量排行</span>
    </div>
    <div id="cat-bar-chart"></div>
  </div>

  <div class="stats-section">
    <div class="stats-section-header">
      <i class="fas fa-trophy"></i>
      <span class="stats-section-title">文章浏览量排行</span>
    </div>
    <div id="post-rank-list"></div>
  </div>

  <div class="stats-footer">
    <div class="stats-updated">
      <i class="fas fa-clock"></i>
      <span>数据更新于：<span id="stat-updated-time">--</span></span>
    </div>
    <div class="stats-source">数据来源于 Busuanzi 实时统计</div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="/js/stats-renderer.js"></script>
