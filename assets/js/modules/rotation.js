/**
 * MBCDI Rotation Module
 * Gestion de la rotation de carte Leaflet
 * @version 5.5.1
 */

/**
 * Active la rotation sur une carte Leaflet
 * Note: leaflet-rotate doit être chargé avant
 * @param {Object} map - Instance Leaflet
 * @returns {boolean} True si la rotation a été activée
 */
export function enableRotation(map) {
    if (!map) {
        console.error('[MBCDI Rotation] Carte invalide');
        return false;
    }

    // Vérifier si leaflet-rotate est disponible
    if (typeof map.setBearing !== 'function') {
        console.warn('[MBCDI Rotation] leaflet-rotate non disponible');
        return false;
    }

    console.log('[MBCDI Rotation] Rotation activée sur la carte');
    return true;
}

/**
 * Fait pivoter la carte vers un angle donné
 * @param {Object} map - Instance Leaflet
 * @param {number} bearing - Angle en degrés (0 = Nord, 90 = Est, 180 = Sud, 270 = Ouest)
 * @param {Object} options - Options de rotation
 * @param {boolean} options.animate - Animer la rotation (défaut: true)
 * @param {number} options.duration - Durée de l'animation en ms (défaut: 1000)
 */
export function rotateMap(map, bearing, options = {}) {
    if (!map || typeof map.setBearing !== 'function') {
        console.error('[MBCDI Rotation] Carte invalide ou rotation non supportée');
        return;
    }

    const defaultOptions = {
        animate: true,
        duration: 1000
    };

    const opts = { ...defaultOptions, ...options };

    // Normaliser l'angle entre 0 et 360
    bearing = ((bearing % 360) + 360) % 360;

    console.log('[MBCDI Rotation] Rotation vers', bearing, '°');

    if (opts.animate) {
        map.setBearing(bearing, { duration: opts.duration });
    } else {
        map.setBearing(bearing);
    }
}

/**
 * Réinitialise la rotation de la carte (retour au Nord)
 * @param {Object} map - Instance Leaflet
 * @param {Object} options - Options de rotation
 * @param {boolean} options.animate - Animer la rotation (défaut: true)
 * @param {number} options.duration - Durée de l'animation en ms (défaut: 800)
 */
export function resetRotation(map, options = {}) {
    const defaultOptions = {
        animate: true,
        duration: 800
    };

    const opts = { ...defaultOptions, ...options };

    console.log('[MBCDI Rotation] Réinitialisation vers le Nord');
    rotateMap(map, 0, opts);
}

/**
 * Calcule le cap (bearing) entre deux points GPS
 * @param {Object} from - Point de départ {lat, lng}
 * @param {Object} to - Point d'arrivée {lat, lng}
 * @returns {number} Cap en degrés (0-360)
 */
export function calculateBearing(from, to) {
    if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
        console.error('[MBCDI Rotation] Points invalides pour le calcul du cap');
        return 0;
    }

    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;

    // Normaliser entre 0 et 360
    return ((bearing + 360) % 360);
}

/**
 * Obtient le cap actuel de la carte
 * @param {Object} map - Instance Leaflet
 * @returns {number} Cap actuel en degrés (0-360)
 */
export function getCurrentBearing(map) {
    if (!map || typeof map.getBearing !== 'function') {
        return 0;
    }
    return ((map.getBearing() % 360) + 360) % 360;
}

/**
 * Crée un contrôle de rotation pour la carte
 * @param {Object} map - Instance Leaflet
 * @param {Object} options - Options du contrôle
 * @param {string} options.position - Position du contrôle (défaut: 'topright')
 * @param {Function} options.onRotate - Callback appelé après rotation manuelle
 * @returns {Object} Instance du contrôle Leaflet
 */
export function createRotationControl(map, options = {}) {
    if (!map) {
        console.error('[MBCDI Rotation] Carte invalide');
        return null;
    }

    const defaultOptions = {
        position: 'topright',
        onRotate: null
    };

    const opts = { ...defaultOptions, ...options };

    const RotationControl = L.Control.extend({
        options: {
            position: opts.position
        },

        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'mbcdi-rotation-control leaflet-bar leaflet-control');

            // Bouton de réinitialisation
            const resetBtn = L.DomUtil.create('button', 'mbcdi-rotation-reset', container);
            resetBtn.type = 'button';
            resetBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12l7-7 7 7"/>
                </svg>
            `;
            resetBtn.title = 'Réinitialiser l\'orientation (Nord)';

            // Affichage de l'angle
            const angleDisplay = L.DomUtil.create('div', 'mbcdi-rotation-angle', container);
            angleDisplay.textContent = '0°';
            angleDisplay.style.display = 'none'; // Caché par défaut

            // Empêcher les événements de carte sur le contrôle
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Event reset
            L.DomEvent.on(resetBtn, 'click', function(e) {
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
                resetRotation(map);
                angleDisplay.textContent = '0°';
                if (opts.onRotate) {
                    opts.onRotate(0);
                }
            });

            // Mettre à jour l'affichage de l'angle quand la carte tourne
            map.on('rotate', function() {
                const bearing = getCurrentBearing(map);
                angleDisplay.textContent = Math.round(bearing) + '°';

                // Afficher l'angle seulement si différent de 0
                if (Math.abs(bearing) > 1) {
                    angleDisplay.style.display = 'block';
                } else {
                    angleDisplay.style.display = 'none';
                }
            });

            return container;
        },

        onRemove: function(map) {
            map.off('rotate');
        }
    });

    const control = new RotationControl();
    map.addControl(control);

    console.log('[MBCDI Rotation] Contrôle de rotation ajouté');
    return control;
}

/**
 * Fait pivoter la carte pour qu'un itinéraire soit orienté vers le haut
 * Utilise les deux premiers points de la polyline pour calculer le cap
 * @param {Object} map - Instance Leaflet
 * @param {Array} routeCoords - Coordonnées de l'itinéraire [[lat, lng], ...]
 * @param {Object} options - Options de rotation
 * @param {boolean} options.animate - Animer la rotation (défaut: true)
 * @param {number} options.duration - Durée de l'animation en ms (défaut: 1200)
 * @returns {number|null} Cap calculé en degrés, ou null si impossible
 */
export function rotateToRoute(map, routeCoords, options = {}) {
    if (!map || !routeCoords || !Array.isArray(routeCoords) || routeCoords.length < 2) {
        console.error('[MBCDI Rotation] Paramètres invalides pour rotateToRoute');
        return null;
    }

    const defaultOptions = {
        animate: true,
        duration: 1200
    };

    const opts = { ...defaultOptions, ...options };

    // Prendre les deux premiers points de l'itinéraire
    const from = { lat: routeCoords[0][0], lng: routeCoords[0][1] };
    const to = { lat: routeCoords[1][0], lng: routeCoords[1][1] };

    // Calculer le cap
    const bearing = calculateBearing(from, to);

    console.log('[MBCDI Rotation] Rotation automatique vers l\'itinéraire:', bearing, '°');

    // Appliquer la rotation
    rotateMap(map, bearing, opts);

    return bearing;
}

/**
 * Active la rotation manuelle avec le clic-droit + drag
 * Note: leaflet-rotate active cela par défaut, cette fonction est là pour documentation
 * @param {Object} map - Instance Leaflet
 * @param {boolean} enable - Activer ou désactiver
 */
export function enableManualRotation(map, enable = true) {
    if (!map || typeof map.touchRotate !== 'object') {
        return;
    }

    if (enable) {
        map.touchRotate.enable();
        console.log('[MBCDI Rotation] Rotation manuelle activée');
    } else {
        map.touchRotate.disable();
        console.log('[MBCDI Rotation] Rotation manuelle désactivée');
    }
}
