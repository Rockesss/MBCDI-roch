/**
 * MBCDI Map Module
 * Initialisation et gestion de la carte Leaflet
 * @version 5.5.0
 */

/**
 * Initialise la carte Leaflet
 * @param {HTMLElement} container - Container de la carte
 * @param {Object} center - {lat, lng} centre initial
 * @param {number} zoom - Niveau de zoom initial
 * @param {Object} options - Options supplémentaires
 * @param {boolean} options.enableRotation - Activer la rotation (défaut: true)
 * @returns {Object} Instance Leaflet map
 */
export function initMap(container, center, zoom = 15, options = {}) {
    if (!container) {
        console.error('[MBCDI Map] Container invalide');
        return null;
    }

    container.classList.remove('mbcdi-skeleton');

    const defaultOptions = {
        enableRotation: true
    };

    const opts = { ...defaultOptions, ...options };

    // Options de base de la carte
    const mapOptions = {
        zoomControl: false,
        attributionControl: false
    };

    // Ajouter les options de rotation si leaflet-rotate est disponible
    if (opts.enableRotation && typeof L.Map.prototype.setBearing === 'function') {
        mapOptions.rotate = true;
        mapOptions.bearing = 0;
        mapOptions.touchRotate = true;
        mapOptions.shiftKeyRotate = true;
        console.log('[MBCDI Map] Rotation activée');
    }

    const map = L.map(container, mapOptions).setView([center.lat, center.lng], zoom);

    // Ajouter les tiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    console.log('[MBCDI Map] Carte initialisée', center);

    return map;
}

/**
 * Centre la carte sur une position
 * @param {Object} map - Instance Leaflet
 * @param {Object} position - {lat, lng}
 * @param {number} zoom - Niveau de zoom (optionnel)
 */
export function centerMap(map, position, zoom) {
    if (!map || !position) return;

    if (zoom) {
        map.setView([position.lat, position.lng], zoom);
    } else {
        map.panTo([position.lat, position.lng]);
    }
}

/**
 * Fit la carte aux bounds
 * @param {Object} map - Instance Leaflet
 * @param {Array} bounds - [[lat1,lng1], [lat2,lng2]]
 * @param {Object} options - Options Leaflet fitBounds
 */
export function fitBounds(map, bounds, options = {}) {
    if (!map || !bounds || bounds.length !== 2) return;

    const defaultOptions = {
        padding: [50, 50],
        maxZoom: 16
    };

    map.fitBounds(bounds, { ...defaultOptions, ...options });
}

/**
 * Ajoute un événement sur la carte
 * @param {Object} map - Instance Leaflet
 * @param {string} eventName - Nom de l'événement
 * @param {Function} handler - Fonction handler
 */
export function addMapEvent(map, eventName, handler) {
    if (!map || !eventName || typeof handler !== 'function') return;
    map.on(eventName, handler);
}

/**
 * Supprime un événement de la carte
 * @param {Object} map - Instance Leaflet
 * @param {string} eventName - Nom de l'événement
 * @param {Function} handler - Fonction handler (optionnel)
 */
export function removeMapEvent(map, eventName, handler) {
    if (!map || !eventName) return;
    map.off(eventName, handler);
}

/**
 * Invalide la taille de la carte (force redraw)
 * @param {Object} map - Instance Leaflet
 */
export function invalidateSize(map) {
    if (!map) return;
    setTimeout(() => map.invalidateSize(), 100);
}

/**
 * Obtient le zoom actuel
 * @param {Object} map - Instance Leaflet
 * @returns {number} Niveau de zoom
 */
export function getZoom(map) {
    return map ? map.getZoom() : 0;
}

/**
 * Obtient le centre actuel
 * @param {Object} map - Instance Leaflet
 * @returns {Object} {lat, lng}
 */
export function getCenter(map) {
    if (!map) return null;
    const center = map.getCenter();
    return { lat: center.lat, lng: center.lng };
}

/**
 * Obtient les bounds actuels
 * @param {Object} map - Instance Leaflet
 * @returns {Array} [[lat1,lng1], [lat2,lng2]]
 */
export function getBounds(map) {
    if (!map) return null;
    const bounds = map.getBounds();
    return [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
    ];
}
