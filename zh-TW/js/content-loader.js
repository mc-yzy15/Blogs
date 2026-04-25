(function () {
  var CACHE_KEY = 'visitor_region';
  var CACHE_TTL = 86400000;

  function buildCard(cfg) {
    var pad = cfg.compact ? '14px 10px' : '18px 14px';
    var titleSize = cfg.compact ? '14px' : '17px';
    var descSize = cfg.compact ? '11px' : '13px';
    var btnPad = cfg.compact ? '5px 16px' : '7px 22px';
    var btnRadius = cfg.compact ? '14px' : '18px';
    var btnSize = cfg.compact ? '12px' : '13px';
    var h = '<div style="text-align:center;padding:' + pad + ';border:2px solid ' + cfg.color + ';border-radius:10px;margin:0 auto;background:linear-gradient(135deg,' + cfg.bgLight + ',' + cfg.bgDark + ');box-shadow:0 2px 12px ' + cfg.color + '33;transition:transform .2s,box-shadow .2s;" onmouseover="this.style.transform=\'scale(1.02)\';this.style.boxShadow=\'0 4px 20px ' + cfg.color + '55\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 2px 12px ' + cfg.color + '33\'">';
    h += '<div style="font-size:' + titleSize + ';font-weight:bold;color:' + cfg.color + ';line-height:1.4;">' + cfg.icon + ' ' + cfg.title + '</div>';
    if (cfg.desc) h += '<div style="font-size:' + descSize + ';color:#444;margin-top:6px;font-weight:500;">' + cfg.desc + '</div>';
    if (cfg.sub) h += '<div style="font-size:' + descSize + ';color:#666;margin-top:3px;">' + cfg.sub + '</div>';
    if (cfg.link && cfg.linkText) {
      h += '<div style="margin-top:10px;"><a href="' + cfg.link + '" target="_blank" rel="noopener" style="display:inline-block;padding:' + btnPad + ';background:linear-gradient(135deg,' + cfg.color + ',' + cfg.btnGrad + ');color:#fff;border-radius:' + btnRadius + ';text-decoration:none;font-size:' + btnSize + ';font-weight:bold;box-shadow:0 2px 8px ' + cfg.color + '44;transition:transform .15s;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">' + cfg.linkText + '</a></div>';
    }
    if (cfg.footer) h += '<div style="font-size:10px;color:#999;margin-top:6px;">' + cfg.footer + '</div>';
    h += '</div>';
    return h;
  }

  var CN = {
    icon: '\u2601\uFE0F',
    title: '\u5357\u5F71\u4E91 - \u9AD8\u6027\u4EF7\u6BD4\u4E91\u670D\u52A1\u5668',
    desc: '\u4E0A\u4E07\u53F0\u670D\u52A1\u5668 | T+\u7EA7DDoS\u9632\u62A4 | \u65E0\u9650\u9632CC',
    sub: '\uD83C\uDF81 \u901A\u8FC7\u4E0B\u65B9\u94FE\u63A5\u6CE8\u518C\u4EAB\u4E13\u5C5E\u4F18\u60E0',
    link: 'https://idc.ofoca.net/aff/PJQGAEKY',
    linkText: '\u7ACB\u5373\u6CE8\u518C\u9886\u4F18\u60E0',
    footer: '\u6CE8\u518C\u540E\u8054\u7CFB\u535A\u4E3B\u53EF\u518D\u9886\u989D\u5916\u6298\u6263',
    color: '#ff6b6b',
    btnGrad: '#ee5a24',
    bgLight: '#fff5f5',
    bgDark: '#ffe0e0'
  };

  var CN_ASIDE = Object.assign({}, CN, {
    footer: null,
    color: '#49b1f5',
    btnGrad: '#2d8fd5',
    bgLight: '#f0f9ff',
    bgDark: '#e0f2fe',
    compact: true
  });

  var INTL = {
    icon: '\uD83D\uDCE2',
    title: 'Ad Space Available',
    desc: null,
    sub: null,
    link: null,
    linkText: null,
    footer: null,
    color: '#7c3aed',
    btnGrad: '#6d28d9',
    bgLight: '#f5f3ff',
    bgDark: '#ede9fe'
  };

  var cnCards = {
    aside: buildCard(CN_ASIDE),
    index: buildCard(CN),
    post: buildCard(CN)
  };

  var intlCards = {
    aside: buildCard(Object.assign({}, INTL, { desc: 'Sidebar: $5/mo', sub: 'Contact via Telegram', compact: true })),
    index: buildCard(Object.assign({}, INTL, { desc: 'Homepage: $10/mo', sub: 'Contact via Telegram' })),
    post: buildCard(Object.assign({}, INTL, { desc: 'Post: $8/mo', sub: 'Contact via Telegram' }))
  };

  function getCachedRegion() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
      return obj.isChina;
    } catch (e) { return null; }
  }

  function setCache(isChina) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ isChina: isChina, ts: Date.now() })); } catch (e) { }
  }

  function fallbackDetect() {
    var tz = '', lang = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { }
    try { lang = navigator.language || navigator.userLanguage || ''; } catch (e) { }
    var cnTz = ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Hong_Kong', 'Asia/Macau'];
    return cnTz.indexOf(tz) !== -1 || lang.indexOf('zh') === 0;
  }

  var apis = [
    { url: 'https://get.geojs.io/v1/ip/geo.json', field: 'country_code' },
    { url: 'https://ipwho.is/', field: 'country_code' },
    { url: 'https://ipapi.co/json/', field: 'country_code' }
  ];

  function tryApi(idx) {
    if (idx >= apis.length) { var fb = fallbackDetect(); setCache(fb); return Promise.resolve(fb); }
    var api = apis[idx];
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 5000);
    return fetch(api.url, { signal: controller.signal })
      .then(function (res) { clearTimeout(timer); if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (data) { var code = data[api.field]; if (code) { var r = code === 'CN'; setCache(r); return r; } throw new Error('no data'); })
      .catch(function () { return tryApi(idx + 1); });
  }

  function renderCards(isChina) {
    var cards = isChina ? cnCards : intlCards;
    var asideEls = document.querySelectorAll('.card-widget.rec-card');
    for (var i = 0; i < asideEls.length; i++) { asideEls[i].innerHTML = cards.aside; }
    var indexEls = document.querySelectorAll('.recent-post-item.rec-card');
    for (var j = 0; j < indexEls.length; j++) { indexEls[j].innerHTML = cards.index; }
    var postEls = document.querySelectorAll('#post .rec-card');
    for (var k = 0; k < postEls.length; k++) { postEls[k].innerHTML = cards.post; }
  }

  function createSideBanners(isChina) {
    var existing = document.getElementById('side-slot-left');
    if (existing) return;
    if (!isChina) return;

    var style = document.createElement('style');
    style.textContent = '@media(min-width:1300px){.side-slot{position:fixed;top:15%;width:120px;z-index:1;text-align:center;}.side-slot-left{left:0;}.side-slot-right{right:0;}.side-slot .slot-card{margin:0 auto 12px;padding:10px 8px;background:#fff;border:1px solid #eee;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,.06);transition:box-shadow .2s;}.side-slot .slot-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.12);}.side-slot .slot-card img{width:60px;height:60px;border-radius:8px;margin:0 auto 6px;display:block;}.side-slot .slot-title{font-size:12px;font-weight:bold;color:#333;margin-bottom:2px;}.side-slot .slot-desc{font-size:10px;color:#999;line-height:1.3;}.side-slot .slot-btn{display:inline-block;margin-top:6px;padding:3px 10px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);color:#fff;border-radius:10px;font-size:10px;font-weight:bold;text-decoration:none;}.side-slot .slot-btn-blue{background:linear-gradient(135deg,#49b1f5,#2d8fd5);}}@media(max-width:1299px){.side-slot{display:none!important;}}';
    document.head.appendChild(style);

    var leftSlot = document.createElement('div');
    leftSlot.id = 'side-slot-left';
    leftSlot.className = 'side-slot side-slot-left';
    leftSlot.innerHTML = '<a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" class="slot-card" style="display:block;text-decoration:none;"><div style="font-size:32px;">\u2601\uFE0F</div><div class="slot-title">\u5357\u5F71\u4E91</div><div class="slot-desc">T+\u7EA7DDoS\u9632\u62A4<br>\u65E0\u9650\u9632CC</div><span class="slot-btn">\u4E13\u5C5E\u4F18\u60E0</span></a>';

    var rightSlot = document.createElement('div');
    rightSlot.id = 'side-slot-right';
    rightSlot.className = 'side-slot side-slot-right';
    rightSlot.innerHTML = '<a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" class="slot-card" style="display:block;text-decoration:none;"><div style="font-size:32px;">\u2601\uFE0F</div><div class="slot-title">\u5357\u5F71\u4E91</div><div class="slot-desc">\u8D85\u4F4E\u5355\u4EF7<br>\u7A33\u5B9A\u53EF\u9760</div><span class="slot-btn slot-btn-blue">\u7ACB\u5373\u6CE8\u518C</span></a>';

    document.body.appendChild(leftSlot);
    document.body.appendChild(rightSlot);
  }

  function createFloatingCorner(isChina) {
    var existing = document.getElementById('float-corner');
    if (existing) return;
    if (!isChina) return;

    var el = document.createElement('div');
    el.id = 'float-corner';
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';
    el.innerHTML = '<a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:6px;padding:8px 14px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);color:#fff;border-radius:24px;text-decoration:none;font-size:12px;font-weight:bold;box-shadow:0 3px 12px rgba(255,107,107,.4);transition:transform .2s,box-shadow .2s;" onmouseover="this.style.transform=\'scale(1.05)\';this.style.boxShadow=\'0 5px 20px rgba(255,107,107,.5)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 3px 12px rgba(255,107,107,.4)\'"><span style="font-size:16px;">\u2601\uFE0F</span><span>\u5357\u5F71\u4E91\u4E13\u5C5E\u4F18\u60E0</span></a>';
    document.body.appendChild(el);
  }

  function init() {
    var cached = getCachedRegion();
    if (cached !== null) {
      renderCards(cached);
      createSideBanners(cached);
      return;
    }
    tryApi(0).then(function (isChina) {
      renderCards(isChina);
      createSideBanners(isChina);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
