(function() {
    'use strict';

    function initWebinfoStats() {
        var pvElement = document.getElementById('busuanzi_value_site_pv');
        var uvElement = document.getElementById('busuanzi_value_site_uv');

        if (!pvElement && !uvElement) return;

        var pvObserver = null;
        var uvObserver = null;
        var pvApplied = false;
        var uvApplied = false;
        var timeoutId = null;

        function cleanup() {
            if (pvObserver) pvObserver.disconnect();
            if (uvObserver) uvObserver.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
        }

        function tryApplyOffset(element, offsetValue) {
            var text = element.textContent.trim();
            var value = parseInt(text.replace(/,/g, ''), 10);
            if (isNaN(value)) return false;
            element.textContent = (value + offsetValue).toLocaleString();
            return true;
        }

        var offsetPromise = fetch('/stats/offset.json')
            .then(function(r) { return r.json(); })
            .catch(function() { return { total_pv: 0, total_uv: 0 }; });

        offsetPromise.then(function(offset) {
            var offsetPv = offset.total_pv || 0;
            var offsetUv = offset.total_uv || 0;
            var config = { childList: true, characterData: true, subtree: true };

            if (pvElement) {
                pvObserver = new MutationObserver(function() {
                    if (!pvApplied && tryApplyOffset(pvElement, offsetPv)) {
                        pvApplied = true;
                        pvObserver.disconnect();
                        if (uvApplied) cleanup();
                    }
                });
                pvObserver.observe(pvElement, config);
                if (tryApplyOffset(pvElement, offsetPv)) {
                    pvApplied = true;
                    pvObserver.disconnect();
                }
            }

            if (uvElement) {
                uvObserver = new MutationObserver(function() {
                    if (!uvApplied && tryApplyOffset(uvElement, offsetUv)) {
                        uvApplied = true;
                        uvObserver.disconnect();
                        if (pvApplied) cleanup();
                    }
                });
                uvObserver.observe(uvElement, config);
                if (tryApplyOffset(uvElement, offsetUv)) {
                    uvApplied = true;
                    uvObserver.disconnect();
                }
            }

            if (pvApplied && uvApplied) {
                cleanup();
                return;
            }

            timeoutId = setTimeout(function() {
                if (pvApplied && uvApplied) return;
                cleanup();
                fetch('/stats/views.json')
                    .then(function(r) { return r.json(); })
                    .catch(function() { return { total: { pv: 0, uv: 0 } }; })
                    .then(function(views) {
                        if (!pvApplied && pvElement) {
                            var pv = (views.total && views.total.pv) || 0;
                            pvElement.textContent = (pv + offsetPv).toLocaleString();
                        }
                        if (!uvApplied && uvElement) {
                            var uv = (views.total && views.total.uv) || 0;
                            uvElement.textContent = (uv + offsetUv).toLocaleString();
                        }
                    });
            }, 10000);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWebinfoStats);
    } else {
        initWebinfoStats();
    }
})();
