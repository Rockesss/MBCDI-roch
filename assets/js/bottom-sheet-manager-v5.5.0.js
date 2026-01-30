/**
 * MBCDI Bottom Sheet Manager v5.5.1
 * Gestion de la navigation, handle et états du bottom sheet
 * @version 5.5.1
 */

(function() {
    'use strict';

    var currentState = 'list';
    var currentCommerce = null;
    var bottomSheetBody = null;
    var bottomSheet = null;
    var handle = null;
    var isExpanded = false;

    function init(sheetBodyElement, sheetElement, handleElement) {
        bottomSheetBody = sheetBodyElement;
        bottomSheet = sheetElement;
        handle = handleElement;
        
        console.log('[MBCDI BS Manager v5.5.0] Initialisé');
        
        initHandle();
    }

    function initHandle() {
        if (!handle || !bottomSheet) return;
        
        handle.addEventListener('click', function() {
            toggleExpanded();
        });
        
        console.log('[MBCDI BS Manager] Handle initialisé');
    }

    function toggleExpanded() {
        if (isExpanded) {
            collapse();
        } else {
            expand();
        }
    }

    function expand() {
        if (!bottomSheet) return;
        bottomSheet.classList.add('mbcdi-expanded');
        isExpanded = true;
        console.log('[MBCDI BS Manager] Étendu');
    }

    function collapse() {
        if (!bottomSheet) return;
        bottomSheet.classList.remove('mbcdi-expanded');
        isExpanded = false;
        console.log('[MBCDI BS Manager] Réduit');
    }

    function updateTitleVisibility(state) {
        var title = bottomSheetBody ? bottomSheetBody.querySelector('.mbcdi-bs-list-title') : null;
        if (title) {
            if (state === 'list' || state === 'detail') {
                title.style.display = 'block';
            } else {
                title.style.display = 'none';
            }
        }
    }

    function showList(commerces) {
        if (!bottomSheetBody) return;
        
        console.log('[MBCDI BS Manager] LISTE', commerces.length);
        currentState = 'list';
        currentCommerce = null;
        
        var html = window.MBCDI_BottomSheet.renderList(commerces);
        bottomSheetBody.innerHTML = html;
        
        updateTitleVisibility('list');
        attachListEvents();
    }

    function showDetail(commerce) {
        if (!bottomSheetBody) return;
        
        console.log('[MBCDI BS Manager] DÉTAIL:', commerce.name);
        currentState = 'detail';
        currentCommerce = commerce;
        
        var html = window.MBCDI_BottomSheet.renderDetail(commerce);
        bottomSheetBody.innerHTML = html;
        
        updateTitleVisibility('detail');
        attachDetailEvents();
    }

    function showRouteMini(commerce) {
        if (!bottomSheetBody) return;
        
        console.log('[MBCDI BS Manager] TRAJET MINI:', commerce.name);
        currentState = 'route-mini';
        currentCommerce = commerce;
        
        var html = window.MBCDI_BottomSheet.renderRouteMini(commerce);
        bottomSheetBody.innerHTML = html;
        
        updateTitleVisibility('route-mini');
        attachRouteMiniEvents();
        
        setTimeout(function() {
            collapse();
        }, 300);
    }

    function showRouteDetail(commerce) {
        if (!bottomSheetBody) return;
        
        console.log('[MBCDI BS Manager] TRAJET DÉTAIL:', commerce.name);
        currentState = 'route-detail';
        currentCommerce = commerce;
        
        var html = window.MBCDI_BottomSheet.renderRouteDetail(commerce);
        bottomSheetBody.innerHTML = html;
        
        updateTitleVisibility('route-detail');
        attachRouteDetailEvents();
    }

    function attachListEvents() {
        var btnsDetails = bottomSheetBody.querySelectorAll('.mbcdi-bs-btn-details');
        btnsDetails.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var commerceId = parseInt(this.getAttribute('data-commerce-id'), 10);
                console.log('[MBCDI BS Manager] Clic Détails:', commerceId);
                
                var event = new CustomEvent('mbcdi:showCommerceDetail', {
                    detail: { commerceId: commerceId }
                });
                window.dispatchEvent(event);
            });
        });
        
        var btnsChoose = bottomSheetBody.querySelectorAll('.mbcdi-bs-btn-choose');
        btnsChoose.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var commerceId = parseInt(this.getAttribute('data-commerce-id'), 10);
                console.log('[MBCDI BS Manager] Clic Choisir (liste):', commerceId);
                
                var event = new CustomEvent('mbcdi:chooseCommerce', {
                    detail: { commerceId: commerceId }
                });
                window.dispatchEvent(event);
            });
        });
    }

    function attachDetailEvents() {
        var btnBack = bottomSheetBody.querySelector('.mbcdi-bs-btn-back');
        if (btnBack) {
            btnBack.addEventListener('click', function() {
                console.log('[MBCDI BS Manager] Retour vers liste');
                
                var event = new CustomEvent('mbcdi:backToList');
                window.dispatchEvent(event);
            });
        }
        
        var btnChoose = bottomSheetBody.querySelector('.mbcdi-bs-btn-choose-detail');
        if (btnChoose) {
            btnChoose.addEventListener('click', function() {
                var commerceId = parseInt(this.getAttribute('data-commerce-id'), 10);
                console.log('[MBCDI BS Manager] Clic Choisir (détail):', commerceId);
                
                var event = new CustomEvent('mbcdi:chooseCommerce', {
                    detail: { commerceId: commerceId }
                });
                window.dispatchEvent(event);
            });
        }
    }

    function attachRouteMiniEvents() {
        var btnView = bottomSheetBody.querySelector('.mbcdi-bs-btn-view');
        if (btnView) {
            btnView.addEventListener('click', function() {
                console.log('[MBCDI BS Manager] Voir');
                
                if (currentCommerce) {
                    showRouteDetail(currentCommerce);
                    expand();
                }
            });
        }
        
        var btnStop = bottomSheetBody.querySelector('.mbcdi-bs-btn-stop');
        if (btnStop) {
            btnStop.addEventListener('click', function() {
                console.log('[MBCDI BS Manager] Arrêter');
                
                var event = new CustomEvent('mbcdi:stopRoute');
                window.dispatchEvent(event);
            });
        }
    }

    function attachRouteDetailEvents() {
        var btnBack = bottomSheetBody.querySelector('.mbcdi-bs-btn-back-to-mini');
        if (btnBack) {
            btnBack.addEventListener('click', function() {
                console.log('[MBCDI BS Manager] Retour vers mini');
                
                if (currentCommerce) {
                    showRouteMini(currentCommerce);
                }
            });
        }
        
        var btnStop = bottomSheetBody.querySelector('.mbcdi-bs-btn-stop');
        if (btnStop) {
            btnStop.addEventListener('click', function() {
                console.log('[MBCDI BS Manager] Arrêter (détail)');
                
                var event = new CustomEvent('mbcdi:stopRoute');
                window.dispatchEvent(event);
            });
        }
    }

    function getState() {
        return currentState;
    }

    function getCurrentCommerce() {
        return currentCommerce;
    }

    window.MBCDI_BSManager = {
        init: init,
        showList: showList,
        showDetail: showDetail,
        showRouteMini: showRouteMini,
        showRouteDetail: showRouteDetail,
        getState: getState,
        getCurrentCommerce: getCurrentCommerce,
        expand: expand,
        collapse: collapse,
        toggleExpanded: toggleExpanded
    };

})();
