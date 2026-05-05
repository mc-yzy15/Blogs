(function() {
    'strict mode';

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
                    pvElement.textContent = Number(data.total_pv).toLocaleString();
                }
                if (data.total_uv !== undefined && uvElement) {
                    uvElement.textContent = Number(data.total_uv).toLocaleString();
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
