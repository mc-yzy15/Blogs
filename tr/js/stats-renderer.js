(function () {
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

  function renderOverview(views, offset) {
    var totalPv = offset.total_pv || 0;
    var totalUv = offset.total_uv || 0;
    animateNumber(document.getElementById('stat-total-pv'), totalPv);
    animateNumber(document.getElementById('stat-total-uv'), totalUv);
    animateNumber(document.getElementById('stat-total-posts'), views.posts.length);
    animateNumber(document.getElementById('stat-total-cats'), Object.keys(views.categories).length);
  }

  function renderCategories(views, offset) {
    var container = document.getElementById('cat-bar-chart');
    if (!container) return;
    var catOff = offset.categories || {};
    var entries = Object.entries(views.categories).sort(function (a, b) {
      return (b[1].pv + (catOff[b[0]] || 0)) - (a[1].pv + (catOff[a[0]] || 0));
    });
    var maxPv = entries.length ? entries[0][1].pv + (catOff[entries[0][0]] || 0) : 1;
    var html = '';
    entries.forEach(function (entry) {
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
    var sorted = views.posts.slice().sort(function (a, b) {
      return (b.pv + (postOff[b.slug] || 0)) - (a.pv + (postOff[a.slug] || 0));
    });
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

  function renderTimestamp(views) {
    var el = document.getElementById('stat-updated-time');
    if (el && views.updated_at) el.textContent = views.updated_at;
  }

  function init() {
    var viewsPromise = fetch('/stats/views.json').then(function (r) { return r.json(); });
    var offsetPromise = fetch('/stats/offset.json').then(function (r) { return r.json(); }).catch(function () {
      return { total_pv: 0, total_uv: 0, categories: {}, tags: {}, posts: {} };
    });

    Promise.all([viewsPromise, offsetPromise]).then(function (results) {
      var views = results[0];
      var offset = results[1];
      renderOverview(views, offset);
      renderCategories(views, offset);
      renderPosts(views, offset);
      renderTimestamp(views);
    }).catch(function (e) { console.error('Stats data load failed:', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
