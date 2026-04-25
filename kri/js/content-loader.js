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

  function detectBlocker(callback) {
    var detected = false;

    function done(result) {
      if (detected) return;
      detected = true;
      callback(result);
    }

    // Method 1: Check real ad elements on page
    function checkRealAds() {
      var selectors = ['.ad-banner', '.sponsor', '.ad-slot', '.ad-placement', '.ads', '.adsbox', '.ad_container', '.ad-wrapper', '.ad-wrapper'];
      for (var s = 0; s < selectors.length; s++) {
        var els = document.querySelectorAll(selectors[s]);
        for (var i = 0; i < els.length; i++) {
          var style = window.getComputedStyle(els[i]);
          if (style.display !== 'none' && style.visibility !== 'hidden' && els[i].offsetHeight > 0) {
            return false;
          }
        }
      }
      return true;
    }

    // Method 2: Bait element with tons of ad classes
    function createBait() {
      var bait = document.createElement('div');
      bait.id = 'ad-detect-bait';
      bait.className = 'ad-banner ad ads adsbox ad-placement sponsor ad-banner-container textads banner-ads banner_ad ad-active ad_container ad-wrapper ad-slot ad_unit ad-unit adsbox adbox adcontent adframe adholder adleaderboard adlink adpane adplaceholder adrectangle adsection adserver adspace adtag adtext adtitle adtop adv ad-vertical-container ad-wrapper-center adsense adSense';
      bait.setAttribute('data-ad', '1');
      bait.setAttribute('data-ad-slot', '1');
      bait.setAttribute('data-ad-client', '1');
      bait.setAttribute('data-ad-format', 'auto');
      bait.setAttribute('data-ad-region', 'test');
      bait.setAttribute('data-google-query-id', 'test');
      bait.setAttribute('id', 'google_ads_iframe_test');
      bait.innerHTML = '<span style="font-size:1px;">&nbsp;ad&nbsp;</span><ins class="adsbygoogle" style="display:block;"></ins>';
      document.body.appendChild(bait);
      return bait;
    }

    function checkBait(bait) {
      if (!bait || !bait.parentNode) return false;
      var style = window.getComputedStyle(bait);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
      if (bait.offsetHeight === 0 || bait.clientHeight === 0 || bait.offsetWidth === 0) return true;
      if (bait.offsetParent === null) return true;
      var rect = bait.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return true;
      var inner = bait.querySelector('ins');
      if (inner) {
        var innerStyle = window.getComputedStyle(inner);
        if (innerStyle.display === 'none' || inner.offsetHeight === 0) return true;
      }
      return false;
    }

    // Method 3: Try fetching a known ad URL
    function checkFetch() {
      var urls = [
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        'https://adservice.google.com/adsid/integrator.js',
        'https://doubleclick.net/instream/ad_status.js'
      ];
      var blocked = 0;
      var total = urls.length;
      urls.forEach(function (url) {
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, 3000);
        fetch(url, { mode: 'no-cors', signal: controller.signal })
          .then(function () { clearTimeout(timer); blocked++; checkDone(); })
          .catch(function () { clearTimeout(timer); blocked += 0; checkDone(); });
      });
      var doneCount = 0;
      function checkDone() {
        doneCount++;
        if (doneCount === total) {
          // If all fetches failed, likely blocked
          if (blocked === 0) done(true);
        }
      }
    }

    // Method 4: Check for Adblock-specific CSS/elements
    function checkAdblockTraces() {
      // uBlock Origin creates style elements with specific content
      var styles = document.querySelectorAll('style');
      for (var i = 0; i < styles.length; i++) {
        var text = styles[i].textContent || '';
        if (text.indexOf('ad-banner') !== -1 || text.indexOf('adsbox') !== -1 || text.indexOf('.ad ') !== -1 || text.indexOf('.ads') !== -1) {
          return true;
        }
      }
      // Adblock Plus creates collapsed elements
      var collapsed = document.querySelectorAll('[style*="display: none"][class*="ad"], [style*="display:none"][class*="ad"]');
      if (collapsed.length > 0) return true;
      return false;
    }

    // Method 5: Check window properties
    function checkWindowProps() {
      if (typeof window.google_ad_status !== 'undefined') return false;
      // Some blockers define these
      if (typeof window.blockAdBlock !== 'undefined' || typeof window.adBlockDetected !== 'undefined') return true;
      return false;
    }

    // Method 6: Create an ad-like iframe
    function checkIframe() {
      try {
        var iframe = document.createElement('iframe');
        iframe.src = 'about:blank';
        iframe.name = 'google_ads_iframe_test';
        iframe.id = 'ad-iframe-detect';
        iframe.style.cssText = 'width:1px;height:1px;position:absolute;left:-10px;top:-10px;';
        iframe.setAttribute('data-ad', '1');
        document.body.appendChild(iframe);
        setTimeout(function () {
          var el = document.getElementById('ad-iframe-detect');
          if (!el || !el.parentNode || el.style.display === 'none' || el.offsetHeight === 0) {
            done(true);
          } else {
            try { document.body.removeChild(el); } catch (e) {}
          }
        }, 500);
      } catch (e) {}
    }

    // Method 7: Image-based detection
    function checkImage() {
      var img = new Image();
      img.src = 'https://pagead2.googlesyndication.com/pagead/images/ad_choices_icon.png?' + Date.now();
      img.onload = function () {};
      img.onerror = function () { done(true); };
      setTimeout(function () { img.src = ''; }, 3000);
    }

    // Method 8: Script-based detection
    function checkScript() {
      var script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?' + Date.now();
      script.onerror = function () { done(true); };
      script.onload = function () { try { document.body.removeChild(script); } catch (e) {} };
      document.body.appendChild(script);
      setTimeout(function () { try { document.body.removeChild(script); } catch (e) {} }, 3000);
    }

    // Method 9: Check for collapsed ad containers
    function checkCollapsed() {
      var all = document.querySelectorAll('div, section, aside');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        var cn = (el.className || '').toLowerCase();
        if (cn.indexOf('ad') !== -1 || cn.indexOf('sponsor') !== -1 || cn.indexOf('banner') !== -1) {
          var style = window.getComputedStyle(el);
          if (style.display === 'none' || (el.offsetHeight === 0 && el.offsetWidth === 0)) {
            return true;
          }
        }
      }
      return false;
    }

    // Method 10: XMLHttpRequest-based detection
    function checkXHR() {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?' + Date.now(), true);
        xhr.timeout = 3000;
        xhr.onerror = function () { done(true); };
        xhr.ontimeout = function () {};
        xhr.send();
      } catch (e) {
        done(true);
      }
    }

    // Run all methods
    var bait = createBait();

    // Polling check for DOM-based methods
    var pollCount = 0;
    var maxPolls = 20;
    function poll() {
      pollCount++;
      if (checkRealAds()) { done(true); return; }
      if (checkBait(bait)) { done(true); return; }
      if (checkAdblockTraces()) { done(true); return; }
      if (checkWindowProps()) { done(true); return; }
      if (checkCollapsed()) { done(true); return; }
      if (pollCount < maxPolls) {
        setTimeout(poll, 300);
      } else {
        done(false);
      }
    }

    setTimeout(poll, 500);
    checkFetch();
    checkIframe();
    checkImage();
    checkScript();
    checkXHR();

    // Final fallback timeout
    setTimeout(function () { done(false); }, 5000);
  }

  function showBlockerAppeal() {
    var dismissed = false;
    try { dismissed = sessionStorage.getItem('blocker_appeal_dismissed'); } catch (e) {}
    if (dismissed) return;

    var overlay = document.createElement('div');
    overlay.id = 'blocker-appeal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;padding:32px 28px;max-width:420px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2);position:relative;';
    modal.innerHTML = '<div style="font-size:48px;margin-bottom:12px;">\uD83D\uDE4F</div><div style="font-size:20px;font-weight:bold;color:#333;margin-bottom:12px;">\u8BF7\u652F\u6301\u6211\u4EEC\u7684\u521B\u4F5C</div><div style="font-size:14px;color:#666;line-height:1.7;margin-bottom:8px;">\u6211\u4EEC\u68C0\u6D4B\u5230\u60A8\u5F00\u542F\u4E86\u5E7F\u544A\u62E6\u622A\u5668\uFF0C\u8FD9\u8BA9\u6211\u4EEC\u5F88\u96BE\u8FC7 \uD83D\uDE22</div><div style="font-size:14px;color:#666;line-height:1.7;margin-bottom:8px;">\u535A\u5BA2\u7684\u670D\u52A1\u5668\u3001\u57DF\u540D\u3001\u7EF4\u62A4\u90FD\u9700\u8981\u8D39\u7528\uFF0C\u5E7F\u544A\u6536\u5165\u662F\u6211\u4EEC\u575A\u6301\u521B\u4F5C\u7684\u91CD\u8981\u652F\u6491\u3002</div><div style="font-size:14px;color:#666;line-height:1.7;margin-bottom:16px;">\u5982\u679C\u60A8\u89C9\u5F97\u6211\u4EEC\u7684\u5185\u5BB9\u5BF9\u60A8\u6709\u5E2E\u52A9\uFF0C\u8BF7\u8003\u8651\u5C06\u672C\u7AD9\u52A0\u5165\u5E7F\u544A\u62E6\u622A\u5668\u7684\u767D\u540D\u5355\uFF0C\u6216\u4E34\u65F6\u5173\u95ED\u62E6\u622A\u5668\u3002</div><div style="font-size:13px;color:#999;margin-bottom:20px;">\u6211\u4EEC\u7684\u5E7F\u544A\u4E0D\u4F1A\u5F39\u7A97\u3001\u4E0D\u4F1A\u8DF3\u8F6C\u3001\u4E0D\u4F1A\u5E72\u6270\u60A8\u7684\u9605\u8BFB\u4F53\u9A8C \u2764\uFE0F</div><div style="display:flex;gap:10px;justify-content:center;"><button id="appeal-close" style="padding:10px 24px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#666;font-size:14px;cursor:pointer;">\u6211\u77E5\u9053\u4E86</button><button id="appeal-whitelist" style="padding:10px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);color:#fff;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(255,107,107,.3);">\u6211\u613F\u610F\u652F\u6301</button></div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('appeal-close').onclick = function () {
      document.body.removeChild(overlay);
      try { sessionStorage.setItem('blocker_appeal_dismissed', '1'); } catch (e) {}
    };

    document.getElementById('appeal-whitelist').onclick = function () {
      document.body.removeChild(overlay);
      try { sessionStorage.setItem('blocker_appeal_dismissed', '1'); } catch (e) {}
    };

    overlay.onclick = function (e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        try { sessionStorage.setItem('blocker_appeal_dismissed', '1'); } catch (e) {}
      }
    };
  }

  function createFooterPromo(isChina) {
    var existing = document.getElementById('footer-promo-slot');
    if (existing) return;
    if (!isChina) return;

    var footer = document.getElementById('footer');
    if (!footer) return;

    var el = document.createElement('div');
    el.id = 'footer-promo-slot';
    el.style.cssText = 'text-align:center;padding:12px 10px;border-top:1px solid #eee;background:#fafafa;';
    el.innerHTML = '<a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" style="text-decoration:none;color:#666;font-size:12px;">\u2601\uFE0F \u672C\u7AD9\u670D\u52A1\u5668\u7531 <strong style="color:#ff6b6b;">\u5357\u5F71\u4E91</strong> \u63D0\u4F9B\u6258\u7BA1 | T+\u7EA7DDoS\u9632\u62A4 | \u65E0\u9650\u9632CC | \u8D85\u4F4E\u5355\u4EF7 | <span style="color:#ff6b6b;font-weight:bold;">\u6CE8\u518C\u4EAB\u4E13\u5C5E\u4F18\u60E0</span></a>';
    footer.parentNode.insertBefore(el, footer.nextSibling);
  }

  function init() {
    detectBlocker(function (blocked) {
      if (blocked) showBlockerAppeal();
    });
    var cached = getCachedRegion();
    if (cached !== null) {
      renderCards(cached);
      createSideBanners(cached);
      createFooterPromo(cached);
      return;
    }
    tryApi(0).then(function (isChina) {
      renderCards(isChina);
      createSideBanners(isChina);
      createFooterPromo(isChina);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
