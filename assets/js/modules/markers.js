/**
 * MBCDI Markers Module
 * Gestion des markers Leaflet et clustering
 * @version 5.5.0
 */

/**
 * Crée une icône pour un commerce
 * @param {string} logoUrl - URL du logo (optionnel)
 * @param {number} size - Taille de l'icône
 * @returns {Object} Leaflet DivIcon
 */
export function createCommerceIcon(logoUrl, size = 44) {
    let html = '<div class="mbcdi-commerce-marker">';
    
    if (logoUrl) {
        html += `<div class="mbcdi-commerce-marker-img" style="background-image:url(${logoUrl});"></div>`;
    } else {
        html += '<div class="mbcdi-commerce-marker-default">🏪</div>';
    }
    
    html += '</div>';

    return L.divIcon({
        html: html,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
}

/**
 * Initialise le clustering Leaflet.markercluster
 * @returns {Object} Cluster group ou null
 */
export function initClusterGroup() {
    if (!window.L || !L.markerClusterGroup) {
        console.error('[MBCDI Markers] Leaflet.markercluster non chargé');
        return null;
    }

    return L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        animate: false,
        animateAddingMarkers: false,
        disableClusteringAtZoom: 18
    });
}

/**
 * Ajoute des commerces au cluster
 * @param {Object} clusterGroup - Groupe de clustering
 * @param {Array} commerces - Liste des commerces
 * @param {Object} map - Instance Leaflet map
 */
export function addCommercesToCluster(clusterGroup, commerces, map) {
    if (!clusterGroup) return;

    // Nettoyer les markers existants
    try {
        clusterGroup.clearLayers();
    } catch (e) {
        console.warn('[MBCDI Markers] Erreur clearLayers:', e);
    }

    // Ajouter les nouveaux markers
    commerces.forEach(commerce => {
        if (!commerce.lat || !commerce.lng) return;

        const icon = createCommerceIcon(commerce.logoUrl);
        const marker = L.marker([commerce.lat, commerce.lng], { icon });
        
        // Attacher les données du commerce
        marker.commerceData = commerce;

        clusterGroup.addLayer(marker);
    });

    // Ajouter le cluster à la carte si pas déjà présent
    if (map && !map.hasLayer(clusterGroup)) {
        map.addLayer(clusterGroup);
    }
}

/**
 * Crée un marker simple
 * @param {Object} position - {lat, lng}
 * @param {Object} options - Options Leaflet marker
 * @returns {Object} Leaflet marker
 */
export function createMarker(position, options = {}) {
    if (!position || !position.lat || !position.lng) {
        console.error('[MBCDI Markers] Position invalide');
        return null;
    }

    return L.marker([position.lat, position.lng], options);
}

/**
 * Crée un marker personnalisé avec HTML
 * @param {Object} position - {lat, lng}
 * @param {string} html - HTML de l'icône
 * @param {number} iconSize - Taille de l'icône
 * @returns {Object} Leaflet marker
 */
export function createCustomMarker(position, html, iconSize = [40, 40]) {
    const icon = L.divIcon({
        html: html,
        className: '',
        iconSize: iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1]]
    });

    return L.marker([position.lat, position.lng], { icon });
}

/**
 * Crée un marker de position utilisateur
 * @param {Object} position - {lat, lng}
 * @returns {Object} Leaflet marker
 */
export function createUserMarker(position) {
    const html = `
        <div class="mbcdi-user-marker">
            <div class="mbcdi-user-marker-pulse"></div>
            <div class="mbcdi-user-marker-dot"></div>
        </div>
    `;

    return createCustomMarker(position, html, [24, 24]);
}

/**
 * Crée un cercle (rayon)
 * @param {Object} position - {lat, lng}
 * @param {number} radius - Rayon en mètres
 * @param {Object} options - Options Leaflet circle
 * @returns {Object} Leaflet circle
 */
export function createCircle(position, radius, options = {}) {
    const defaultOptions = {
        color: '#007AFF',
        fillColor: '#007AFF',
        fillOpacity: 0.1,
        weight: 2
    };

    return L.circle([position.lat, position.lng], radius, { ...defaultOptions, ...options });
}

/**
 * Crée une polyline
 * @param {Array} points - Array de [lat, lng]
 * @param {Object} options - Options Leaflet polyline
 * @returns {Object} Leaflet polyline
 */
export function createPolyline(points, options = {}) {
    const defaultOptions = {
        color: '#007AFF',
        weight: 4,
        opacity: 0.7
    };

    return L.polyline(points, { ...defaultOptions, ...options });
}

/**
 * Crée un polygone
 * @param {Array} points - Array de [lat, lng]
 * @param {Object} options - Options Leaflet polygon
 * @returns {Object} Leaflet polygon
 */
export function createPolygon(points, options = {}) {
    const defaultOptions = {
        color: '#007AFF',
        fillColor: '#007AFF',
        fillOpacity: 0.2,
        weight: 2
    };

    return L.polygon(points, { ...defaultOptions, ...options });
}

/**
 * Supprime un marker/layer de la carte
 * @param {Object} map - Instance Leaflet
 * @param {Object} layer - Layer à supprimer
 */
export function removeLayer(map, layer) {
    if (!map || !layer) return;
    
    try {
        map.removeLayer(layer);
    } catch (e) {
        console.warn('[MBCDI Markers] Erreur removeLayer:', e);
    }
}

/**
 * Supprime tous les markers d'un array
 * @param {Object} map - Instance Leaflet
 * @param {Array} markers - Array de markers
 */
export function removeMarkers(map, markers) {
    if (!map || !Array.isArray(markers)) return;

    markers.forEach(marker => removeLayer(map, marker));
    markers.length = 0; // Vider l'array
}
