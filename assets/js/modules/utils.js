/**
 * MBCDI Utils Module
 * Fonctions utilitaires réutilisables
 * @version 5.5.0
 */

/**
 * Récupère un paramètre d'URL
 * @param {string} name - Nom du paramètre
 * @returns {string} Valeur du paramètre ou chaîne vide
 */
export function getUrlParam(name) {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get(name) || '';
    } catch (e) {
        return '';
    }
}

/**
 * Formate une distance en mètres vers un format lisible
 * @param {number} meters - Distance en mètres
 * @returns {string} Distance formatée (ex: "1,2 km" ou "450 m")
 */
export function formatDistance(meters) {
    if (!meters || isNaN(meters)) return '0 m';
    
    if (meters >= 1000) {
        return (meters / 1000).toFixed(1).replace('.', ',') + ' km';
    }
    return Math.round(meters) + ' m';
}

/**
 * Formate une durée en secondes vers un format lisible
 * @param {number} seconds - Durée en secondes
 * @returns {string} Durée formatée (ex: "1h 25min" ou "15 min")
 */
export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0 min';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    
    if (hours > 0) {
        return hours + 'h' + (minutes > 0 ? ' ' + minutes + 'min' : '');
    }
    return minutes + ' min';
}

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 * @param {number} lat1 - Latitude point 1
 * @param {number} lng1 - Longitude point 1
 * @param {number} lat2 - Latitude point 2
 * @param {number} lng2 - Longitude point 2
 * @returns {number} Distance en mètres
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
export function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Debounce une fonction
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Délai en ms
 * @returns {Function} Fonction debouncée
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Vérifie si une valeur est vide
 * @param {*} value - Valeur à vérifier
 * @returns {boolean} True si vide
 */
export function isEmpty(value) {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
}

/**
 * Normalise une chaîne pour la recherche (retire accents, lowercase)
 * @param {string} str - Chaîne à normaliser
 * @returns {string} Chaîne normalisée
 */
export function normalizeString(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Génère un ID unique
 * @returns {string} ID unique
 */
export function generateId() {
    return 'mbcdi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Clamp une valeur entre min et max
 * @param {number} value - Valeur
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number} Valeur clampée
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
