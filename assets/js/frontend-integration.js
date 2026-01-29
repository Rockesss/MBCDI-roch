/**
 * MBCDI - Intégration Frontend
 * 
 * Ce fichier s'ajoute APRÈS frontend.js pour intégrer les fonctionnalités avancées :
 * - Géolocalisation silencieuse + auto-sélection point proche
 * - Autocomplétion améliorée (nom + adresse, highlight)
 * - Bottom sheet avec ouverture automatique et liste triée
 * - Animation pulse 15s sur point de départ
 * 
 * @package MBCDI
 * @version 5.5.0
 */
(function() {
    'use strict';

    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initV5);
    } else {
        initV5();
    }

    function initV5() {
        console.log('[MBCDI] Initialisation intégration frontend...');

        // Trouver toutes les instances MBCDI
        var apps = document.querySelectorAll('.mbcdi-app[data-mbcdi-instance]');
        
        if (apps.length === 0) {
            console.warn('[MBCDI] Aucune instance trouvée');
            return;
        }

        apps.forEach(function(app) {
            var instanceId = app.getAttribute('data-mbcdi-instance');
            var varName = 'MBCDI_DATA_' + instanceId.replace(/-/g, '_');
            var data = window[varName];

            // V5.0.5: Correction - essayer aussi sans remplacement si échec
            if (!data) {
                varName = 'MBCDI_DATA_' + instanceId;
                data = window[varName];
            }

            if (!data || !data.destinations || !data.destinations.length) {
                console.error('[MBCDI] Données manquantes pour instance', instanceId);
                console.error('[MBCDI] Nom de variable cherché:', varName);
                console.error('[MBCDI] Variables window disponibles:', Object.keys(window).filter(function(k) { return k.indexOf('MBCDI_DATA') === 0; }));
                return;
            }

            console.log('[MBCDI] Instance', instanceId, 'trouvée avec variable', varName);

            // Préparer la liste de tous les commerces pour l'autocomplétion
            var allCommerces = [];
            data.destinations.forEach(function(dest) {
                if (dest.commerces && dest.commerces.length) {
                    dest.commerces.forEach(function(commerce) {
                        allCommerces.push({
                            id: commerce.id,
                            name: commerce.name || '',
                            address: commerce.address || '',
                            lat: commerce.lat,
                            lng: commerce.lng
                        });
                    });
                }
            });

            console.log('[MBCDI] Commerces pour autocomplétion:', allCommerces.length);

            // ============================================================
            // INITIALISATION AUTOCOMPLÉTION V5
            // ============================================================
            var searchInput = app.querySelector('.mbcdi-search-input');
            
            if (searchInput && window.MBCDIAutocomplete) {
                window.MBCDIAutocomplete.init(searchInput, allCommerces, function(commerce) {
                    console.log('[MBCDI] Commerce sélectionné via recherche:', commerce.name);
                    
                    // Trouver le commerce complet avec toutes ses données
                    var fullCommerce = null;
                    data.destinations.forEach(function(dest) {
                        if (!fullCommerce && dest.commerces) {
                            dest.commerces.forEach(function(c) {
                                if (c.id == commerce.id) {
                                    fullCommerce = c;
                                }
                            });
                        }
                    });
                    
                    if (!fullCommerce) {
                        console.error('[MBCDI] Commerce complet non trouvé');
                        return;
                    }

                    // Récupérer la position de départ actuelle
                    var positionData = null;
                    try {
                        positionData = JSON.parse(sessionStorage.getItem('mbcdi_position') || '{}');
                    } catch (e) {
                        console.error('[MBCDI] Erreur lecture position:', e);
                    }

                    if (!positionData || !positionData.startPoint) {
                        console.error('[MBCDI] Position de départ non définie');
                        return;
                    }

                    // Déclencher l'affichage du commerce
                    // Cette fonction doit être définie dans frontend.js
                    if (window.MBCDI && window.MBCDI.showCommerceDetail) {
                        window.MBCDI.showCommerceDetail(instanceId, fullCommerce, positionData.startPoint);
                    } else {
                        console.warn('[MBCDI] Fonction showCommerceDetail non disponible');
                        // Fallback : émettre un événement custom
                        var event = new CustomEvent('mbcdi:commerce-selected', {
                            detail: {
                                commerce: fullCommerce,
                                startPoint: positionData.startPoint
                            }
                        });
                        app.dispatchEvent(event);
                    }
                });

                console.log('[MBCDI] Autocomplétion v5 initialisée');
            }

            // ============================================================
            // INITIALISATION SMART LOCATION
            // ============================================================
            if (window.MBCDISmartLocation) {
                window.MBCDISmartLocation.init(app, data, {
                    
                    // Callback : Position déterminée et prête
                    onPositionReady: function(positionData) {
                        console.log('[MBCDI] Position prête:', positionData.label);
                        
                        var startPoint = positionData.startPoint;
                        
                        // 1. Afficher le marqueur du point de départ avec animation pulse
                        showStartPointWithPulse(app, startPoint);
                        
                        // 2. Calculer les distances de tous les commerces depuis ce point
                        var commercesWithDistance = [];
                        if (data.destinations[0] && data.destinations[0].commerces) {
                            commercesWithDistance = data.destinations[0].commerces.map(function(commerce) {
                                var distance = window.MBCDISmartLocation.calculateDistance(
                                    startPoint.lat, 
                                    startPoint.lng, 
                                    commerce.lat, 
                                    commerce.lng
                                );
                                
                                return Object.assign({}, commerce, { 
                                    distanceFromStart: distance 
                                });
                            });
                            
                            // Trier par ordre alphabétique (uniformisation avec le mode démo)
                            commercesWithDistance.sort(function(a, b) {
                                var an = (a.name || '').toLowerCase();
                                var bn = (b.name || '').toLowerCase();
                                return an.localeCompare(bn, 'fr', { sensitivity: 'base' });
                            });
                        }
                        
                        console.log('[MBCDI] Commerces triés par ordre alphabétique:', commercesWithDistance.length);
                        
                        // 3. Remplir le bottom sheet avec la liste triée
                        renderCommerceList(app, commercesWithDistance, positionData);
                        
                        // 4. Ouvrir le bottom sheet automatiquement
                        openBottomSheet(app);
                        
                        // V5.0.3: Émettre événement custom pour frontend.js avec coordonnées GPS
                        var event = new CustomEvent('mbcdi:position-ready', {
                            detail: {
                                position: positionData,
                                commerces: commercesWithDistance,
                                // V5.0.3: Ajouter les coordonnées GPS user si disponibles
                                userLat: positionData.userLat || null,
                                userLng: positionData.userLng || null
                            }
                        });
                        app.dispatchEvent(event);
                    },
                    
                    // Callback : Changement manuel de position
                    onPositionChanged: function(positionData) {
                        console.log('[MBCDI] Position changée:', positionData.label);
                        
                        // Recharger la page pour réinitialiser tout
                        window.location.reload();
                    }
                });

                console.log('[MBCDI] Smart Location initialisé');
            }
        });
    }

    // ============================================================
    // FONCTION : AFFICHER POINT DE DÉPART AVEC PULSE ET RECENTRER
    // ============================================================
    function showStartPointWithPulse(app, startPoint) {
        console.log('[MBCDI] Affichage point départ avec pulse:', startPoint.label);
        
        // Émettre événement pour que frontend.js affiche le marqueur ET recentre la carte
        var event = new CustomEvent('mbcdi:show-start-point', {
            detail: {
                lat: startPoint.lat,
                lng: startPoint.lng,
                label: startPoint.label,
                withPulse: true,
                pulseDuration: 15000, // 15 secondes
                recenterMap: true,     // NOUVEAU : recentrer la carte
                zoom: 16              // Zoom sur le point de départ
            }
        });
        app.dispatchEvent(event);
        app.addEventListener('mbcdi:show-start-point', function(e) {
    var detail = e.detail;
    
    // Créer marqueur avec pulse
    var pulseIcon = L.divIcon({ /* ... */ });
    var marker = L.marker([detail.lat, detail.lng], {
        icon: pulseIcon
    }).addTo(state.map);
    
    // Arrêter pulse après 15s
    setTimeout(function() { /* ... */ }, detail.pulseDuration);
    
    // RECENTRER LA CARTE (NOUVEAU)
    if (detail.recenterMap) {
        state.map.setView([detail.lat, detail.lng], detail.zoom || 16);
        console.log('[MBCDI] Carte recentrée sur:', detail.label);
    }
});
    }

    // ============================================================
    // FONCTION : REMPLIR LISTE COMMERCES DANS BOTTOM SHEET
    // ============================================================
    function renderCommerceList(app, commerces, positionData) {
        var listContainer = app.querySelector('.mbcdi-commerce-list');
        
        if (!listContainer) {
            console.error('[MBCDI] Conteneur liste commerces non trouvé');
            return;
        }
        // Uniformisation : si les cartes v2 sont disponibles, on délègue le rendu
        // afin d'obtenir le même affichage qu'en mode démo, même avec la localisation.
        if (typeof window.MBCDICommerceCards !== 'undefined' && window.MBCDICommerceCards && typeof window.MBCDICommerceCards.init === 'function') {
            try {
                // Assurer l'ordre alphabétique (mode démo)
                var sorted = (commerces || []).slice().sort(function(a, b) {
                    var an = (a.name || '').toLowerCase();
                    var bn = (b.name || '').toLowerCase();
                    return an.localeCompare(bn, 'fr', { sensitivity: 'base' });
                });

				// Le module Cards v2 attend un instanceId (string), pas un élément DOM.
				var instanceId = app.getAttribute('data-mbcdi-instance') || '';
				window.MBCDICommerceCards.init(instanceId, sorted);

                // Le bottom sheet reste géré par l'intégration
                return;
            } catch (e) {
                console.warn('[MBCDI] Échec rendu cartes v2, fallback rendu legacy:', e);
                // on continue sur le rendu legacy ci-dessous
            }
        }


        listContainer.innerHTML = '';

        if (!commerces || commerces.length === 0) {
            listContainer.innerHTML = '<div class="mbcdi-commerce-empty">Aucun commerce disponible</div>';
            return;
        }

        console.log('[MBCDI] Rendu de', commerces.length, 'commerces');

        commerces.forEach(function(commerce) {
            // IMPORTANT : on utilise un <div> cliquable au lieu d'un <button>.
            // Raison : certains navigateurs / thèmes appliquent des styles natifs aux <button>
            // (bordures, background, alignements) qui cassent l'affichage.
            // On garde l'accessibilité via role="button" + tabindex + gestion clavier.
            var item = document.createElement('div');
            item.className = 'mbcdi-commerce-item';
            item.setAttribute('data-commerce-id', commerce.id);
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            
            // Format distance
            var distText = '';
            if (commerce.distanceFromStart !== undefined) {
                distText = commerce.distanceFromStart < 1000 
                    ? Math.round(commerce.distanceFromStart) + 'm'
                    : (commerce.distanceFromStart / 1000).toFixed(1) + 'km';
            }
            
            // Zone de livraison (si disponible)
            var zoneLabel = '';
            var zoneBadge = '';
            if (commerce.deliveryZoneId) {
                // Chercher le nom de la zone
                // Cette info devrait être dans data.deliveryZones
                zoneLabel = 'Zone P' + commerce.deliveryZoneId;
                zoneBadge = '<span class="mbcdi-zone">🅿️ ' + zoneLabel + '</span>';
            }
            
            // Distance de marche (si disponible)
            var walkInfo = '';
            if (commerce.walkingDistance) {
                walkInfo = '<span class="mbcdi-walk-time">' + commerce.walkingDistance + 'm à pied du parking</span>';
            }
            
            item.innerHTML = `
                <div class="mbcdi-commerce-logo">
                    ${commerce.logoUrl 
                        ? '<img src="' + commerce.logoUrl + '" alt="Logo ' + (commerce.name || '') + '" />' 
                        : '<span>🏪</span>'}
                </div>
                <div class="mbcdi-commerce-info">
                    <strong class="mbcdi-commerce-name">${commerce.name || 'Commerce'}</strong>
                    ${distText || zoneBadge ? `
                        <span class="mbcdi-commerce-meta">
                            ${distText ? '<span class="mbcdi-distance">' + distText + '</span>' : ''}
                            ${zoneBadge}
                        </span>
                    ` : ''}
                    ${walkInfo}
                </div>
                <span class="mbcdi-commerce-arrow">›</span>
            `;
            
            function emitCommerceClicked() {
                console.log('[MBCDI] Clic commerce:', commerce.name);
                
                // Émettre événement pour frontend.js
                var event = new CustomEvent('mbcdi:commerce-clicked', {
                    detail: {
                        commerce: commerce,
                        startPoint: positionData.startPoint
                    }
                });
                app.dispatchEvent(event);
            }

            // Event clic
            item.addEventListener('click', function() {
                emitCommerceClicked();
            });

            // Accessibilité clavier (Entrée / Espace)
            item.addEventListener('keydown', function(e) {
                var key = e.key || e.code;
                if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                    e.preventDefault();
                    emitCommerceClicked();
                }
            });
            
            listContainer.appendChild(item);
        });

        console.log('[MBCDI] Liste commerces rendue avec succès');
    }

    // ============================================================
    // FONCTION : OUVRIR BOTTOM SHEET
    // ============================================================
    function openBottomSheet(app) {
        var bottomSheet = app.querySelector('.mbcdi-bottomsheet');
        
        if (!bottomSheet) {
            console.error('[MBCDI] Bottom sheet non trouvé');
            return;
        }

        // Ajouter la classe visible
        bottomSheet.classList.add('mbcdi-visible');
        
        // S'assurer que la vue liste est affichée
        var listView = app.querySelector('.mbcdi-commerce-list-view');
        var detailView = app.querySelector('.mbcdi-commerce-detail-view');
        
        if (listView) listView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';

        console.log('[MBCDI] Bottom sheet ouvert');
    }

    // ============================================================
    // EXPOSITION GLOBALE POUR DEBUG
    // ============================================================
    window.MBCDIv5Integration = {
        version: '5.0.0',
        renderCommerceList: renderCommerceList,
        openBottomSheet: openBottomSheet,
        showStartPointWithPulse: showStartPointWithPulse
    };

})();
