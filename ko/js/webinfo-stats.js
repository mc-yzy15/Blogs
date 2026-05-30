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

        function dispatchStatsEvent(pv, uv) {
            document.dispatchEvent(new CustomEvent('busuanzi-offset-applied', {
                detail: { pv: pv, uv: uv }
            }));
        }

        var offsetPromise = fetch('/stats/offset.json')
            .then(function(r) { return r.json(); })
            .catch(function() { return { total_pv: 0, total_uv: 0 }; });

        offsetPromise.then(function(offset) {
            var offsetPv = offset.total_pv || 0;
            var offsetUv = offset.total_uv || 0;
            var config = { childList: true, characterData: true, subtree: true };

            var rawPv = 0;
            var rawUv = 0;

            function checkAndApply() {
                if (pvApplied && uvApplied) return;
                if (pvElement) {
                    var pvText = pvElement.textContent.trim();
                    var pvVal = parseInt(pvText.replace(/,/g, ''), 10);
                    if (!isNaN(pvVal) && pvVal > 0 && !pvApplied) {
                        rawPv = pvVal;
                        pvElement.textContent = (pvVal + offsetPv).toLocaleString();
                        pvApplied = true;
                        if (pvObserver) pvObserver.disconnect();
                    }
                }
                if (uvElement) {
                    var uvText = uvElement.textContent.trim();
                    var uvVal = parseInt(uvText.replace(/,/g, ''), 10);
                    if (!isNaN(uvVal) && uvVal > 0 && !uvApplied) {
                        rawUv = uvVal;
                        uvElement.textContent = (uvVal + offsetUv).toLocaleString();
                        uvApplied = true;
                        if (uvObserver) uvObserver.disconnect();
                    }
                }
                if (pvApplied && uvApplied) {
                    cleanup();
                    dispatchStatsEvent(rawPv + offsetPv, rawUv + offsetUv);
                }
            }

            if (pvElement) {
                pvObserver = new MutationObserver(checkAndApply);
                pvObserver.observe(pvElement, config);
            }
            if (uvElement) {
                uvObserver = new MutationObserver(checkAndApply);
                uvObserver.observe(uvElement, config);
            }

            checkAndApply();

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
                        var fallbackPv = 0;
                        var fallbackUv = 0;
                        if (!pvApplied && pvElement) {
                            fallbackPv = (views.total && views.total.pv) || 0;
                            pvElement.textContent = (fallbackPv + offsetPv).toLocaleString();
                        } else if (pvApplied) {
                            fallbackPv = rawPv + offsetPv;
                        }
                        if (!uvApplied && uvElement) {
                            fallbackUv = (views.total && views.total.uv) || 0;
                            uvElement.textContent = (fallbackUv + offsetUv).toLocaleString();
                        } else if (uvApplied) {
                            fallbackUv = rawUv + offsetUv;
                        }
                        dispatchStatsEvent(
                            pvApplied ? rawPv + offsetPv : fallbackPv + offsetPv,
                            uvApplied ? rawUv + offsetUv : fallbackUv + offsetUv
                        );
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
