/**
 * MBCDI Commerce Cards v2
 * Gestion des cartes commerces avec fiche détaillée
 * @package MBCDI
 * @version 5.5.0
 */

(function() {
    'use strict';

    // SVG Icons
    const ICONS = {
        // Icon Info (cercle avec i)
        info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        
        // Icon Navigation (boussole)
        navigation: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
        
        // Icon Retour (chevron gauche)
        chevronLeft: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
        
        // Icon Catégorie (tag)
        tag: '<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
        
        // Icon Horloge
        clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        
        // Icon Téléphone
        phone: '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        
        // Icon Globe (site web)
        globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        
        // Icon Map Pin
        mapPin: '<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
    };

    /**
     * Génère le HTML d'une carte commerce
     */
    function renderCommerceCard(commerce) {
        const logoHtml = commerce.logoUrl 
            ? `<img src="${escapeHtml(commerce.logoUrl)}" alt="Logo ${escapeHtml(commerce.name)}" class="mbcdi-commerce-logo-large" />`
            : `<div class="mbcdi-commerce-logo-large"></div>`;

        const categoryHtml = commerce.category 
            ? `<p class="mbcdi-commerce-category">${escapeHtml(commerce.category)}</p>`
            : '';

        return `
            <div class="mbcdi-commerce-card" data-commerce-id="${commerce.id}">
                <!-- Header -->
                <div class="mbcdi-commerce-card-header">
                    <div class="mbcdi-commerce-logo-wrapper">
                        ${logoHtml}
                    </div>
                    <div class="mbcdi-commerce-info-main">
                        <h3 class="mbcdi-commerce-name-compact">${escapeHtml(commerce.name)}</h3>
                        <p class="mbcdi-commerce-address-compact">${escapeHtml(commerce.address || '')}</p>
                        ${categoryHtml}
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="mbcdi-commerce-card-actions">
                    <button type="button" class="mbcdi-btn-details" data-commerce-id="${commerce.id}">
                        <span class="mbcdi-btn-icon">${ICONS.info}</span>
                        <span class="mbcdi-btn-text">Détails</span>
                    </button>
                    <button type="button" class="mbcdi-btn-go-primary" data-commerce-id="${commerce.id}">
                        <span class="mbcdi-btn-icon">${ICONS.navigation}</span>
                        <span class="mbcdi-btn-text">Y aller</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Génère le HTML de la fiche détaillée
     */
    function renderCommerceDetail(commerce) {
        const logoHtml = commerce.logoUrl 
            ? `<img src="${escapeHtml(commerce.logoUrl)}" alt="Logo ${escapeHtml(commerce.name)}" class="mbcdi-detail-logo-large" />`
            : `<div class="mbcdi-detail-logo-large"></div>`;

        const categoryRow = commerce.category 
            ? `<div class="mbcdi-detail-info-row">
                   <span class="mbcdi-detail-info-icon">${ICONS.tag}</span>
                   <span class="mbcdi-detail-info-text">${escapeHtml(commerce.category)}</span>
               </div>`
            : '';

        const hoursRow = commerce.hours 
            ? `<div class="mbcdi-detail-info-row">
                   <span class="mbcdi-detail-info-icon">${ICONS.clock}</span>
                   <span class="mbcdi-detail-info-text">${escapeHtml(commerce.hours)}</span>
               </div>`
            : '';

        const phoneRow = commerce.phone 
            ? `<div class="mbcdi-detail-info-row">
                   <span class="mbcdi-detail-info-icon">${ICONS.phone}</span>
                   <span class="mbcdi-detail-info-text">
                       <a href="tel:${escapeHtml(commerce.phone)}">${escapeHtml(commerce.phone)}</a>
                   </span>
               </div>`
            : '';

        const websiteRow = commerce.website 
            ? `<div class="mbcdi-detail-info-row">
                   <span class="mbcdi-detail-info-icon">${ICONS.globe}</span>
                   <span class="mbcdi-detail-info-text">
                       <a href="${escapeHtml(commerce.website)}" target="_blank" rel="noopener">${escapeHtml(commerce.website)}</a>
                   </span>
               </div>`
            : '';

        const descriptionHtml = commerce.shortDesc 
            ? `<p class="mbcdi-detail-description">${escapeHtml(commerce.shortDesc)}</p>`
            : '';

        return `
            <div class="mbcdi-commerce-detail-fullscreen" data-commerce-id="${commerce.id}">
                <!-- Header -->
                <div class="mbcdi-detail-header">
                    <button type="button" class="mbcdi-btn-back">
                        ${ICONS.chevronLeft}
                        <span>Retour</span>
                    </button>
                    <h2 class="mbcdi-detail-commerce-name">${escapeHtml(commerce.name)}</h2>
                </div>
                
                <!-- Contenu -->
                <div class="mbcdi-detail-content">
                    <!-- Logo -->
                    <div class="mbcdi-detail-logo-wrapper">
                        ${logoHtml}
                    </div>
                    
                    <!-- Titre et adresse -->
                    <h1 class="mbcdi-detail-title">${escapeHtml(commerce.name)}</h1>
                    <p class="mbcdi-detail-address">
                        <span class="mbcdi-detail-info-icon" style="display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:4px;">${ICONS.mapPin}</span>
                        ${escapeHtml(commerce.address || '')}
                    </p>
                    
                    <!-- Bloc informations -->
                    ${categoryRow || hoursRow || phoneRow || websiteRow ? `
                    <div class="mbcdi-detail-info-block">
                        ${categoryRow}
                        ${hoursRow}
                        ${phoneRow}
                        ${websiteRow}
                    </div>
                    ` : ''}
                    
                    <!-- Description -->
                    ${descriptionHtml}
                </div>
                
                <!-- Footer avec bouton Y aller -->
                <div class="mbcdi-detail-footer">
                    <button type="button" class="mbcdi-btn-go-detail" data-commerce-id="${commerce.id}">
                        <span class="mbcdi-btn-icon">${ICONS.navigation}</span>
                        <span class="mbcdi-btn-text">Y aller</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Échappe le HTML pour éviter les injections XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Ouvre la fiche détaillée d'un commerce
     */
    function openCommerceDetail(commerceId, commerces) {
        const commerce = commerces.find(c => c.id == commerceId);
        if (!commerce) {
            console.error('[MBCDI Cards] Commerce non trouvé:', commerceId);
            return;
        }

        // Vérifier si la fiche existe déjà
        let detailView = document.querySelector(`.mbcdi-commerce-detail-fullscreen[data-commerce-id="${commerceId}"]`);
        
        if (!detailView) {
            // Créer la fiche
            const container = document.querySelector('.mbcdi-app') || document.body;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderCommerceDetail(commerce);
            detailView = tempDiv.firstElementChild;
            container.appendChild(detailView);

            // Attacher les event listeners
            const btnBack = detailView.querySelector('.mbcdi-btn-back');
            const btnGo = detailView.querySelector('.mbcdi-btn-go-detail');

            if (btnBack) {
                btnBack.addEventListener('click', function() {
                    closeCommerceDetail(detailView);
                });
            }

            if (btnGo) {
                btnGo.addEventListener('click', function() {
                    const id = this.getAttribute('data-commerce-id');
                    closeCommerceDetail(detailView);
                    // Déclencher l'événement pour lancer l'itinéraire
                    triggerGoToCommerce(id);
                });
            }
        }

        // Afficher la fiche avec animation
        requestAnimationFrame(() => {
            detailView.classList.add('active');
        });

        // Bloquer le scroll du body
        document.body.style.overflow = 'hidden';
    }

    /**
     * Ferme la fiche détaillée
     */
    function closeCommerceDetail(detailView) {
        detailView.classList.remove('active');
        
        // Débloquer le scroll
        document.body.style.overflow = '';

        // Supprimer l'élément après l'animation
        setTimeout(() => {
            if (detailView.parentNode) {
                detailView.parentNode.removeChild(detailView);
            }
        }, 300);
    }

    /**
     * Déclenche l'itinéraire vers un commerce
     */
    function triggerGoToCommerce(commerceId) {
        console.log('[MBCDI Cards v5.2.3] Déclenchement Y aller pour commerce:', commerceId);
        
        // Déclencher un événement personnalisé que frontend.js pourra écouter
        const event = new CustomEvent('mbcdi:goToCommerce', {
            detail: { commerceId: commerceId },
            bubbles: true // V5.2.3: Assure la propagation de l'événement
        });
        window.dispatchEvent(event);
        
        console.log('[MBCDI Cards v5.2.3] Événement mbcdi:goToCommerce dispatché');
    }

    /**
     * Initialise les cartes commerces pour une instance
     */
    function initCommerceCards(instanceId, commerces) {
        console.log('[MBCDI Cards] Initialisation pour instance:', instanceId);
        
        const app = document.querySelector(`.mbcdi-app[data-mbcdi-instance="${instanceId}"]`);
        if (!app) {
            console.error('[MBCDI Cards] Instance non trouvée:', instanceId);
            return;
        }

        const listContainer = app.querySelector('.mbcdi-commerce-list');
        if (!listContainer) {
            console.error('[MBCDI Cards] Container liste non trouvé');
            return;
        }

        // Générer les cartes
        if (!commerces || commerces.length === 0) {
            listContainer.innerHTML = `
                <div class="mbcdi-commerce-list-empty">
                    <div class="mbcdi-commerce-list-empty-icon">🏪</div>
                    <p class="mbcdi-commerce-list-empty-text">Aucun commerce trouvé</p>
                    <p class="mbcdi-commerce-list-empty-subtext">Il n'y a pas de commerces à proximité pour le moment.</p>
                </div>
            `;
            return;
        }

        // Générer le HTML des cartes
        const cardsHtml = commerces.map(commerce => renderCommerceCard(commerce)).join('');
        listContainer.innerHTML = cardsHtml;

        // Attacher les event listeners
        listContainer.addEventListener('click', function(e) {
            // Bouton Détails
            const btnDetails = e.target.closest('.mbcdi-btn-details');
            if (btnDetails) {
                e.preventDefault();
                const commerceId = btnDetails.getAttribute('data-commerce-id');
                console.log('[MBCDI Cards v5.2.3] Clic Détails pour commerce:', commerceId);
                openCommerceDetail(commerceId, commerces);
                return;
            }

            // Bouton Y aller
            const btnGo = e.target.closest('.mbcdi-btn-go-primary');
            if (btnGo) {
                e.preventDefault();
                const commerceId = btnGo.getAttribute('data-commerce-id');
                console.log('[MBCDI Cards v5.2.3] Clic Y aller pour commerce:', commerceId);
                triggerGoToCommerce(commerceId);
                return;
            }
        });

        console.log('[MBCDI Cards] Cartes initialisées:', commerces.length);
    }

    /**
     * Point d'entrée principal
     */
    function init() {
        console.log('[MBCDI Cards] Module chargé');

        // Exposer les fonctions publiques
        window.MBCDICommerceCards = {
            init: initCommerceCards,
            openDetail: openCommerceDetail,
            renderCard: renderCommerceCard,
            renderDetail: renderCommerceDetail
        };
    }

    // Initialiser au chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
