(function () {
  var CACHE_KEY = 'geo_ad_region';
  var CACHE_TTL = 86400000;

  var cnAds = {
    aside: '<div style="text-align:center;padding:18px 10px;border:2px dashed #49b1f5;border-radius:8px;margin:0 auto;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);"><div style="font-size:16px;font-weight:bold;color:#49b1f5;">☁️ 南影云 - 高性价比云服务器</div><div style="font-size:12px;color:#555;margin-top:6px;">本站服务器托管方，稳定可靠</div><div style="font-size:12px;color:#555;margin-top:4px;">🎁 通过下方链接注册享专属优惠</div><div style="margin-top:8px;"><a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" style="display:inline-block;padding:6px 20px;background:#49b1f5;color:#fff;border-radius:16px;text-decoration:none;font-size:13px;font-weight:bold;">立即注册领优惠</a></div></div>',
    index: '<div style="text-align:center;padding:20px 10px;border:2px dashed #ff6b6b;border-radius:8px;margin:0 auto;background:linear-gradient(135deg,#fff5f5,#ffe0e0);"><div style="font-size:18px;font-weight:bold;color:#ff6b6b;">☁️ 南影云 - 高性价比云服务器</div><div style="font-size:13px;color:#555;margin-top:8px;">本站服务器托管方，稳定可靠</div><div style="font-size:13px;color:#555;margin-top:4px;">🎁 通过下方链接注册享专属优惠</div><div style="margin-top:10px;"><a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" style="display:inline-block;padding:8px 24px;background:#ff6b6b;color:#fff;border-radius:20px;text-decoration:none;font-size:14px;font-weight:bold;">立即注册领优惠</a></div><div style="font-size:11px;color:#999;margin-top:6px;">注册后联系博主可再领额外折扣</div></div>',
    post: '<div style="text-align:center;padding:20px 10px;border:2px dashed #ff6b6b;border-radius:8px;margin:0 auto;background:linear-gradient(135deg,#fff5f5,#ffe0e0);"><div style="font-size:18px;font-weight:bold;color:#ff6b6b;">☁️ 南影云 - 高性价比云服务器</div><div style="font-size:13px;color:#555;margin-top:8px;">本站服务器托管方，稳定可靠</div><div style="font-size:13px;color:#555;margin-top:4px;">🎁 通过下方链接注册享专属优惠</div><div style="margin-top:10px;"><a href="https://idc.ofoca.net/aff/PJQGAEKY" target="_blank" rel="noopener" style="display:inline-block;padding:8px 24px;background:#ff6b6b;color:#fff;border-radius:20px;text-decoration:none;font-size:14px;font-weight:bold;">立即注册领优惠</a></div><div style="font-size:11px;color:#999;margin-top:6px;">注册后联系博主可再领额外折扣</div></div>'
  };

  var intlAds = {
    aside: '<div style="text-align:center;padding:18px 10px;border:2px dashed #7c3aed;border-radius:8px;margin:0 auto;background:linear-gradient(135deg,#f5f3ff,#ede9fe);"><div style="font-size:16px;font-weight:bold;color:#7c3aed;">🚀 Vultr - Global Cloud Hosting</div><div style="font-size:12px;color:#555;margin-top:6px;">High-performance SSD VPS worldwide</div><div style="font-size:12px;color:#555;margin-top:4px;">🎁 $100 free credit for new users</div><div style="margin-top:8px;"><a href="https://www.vultr.com/?ref=9515608" target="_blank" rel="noopener" style="display:inline-block;padding:6px 20px;background:#7c3aed;color:#fff;border-radius:16px;text-decoration:none;font-size:13px;font-weight:bold;">Claim $100 Credit</a></div></div>',
    index: '<div style="text-align:center;padding:20px 10px;border:2px dashed #7c3aed;border-radius:8px;margin:0 auto;background:linear-gradient(135deg,#f5f3ff,#ede9fe);"><div style="font-size:18px;font-weight:bold;color:#7c3aed;">🚀 Vultr - Global Cloud Hosting</div><div style="font-size:13px;color:#555;margin-top:8px;">High-performance SSD VPS in 32 locations</div><div style="font-size:13px;color:#555;margin-top:4px;">🎁 Get $100 free credit to try Vultr</div><div style="margin-top:10px;"><a href="https://www.vultr.com/?ref=9515608" target="_blank" rel="noopener" style="display:inline-block;padding:8px 24px;background:#7c3aed;color:#fff;border-radius:20px;text-decoration:none;font-size:14px;font-weight:bold;">Claim $100 Credit</a></div><div style="font-size:11px;color:#999;margin-top:6px;">Deploy in seconds, pay as you go</div></div>',
    post: '<div style="text-align:center;padding:20px 10px;border:2px dashed #7c3aed;border-radius:8px;margin:0 auto;background:linear-gradient(135deg,#f5f3ff,#ede9fe);"><div style="font-size:18px;font-weight:bold;color:#7c3aed;">🚀 Vultr - Global Cloud Hosting</div><div style="font-size:13px;color:#555;margin-top:8px;">High-performance SSD VPS in 32 locations</div><div style="font-size:13px;color:#555;margin-top:4px;">🎁 Get $100 free credit to try Vultr</div><div style="margin-top:10px;"><a href="https://www.vultr.com/?ref=9515608" target="_blank" rel="noopener" style="display:inline-block;padding:8px 24px;background:#7c3aed;color:#fff;border-radius:20px;text-decoration:none;font-size:14px;font-weight:bold;">Claim $100 Credit</a></div><div style="font-size:11px;color:#999;margin-top:6px;">Deploy in seconds, pay as you go</div></div>'
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
