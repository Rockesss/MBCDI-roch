/**
 * MBCDI Commerce Module
 * Gestion des commerces : affichage, sélection, clustering
 * @version 5.5.0
 */

import { escapeHtml, formatDistance, calculateDistance } from './utils.js';

/**
 * Trie les commerces par distance depuis une position
 * @param {Array} commerces - Liste des commerces
 * @param {Object} userPosition - Position de l'utilisateur {lat, lng}
 * @returns {Array} Commerces triés par distance
 */
export function sortCommercesByDistance(commerces, userPosition) {
    if (!userPosition || !userPosition.lat || !userPosition.lng) {
        return commerces;
    }
    
    return commerces.slice().sort((a, b) => {
        const distA = calculateDistance(userPosition.lat, userPosition.lng, a.lat, a.lng);
        const distB = calculateDistance(userPosition.lat, userPosition.lng, b.lat, b.lng);
        return distA - distB;
    });
}

/**
 * Génère le HTML d'une carte commerce
 * @param {Object} commerce - Données du commerce
 * @param {Object} options - Options {userPosition, showDistance}
 * @returns {string} HTML de la carte
 */
export function buildCommerceCardHTML(commerce, options = {}) {
    const { userPosition, showDistance = true } = options;
    
    const logoHtml = commerce.logo 
        ? `<img src="${escapeHtml(commerce.logo)}" alt="" class="mbcdi-commerce-logo-large">`
        : `<div class="mbcdi-commerce-logo-large mbcdi-commerce-logo-placeholder">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
               <polyline points="9 22 9 12 15 12 15 22"/>
             </svg>
           </div>`;
    
    let distanceHtml = '';
    if (showDistance && userPosition && userPosition.lat && userPosition.lng) {
        const dist = calculateDistance(userPosition.lat, userPosition.lng, commerce.lat, commerce.lng);
        distanceHtml = `<span class="mbcdi-commerce-distance">${formatDistance(dist)}</span>`;
    }
    
    const typeHtml = commerce.type 
        ? `<span class="mbcdi-commerce-type">${escapeHtml(commerce.type)}</span>` 
        : '';
    
    const phoneHtml = commerce.phone 
        ? `<a href="tel:${escapeHtml(commerce.phone)}" class="mbcdi-commerce-phone">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
             </svg>
             ${escapeHtml(commerce.phone)}
           </a>`
        : '';
    
    const websiteHtml = commerce.website 
        ? `<a href="${escapeHtml(commerce.website)}" target="_blank" rel="noopener" class="mbcdi-commerce-website">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <circle cx="12" cy="12" r="10"/>
               <line x1="2" y1="12" x2="22" y2="12"/>
               <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
             </svg>
             Site web
           </a>`
        : '';
    
    return `
        <div class="mbcdi-commerce-card" data-commerce-id="${commerce.id}">
            <div class="mbcdi-commerce-card-header">
                <div class="mbcdi-commerce-logo-wrapper">
                    ${logoHtml}
                </div>
                <div class="mbcdi-commerce-info-main">
                    <h3 class="mbcdi-commerce-name-compact">${escapeHtml(commerce.title || commerce.name)}</h3>
                    <div class="mbcdi-commerce-meta">
                        ${typeHtml}
                        ${distanceHtml}
                    </div>
                </div>
            </div>
            <div class="mbcdi-commerce-card-body">
                ${commerce.address ? `<p class="mbcdi-commerce-address">${escapeHtml(commerce.address)}</p>` : ''}
                <div class="mbcdi-commerce-contacts">
                    ${phoneHtml}
                    ${websiteHtml}
                </div>
            </div>
            <div class="mbcdi-commerce-card-actions">
                <button type="button" class="mbcdi-btn-details" data-commerce-id="${commerce.id}">
                    Détails
                </button>
                <button type="button" class="mbcdi-btn-go-primary" data-commerce-id="${commerce.id}">
                    Y aller
                </button>
            </div>
        </div>
    `;
}

/**
 * Génère le HTML de la liste des commerces
 * @param {Array} commerces - Liste des commerces
 * @param {Object} options - Options {userPosition, showDistance}
 * @returns {string} HTML de la liste
 */
export function buildCommerceListHTML(commerces, options = {}) {
    if (!commerces || !commerces.length) {
        return '<p class="mbcdi-no-commerces">Aucun commerce disponible</p>';
    }
    
    const sortedCommerces = options.userPosition 
        ? sortCommercesByDistance(commerces, options.userPosition)
        : commerces;
    
    return sortedCommerces
        .map(commerce => buildCommerceCardHTML(commerce, options))
        .join('');
}

/**
 * Crée une icône de commerce pour la carte
 * @param {string} logoUrl - URL du logo
 * @param {number} size - Taille en pixels (défaut: 36)
 * @returns {L.DivIcon} Icône Leaflet
 */
export function createCommerceIcon(logoUrl, size = 36) {
    const innerHtml = logoUrl 
        ? `<img src="${escapeHtml(logoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
             <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
           </svg>`;
    
    return L.divIcon({
        className: 'mbcdi-commerce-marker',
        html: `<div class="mbcdi-commerce-marker-inner">${innerHtml}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
}

/**
 * Filtre les commerces par recherche
 * @param {Array} commerces - Liste des commerces
 * @param {string} query - Terme de recherche
 * @returns {Array} Commerces filtrés
 */
export function filterCommerces(commerces, query) {
    if (!query || !query.trim()) {
        return commerces;
    }
    
    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    return commerces.filter(commerce => {
        const name = (commerce.title || commerce.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const type = (commerce.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const address = (commerce.address || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        return name.includes(normalizedQuery) || 
               type.includes(normalizedQuery) || 
               address.includes(normalizedQuery);
    });
}

/**
 * Trouve un commerce par son ID
 * @param {Array} commerces - Liste des commerces
 * @param {number|string} id - ID du commerce
 * @returns {Object|null} Commerce trouvé ou null
 */
export function findCommerceById(commerces, id) {
    const numericId = parseInt(id, 10);
    return commerces.find(c => c.id === numericId) || null;
}
