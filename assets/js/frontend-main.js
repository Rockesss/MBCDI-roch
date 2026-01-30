/**
 * MBCDI Frontend Main - Point d'entrée modulaire
 * Orchestre tous les modules ES6
 * @version 5.5.0
 */

// Import des modules
import { createState, resetState, setTransportMode, setUserPosition, selectCommerce } from './modules/state.js';
import { formatDistance, formatDuration, calculateDistance, escapeHtml, debounce, normalizeString } from './modules/utils.js';
import { getStepText, translate, STEP_I18N } from './modules/i18n.js';
import { initMap, centerMap, fitBounds } from './modules/map.js';
import { initClusterGroup, addCommercesToCluster, createUserMarker, removeLayer } from './modules/markers.js';
import { calculateRoute, createRoutePolyline, createRoutePolylineWithRotation, getRouteSummary, createWalkingLine } from './modules/routing.js';
import { enableRotation, rotateMap, resetRotation, calculateBearing, getCurrentBearing, createRotationControl, rotateToRoute, enableManualRotation } from './modules/rotation.js';
import { 
    buildCommerceCardHTML, 
    buildCommerceListHTML, 
    sortCommercesByDistance, 
    createCommerceIcon, 
    filterCommerces, 
    findCommerceById 
} from './modules/commerce.js';
import { 
    showBottomSheet, 
    hideBottomSheet, 
    toggleBottomSheetExpansion,
    showFieldError, 
    clearFieldError, 
    clearAllErrors,
    showLoading,
    hideLoading,
    setAppExpanded,
    showModal,
    hideModal,
    showToast,
    switchView
} from './modules/ui.js';

/**
 * Initialise l'application MBCDI
 */
window.MBCDI_Modular = {
    
    // Exposer les modules pour utilisation externe
    modules: {
        state: { createState, resetState, setTransportMode, setUserPosition, selectCommerce },
        utils: { formatDistance, formatDuration, calculateDistance, escapeHtml, debounce, normalizeString },
        i18n: { getStepText, translate, STEP_I18N },
        map: { initMap, centerMap, fitBounds },
        markers: { initClusterGroup, addCommercesToCluster, createUserMarker, removeLayer },
        routing: { calculateRoute, createRoutePolyline, createRoutePolylineWithRotation, getRouteSummary, createWalkingLine },
        rotation: { enableRotation, rotateMap, resetRotation, calculateBearing, getCurrentBearing, createRotationControl, rotateToRoute, enableManualRotation },
        commerce: { buildCommerceCardHTML, buildCommerceListHTML, sortCommercesByDistance, createCommerceIcon, filterCommerces, findCommerceById },
        ui: { showBottomSheet, hideBottomSheet, toggleBottomSheetExpansion, showFieldError, clearFieldError, clearAllErrors, showLoading, hideLoading, setAppExpanded, showModal, hideModal, showToast, switchView }
    },

    /**
     * Initialise une instance de carte
     * @param {string} instanceId - ID de l'instance
     * @param {string} varName - Nom de la variable globale contenant les données
     */
    init: function(instanceId, varName) {
        console.log('[MBCDI Modular] Initialisation v5.4.2 avec modules ES6');
        
        const app = document.querySelector('.mbcdi-app[data-mbcdi-instance="' + instanceId + '"]');
        if (!app) {
            console.error('[MBCDI Modular] App container non trouvé');
            return;
        }

        const data = window[varName];
        if (!data || !data.destinations || !data.destinations.length) {
            console.error('[MBCDI Modular] Données manquantes');
            return;
        }

        // Créer l'état global
        const state = createState();
        
        // Configuration
        const settings = data.settings || {};
        const lang = settings.lang ? String(settings.lang).toLowerCase() : 'fr';
        const defaultMode = settings.defaultProfile || 'car';
        
        // Mode de transport par défaut
        setTransportMode(state, ['car', 'bike', 'foot'].includes(defaultMode) ? defaultMode : 'car');

        // Elements DOM
        const mapContainer = app.querySelector('.mbcdi-map');
        const commerceListContainer = app.querySelector('.mbcdi-commerce-list');
        const bottomSheet = app.querySelector('.mbcdi-bottomsheet');
        
        if (!mapContainer) {
            console.error('[MBCDI Modular] Container carte non trouvé');
            return;
        }

        // Initialiser la carte
        const firstDest = data.destinations[0];
        state.map = initMap(
            mapContainer,
            { lat: firstDest.lat, lng: firstDest.lng },
            15
        );

        if (!state.map) {
            console.error('[MBCDI Modular] Erreur initialisation carte');
            return;
        }

        // Initialiser le clustering
        state.commerceClusterGroup = initClusterGroup();

        const commerces = firstDest.commerces || [];

        if (state.commerceClusterGroup) {
            addCommercesToCluster(state.commerceClusterGroup, commerces, state.map);
            console.log('[MBCDI Modular] Clustering initialisé avec', commerces.length, 'commerces');
        }

        // Ajouter le contrôle de rotation si la rotation est supportée
        if (typeof state.map.setBearing === 'function') {
            state.rotationControl = createRotationControl(state.map, {
                position: 'topright',
                onRotate: function(bearing) {
                    console.log('[MBCDI Modular] Rotation manuelle vers', bearing, '°');
                }
            });
            console.log('[MBCDI Modular] Contrôle de rotation ajouté');
        }

        // Rendre la liste des commerces si le conteneur existe
        if (commerceListContainer) {
            const listHTML = buildCommerceListHTML(commerces, { 
                userPosition: state.userPosition,
                showDistance: !!state.userPosition 
            });
            commerceListContainer.innerHTML = listHTML;
            console.log('[MBCDI Modular] Liste commerces rendue');
        }

        // Écouter l'événement de position
        app.addEventListener('mbcdi:position-ready', function(e) {
            if (e.detail && e.detail.userLat && e.detail.userLng) {
                setUserPosition(state, {
                    lat: e.detail.userLat,
                    lng: e.detail.userLng
                });
                console.log('[MBCDI Modular] Position utilisateur:', state.userPosition);
                
                // Mettre à jour la liste des commerces avec les distances
                if (commerceListContainer && commerces.length) {
                    const listHTML = buildCommerceListHTML(commerces, { 
                        userPosition: state.userPosition,
                        showDistance: true 
                    });
                    commerceListContainer.innerHTML = listHTML;
                }
            }
        });

        // Écouter les clics sur les boutons "Y aller"
        app.addEventListener('click', function(e) {
            const goBtn = e.target.closest('.mbcdi-btn-go-primary');
            if (goBtn) {
                const commerceId = goBtn.dataset.commerceId;
                console.log('[MBCDI Modular] Clic Y aller:', commerceId);
                
                // Émettre un événement pour que frontend.js puisse le gérer
                const goEvent = new CustomEvent('mbcdi:commerce-go', {
                    detail: { commerceId: parseInt(commerceId, 10) }
                });
                app.dispatchEvent(goEvent);
            }
            
            const detailsBtn = e.target.closest('.mbcdi-btn-details');
            if (detailsBtn) {
                const commerceId = detailsBtn.dataset.commerceId;
                console.log('[MBCDI Modular] Clic Détails:', commerceId);
                
                const detailEvent = new CustomEvent('mbcdi:commerce-details', {
                    detail: { commerceId: parseInt(commerceId, 10) }
                });
                app.dispatchEvent(detailEvent);
            }
        });

        // Stocker l'état globalement pour accès externe
        window['MBCDI_State_' + instanceId] = state;
        window['MBCDI_Data_' + instanceId] = data;

        console.log('[MBCDI Modular] Initialisation terminée avec succès');
        
        // Émettre un événement pour signaler que les modules sont prêts
        const readyEvent = new CustomEvent('mbcdi:modules-ready', {
            detail: { instanceId, state, data }
        });
        app.dispatchEvent(readyEvent);
    },

    /**
     * Récupère l'état d'une instance
     * @param {string} instanceId - ID de l'instance
     * @returns {Object|null} État ou null
     */
    getState: function(instanceId) {
        return window['MBCDI_State_' + instanceId] || null;
    },

    /**
     * Récupère les données d'une instance
     * @param {string} instanceId - ID de l'instance
     * @returns {Object|null} Données ou null
     */
    getData: function(instanceId) {
        return window['MBCDI_Data_' + instanceId] || null;
    },
    
    /**
     * Utilitaires exposés pour usage externe
     */
    utils: {
        formatDistance,
        formatDuration,
        calculateDistance,
        escapeHtml,
        debounce
    },
    
    /**
     * UI helpers exposés pour usage externe
     */
    ui: {
        showBottomSheet,
        hideBottomSheet,
        showToast,
        showFieldError,
        clearFieldError
    }
};

// Auto-init si données présentes
document.addEventListener('DOMContentLoaded', function() {
    const apps = document.querySelectorAll('.mbcdi-app[data-mbcdi-instance]');
    apps.forEach(function(app) {
        const instanceId = app.getAttribute('data-mbcdi-instance');
        const varName = 'MBCDI_DATA_' + instanceId;
        
        if (window[varName]) {
            console.log('[MBCDI Modular] Auto-init instance:', instanceId);
            window.MBCDI_Modular.init(instanceId, varName);
        }
    });
});

console.log('[MBCDI Modular] Module chargé - Version 5.4.2');
