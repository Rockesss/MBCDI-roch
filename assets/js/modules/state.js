/**
 * MBCDI State Management Module
 * Gestion de l'état global de l'application
 * @version 5.5.0
 */

/**
 * Crée l'état initial de l'application
 * @returns {Object} État initial
 */
export function createState() {
    return {
        // Carte Leaflet
        map: null,
        
        // Mode de transport actuel
        currentMode: 'car',
        
        // Positions
        userPosition: null,      // Position GPS utilisateur
        startPosition: null,     // Point de départ sélectionné
        destPosition: null,      // Destination finale
        
        // Layers carte
        routeLayer: null,            // Layer de l'itinéraire
        zoneLayer: null,             // Layer des zones
        walkingLineLayer: null,      // Ligne marche à pied
        
        // Markers
        markers: [],                 // Markers destinations
        commerceMarkers: [],         // Markers commerces
        commerceClusterGroup: null,  // Groupe clustering
        pictoMarkers: [],            // Markers pictogrammes
        startPointMarkers: [],       // Markers points de départ
        deliveryZoneMarkers: [],     // Markers zones de livraison
        deliveryZonePolygons: [],    // Polygones zones
        userMarker: null,            // Marker position utilisateur
        
        // Sélections
        selectedCommerce: null,      // Commerce sélectionné
        selectedZone: null,          // Zone de livraison sélectionnée
        selectedCommerceId: 0,       // ID du commerce sélectionné
        selectedDestinationId: 0,    // ID de la destination
        
        // UI
        isCommerceCardExpanded: false,  // État carte commerce
        isExpanded: false,               // État détails commerce
        isSheetExpanded: false,          // État bottom sheet
        
        // Route
        currentRoute: null           // Réponse OSRM complète
    };
}

/**
 * Réinitialise l'état (utile pour cleanup)
 * @param {Object} state - État à réinitialiser
 */
export function resetState(state) {
    // Nettoyer les layers
    if (state.routeLayer) {
        state.map.removeLayer(state.routeLayer);
        state.routeLayer = null;
    }
    
    if (state.zoneLayer) {
        state.map.removeLayer(state.zoneLayer);
        state.zoneLayer = null;
    }
    
    if (state.walkingLineLayer) {
        state.map.removeLayer(state.walkingLineLayer);
        state.walkingLineLayer = null;
    }
    
    // Réinitialiser les sélections
    state.selectedCommerce = null;
    state.selectedZone = null;
    state.selectedCommerceId = 0;
    state.currentRoute = null;
}

/**
 * Met à jour le mode de transport
 * @param {Object} state - État global
 * @param {string} mode - Nouveau mode (car/bike/foot)
 */
export function setTransportMode(state, mode) {
    state.currentMode = mode;
}

/**
 * Met à jour la position utilisateur
 * @param {Object} state - État global
 * @param {Object} position - {lat, lng}
 */
export function setUserPosition(state, position) {
    state.userPosition = position;
}

/**
 * Sélectionne un commerce
 * @param {Object} state - État global
 * @param {Object} commerce - Commerce à sélectionner
 */
export function selectCommerce(state, commerce) {
    state.selectedCommerce = commerce;
    state.selectedCommerceId = commerce ? commerce.id : 0;
}
