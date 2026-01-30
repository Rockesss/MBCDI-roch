/**
 * MBCDI Routing Module
 * Calcul d'itinéraires via OSRM
 * @version 5.5.0
 */

import { formatDistance, formatDuration } from './utils.js';
import { getStepText } from './i18n.js';
import { rotateToRoute } from './rotation.js';

/**
 * Calcule un itinéraire via OSRM
 * @param {Object} start - {lat, lng}
 * @param {Object} end - {lat, lng}
 * @param {string} profile - Mode transport (car/bike/foot)
 * @param {string} lang - Langue (fr/en/de/es/it)
 * @returns {Promise} Réponse OSRM
 */
export async function calculateRoute(start, end, profile = 'car', lang = 'fr') {
    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
        throw new Error('Positions invalides');
    }

    const validProfiles = ['car', 'bike', 'foot'];
    if (!validProfiles.includes(profile)) {
        profile = 'car';
    }

    const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&steps=true&geometries=geojson`;

    console.log('[MBCDI Routing] Calcul itinéraire:', { start, end, profile });

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
            throw new Error('Aucun itinéraire trouvé');
        }

        console.log('[MBCDI Routing] Itinéraire calculé:', data.routes[0]);

        return data;
    } catch (error) {
        console.error('[MBCDI Routing] Erreur calcul:', error);
        throw error;
    }
}

/**
 * Décode une géométrie OSRM en coordonnées Leaflet
 * @param {Object} geometry - Géométrie OSRM (geojson)
 * @returns {Array} Array de [lat, lng]
 */
export function decodeGeometry(geometry) {
    if (!geometry || !geometry.coordinates) {
        return [];
    }

    // GeoJSON format: [lng, lat] -> Leaflet format: [lat, lng]
    return geometry.coordinates.map(coord => [coord[1], coord[0]]);
}

/**
 * Formate les étapes d'un itinéraire
 * @param {Array} steps - Étapes OSRM
 * @param {string} lang - Langue
 * @returns {Array} Étapes formatées
 */
export function formatSteps(steps, lang = 'fr') {
    if (!Array.isArray(steps)) {
        return [];
    }

    return steps.map((step, index) => {
        return {
            index: index + 1,
            instruction: getStepText(step, lang),
            distance: formatDistance(step.distance),
            duration: formatDuration(step.duration),
            maneuver: step.maneuver,
            name: step.name || ''
        };
    });
}

/**
 * Extrait le résumé d'un itinéraire
 * @param {Object} route - Route OSRM
 * @returns {Object} {distance, duration, steps}
 */
export function getRouteSummary(route) {
    if (!route) {
        return { distance: '0 m', duration: '0 min', steps: [] };
    }

    const leg = route.legs && route.legs[0];
    
    return {
        distance: formatDistance(route.distance),
        duration: formatDuration(route.duration),
        steps: leg && leg.steps ? leg.steps.length : 0
    };
}

/**
 * Crée une polyline Leaflet depuis une route OSRM
 * @param {Object} route - Route OSRM
 * @param {Object} options - Options Leaflet polyline
 * @returns {Object} Leaflet polyline
 */
export function createRoutePolyline(route, options = {}) {
    if (!route || !route.geometry) {
        return null;
    }

    const coords = decodeGeometry(route.geometry);
    
    const defaultOptions = {
        color: '#007AFF',
        weight: 5,
        opacity: 0.7,
        lineJoin: 'round',
        lineCap: 'round'
    };

    return L.polyline(coords, { ...defaultOptions, ...options });
}

/**
 * Calcule la distance entre deux points (utilisée pour la marche finale)
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance en mètres
 */
export function calculateWalkingDistance(point1, point2) {
    const R = 6371e3;
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

/**
 * Crée une ligne pointillée pour la marche à pied
 * @param {Object} start - {lat, lng}
 * @param {Object} end - {lat, lng}
 * @param {Object} options - Options Leaflet polyline
 * @returns {Object} Leaflet polyline
 */
export function createWalkingLine(start, end, options = {}) {
    const defaultOptions = {
        color: '#FF6B6B',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
        lineJoin: 'round',
        lineCap: 'round'
    };

    return L.polyline(
        [[start.lat, start.lng], [end.lat, end.lng]],
        { ...defaultOptions, ...options }
    );
}

/**
 * Crée une polyline d'itinéraire avec rotation automatique de la carte
 * @param {Object} map - Instance Leaflet
 * @param {Object} route - Route OSRM
 * @param {Object} options - Options
 * @param {Object} options.polylineOptions - Options Leaflet polyline
 * @param {boolean} options.autoRotate - Activer la rotation auto (défaut: true)
 * @param {boolean} options.animateRotation - Animer la rotation (défaut: true)
 * @param {number} options.rotationDuration - Durée rotation en ms (défaut: 1200)
 * @returns {Object} { polyline, bearing } - Polyline créée et cap calculé
 */
export function createRoutePolylineWithRotation(map, route, options = {}) {
    if (!map || !route || !route.geometry) {
        console.error('[MBCDI Routing] Paramètres invalides pour createRoutePolylineWithRotation');
        return null;
    }

    const defaultOptions = {
        polylineOptions: {},
        autoRotate: true,
        animateRotation: true,
        rotationDuration: 1200
    };

    const opts = { ...defaultOptions, ...options };

    // Créer la polyline
    const polyline = createRoutePolyline(route, opts.polylineOptions);

    if (!polyline) {
        return null;
    }

    // Appliquer la rotation automatique si demandé
    let bearing = null;
    if (opts.autoRotate && typeof map.setBearing === 'function') {
        const coords = decodeGeometry(route.geometry);

        if (coords && coords.length >= 2) {
            bearing = rotateToRoute(map, coords, {
                animate: opts.animateRotation,
                duration: opts.rotationDuration
            });
        }
    }

    return {
        polyline,
        bearing
    };
}
