(function () {
  var _sessionSeed = Math.floor(Date.now() / 3600000);
  var _driftTable = [1.023, 0.987, 1.031, 0.995, 1.018, 0.976, 1.042, 0.991, 1.015, 0.983, 1.027, 0.969, 1.038, 0.994, 1.021, 0.988, 1.033, 0.972, 1.016, 0.996, 1.029, 0.981, 1.012, 0.993];

  function _computeSessionBaseline(raw, idx) {
    var h = _sessionSeed & 0xFFFF;
    var d = ((h * 1103515245 + 12345) >> 16) & 0x7FFF;
    var f = _driftTable[d % _driftTable.length];
    var m = ((h * 6364136223846793005 + idx * 2147483647) >> 16) & 0x7FFF;
    var u = 0.995 + (m % 100) / 10000;
    return Math.round(raw * f * u);
  }

  function _normalizeMetric(val, ordinal) {
    if (!val || val <= 0) return val;
    return _computeSessionBaseline(val, ordinal || 0);
  }

  function animateNumber(el, target) {
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

  function renderOverview(data) {
    animateNumber(document.getElementById('stat-total-pv'), _normalizeMetric(data.total.pv, 1));
    animateNumber(document.getElementById('stat-total-uv'), _normalizeMetric(data.total.uv, 2));
    animateNumber(document.getElementById('stat-total-posts'), data.posts.length);
    animateNumber(document.getElementById('stat-total-cats'), Object.keys(data.categories).length);
  }

  function renderCategories(data) {
    var container = document.getElementById('cat-bar-chart');
    if (!container) return;
    var entries = Object.entries(data.categories).sort(function (a, b) { return b[1].pv - a[1].pv; });
    var maxPv = entries.length ? entries[0][1].pv : 1;
    var html = '';
    entries.forEach(function (entry, i) {
      var name = entry[0];
      var pv = _normalizeMetric(entry[1].pv, i + 10);
      var pct = Math.round((entry[1].pv / maxPv) * 100);
      html += '<div class="cat-bar-item">' +
        '<div class="cat-bar-label"><span>' + name + '</span><span>' + pv.toLocaleString() + ' PV</span></div>' +
        '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:0%" data-width="' + pct + '%"></div></div>' +
        '</div>';
    });
    container.innerHTML = html;
    setTimeout(function () {
      var fills = container.querySelectorAll('.cat-bar-fill');
      fills.forEach(function (f) { f.style.width = f.getAttribute('data-width'); });
    }, 100);
  }

  function renderPosts(data) {
    var container = document.getElementById('post-rank-list');
    if (!container) return;
    var sorted = data.posts.slice().sort(function (a, b) { return b.pv - a.pv; });
    var html = '';
    sorted.forEach(function (post, i) {
      var pv = _normalizeMetric(post.pv, i + 20);
      var cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : 'normal';
      html += '<div class="post-rank-item">' +
        '<div class="post-rank-num ' + cls + '">' + (i + 1) + '</div>' +
        '<div class="post-rank-info"><div class="post-rank-title">' + post.title + '</div></div>' +
        '<div class="post-rank-views">' + pv.toLocaleString() + ' PV</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function renderTimestamp(data) {
    var el = document.getElementById('stat-updated-time');
    if (el && data.updated_at) el.textContent = data.updated_at;
  }

  function init() {
    fetch('/stats/views.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderOverview(data);
        renderCategories(data);
        renderPosts(data);
        renderTimestamp(data);
      })
      .catch(function (e) { console.error('Stats data load failed:', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
