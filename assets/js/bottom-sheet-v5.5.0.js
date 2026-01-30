/**
 * MBCDI Bottom Sheet v5.5.1
 * Système de bottom sheet avec 4 états selon maquette
 * @version 5.5.1
 */

(function() {
    'use strict';

    // SVG Icons arrondis en ligne
    const ICONS = {
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        
        navigation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
        
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        
        phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        
        globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        
        mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        
        eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        
        arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
    };

    // Helper pour échapper le HTML
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * ÉTAT 1 : LISTE DES COMMERCES
     */
    function renderCommerceList(commerces) {
        let html = '<div class="mbcdi-bs-list">';
        html += '<h2 class="mbcdi-bs-list-title">Commerces à proximité</h2>';
        html += '<div class="mbcdi-bs-list-items">';
        
        commerces.forEach(function(commerce) {
            const logoHtml = commerce.logoUrl 
                ? `<img src="${escapeHtml(commerce.logoUrl)}" alt="Logo ${escapeHtml(commerce.name)}" class="mbcdi-bs-commerce-logo" />`
                : '<div class="mbcdi-bs-commerce-logo mbcdi-bs-commerce-logo-placeholder">🏪</div>';
            
            html += `
                <div class="mbcdi-bs-commerce-item" data-commerce-id="${commerce.id}">
                    <div class="mbcdi-bs-commerce-info">
                        ${logoHtml}
                        <div class="mbcdi-bs-commerce-text">
                            <h3 class="mbcdi-bs-commerce-name">${escapeHtml(commerce.name)}</h3>
                            <p class="mbcdi-bs-commerce-address">${escapeHtml(commerce.address || '')}</p>
                        </div>
                    </div>
                    <div class="mbcdi-bs-commerce-actions">
                        <button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-secondary mbcdi-bs-btn-details" data-commerce-id="${commerce.id}">
                            <span class="mbcdi-bs-btn-icon">${ICONS.info}</span>
                            <span class="mbcdi-bs-btn-text">Détails</span>
                        </button>
                        <button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-primary mbcdi-bs-btn-choose" data-commerce-id="${commerce.id}">
                            <span class="mbcdi-bs-btn-icon">${ICONS.navigation}</span>
                            <span class="mbcdi-bs-btn-text">Choisir</span>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    }

    /**
     * ÉTAT 2 : DÉTAIL COMMERCE (sans itinéraire)
     */
    function renderCommerceDetail(commerce) {
        const logoHtml = commerce.logoUrl 
            ? `<img src="${escapeHtml(commerce.logoUrl)}" alt="Logo ${escapeHtml(commerce.name)}" class="mbcdi-bs-detail-logo" />`
            : '<div class="mbcdi-bs-detail-logo mbcdi-bs-detail-logo-placeholder">🏪</div>';
        
        let html = '<div class="mbcdi-bs-detail">';
        
        html += `<div class="mbcdi-bs-detail-logo-wrapper">${logoHtml}</div>`;
        html += `<h2 class="mbcdi-bs-detail-name">${escapeHtml(commerce.name)}</h2>`;
        html += `<p class="mbcdi-bs-detail-address">
            <span class="mbcdi-bs-icon">${ICONS.mapPin}</span>
            <span>${escapeHtml(commerce.address || '')}</span>
        </p>`;
        
        html += '<div class="mbcdi-bs-detail-infos">';
        
        if (commerce.hours) {
            html += `<div class="mbcdi-bs-detail-info-row">
                <span class="mbcdi-bs-icon">${ICONS.clock}</span>
                <span>${escapeHtml(commerce.hours)}</span>
            </div>`;
        }
        
        if (commerce.phone) {
            html += `<div class="mbcdi-bs-detail-info-row">
                <span class="mbcdi-bs-icon">${ICONS.phone}</span>
                <a href="tel:${escapeHtml(commerce.phone)}" class="mbcdi-bs-link">${escapeHtml(commerce.phone)}</a>
            </div>`;
        }
        
        if (commerce.website) {
            html += `<div class="mbcdi-bs-detail-info-row">
                <span class="mbcdi-bs-icon">${ICONS.globe}</span>
                <a href="${escapeHtml(commerce.website)}" target="_blank" rel="noopener" class="mbcdi-bs-link">${escapeHtml(commerce.website)}</a>
            </div>`;
        }
        
        html += '</div>';
        
        if (commerce.description || commerce.shortDesc) {
            html += `<div class="mbcdi-bs-detail-description">
                <p>${escapeHtml(commerce.description || commerce.shortDesc)}</p>
            </div>`;
        }
        
        html += `<div class="mbcdi-bs-detail-actions">
            <button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-secondary mbcdi-bs-btn-back">
                <span class="mbcdi-bs-btn-icon">${ICONS.arrowLeft}</span>
                <span class="mbcdi-bs-btn-text">Retour</span>
            </button>
            <button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-primary mbcdi-bs-btn-choose-detail" data-commerce-id="${commerce.id}">
                <span class="mbcdi-bs-btn-icon">${ICONS.navigation}</span>
                <span class="mbcdi-bs-btn-text">Choisir</span>
            </button>
        </div>`;
        
        html += '</div>';
        return html;
    }

    /**
     * ÉTAT 3 : TRAJET MINI
     */
    function renderRouteMini(commerce) {
        let html = '<div class="mbcdi-bs-route-mini">';
        
        html += '<div class="mbcdi-bs-route-status">';
        html += '<p class="mbcdi-bs-route-label">Trajet en cours</p>';
        html += '<div class="mbcdi-bs-route-animation">';
        html += '<div class="mbcdi-bs-route-line"></div>';
        html += '</div>';
        html += '</div>';
        
        html += '<div class="mbcdi-bs-route-mini-info">';
        html += `<h3 class="mbcdi-bs-route-mini-name">${escapeHtml(commerce.name)}</h3>`;
        html += `<p class="mbcdi-bs-route-mini-address">${escapeHtml(commerce.address || '')}</p>`;
        html += '</div>';
        
        html += '<div class="mbcdi-bs-route-mini-actions">';
        html += `<button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-secondary mbcdi-bs-btn-view">
            <span class="mbcdi-bs-btn-icon">${ICONS.eye}</span>
            <span class="mbcdi-bs-btn-text">Voir</span>
        </button>`;
        html += `<button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-danger mbcdi-bs-btn-stop">
            <span class="mbcdi-bs-btn-icon">${ICONS.close}</span>
            <span class="mbcdi-bs-btn-text">Arrêter</span>
        </button>`;
        html += '</div>';
        
        html += '</div>';
        return html;
    }

    /**
     * ÉTAT 4 : TRAJET DÉTAIL
     */
    function renderRouteDetail(commerce) {
        const logoHtml = commerce.logoUrl 
            ? `<img src="${escapeHtml(commerce.logoUrl)}" alt="Logo ${escapeHtml(commerce.name)}" class="mbcdi-bs-detail-logo" />`
            : '<div class="mbcdi-bs-detail-logo mbcdi-bs-detail-logo-placeholder">🏪</div>';
        
        let html = '<div class="mbcdi-bs-route-detail">';
        
        html += `<div class="mbcdi-bs-detail-logo-wrapper">${logoHtml}</div>`;
        html += `<h2 class="mbcdi-bs-detail-name">${escapeHtml(commerce.name)}</h2>`;
        html += `<p class="mbcdi-bs-detail-address">
            <span class="mbcdi-bs-icon">${ICONS.mapPin}</span>
            <span>${escapeHtml(commerce.address || '')}</span>
        </p>`;
        
        html += '<div class="mbcdi-bs-route-status">';
        html += '<p class="mbcdi-bs-route-label">Trajet en cours</p>';
        html += '<div class="mbcdi-bs-route-animation">';
        html += '<div class="mbcdi-bs-route-line"></div>';
        html += '</div>';
        html += '</div>';
        
        html += '<div class="mbcdi-bs-detail-infos">';
        
        if (commerce.hours) {
            html += `<div class="mbcdi-bs-detail-info-row">
                <span class="mbcdi-bs-icon">${ICONS.clock}</span>
                <span>${escapeHtml(commerce.hours)}</span>
            </div>`;
        }
        
        if (commerce.phone) {
            html += `<div class="mbcdi-bs-detail-info-row">
                <span class="mbcdi-bs-icon">${ICONS.phone}</span>
                <a href="tel:${escapeHtml(commerce.phone)}" class="mbcdi-bs-link">${escapeHtml(commerce.phone)}</a>
            </div>`;
        }
        
        if (commerce.website) {
            html += `<div class="mbcdi-bs-detail-info-row">
                <span class="mbcdi-bs-icon">${ICONS.globe}</span>
                <a href="${escapeHtml(commerce.website)}" target="_blank" rel="noopener" class="mbcdi-bs-link">${escapeHtml(commerce.website)}</a>
            </div>`;
        }
        
        html += '</div>';
        
        if (commerce.description || commerce.shortDesc) {
            html += `<div class="mbcdi-bs-detail-description">
                <p>${escapeHtml(commerce.description || commerce.shortDesc)}</p>
            </div>`;
        }
        
        html += `<div class="mbcdi-bs-route-detail-actions">
            <button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-secondary mbcdi-bs-btn-back-to-mini">
                <span class="mbcdi-bs-btn-icon">${ICONS.arrowLeft}</span>
                <span class="mbcdi-bs-btn-text">Retour</span>
            </button>
            <button type="button" class="mbcdi-bs-btn mbcdi-bs-btn-danger mbcdi-bs-btn-stop">
                <span class="mbcdi-bs-btn-icon">${ICONS.close}</span>
                <span class="mbcdi-bs-btn-text">Arrêter</span>
            </button>
        </div>`;
        
        html += '</div>';
        return html;
    }

    // Export
    window.MBCDI_BottomSheet = {
        renderList: renderCommerceList,
        renderDetail: renderCommerceDetail,
        renderRouteMini: renderRouteMini,
        renderRouteDetail: renderRouteDetail,
        icons: ICONS
    };

})();
