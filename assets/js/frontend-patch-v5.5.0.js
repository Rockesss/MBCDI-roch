/**
 * MBCDI Frontend Patch v5.5.0
 * @version 5.5.0
 */

(function() {
    'use strict';

    console.log('[MBCDI Patch v5.5.0] Chargement...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPatch);
    } else {
        initPatch();
    }

    function initPatch() {
        console.log('[MBCDI Patch v5.5.0] Init...');

        var apps = document.querySelectorAll('.mbcdi-app');
        
        apps.forEach(function(app) {
            var instanceId = app.getAttribute('data-mbcdi-instance');
            if (!instanceId) return;

            var btnSearch = app.querySelector('.mbcdi-btn-search');
            
            if (btnSearch) {
                console.log('[MBCDI Patch] Bouton Y aller trouvé');
                
                btnSearch.addEventListener('click', function(e) {
                    console.log('[MBCDI Patch] Clic Y aller');
                    
                    var selectDest = app.querySelector('.mbcdi-input-dest, .mbcdi-input-dest-main');
                    var commerceId = selectDest ? parseInt(selectDest.getAttribute('data-commerce-id'), 10) : null;
                    
                    if (commerceId) {
                        var varName = 'MBCDI_DATA_' + instanceId.replace(/-/g, '_');
                        var data = window[varName];
                        var commerces = data && data.destinations && data.destinations[0] ? data.destinations[0].commerces : [];
                        var commerce = commerces.find(function(c) { return c.id === commerceId; });
                        
                        if (commerce) {
                            console.log('[MBCDI Patch] Commerce:', commerce.name);
                            window.MBCDI_CURRENT_COMMERCE = commerce;
                        }
                    }
                });
            }

            interceptRouteCalculation(app, instanceId);
        });

        window.addEventListener('mbcdi:resetRoute', function() {
            console.log('[MBCDI Patch] Reset');

            var apps = document.querySelectorAll('.mbcdi-app');
            
            apps.forEach(function(app) {
                var instanceId = app.getAttribute('data-mbcdi-instance');
                if (!instanceId) return;

                // Vider les champs
                var selectDestMain = app.querySelector('.mbcdi-input-dest-main');
                var selectDest = app.querySelector('.mbcdi-input-dest');
                if (selectDestMain) selectDestMain.value = '';
                if (selectDest) selectDest.value = '';

                // Replier la barre
                if (app.classList.contains('expanded')) {
                    app.classList.remove('expanded');
                }

                console.log('[MBCDI Patch] Reset terminé');
            });
        });

        console.log('[MBCDI Patch v5.5.0] Initialisé');
    }

    function interceptRouteCalculation(app, instanceId) {
        var map = app.querySelector('.leaflet-container');
        if (!map) return;
        
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                var polylines = map.querySelectorAll('.leaflet-interactive');
                if (polylines.length > 0 && window.MBCDI_CURRENT_COMMERCE) {
                    console.log('[MBCDI Patch] Itinéraire détecté');
                    
                    var event = new CustomEvent('mbcdi:routeCalculated', {
                        detail: { commerce: window.MBCDI_CURRENT_COMMERCE }
                    });
                    window.dispatchEvent(event);
                    
                    window.MBCDI_CURRENT_COMMERCE = null;
                    observer.disconnect();
                }
            });
        });
        
        observer.observe(map, {
            childList: true,
            subtree: true
        });
    }

})();
