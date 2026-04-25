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
      if (Date.now() - obj.ts > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
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
    if (idx >= apis.length) {
      var fb = fallbackDetect();
      setCache(fb);
      return Promise.resolve(fb);
    }
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
    var existing = document.getElementById('side-banner-left');
    if (existing) return;

    if (!isChina) return;

    var style = document.createElement('style');
    style.textContent = '@media(min-width:1200px){.side-banner{position:fixed;top:50%;transform:translateY(-50%);z-index:9999;}.side-banner-left{left:8px;}.side-banner-right{right:8px;}.side-banner a{display:block;text-decoration:none;}.side-banner img{border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.15);transition:transform .2s;}.side-banner img:hover{transform:scale(1.05);}.side-banner .close-btn{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.45);color:#fff;font-size:11px;line-height:18px;text-align:center;cursor:pointer;pointer-events:auto;}.side-banner .close-btn:hover{background:rgba(0,0,0,.65);}}@media(max-width:1199px){.side-banner{display:none!important;}}';
    document.head.appendChild(style);

    var leftBanner = document.createElement('div');
    leftBanner.id = 'side-banner-left';
    leftBanner.className = 'side-banner side-banner-left';
    leftBanner.innerHTML = '<a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" title="\u5357\u5F71\u4E91 - \u9AD8\u6027\u4EF7\u6BD4\u4E91\u670D\u52A1\u5668"><div style="width:100px;padding:10px 6px;background:linear-gradient(180deg,#ff6b6b,#ee5a24);border-radius:10px;text-align:center;box-shadow:0 4px 16px rgba(255,107,107,.4);"><div style="font-size:28px;">\u2601\uFE0F</div><div style="color:#fff;font-size:13px;font-weight:bold;margin-top:4px;line-height:1.3;">\u5357\u5F71\u4E91</div><div style="color:#ffe0e0;font-size:10px;margin-top:3px;">T+\u7EA7\u9632\u62A4</div><div style="color:#ffe0e0;font-size:10px;">\u65E0\u9650\u9632CC</div><div style="margin-top:6px;padding:3px 8px;background:rgba(255,255,255,.3);border-radius:10px;color:#fff;font-size:10px;font-weight:bold;">\u4E13\u5C5E\u4F18\u60E0</div></div></a><div class="close-btn" onmousedown="var t=this;this._ht=setTimeout(function(){t.parentElement.style.display=\'none\';},1500)" onmouseup="clearTimeout(this._ht)" onmouseleave="clearTimeout(this._ht)">\u00D7</div>';

    var rightBanner = document.createElement('div');
    rightBanner.id = 'side-banner-right';
    rightBanner.className = 'side-banner side-banner-right';
    rightBanner.innerHTML = '<a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" title="\u5357\u5F71\u4E91 - \u9AD8\u6027\u4EF7\u6BD4\u4E91\u670D\u52A1\u5668"><div style="width:100px;padding:10px 6px;background:linear-gradient(180deg,#49b1f5,#2d8fd5);border-radius:10px;text-align:center;box-shadow:0 4px 16px rgba(73,177,245,.4);"><div style="font-size:28px;">\u2601\uFE0F</div><div style="color:#fff;font-size:13px;font-weight:bold;margin-top:4px;line-height:1.3;">\u5357\u5F71\u4E91</div><div style="color:#e0f2fe;font-size:10px;margin-top:3px;">\u8D85\u4F4E\u5355\u4EF7</div><div style="color:#e0f2fe;font-size:10px;">\u7A33\u5B9A\u53EF\u9760</div><div style="margin-top:6px;padding:3px 8px;background:rgba(255,255,255,.3);border-radius:10px;color:#fff;font-size:10px;font-weight:bold;">\u7ACB\u5373\u6CE8\u518C</div></div></a><div class="close-btn" onmousedown="var t=this;this._ht=setTimeout(function(){t.parentElement.style.display=\'none\';},1500)" onmouseup="clearTimeout(this._ht)" onmouseleave="clearTimeout(this._ht)">\u00D7</div>';

    document.body.appendChild(leftBanner);
    document.body.appendChild(rightBanner);
  }

  function createFloatingCorner(isChina) {
    var existing = document.getElementById('float-corner');
    if (existing) return;

    if (!isChina) return;

    var el = document.createElement('div');
    el.id = 'float-corner';
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';
    el.innerHTML = '<a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);color:#fff;border-radius:30px;text-decoration:none;font-size:13px;font-weight:bold;box-shadow:0 4px 16px rgba(255,107,107,.5);transition:transform .2s,box-shadow .2s;" onmouseover="this.style.transform=\'scale(1.05)\';this.style.boxShadow=\'0 6px 24px rgba(255,107,107,.6)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 4px 16px rgba(255,107,107,.5)\'"><span style="font-size:18px;">\u2601\uFE0F</span><span>\u5357\u5F71\u4E91\u4E13\u5C5E\u4F18\u60E0</span></a>';
    document.body.appendChild(el);
  }

  function createFooterBanner(isChina) {
    var existing = document.getElementById('footer-promo');
    if (existing) return;

    if (!isChina) return;

    var el = document.createElement('div');
    el.id = 'footer-promo';
    el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99998;background:linear-gradient(90deg,#ff6b6b,#ee5a24);color:#fff;text-align:center;padding:8px 0;font-size:13px;box-shadow:0 -2px 12px rgba(255,107,107,.3);';
    el.innerHTML = '<span style="margin-right:8px;">\u2601\uFE0F \u5357\u5F71\u4E91 - \u672C\u7AD9\u670D\u52A1\u5668\u6258\u7BA1\u65B9 | T+\u7EA7DDoS\u9632\u62A4 | \u65E0\u9650\u9632CC | \u8D85\u4F4E\u5355\u4EF7</span><a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" style="display:inline-block;padding:4px 14px;background:rgba(255,255,255,.25);border-radius:14px;color:#fff;text-decoration:none;font-weight:bold;font-size:12px;margin-left:6px;">\u7ACB\u5373\u6CE8\u518C\u9886\u4F18\u60E0</a><span onmousedown="var t=this;this._ht=setTimeout(function(){t.parentElement.style.display=\'none\';},1500)" onmouseup="clearTimeout(this._ht)" onmouseleave="clearTimeout(this._ht)" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:14px;opacity:.5;line-height:1;">\u00D7</span>';
    document.body.appendChild(el);
  }

  function init() {
    var cached = getCachedRegion();
    if (cached !== null) {
      renderCards(cached);
      createSideBanners(cached);
      createFloatingCorner(cached);
      createFooterBanner(cached);
      return;
    }
    tryApi(0).then(function (isChina) {
      renderCards(isChina);
      createSideBanners(isChina);
      createFloatingCorner(isChina);
      createFooterBanner(isChina);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
