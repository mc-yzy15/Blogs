(function() {
    'use strict';

    function updateWebinfoStats() {
        var pvElement = document.getElementById('busuanzi_value_site_pv');
        var uvElement = document.getElementById('busuanzi_value_site_uv');

        if (!pvElement && !uvElement) {
            return;
        }

        var viewsPromise = fetch('/stats/views.json').then(function(r) { return r.json(); }).catch(function() {
            return { total: { pv: 0, uv: 0 } };
        });
        var offsetPromise = fetch('/stats/offset.json').then(function(r) { return r.json(); }).catch(function() {
            return { total_pv: 0, total_uv: 0 };
        });

        Promise.all([viewsPromise, offsetPromise]).then(function(results) {
            var views = results[0];
            var offset = results[1];

            var realPv = views.total ? (views.total.pv || 0) : 0;
            var realUv = views.total ? (views.total.uv || 0) : 0;
            var offsetPv = offset.total_pv || 0;
            var offsetUv = offset.total_uv || 0;

            var displayPv = realPv + offsetPv;
            var displayUv = realUv + offsetUv;

            if (pvElement) {
                pvElement.textContent = displayPv.toLocaleString();
            }
            if (uvElement) {
                uvElement.textContent = displayUv.toLocaleString();
            }
        }).catch(function(error) {
            console.error('Failed to fetch webinfo stats:', error);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateWebinfoStats);
    } else {
        updateWebinfoStats();
    }
})();
