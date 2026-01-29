/**
 * MBCDI Integration v5.5.0
 * Intégration du nouveau bottom sheet - CORRECTION remplissage champ destination
 * @version 5.5.0
 */

(function() {
    'use strict';

    console.log('[MBCDI Integration v5.5.0] Chargement...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIntegration);
    } else {
        initIntegration();
    }

    function initIntegration() {
        console.log('[MBCDI Integration v5.5.0] Initialisation...');

        var apps = document.querySelectorAll('.mbcdi-app');
        
        apps.forEach(function(app) {
            var instanceId = app.getAttribute('data-mbcdi-instance');
            if (!instanceId) return;

            console.log('[MBCDI Integration v5.5.0] Instance:', instanceId);

            var varName = 'MBCDI_DATA_' + instanceId.replace(/-/g, '_');
            var data = window[varName];
            
            if (!data || !data.destinations || !data.destinations.length) {
                console.error('[MBCDI Integration] Aucune donnée pour instance:', instanceId);
                return;
            }

            var commerces = data.commerces || [];
            if (data.destinations[0] && data.destinations[0].commerces) {
                commerces = data.destinations[0].commerces;
            }

            console.log('[MBCDI Integration] Commerces:', commerces.length);

            var bottomSheetBody = app.querySelector('.mbcdi-bottomsheet-body');
            var bottomSheet = app.querySelector('.mbcdi-bottomsheet');
            var handle = app.querySelector('.mbcdi-bottomsheet-handle');
            
            if (!bottomSheetBody || !bottomSheet) {
                console.error('[MBCDI Integration] Bottom sheet non trouvé');
                return;
            }

            window.MBCDI_BSManager.init(bottomSheetBody, bottomSheet, handle);
            window.MBCDI_BSManager.showList(commerces);

            // CORRECTION: Trouver les DEUX champs destination
            var selectDestMain = app.querySelector('.mbcdi-input-dest-main');
            var selectDest = app.querySelector('.mbcdi-input-dest');
            var searchBar = app.querySelector('.mbcdi-search-bar');

            console.log('[MBCDI Integration] Champs trouvés:', {
                selectDestMain: !!selectDestMain,
                selectDest: !!selectDest,
                searchBar: !!searchBar
            });

            observeSearchBarExpansion(app, searchBar);

            /**
             * Afficher détail
             */
            window.addEventListener('mbcdi:showCommerceDetail', function(e) {
                if (!e.detail || !e.detail.commerceId) return;

                var commerceId = e.detail.commerceId;
                var commerce = commerces.find(function(c) { return c.id === commerceId; });
                
                if (commerce) {
                    console.log('[MBCDI Integration] Affichage détail:', commerce.name);
                    window.MBCDI_BSManager.showDetail(commerce);
                }
            });

            /**
             * CHOISIR un commerce - CORRECTION ici
             */
            window.addEventListener('mbcdi:chooseCommerce', function(e) {
                if (!e.detail || !e.detail.commerceId) return;

                var commerceId = e.detail.commerceId;
                var commerce = commerces.find(function(c) { return c.id === commerceId; });
                
                if (!commerce) {
                    console.error('[MBCDI Integration] Commerce non trouvé:', commerceId);
                    return;
                }

                console.log('[MBCDI Integration] Choisir commerce:', commerce.name);

                // CORRECTION: Remplir LES DEUX champs destination
                if (selectDestMain) {
                    selectDestMain.value = commerce.name;
                    selectDestMain.setAttribute('data-commerce-id', commerce.id);
                    selectDestMain.setAttribute('data-lat', commerce.lat);
                    selectDestMain.setAttribute('data-lng', commerce.lng);
                    console.log('[MBCDI Integration] Champ destination MAIN rempli:', commerce.name);
                }

                if (selectDest) {
                    selectDest.value = commerce.name;
                    selectDest.setAttribute('data-commerce-id', commerce.id);
                    selectDest.setAttribute('data-lat', commerce.lat);
                    selectDest.setAttribute('data-lng', commerce.lng);
                    console.log('[MBCDI Integration] Champ destination rempli:', commerce.name);
                }

                // Déplier la barre de recherche
                if (app && !app.classList.contains('expanded')) {
                    app.classList.add('expanded');
                    console.log('[MBCDI Integration] Barre dépliée');
                }

                // Replier le bottom sheet
                window.MBCDI_BSManager.collapse();

                // Focus sur le champ de départ
                var selectStart = app.querySelector('.mbcdi-input-start, .mbcdi-start-input');
                if (selectStart) {
                    setTimeout(function() {
                        selectStart.focus();
                    }, 300);
                }
            });

            /**
             * Retour à la liste
             */
            window.addEventListener('mbcdi:backToList', function() {
                console.log('[MBCDI Integration] Retour liste');
                window.MBCDI_BSManager.showList(commerces);
            });

            /**
             * Arrêter
             */
            window.addEventListener('mbcdi:stopRoute', function() {
                console.log('[MBCDI Integration] Arrêt trajet');
                window.MBCDI_BSManager.showList(commerces);
                
                var event = new CustomEvent('mbcdi:resetRoute');
                window.dispatchEvent(event);
            });

            /**
             * Itinéraire calculé
             */
            window.addEventListener('mbcdi:routeCalculated', function(e) {
                console.log('[MBCDI Integration] Itinéraire calculé');
                
                if (e.detail && e.detail.commerce) {
                    window.MBCDI_BSManager.showRouteMini(e.detail.commerce);
                }
            });

            console.log('[MBCDI Integration v5.5.0] Initialisé:', instanceId);
        });
    }

    /**
     * Observer le déploiement de la barre
     */
    function observeSearchBarExpansion(app, searchBar) {
        if (!app || !searchBar) return;

        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (app.classList.contains('expanded')) {
                        console.log('[MBCDI Integration] Barre dépliée → repli bottom sheet');
                        window.MBCDI_BSManager.collapse();
                    }
                }
            });
        });

        observer.observe(app, { attributes: true });
        console.log('[MBCDI Integration] Observer activé');
    }

})();
