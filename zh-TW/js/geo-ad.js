(function () {
  var CACHE_KEY = 'geo_ad_region';
  var CACHE_TTL = 86400000;

  function buildAd(cfg) {
    var pad = cfg.compact ? '18px 10px' : '20px 10px';
    var titleSize = cfg.compact ? '16px' : '18px';
    var descSize = cfg.compact ? '12px' : '13px';
    var btnPad = cfg.compact ? '6px 20px' : '8px 24px';
    var btnRadius = cfg.compact ? '16px' : '20px';
    var btnSize = cfg.compact ? '13px' : '14px';
    var h = '<div style="text-align:center;padding:' + pad + ';border:2px dashed ' + cfg.color + ';border-radius:8px;margin:0 auto;background:linear-gradient(135deg,' + cfg.bgLight + ',' + cfg.bgDark + ');">';
    h += '<div style="font-size:' + titleSize + ';font-weight:bold;color:' + cfg.color + ';">' + cfg.icon + ' ' + cfg.title + '</div>';
    if (cfg.desc) h += '<div style="font-size:' + descSize + ';color:#555;margin-top:' + (cfg.compact ? '6px' : '8px') + ';">' + cfg.desc + '</div>';
    if (cfg.sub) h += '<div style="font-size:' + descSize + ';color:#555;margin-top:4px;">' + cfg.sub + '</div>';
    if (cfg.link && cfg.linkText) {
      h += '<div style="margin-top:' + (cfg.compact ? '8px' : '10px') + ';"><a href="' + cfg.link + '" target="_blank" rel="noopener" style="display:inline-block;padding:' + btnPad + ';background:' + cfg.color + ';color:#fff;border-radius:' + btnRadius + ';text-decoration:none;font-size:' + btnSize + ';font-weight:bold;">' + cfg.linkText + '</a></div>';
    }
    if (cfg.footer) h += '<div style="font-size:11px;color:#999;margin-top:6px;">' + cfg.footer + '</div>';
    h += '</div>';
    return h;
  }

  // ==================== 广告配置接口 ====================
  // 修改下方配置对象即可更换广告内容，无需改动其他代码
  //
  // 配置字段说明：
  //   icon     - 标题前图标
  //   title    - 广告标题
  //   desc     - 描述文字（可选，null则不显示）
  //   sub      - 副描述（可选，null则不显示）
  //   link     - 跳转链接（可选，null则不显示按钮）
  //   linkText - 按钮文字（可选，需配合link使用）
  //   footer   - 底部小字（可选，null则不显示）
  //   color    - 主题色（边框/按钮/标题）
  //   bgLight  - 背景渐变浅色
  //   bgDark   - 背景渐变深色
  //   compact  - 紧凑模式（侧边栏用，true=更小间距）
  // ========================================================

  // 国内广告配置
  var CN_AD = {
    icon: '\u2601\uFE0F',
    title: '\u5357\u5F71\u4E91 - \u9AD8\u6027\u4EF7\u6BD4\u4E91\u670D\u52A1\u5668',
    desc: '\u672C\u7AD9\u670D\u52A1\u5668\u6258\u7BA1\u65B9\uFF0C\u7A33\u5B9A\u53EF\u9760',
    sub: '\uD83C\uDF81 \u901A\u8FC7\u4E0B\u65B9\u94FE\u63A5\u6CE8\u518C\u4EAB\u4E13\u5C5E\u4F18\u60E0',
    link: 'https://idc.ofoca.net/aff/PJQGAEKY',
    linkText: '\u7ACB\u5373\u6CE8\u518C\u9886\u4F18\u60E0',
    footer: '\u6CE8\u518C\u540E\u8054\u7CFB\u535A\u4E3B\u53EF\u518D\u9886\u989D\u5916\u6298\u6263',
    color: '#ff6b6b',
    bgLight: '#fff5f5',
    bgDark: '#ffe0e0'
  };

  // 国内侧边栏广告（基于CN_AD覆盖部分字段）
  var CN_AD_ASIDE = Object.assign({}, CN_AD, {
    footer: null,
    color: '#49b1f5',
    bgLight: '#f0f9ff',
    bgDark: '#e0f2fe',
    compact: true
  });

  // 国外广告配置（当前为招租占位，有广告主时替换此配置即可）
  var INTL_AD = {
    icon: '\uD83D\uDCE2',
    title: 'Ad Space Available',
    desc: null,
    sub: null,
    link: null,
    linkText: null,
    footer: null,
    color: '#7c3aed',
    bgLight: '#f5f3ff',
    bgDark: '#ede9fe'
  };

  // ==================== 广告渲染 ====================

  var cnAds = {
    aside: buildAd(CN_AD_ASIDE),
    index: buildAd(CN_AD),
    post: buildAd(CN_AD)
  };

  var intlAds = {
    aside: buildAd(Object.assign({}, INTL_AD, { desc: 'Sidebar ad: $5/month', sub: 'Contact via Telegram for details', compact: true })),
    index: buildAd(Object.assign({}, INTL_AD, { desc: 'Homepage ad: $10/month', sub: 'Contact via Telegram for details' })),
    post: buildAd(Object.assign({}, INTL_AD, { desc: 'Post ad: $8/month', sub: 'Contact via Telegram for details' }))
  };

  // ==================== 地理位置检测 ====================

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
    } catch (e) {
      return null;
    }
  }

  function setCache(isChina) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ isChina: isChina, ts: Date.now() }));
    } catch (e) { }
  }

  function fallbackDetect() {
    var tz = '';
    var lang = '';
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
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var code = data[api.field];
        if (code) {
          var isChina = code === 'CN';
          setCache(isChina);
          return isChina;
        }
        throw new Error('no country_code');
      })
      .catch(function () {
        return tryApi(idx + 1);
      });
  }

  // ==================== 广告渲染 & 初始化 ====================

  function renderAds(isChina) {
    var ads = isChina ? cnAds : intlAds;
    var asideWraps = document.querySelectorAll('.card-widget.ads-wrap');
    for (var i = 0; i < asideWraps.length; i++) {
      asideWraps[i].innerHTML = ads.aside;
    }
    var indexWraps = document.querySelectorAll('.recent-post-item.ads-wrap');
    for (var j = 0; j < indexWraps.length; j++) {
      indexWraps[j].innerHTML = ads.index;
    }
    var postWraps = document.querySelectorAll('#post .ads-wrap');
    for (var k = 0; k < postWraps.length; k++) {
      postWraps[k].innerHTML = ads.post;
    }
  }

  function init() {
    var cached = getCachedRegion();
    if (cached !== null) {
      renderAds(cached);
      return;
    }
    tryApi(0).then(function (isChina) {
      renderAds(isChina);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
