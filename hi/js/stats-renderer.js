(function () {
  'use strict';
  var trendChart = null;
  var historyData = null;

  function animateNumber(el, target) {
    if (!el) return;
    var start = 0;
    var duration = 1200;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var p = Math.min((ts - startTime) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function sortByPvWithOffset(items, offsetObj, getPv, getKey) {
    return items.slice().sort(function (a, b) {
      var pvA = getPv(a) + (offsetObj[getKey(a)] || 0);
      var pvB = getPv(b) + (offsetObj[getKey(b)] || 0);
      return pvB - pvA;
    });
  }

  function renderCategories(views, offset) {
    var container = document.getElementById('cat-bar-chart');
    if (!container) return;
    var catOff = offset.categories || {};
    var entries = sortByPvWithOffset(
      Object.entries(views.categories),
      catOff,
      function (entry) { return entry[1].pv; },
      function (entry) { return entry[0]; }
    );
    var maxPv = entries.length ? entries[0][1].pv + (catOff[entries[0][0]] || 0) : 1;
    var html = '';
    entries.forEach(function (entry, i) {
      var name = entry[0];
      var pv = entry[1].pv + (catOff[name] || 0);
      var pct = Math.round((pv / maxPv) * 100);
      html += '<div class="cat-bar-item">' +
        '<div class="cat-bar-header"><span class="cat-bar-name">' + name + '</span><span class="cat-bar-value">' + pv.toLocaleString() + ' PV</span></div>' +
        '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:0%" data-width="' + pct + '%"></div></div>' +
        '</div>';
    });
    container.innerHTML = html;
    setTimeout(function () {
      var fills = container.querySelectorAll('.cat-bar-fill');
      fills.forEach(function (f) { f.style.width = f.getAttribute('data-width'); });
    }, 100);
  }

  function renderPosts(views, offset) {
    var container = document.getElementById('post-rank-list');
    if (!container) return;
    var postOff = offset.posts || {};
    var sorted = sortByPvWithOffset(
      views.posts,
      postOff,
      function (post) { return post.pv; },
      function (post) { return post.slug; }
    );
    var html = '';
    sorted.forEach(function (post, i) {
      var pv = post.pv + (postOff[post.slug] || 0);
      var cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : 'normal';
      html += '<div class="post-rank-item">' +
        '<div class="post-rank-num ' + cls + '">' + (i + 1) + '</div>' +
        '<div class="post-rank-info"><div class="post-rank-title">' + post.title + '</div></div>' +
        '<div class="post-rank-views">' + pv.toLocaleString() + ' PV</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function renderTimestamp() {
    var el = document.getElementById('stat-updated-time');
    if (el) el.textContent = 'Busuanzi \u5b9e\u65f6\u6570\u636e';
  }

  function initTotalFromEvent() {
    document.addEventListener('busuanzi-offset-applied', function (e) {
      animateNumber(document.getElementById('stat-total-pv'), e.detail.pv);
      animateNumber(document.getElementById('stat-total-uv'), e.detail.uv);
    });
  }

  function initTotalFallback(offset) {
    var fallbackTimer = setTimeout(function () {
      fetch('/stats/views.json').then(function (r) { return r.json(); }).then(function (views) {
        var pv = views.total ? (views.total.pv || 0) : 0;
        var uv = views.total ? (views.total.uv || 0) : 0;
        animateNumber(document.getElementById('stat-total-pv'), pv + (offset.total_pv || 0));
        animateNumber(document.getElementById('stat-total-uv'), uv + (offset.total_uv || 0));
      }).catch(function () {});
    }, 12000);

    document.addEventListener('busuanzi-offset-applied', function () {
      clearTimeout(fallbackTimer);
    }, { once: true });
  }

  function calcIncremental(snapshots, groupFn) {
    if (!snapshots.length) return [];
    var groups = {};
    snapshots.forEach(function (s) {
      var key = groupFn(s);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    var keys = Object.keys(groups).sort();
    var result = [];
    for (var i = 0; i < keys.length; i++) {
      var last = groups[keys[i]][groups[keys[i]].length - 1];
      var prevLast = i > 0 ? groups[keys[i - 1]][groups[keys[i - 1]].length - 1] : null;
      var incPv = prevLast ? Math.max(0, last.pv - prevLast.pv) : 0;
      var incUv = prevLast ? Math.max(0, last.uv - prevLast.uv) : 0;
      result.push({ key: keys[i], pv: incPv, uv: incUv });
    }
    return result;
  }

  function renderChart(range) {
    if (!historyData || !historyData.snapshots) return;
    var snapshots = historyData.snapshots;
    var now = new Date();
    var filtered;
    var groupFn;
    var labelFn;
    var skipFirst = false;

    if (range === '24h') {
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var beforeToday = snapshots.filter(function (s) { return new Date(s.ts) < todayStart; });
      var baseline = beforeToday.length ? [beforeToday[beforeToday.length - 1]] : [];
      var inRange = snapshots.filter(function (s) { return new Date(s.ts) >= todayStart; });
      filtered = baseline.concat(inRange);
      skipFirst = baseline.length > 0;
      groupFn = function (s) {
        var d = new Date(s.ts);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '-' + d.getHours();
      };
      labelFn = function (key) {
        return key.split('-')[3] + ':00';
      };
    } else {
      var days = range === '7d' ? 7 : 30;
      var rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
      var beforeRange = snapshots.filter(function (s) { return new Date(s.ts) < rangeStart; });
      var baseline = beforeRange.length ? [beforeRange[beforeRange.length - 1]] : [];
      var inRange = snapshots.filter(function (s) { return new Date(s.ts) >= rangeStart; });
      filtered = baseline.concat(inRange);
      skipFirst = baseline.length > 0;
      groupFn = function (s) {
        var d = new Date(s.ts);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      };
      labelFn = function (key) {
        return key.substring(5);
      };
    }

    var data = calcIncremental(filtered, groupFn);
    if (skipFirst && data.length > 0) data = data.slice(1);

    var labels = data.map(function (d) { return labelFn(d.key); });
    var pvData = data.map(function (d) { return d.pv; });
    var uvData = data.map(function (d) { return d.uv; });

    var canvas = document.getElementById('traffic-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    var textColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';

    var chartHeight = canvas.parentElement ? (canvas.parentElement.clientHeight || 300) : 300;
    var pvGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    pvGradient.addColorStop(0, 'rgba(102,126,234,0.4)');
    pvGradient.addColorStop(1, 'rgba(118,75,162,0.05)');

    var uvGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    uvGradient.addColorStop(0, 'rgba(17,153,142,0.4)');
    uvGradient.addColorStop(1, 'rgba(56,239,125,0.05)');

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'PV',
            data: pvData,
            borderColor: '#667eea',
            backgroundColor: pvGradient,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'UV',
            data: uvData,
            borderColor: '#11998e',
            backgroundColor: uvGradient,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor }
          },
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor }
          }
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function (context) {
                return context.dataset.label + ': ' + context.parsed.y.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  function initToggle() {
    var btns = document.querySelectorAll('.chart-toggle-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderChart(btn.getAttribute('data-range'));
      });
    });
  }

  function init() {
    var offsetPromise = fetch('/stats/offset.json').then(function (r) { return r.json(); }).catch(function () {
      return { total_pv: 0, total_uv: 0, categories: {}, tags: {}, posts: {} };
    });
    var viewsPromise = fetch('/stats/views.json').then(function (r) { return r.json(); });
    var historyPromise = fetch('/stats/history.json').then(function (r) { return r.json(); }).catch(function () {
      return { snapshots: [] };
    });

    offsetPromise.then(function (offset) {
      initTotalFromEvent();
      initTotalFallback(offset);
    });

    Promise.all([viewsPromise, offsetPromise]).then(function (results) {
      var views = results[0];
      var offset = results[1];
      animateNumber(document.getElementById('stat-total-posts'), views.posts.length);
      animateNumber(document.getElementById('stat-total-cats'), Object.keys(views.categories).length);
      renderCategories(views, offset);
      renderPosts(views, offset);
      renderTimestamp();
    }).catch(function (e) { console.error('Stats data load failed:', e); });

    historyPromise.then(function (data) {
      historyData = data;
      renderChart('30d');
      initToggle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
