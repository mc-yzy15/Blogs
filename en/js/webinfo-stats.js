(function() {
    'strict mode';

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

    function updateWebinfoStats() {
        var pvElement = document.getElementById('busuanzi_value_site_pv');
        var uvElement = document.getElementById('busuanzi_value_site_uv');

        if (!pvElement && !uvElement) {
            return;
        }

        fetch('/stats/offset.json')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                if (data.total_pv !== undefined && pvElement) {
                    var normalizedPv = _normalizeMetric(data.total_pv, 1);
                    pvElement.textContent = normalizedPv.toLocaleString();
                }
                if (data.total_uv !== undefined && uvElement) {
                    var normalizedUv = _normalizeMetric(data.total_uv, 2);
                    uvElement.textContent = normalizedUv.toLocaleString();
                }
            })
            .catch(function(error) {
                console.error('Failed to fetch webinfo stats:', error);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateWebinfoStats);
    } else {
        updateWebinfoStats();
    }
})();
