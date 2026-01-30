/**
 * MBCDI Frontend V5.4.2
 * - Support des zones de livraison
 * - Affichage distance à pied depuis zone
 * - Respect strict de l'ordre des étapes du BO
 * - Clustering commerces + fiche commerce rétractable
 * @version 5.5.1
 */
(function() {
    'use strict';

    // Wrapper debug conditionnel - les logs ne s'affichent qu'en mode debug
    var MBCDI_DEBUG_MODE = window.MBCDI_DEBUG_MODE || false;
    function mbcdiDebug() {
        if (MBCDI_DEBUG_MODE && console && console.log) {
            console.log.apply(console, ['[MBCDI]'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    window.MBCDI = {
        init: function(instanceId, varName) {
            var app = document.querySelector('.mbcdi-app[data-mbcdi-instance="' + instanceId + '"]');
            if (!app) return;

            var data = window[varName];
            if (!data || !data.destinations || !data.destinations.length) {
                console.error('MBCDI: Aucune donnée');
                return;
            }

            var state = {
                map: null,
                currentMode: 'car',
                userPosition: null,
                startPosition: null,
                destPosition: null,
                routeLayer: null,
                zoneLayer: null,
                markers: [],
                commerceMarkers: [],
                commerceClusterGroup: null,
                isCommerceCardExpanded: false,
                pictoMarkers: [],
                startPointMarkers: [],
                deliveryZoneMarkers: [],
                deliveryZonePolygons: [],
                walkingLineLayer: null,
                userMarker: null,
                selectedCommerce: null,
                selectedZone: null,
                isExpanded: false,
                isSheetExpanded: false,
                selectedCommerceId: 0,
                selectedDestinationId: 0,
                currentRoute: null // V4.4: Stocker la réponse complète
            };

            // Mode de transport (profil OSRM)
            function mbcdiGetUrlParam(name) {
                try {
                    var params = new URLSearchParams(window.location.search);
                    return params.get(name) || '';
                } catch (e) {
                    return '';
                }
            }

            var defaultMode = (data.settings && data.settings.defaultProfile) ? data.settings.defaultProfile : 'car';

            // Langue UI (2 lettres) : utilisée pour localiser les instructions de navigation.
            // Ex: fr_FR -> fr
            var uiLang = (data.settings && data.settings.lang) ? String(data.settings.lang).toLowerCase() : 'fr';

            // Dictionnaires minimalistes de traduction (type/modifier) basés sur les champs OSRM.
            // Objectif : permettre un rendu multilingue sans dépendance externe.
            var MBCDI_STEP_I18N = {
                fr: {
                    types: {
                        'depart': 'Partez',
                        'arrive': 'Arrivée',
                        'turn': 'Tournez',
                        'continue': 'Continuez',
                        'merge': 'Rejoignez',
                        'on ramp': 'Prenez la bretelle',
                        'off ramp': 'Sortez par la bretelle',
                        'fork': 'À la fourche',
                        'end of road': 'En fin de route',
                        'new name': 'Continuez sur',
                        'roundabout': 'Au rond-point',
                        'rotary': 'Au rond-point',
                        'roundabout turn': 'Au rond-point',
                        'exit roundabout': 'Sortez du rond-point',
                        'notification': ''
                    },
                    modifiers: {
                        'left': 'à gauche',
                        'right': 'à droite',
                        'slight left': 'légèrement à gauche',
                        'slight right': 'légèrement à droite',
                        'sharp left': 'fortement à gauche',
                        'sharp right': 'fortement à droite',
                        'straight': 'tout droit',
                        'uturn': 'faites demi-tour'
                    },
                    on: 'sur',
                    at: 'à',
                },
                en: {
                    types: {
                        'depart': 'Depart',
                        'arrive': 'Arrive',
                        'turn': 'Turn',
                        'continue': 'Continue',
                        'merge': 'Merge',
                        'on ramp': 'Take the ramp',
                        'off ramp': 'Take the exit ramp',
                        'fork': 'At the fork',
                        'end of road': 'At the end of the road',
                        'new name': 'Continue on',
                        'roundabout': 'At the roundabout',
                        'rotary': 'At the roundabout',
                        'roundabout turn': 'At the roundabout',
                        'exit roundabout': 'Exit the roundabout',
                        'notification': ''
                    },
                    modifiers: {
                        'left': 'left',
                        'right': 'right',
                        'slight left': 'slight left',
                        'slight right': 'slight right',
                        'sharp left': 'sharp left',
                        'sharp right': 'sharp right',
                        'straight': 'straight',
                        'uturn': 'make a U-turn'
                    },
                    on: 'on',
                    at: 'at',
                },
                de: {
                    types: {
                        'depart': 'Starten',
                        'arrive': 'Ankunft',
                        'turn': 'Abbiegen',
                        'continue': 'Weiter',
                        'merge': 'Einfädeln',
                        'on ramp': 'Auffahrt nehmen',
                        'off ramp': 'Ausfahrt nehmen',
                        'fork': 'An der Gabelung',
                        'end of road': 'Am Ende der Straße',
                        'new name': 'Weiter auf',
                        'roundabout': 'Im Kreisverkehr',
                        'rotary': 'Im Kreisverkehr',
                        'roundabout turn': 'Im Kreisverkehr',
                        'exit roundabout': 'Kreisverkehr verlassen',
                        'notification': ''
                    },
                    modifiers: {
                        'left': 'links',
                        'right': 'rechts',
                        'slight left': 'leicht links',
                        'slight right': 'leicht rechts',
                        'sharp left': 'scharf links',
                        'sharp right': 'scharf rechts',
                        'straight': 'geradeaus',
                        'uturn': 'wenden'
                    },
                    on: 'auf',
                    at: 'bei',
                },
                es: {
                    types: {
                        'depart': 'Salga',
                        'arrive': 'Llegada',
                        'turn': 'Gire',
                        'continue': 'Continúe',
                        'merge': 'Incorpórese',
                        'on ramp': 'Tome la rampa',
                        'off ramp': 'Salga por la rampa',
                        'fork': 'En la bifurcación',
                        'end of road': 'Al final de la vía',
                        'new name': 'Continúe por',
                        'roundabout': 'En la rotonda',
                        'rotary': 'En la rotonda',
                        'roundabout turn': 'En la rotonda',
                        'exit roundabout': 'Salga de la rotonda',
                        'notification': ''
                    },
                    modifiers: {
                        'left': 'a la izquierda',
                        'right': 'a la derecha',
                        'slight left': 'ligeramente a la izquierda',
                        'slight right': 'ligeramente a la derecha',
                        'sharp left': 'cerrado a la izquierda',
                        'sharp right': 'cerrado a la derecha',
                        'straight': 'recto',
                        'uturn': 'dé la vuelta'
                    },
                    on: 'por',
                    at: 'en',
                },
                it: {
                    types: {
                        'depart': 'Parti',
                        'arrive': 'Arrivo',
                        'turn': 'Gira',
                        'continue': 'Continua',
                        'merge': 'Immettiti',
                        'on ramp': 'Prendi la rampa',
                        'off ramp': 'Esci dalla rampa',
                        'fork': 'Al bivio',
                        'end of road': 'Alla fine della strada',
                        'new name': 'Continua su',
                        'roundabout': 'Alla rotatoria',
                        'rotary': 'Alla rotatoria',
                        'roundabout turn': 'Alla rotatoria',
                        'exit roundabout': 'Esci dalla rotatoria',
                        'notification': ''
                    },
                    modifiers: {
                        'left': 'a sinistra',
                        'right': 'a destra',
                        'slight left': 'leggermente a sinistra',
                        'slight right': 'leggermente a destra',
                        'sharp left': 'a sinistra stretto',
                        'sharp right': 'a destra stretto',
                        'straight': 'dritto',
                        'uturn': 'fai inversione'
                    },
                    on: 'su',
                    at: 'a',
                }
            };

            function mbcdiGetStepText(step) {
                // Si la langue est FR, on garde le texte serveur (déjà en FR) pour éviter tout écart.
                if (uiLang === 'fr') {
                    return (step && (step.instruction || step.name)) ? (step.instruction || step.name) : 'Continuer';
                }

                var dict = MBCDI_STEP_I18N[uiLang] || MBCDI_STEP_I18N.en;
                var type = (step && step.type) ? String(step.type) : 'continue';
                var modifier = (step && step.modifier) ? String(step.modifier) : '';
                var name = (step && step.name) ? String(step.name) : '';

                var base = (dict.types && dict.types[type] !== undefined) ? dict.types[type] : (MBCDI_STEP_I18N.en.types[type] || 'Continue');
                var mod = (modifier && dict.modifiers && dict.modifiers[modifier]) ? dict.modifiers[modifier] : '';

                var out = base;
                if (mod) out += ' ' + mod;

                if (name) {
                    if (type === 'arrive') {
                        out += ' ' + (dict.at || 'at') + ' ' + name;
                    } else if (type !== 'depart') {
                        out += ' ' + (dict.on || 'on') + ' ' + name;
                    } else {
                        out += ' ' + (dict.on || 'on') + ' ' + name;
                    }
                }

                return out;
            }

            function mbcdiT(key) {
                var table = {
                    fr: {
                        finalWalk: "Finir à pied jusqu'au commerce",
                        followRoute: "Suivez l'itinéraire indiqué"
                    },
                    en: {
                        finalWalk: 'Walk to the store',
                        followRoute: 'Follow the suggested route'
                    },
                    de: {
                        finalWalk: 'Zu Fuß bis zum Geschäft',
                        followRoute: 'Folgen Sie der vorgeschlagenen Route'
                    },
                    es: {
                        finalWalk: 'Termine a pie hasta el comercio',
                        followRoute: 'Siga la ruta sugerida'
                    },
                    it: {
                        finalWalk: 'Prosegui a piedi fino al negozio',
                        followRoute: 'Segui il percorso suggerito'
                    }
                };
                var lang = uiLang;
                if (!table[lang]) lang = 'en';
                return (table[lang] && table[lang][key]) ? table[lang][key] : (table.en[key] || '');
            }

            // Le mode de transport côté front n'est plus sélectionnable via une modale.
            // On applique uniquement le profil par défaut (défini dans le BO), avec 'car' en fallback.
            state.currentMode = (defaultMode || 'car');
            if (['car', 'bike', 'foot'].indexOf(state.currentMode) === -1) {
                state.currentMode = 'car';
            }

            // Nettoyage: on neutralise une éventuelle valeur persistée d'anciennes versions.
            try { window.localStorage.removeItem('mbcdi_profile'); } catch (e) {}

            // Éléments DOM
            var mapContainer = app.querySelector('.mbcdi-map');
            var selectDestMain = app.querySelector('.mbcdi-input-dest-main');
            var selectStart = app.querySelector('.mbcdi-input-start');
            var selectDest = app.querySelector('.mbcdi-input-dest');
            var btnExpand = app.querySelector('.mbcdi-btn-expand');
            var btnCollapse = app.querySelector('.mbcdi-btn-collapse');
            var btnSearch = app.querySelector('.mbcdi-btn-search');
            var bottomSheet = app.querySelector('.mbcdi-bottomsheet');
            var sheetHandle = app.querySelector('.mbcdi-bottomsheet-handle');
            var resultDist = app.querySelector('.mbcdi-result-dist');
            var resultTime = app.querySelector('.mbcdi-result-time');
            var stepsContainer = app.querySelector('.mbcdi-steps');
            var sheetBody = app.querySelector('.mbcdi-bottomsheet-body');
            var btnLocate = app.querySelector('.mbcdi-btn-locate');
            var btnMode = app.querySelector('.mbcdi-btn-mode');

            // Le choix du véhicule ne se fait plus via une modale.
            // Un simple bouton renvoie vers une page configurée dans le BO.
            var transportChangeUrl = data.settings && data.settings.transportChangeUrl ? data.settings.transportChangeUrl : '';

            // Init carte SANS contrôles de zoom
            if (mapContainer) {
                mapContainer.classList.remove('mbcdi-skeleton');
                var first = data.destinations[0];

                state.map = L.map(mapContainer, {
                    zoomControl: false,
                    attributionControl: false
                }).setView([first.lat, first.lng], 15);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(state.map);

                // Initialiser le contrôle de rotation (v5.5.2)
                if (typeof state.map.setBearing === 'function' && window.MBCDI_Modular && window.MBCDI_Modular.modules && window.MBCDI_Modular.modules.rotation) {
                    try {
                        state.rotationControl = window.MBCDI_Modular.modules.rotation.createRotationControl(state.map, {
                            position: 'topright',
                            onRotate: function(bearing) {
                                mbcdiDebug('[MBCDI] Rotation manuelle:', bearing, '°');
                            }
                        });
                        mbcdiDebug('[MBCDI v5.5.2] Contrôle de rotation ajouté');
                    } catch (rotErr) {
                        console.warn('[MBCDI v5.5.2] Erreur création contrôle rotation:', rotErr);
                    }
                }

                state.map.on('zoomend', function() {
                    updatePictoSizes();
                });

                // V4.9: Préparer clustering (les markers seront ajoutés au rendu)
                initializeCommerceClustering();

                renderDestinationOnMap(first);
                
                // V5.0.3: Écouter l'événement de position ready pour mettre à jour state.userPosition
                app.addEventListener('mbcdi:position-ready', function(e) {
                    if (e.detail && e.detail.userLat && e.detail.userLng) {
                        state.userPosition = {
                            lat: e.detail.userLat,
                            lng: e.detail.userLng
                        };
                        mbcdiDebug('] state.userPosition mis à jour depuis géoloc silencieuse:', state.userPosition);
                    }
                });
            }

            // === INITIALISATION AUTOCOMPLÉTION ===
            // Préparer la liste de tous les commerces pour l'autocomplétion
            var allCommerces = [];
            if (data.destinations && data.destinations.length) {
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
            }

            // Initialiser l'autocomplétion sur les deux inputs
            if (selectDestMain && window.MBCDIAutocomplete) {
                window.MBCDIAutocomplete.init(selectDestMain, allCommerces, function(commerce) {
                    // Quand un commerce est sélectionné dans l'input principal
                    // Synchroniser avec l'input déplié
                    if (selectDest) {
                        selectDest.value = commerce.name;
                        selectDest.setAttribute('data-commerce-id', commerce.id);
                        selectDest.setAttribute('data-lat', commerce.lat);
                        selectDest.setAttribute('data-lng', commerce.lng);
                    }
                    // Déplier automatiquement
                    app.classList.add('expanded');
                    state.isExpanded = true;
                });
            }

            if (selectDest && window.MBCDIAutocomplete) {
                window.MBCDIAutocomplete.init(selectDest, allCommerces, function(commerce) {
                    // Quand un commerce est sélectionné dans l'input déplié
                    // Synchroniser avec l'input principal
                    if (selectDestMain) {
                        selectDestMain.value = commerce.name;
                        selectDestMain.setAttribute('data-commerce-id', commerce.id);
                        selectDestMain.setAttribute('data-lat', commerce.lat);
                        selectDestMain.setAttribute('data-lng', commerce.lng);
                    }
                });
            }

            // === ÉCOUTE DE L'ÉVÉNEMENT "Y ALLER" DEPUIS LES CARTES COMMERCES ===
            // V5.2.3: Gestion du bouton "Y aller" des cartes commerces
            window.addEventListener('mbcdi:goToCommerce', function(e) {
                if (!e.detail || !e.detail.commerceId) {
                    console.error('[MBCDI] Événement goToCommerce sans commerceId');
                    return;
                }

                var commerceId = parseInt(e.detail.commerceId, 10);
                mbcdiDebug('] Événement goToCommerce reçu pour commerce:', commerceId);

                // Trouver le commerce dans les données
                var commerce = null;
                if (data.destinations && data.destinations[0] && data.destinations[0].commerces) {
                    commerce = data.destinations[0].commerces.find(function(c) {
                        return c.id === commerceId;
                    });
                }

                if (!commerce) {
                    console.error('[MBCDI] Commerce non trouvé:', commerceId);
                    return;
                }

                mbcdiDebug(' v5.2.3] Commerce trouvé:', commerce.name);

                // Fermer le bottom sheet si ouvert
                if (bottomSheet) {
                    mbcdiDebug(' v5.2.3] Bottom sheet présent, classes:', bottomSheet.className);
                    if (bottomSheet.classList.contains('mbcdi-expanded')) {
                        bottomSheet.classList.remove('mbcdi-expanded');
                        state.isSheetExpanded = false;
                        mbcdiDebug(' v5.2.3] Bottom sheet fermé');
                    }
                } else {
                    mbcdiDebug(' v5.2.3] Aucun bottom sheet trouvé');
                }

                // Déplier la barre de recherche
                if (!app.classList.contains('expanded')) {
                    app.classList.add('expanded');
                    state.isExpanded = true;
                    mbcdiDebug('] Barre de recherche dépliée');
                }

                // Pré-remplir le champ destination (input déplié)
                if (selectDest) {
                    selectDest.value = commerce.name;
                    selectDest.setAttribute('data-commerce-id', commerce.id);
                    selectDest.setAttribute('data-lat', commerce.lat);
                    selectDest.setAttribute('data-lng', commerce.lng);
                    mbcdiDebug('] Champ destination rempli:', commerce.name);
                }

                // Synchroniser avec l'input principal
                if (selectDestMain) {
                    selectDestMain.value = commerce.name;
                    selectDestMain.setAttribute('data-commerce-id', commerce.id);
                    selectDestMain.setAttribute('data-lat', commerce.lat);
                    selectDestMain.setAttribute('data-lng', commerce.lng);
                }

                // Mettre le focus sur le champ point de départ
                setTimeout(function() {
                    if (selectStart) {
                        selectStart.focus();
                        mbcdiDebug('] Focus sur champ point de départ');
                    }
                }, 300); // Petit délai pour l'animation de déploiement
            });

            // === ÉCOUTE DE L'ÉVÉNEMENT "RESET ROUTE" (v5.5.0) ===
            window.addEventListener('mbcdi:resetRoute', function() {
                mbcdiDebug('[MBCDI v5.5.0] Événement resetRoute reçu');
                resetRoute();
            });

            // === MODALE DE LOCALISATION ET LISTE DES COMMERCES V4.9.81 ===
            
            var locationModal = app.querySelector('#mbcdi-location-modal');
            var btnLocationAllow = app.querySelector('.mbcdi-btn-location-allow');
            var btnLocationDeny = app.querySelector('.mbcdi-btn-location-deny');
            var commerceListView = app.querySelector('.mbcdi-commerce-list-view');
            var commerceDetailView = app.querySelector('.mbcdi-commerce-detail-view');
            var commerceListContainer = app.querySelector('.mbcdi-commerce-list');
            var btnBack = app.querySelector('.mbcdi-btn-back');
            var btnToggleSteps = app.querySelector('.mbcdi-btn-toggle-steps');
            var stepsContainerDetail = app.querySelector('.mbcdi-steps-container');

            // Afficher la modale de localisation au chargement (si elle existe)
            if (locationModal) {
                // Afficher la modale après un court délai
                setTimeout(function() {
                    locationModal.classList.remove('hidden');
                }, 500);
            }

            // Bouton "Autoriser" la localisation
            if (btnLocationAllow) {
                btnLocationAllow.addEventListener('click', function() {
                    geolocateUser();
                    if (locationModal) {
                        locationModal.classList.add('hidden');
                    }
                    renderCommerceList();
                });
            }

            // Bouton "Refuser" la localisation
            if (btnLocationDeny) {
                btnLocationDeny.addEventListener('click', function() {
                    if (locationModal) {
                        locationModal.classList.add('hidden');
                    }
                    renderCommerceList();
                });
            }

            // Fonction pour afficher la liste des commerces
            function renderCommerceList() {
                if (!commerceListContainer) return;
                if (!data.destinations || !data.destinations[0] || !data.destinations[0].commerces) return;
                // V5.2.0: Uniformisation affichage commerces (même rendu que mode démo)
                // Si le module de cartes v2 est présent, on délègue le rendu à ce module et on ne génère jamais l'ancien HTML.
                if (window.MBCDICommerceCards && typeof window.MBCDICommerceCards.init === 'function') {
                    var commercesV2 = (data.destinations[0].commerces || []).slice().sort(function(a, b) {
                        return (a.name || '').localeCompare(b.name || '');
                    });
                    window.MBCDICommerceCards.init(instanceId, commercesV2);
                    return;
                }


                var commerces = data.destinations[0].commerces;
                var html = '';

                // Trier les commerces
                if (state.userPosition && state.userPosition.lat && state.userPosition.lng) {
                    // Tri par distance si géolocalisation
                    commerces = commerces.slice().sort(function(a, b) {
                        var distA = haversine(state.userPosition.lat, state.userPosition.lng, a.lat, a.lng);
                        var distB = haversine(state.userPosition.lat, state.userPosition.lng, b.lat, b.lng);
                        return distA - distB;
                    });
                } else {
                    // Tri alphabétique sinon
                    commerces = commerces.slice().sort(function(a, b) {
                        return (a.name || '').localeCompare(b.name || '');
                    });
                }

                // Générer le HTML
                commerces.forEach(function(commerce) {
                    var distance = '';
                    if (state.userPosition && state.userPosition.lat && state.userPosition.lng) {
                        var dist = haversine(state.userPosition.lat, state.userPosition.lng, commerce.lat, commerce.lng);
                        distance = '<div class="mbcdi-commerce-item-distance">' + formatDistance(dist) + '</div>';
                    }

                    html += '<div class="mbcdi-commerce-item" data-commerce-id="' + commerce.id + '">';
                    html += '<div class="mbcdi-commerce-item-header">';
                    
                    if (commerce.logoUrl) {
                        html += '<img src="' + escapeHtml(commerce.logoUrl) + '" alt="Logo" class="mbcdi-commerce-item-logo" />';
                    }
                    
                    html += '<div class="mbcdi-commerce-item-info">';
                    html += '<h3 class="mbcdi-commerce-item-name">' + escapeHtml(commerce.name) + '</h3>';
                    html += '<p class="mbcdi-commerce-item-address">' + escapeHtml(commerce.address || '') + '</p>';
                    html += distance;
                    html += '</div>';
                    html += '</div>';
                    
                    html += '<div class="mbcdi-commerce-item-actions">';
                    html += '<button type="button" class="mbcdi-btn-see-commerce" data-commerce-id="' + commerce.id + '">Voir le commerce</button>';
                    html += '<button type="button" class="mbcdi-btn-go" data-commerce-id="' + commerce.id + '">Go</button>';
                    html += '</div>';
                    
                    // Détails (cachés par défaut)
                    html += '<div class="mbcdi-commerce-item-details" data-commerce-id="' + commerce.id + '">';
                    if (commerce.phone) {
                        html += '<div class="mbcdi-commerce-item-detail-row">';
                        html += '<span class="mbcdi-commerce-item-detail-icon">📞</span>';
                        html += '<span class="mbcdi-commerce-item-detail-text"><a href="tel:' + escapeHtml(commerce.phone) + '">' + escapeHtml(commerce.phone) + '</a></span>';
                        html += '</div>';
                    }
                    if (commerce.website) {
                        html += '<div class="mbcdi-commerce-item-detail-row">';
                        html += '<span class="mbcdi-commerce-item-detail-icon">🌐</span>';
                        html += '<span class="mbcdi-commerce-item-detail-text"><a href="' + escapeHtml(commerce.website) + '" target="_blank">' + escapeHtml(commerce.website) + '</a></span>';
                        html += '</div>';
                    }
                    if (commerce.hours) {
                        html += '<div class="mbcdi-commerce-item-detail-row">';
                        html += '<span class="mbcdi-commerce-item-detail-icon">🕐</span>';
                        html += '<span class="mbcdi-commerce-item-detail-text">' + escapeHtml(commerce.hours) + '</span>';
                        html += '</div>';
                    }
                    if (commerce.shortDesc) {
                        html += '<div class="mbcdi-commerce-item-detail-row">';
                        html += '<span class="mbcdi-commerce-item-detail-icon">📝</span>';
                        html += '<span class="mbcdi-commerce-item-detail-text">' + escapeHtml(commerce.shortDesc) + '</span>';
                        html += '</div>';
                    }
                    html += '</div>';
                    
                    html += '</div>';
                });

                commerceListContainer.innerHTML = html;

                // Attacher les événements
                attachCommerceListEvents();
            }

            // Attacher les événements aux boutons de la liste
            function attachCommerceListEvents() {
                // Boutons "Voir le commerce"
                var btnsSeeCom = app.querySelectorAll('.mbcdi-btn-see-commerce');
                btnsSeeCom.forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var commerceId = parseInt(this.getAttribute('data-commerce-id'), 10);
                        toggleCommerceDetails(commerceId);
                    });
                });

                // Boutons "Go"
                var btnsGo = app.querySelectorAll('.mbcdi-btn-go');
                btnsGo.forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var commerceId = parseInt(this.getAttribute('data-commerce-id'), 10);
                        
                        if (!commerceId) {
                            console.error('[MBCDI] Bouton GO sans commerce ID');
                            return;
                        }
                        
                        mbcdiDebug('] Clic sur bouton GO pour commerce', commerceId);
                        
                        // V5.0.3: Vérifier si on a un point de départ
                        var hasStartPoint = false;
                        if (selectStart && selectStart.value && selectStart.value !== '') {
                            hasStartPoint = true;
                            mbcdiDebug('] Point de départ disponible:', selectStart.value);
                        }
                        
                        if (hasStartPoint) {
                            // Cas 1: Point de départ défini → Replier le sheet + Afficher l'itinéraire
                            mbcdiDebug('] GO avec point de départ → affichage itinéraire');
                            
                            // V5.0.3: Replier le bottom sheet pour voir la carte
                            if (bottomSheet && bottomSheet.classList.contains('mbcdi-expanded')) {
                                bottomSheet.classList.remove('mbcdi-expanded');
                                state.isSheetExpanded = false;
                                mbcdiDebug('] Bottom sheet replié pour afficher la carte');
                            }
                            
                            // Afficher l'itinéraire
                            selectCommerce(commerceId);
                        } else {
                            // Cas 2: Pas de point de départ → Déplier + pré-remplir destination
                            mbcdiDebug('] GO sans point de départ → déploiement barre');
                            
                            // Déplier la barre de recherche
                            if (!app.classList.contains('expanded')) {
                                app.classList.add('expanded');
                                state.isExpanded = true;
                            }
                            
                            // Pré-remplir le champ destination
                            var commerce = data.destinations[0].commerces.find(function(c) {
                                return c.id === commerceId;
                            });
                            
                            if (commerce && selectDest) {
                                selectDest.value = commerce.name;
                                selectDest.setAttribute('data-commerce-id', commerce.id);
                                selectDest.setAttribute('data-lat', commerce.lat);
                                selectDest.setAttribute('data-lng', commerce.lng);
                                mbcdiDebug('] Destination pré-remplie:', commerce.name);
                            }
                            
                            // Focus sur le champ point de départ
                            if (selectStart) {
                                selectStart.focus();
                            }
                        }
                    });
                });
            }

            // Toggle des détails commerce dans la liste
            function toggleCommerceDetails(commerceId) {
                var details = app.querySelector('.mbcdi-commerce-item-details[data-commerce-id="' + commerceId + '"]');
                if (!details) return;

                var btn = app.querySelector('.mbcdi-btn-see-commerce[data-commerce-id="' + commerceId + '"]');
                
                if (details.classList.contains('visible')) {
                    details.classList.remove('visible');
                    if (btn) btn.textContent = 'Voir le commerce';
                } else {
                    details.classList.add('visible');
                    if (btn) btn.textContent = 'Masquer';
                }
            }

            // Afficher la fiche détaillée d'un commerce
            function showCommerceDetail(commerceId) {
                if (!data.destinations || !data.destinations[0] || !data.destinations[0].commerces) return;

                var commerce = data.destinations[0].commerces.find(function(c) {
                    return c.id === commerceId;
                });

                if (!commerce) return;

                // Remplir la fiche
                var nameEl = commerceDetailView.querySelector('.mbcdi-commerce-name');
                var addressEl = commerceDetailView.querySelector('.mbcdi-commerce-address');
                var logoEl = commerceDetailView.querySelector('.mbcdi-commerce-logo');
                var phoneEl = commerceDetailView.querySelector('.mbcdi-commerce-phone');
                var websiteEl = commerceDetailView.querySelector('.mbcdi-commerce-website');
                var hoursEl = commerceDetailView.querySelector('.mbcdi-commerce-hours');
                var descEl = commerceDetailView.querySelector('.mbcdi-commerce-description');

                if (nameEl) nameEl.textContent = commerce.name || '';
                if (addressEl) addressEl.textContent = commerce.address || '';
                
                if (logoEl) {
                    if (commerce.logoUrl) {
                        logoEl.innerHTML = '<img src="' + escapeHtml(commerce.logoUrl) + '" alt="Logo" />';
                    } else {
                        logoEl.innerHTML = '';
                    }
                }

                if (phoneEl) {
                    if (commerce.phone) {
                        phoneEl.innerHTML = '📞 <a href="tel:' + escapeHtml(commerce.phone) + '">' + escapeHtml(commerce.phone) + '</a>';
                    } else {
                        phoneEl.innerHTML = '';
                    }
                }

                if (websiteEl) {
                    if (commerce.website) {
                        websiteEl.innerHTML = '🌐 <a href="' + escapeHtml(commerce.website) + '" target="_blank">' + escapeHtml(commerce.website) + '</a>';
                    } else {
                        websiteEl.innerHTML = '';
                    }
                }

                if (hoursEl) {
                    if (commerce.hours) {
                        hoursEl.innerHTML = '🕐 ' + escapeHtml(commerce.hours);
                    } else {
                        hoursEl.innerHTML = '';
                    }
                }

                if (descEl) {
                    if (commerce.shortDesc) {
                        descEl.innerHTML = '📝 ' + escapeHtml(commerce.shortDesc);
                    } else {
                        descEl.innerHTML = '';
                    }
                }

                // Masquer la liste, afficher la fiche
                commerceListView.style.display = 'none';
                commerceDetailView.style.display = 'block';

                // Déclencher le calcul de l'itinéraire (utilise le système existant)
                state.selectedCommerceId = commerceId;
                
                // Préparer la position de départ
                var startLat, startLng;
                if (state.userPosition && state.userPosition.lat && state.userPosition.lng) {
                    startLat = state.userPosition.lat;
                    startLng = state.userPosition.lng;
                } else if (selectStart && selectStart.value && selectStart.value !== 'geoloc') {
                    var coords = selectStart.value.split(',');
                    startLat = parseFloat(coords[0]);
                    startLng = parseFloat(coords[1]);
                }

                if (startLat && startLng) {
                    state.startPosition = { lat: startLat, lng: startLng };
                    state.selectedCommerce = commerce;

                    var zone = null;
                    if (data.deliveryZones && data.deliveryZones.length && commerce.deliveryZoneId) {
                        zone = data.deliveryZones.find(function(z) { return z.id === commerce.deliveryZoneId; });
                    }
                    state.selectedZone = zone;

                    if (zone && zone.lat && zone.lng) {
                        state.destPosition = { lat: zone.lat, lng: zone.lng };
                    } else {
                        state.destPosition = { lat: commerce.lat, lng: commerce.lng };
                    }

                    state.selectedDestinationId = data.destinations[0].id;

                    if (state.routeLayer) {
                        state.map.removeLayer(state.routeLayer);
                        state.routeLayer = null;
                    }

                    // Calculer l'itinéraire (fonction existante)
                    calculateRoute();
                }
            }

            // Bouton retour
            if (btnBack) {
                btnBack.addEventListener('click', function() {
                    commerceDetailView.style.display = 'none';
                    commerceListView.style.display = 'block';
                    
                    // Masquer les étapes si elles étaient affichées
                    if (stepsContainerDetail) {
                        stepsContainerDetail.style.display = 'none';
                    }
                    if (btnToggleSteps) {
                        btnToggleSteps.textContent = 'Détails des étapes';
                    }
                });
            }

            // Bouton toggle des étapes
            if (btnToggleSteps) {
                btnToggleSteps.addEventListener('click', function() {
                    if (!stepsContainerDetail) return;
                    
                    if (stepsContainerDetail.style.display === 'none' || !stepsContainerDetail.style.display) {
                        stepsContainerDetail.style.display = 'block';
                        btnToggleSteps.textContent = 'Masquer les étapes';
                    } else {
                        stepsContainerDetail.style.display = 'none';
                        btnToggleSteps.textContent = 'Détails des étapes';
                    }
                });
            }

            // Initialiser la liste au chargement (si pas de modale de localisation)
            if (!locationModal) {
                renderCommerceList();
            }

            // === EVENTS ===

            if (btnExpand) {
                btnExpand.addEventListener('click', function() {
                    app.classList.add('expanded');
                    state.isExpanded = true;
                });
            }

            if (btnCollapse) {
                btnCollapse.addEventListener('click', function() {
                    app.classList.remove('expanded');
                    state.isExpanded = false;
                });
            }
            function revealStartOptions() {
                if (!selectStart) return;
                var options = selectStart.querySelectorAll('option');
                options.forEach(function(opt) {
                    opt.style.display = '';
                });
            }

            if (selectStart) {
                selectStart.addEventListener('focus', revealStartOptions);
                selectStart.addEventListener('mousedown', revealStartOptions);
            }
            // Note: La synchronisation entre les inputs est maintenant gérée par l'autocomplétion

            function revealStartOptions() {
                if (!selectStart) return;
                var options = selectStart.querySelectorAll('option');
                options.forEach(function(opt) {
                    opt.style.display = '';
                });
            }

            if (selectStart) {
                selectStart.addEventListener('focus', revealStartOptions);
                selectStart.addEventListener('mousedown', revealStartOptions);
            }

            if (btnSearch) {
                btnSearch.addEventListener('click', searchRoute);
            }

            if (btnLocate) {
                btnLocate.addEventListener('click', function() {
                    if (selectStart) selectStart.value = 'geoloc';
                    geolocateUser();
                });
            }

            if (btnMode) {
                btnMode.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (transportChangeUrl) {
                        var target = transportChangeUrl;
                        var sep = target.indexOf('?') !== -1 ? '&' : '?';
                        target = target + sep + 'return_url=' + encodeURIComponent(window.location.href) + '&mbcdi_profile=' + encodeURIComponent(state.currentMode);
                        window.location.href = target;
                    }
                });
            }

            if (sheetHandle) {
                sheetHandle.addEventListener('click', function() {
                    state.isSheetExpanded = !state.isSheetExpanded;
                    if (state.isSheetExpanded) {
                        bottomSheet.classList.add('mbcdi-expanded');
                    } else {
                        bottomSheet.classList.remove('mbcdi-expanded');
                    }
                });
            }

            // === FONCTIONS ===

            function showBottomSheet() {
                if (bottomSheet) {
                    bottomSheet.classList.add('mbcdi-visible');
                    setTimeout(function() {
                        bottomSheet.classList.add('mbcdi-expanded');
                        state.isSheetExpanded = true;
                    }, 100);
                }
            }

            function hideBottomSheet() {
                if (bottomSheet) {
                    bottomSheet.classList.remove('mbcdi-visible', 'mbcdi-expanded');
                    state.isSheetExpanded = false;
                }
            }

            function getPictoSize() {
                if (!state.map) return [40, 40];
                var zoom = state.map.getZoom();
                var size = Math.round(16 + (zoom - 10) * 5);
                size = Math.max(24, Math.min(64, size));
                return [size, size];
            }

            function updatePictoSizes() {
                var size = getPictoSize();
                state.pictoMarkers.forEach(function(m) {
                    if (m.pictoData && m.pictoData.iconUrl) {
                        var newIcon = L.icon({
                            iconUrl: m.pictoData.iconUrl,
                            iconSize: size,
                            iconAnchor: [size[0] / 2, size[1] / 2],
                            popupAnchor: [0, -size[1] / 2]
                        });
                        m.setIcon(newIcon);
                    }
                });
            }

            function createCommerceIcon(logoUrl) {
                var size = 44;
                var html = '<div class="mbcdi-commerce-marker">';
                if (logoUrl) {
                    html += '<div class="mbcdi-commerce-marker-img" style="background-image:url(' + logoUrl + ');"></div>';
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

            // =========================
            // V4.9 - Clustering commerces
            // =========================
            function initializeCommerceClustering() {
                if (!window.L || !L.markerClusterGroup) {
                    console.error('Leaflet.markercluster non chargé');
                    state.commerceClusterGroup = null;
                    return;
                }

                state.commerceClusterGroup = L.markerClusterGroup({
                    maxClusterRadius: 80,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true,
                    animate: false, // CORRIGÉ: désactiver l'animation pour éviter le mouvement
                    animateAddingMarkers: false,
                    disableClusteringAtZoom: 18,
                    // Ne pas override la fonction iconCreateFunction, utiliser les styles CSS par défaut
                });
            }

            function renderCommercesWithClustering(commerces) {
                if (!state.commerceClusterGroup) {
                    initializeCommerceClustering();
                }
                if (!state.commerceClusterGroup) return;

                try { state.commerceClusterGroup.clearLayers(); } catch (e) {}

                commerces.forEach(function(c) {
                    if (c.lat && c.lng) {
                        var icon = createCommerceIcon(c.logoUrl);
                        var marker = L.marker([c.lat, c.lng], { icon: icon });
                        marker.commerceData = c;
                        // V5.0.4: Désactivation du clic sur les markers commerces
                        // marker.on('click', function() {
                        //     selectCommerce(c.id);
                        // });
                        state.commerceClusterGroup.addLayer(marker);
                    }
                });

                if (state.map && !state.map.hasLayer(state.commerceClusterGroup)) {
                    state.map.addLayer(state.commerceClusterGroup);
                }
            }

            // =========================
            // V4.9 - Fiche commerce rétractable
            // =========================
            function showCommerceCard(commerce, expanded) {
                mbcdiDebug(' showCommerceCard] Début fonction');
                mbcdiDebug(' showCommerceCard] bottomSheet:', bottomSheet);
                mbcdiDebug(' showCommerceCard] sheetBody:', sheetBody);
                mbcdiDebug(' showCommerceCard] commerce:', commerce);
                
                if (!bottomSheet || !sheetBody) {
                    console.error('[MBCDI ERROR] bottomSheet ou sheetBody non trouvé !');
                    mbcdiDebug('] Recherche dans DOM...');
                    var foundSheet = document.querySelector('.mbcdi-bottomsheet');
                    var foundBody = document.querySelector('.mbcdi-bottomsheet-body');
                    mbcdiDebug('] Trouvé bottomsheet:', foundSheet);
                    mbcdiDebug('] Trouvé body:', foundBody);
                    return;
                }

                state.isCommerceCardExpanded = !!expanded;

                mbcdiDebug(' showCommerceCard] Construction HTML...');
                var html = buildCommerceCardHTML(commerce);
                mbcdiDebug(' showCommerceCard] HTML généré, longueur:', html.length);
                
                sheetBody.innerHTML = html;
                mbcdiDebug(' showCommerceCard] HTML injecté');

                bottomSheet.classList.add('mbcdi-visible');
                mbcdiDebug(' showCommerceCard] Classe mbcdi-visible ajoutée');
                
                if (expanded) {
                    bottomSheet.classList.add('mbcdi-expanded');
                    state.isSheetExpanded = true;
                } else {
                    bottomSheet.classList.remove('mbcdi-expanded');
                    state.isSheetExpanded = false;
                }

                mbcdiDebug(' showCommerceCard] Attachement événements...');
                attachCommerceCardToggleEvent();
                attachCommerceBackEvent();

                // État de chargement itinéraire
                var loadingEl = sheetBody.querySelector('.mbcdi-route-loading');
                var contentEl = sheetBody.querySelector('.mbcdi-route-content');
                if (loadingEl) loadingEl.style.display = 'block';
                if (contentEl) contentEl.style.display = 'none';
                
                mbcdiDebug(' showCommerceCard] Fonction terminée');
            }

            function buildCommerceCardHTML(commerce) {
                var logoHTML = '';
                if (commerce.logoUrl) {
                    logoHTML = '<img src="' + escapeHtml(commerce.logoUrl) + '" alt="' + escapeHtml(commerce.name) + '">';
                } else {
                    logoHTML = '<span class="mbcdi-commerce-emoji">🛒</span>';
                }

                var addressShort = commerce.address || '';
                if (addressShort.length > 40) {
                    addressShort = addressShort.substring(0, 40) + '...';
                }

                var html = '';
                html += '<div class="mbcdi-commerce-card" data-commerce-id="' + escapeHtml(String(commerce.id)) + '">';
                html +=   '<div class="mbcdi-commerce-card-header" id="mbcdi-commerce-header">';
                html +=     '<div class="mbcdi-commerce-preview">';
                html +=       '<div class="mbcdi-commerce-logo-small">' + logoHTML + '</div>';
                html +=       '<div class="mbcdi-commerce-preview-info">';
                html +=         '<h3 class="mbcdi-commerce-name-compact">' + escapeHtml(commerce.name || '') + '</h3>';
                html +=         '<p class="mbcdi-commerce-address-compact">' + escapeHtml(addressShort) + '</p>';
                html +=       '</div>';
                html +=     '</div>';
                html +=     '<button type="button" class="mbcdi-commerce-toggle" aria-label="Voir plus d\'informations">';
                html +=       '<span class="mbcdi-toggle-icon">▼</span>';
                html +=     '</button>';
                html +=   '</div>';

                html +=   '<div class="mbcdi-commerce-card-body" id="mbcdi-commerce-body">';
                html +=     '<div class="mbcdi-commerce-details">';

                if (commerce.address) {
                    html += '<div class="mbcdi-info-row"><span class="mbcdi-icon">📍</span><span>' + escapeHtml(commerce.address) + '</span></div>';
                }
                if (commerce.phone) {
                    html += '<div class="mbcdi-info-row"><span class="mbcdi-icon">📞</span><a href="tel:' + escapeHtml(commerce.phone) + '" class="mbcdi-phone-link">' + escapeHtml(commerce.phone) + '</a></div>';
                }
                if (commerce.website) {
                    html += '<div class="mbcdi-info-row"><span class="mbcdi-icon">🌐</span><a href="' + escapeHtml(commerce.website) + '" target="_blank" rel="noopener" class="mbcdi-website-link">Voir le site web →</a></div>';
                }
                if (commerce.hours) {
                    html += '<div class="mbcdi-info-row"><span class="mbcdi-icon">🕐</span><span>' + escapeHtml(commerce.hours) + '</span></div>';
                }
                if (commerce.description) {
                    html += '<div class="mbcdi-commerce-description">' + escapeHtml(commerce.description) + '</div>';
                }

                html +=     '</div>';
                html +=     '<div class="mbcdi-divider"></div>';

                html +=     '<div class="mbcdi-route-section">';
                html +=       '<h4 class="mbcdi-route-section-title">🗺️ Itinéraire</h4>';
                html +=       '<div class="mbcdi-route-loading">Calcul en cours...</div>';
                html +=       '<div class="mbcdi-route-content" style="display:none;"></div>';
                html +=       '<button type="button" class="mbcdi-btn-back mbcdi-btn-back-to-list">← Retour à la carte</button>';
                html +=     '</div>';

                html +=   '</div>';
                html += '</div>';

                return html;
            }

            function attachCommerceCardToggleEvent() {
                var header = document.getElementById('mbcdi-commerce-header');
                var body = document.getElementById('mbcdi-commerce-body');
                var toggleBtn = header ? header.querySelector('.mbcdi-commerce-toggle') : null;
                var toggleIcon = toggleBtn ? toggleBtn.querySelector('.mbcdi-toggle-icon') : null;

                if (!header || !toggleBtn || !body || !toggleIcon) return;

                var toggleCard = function(e) {
                    if (e && e.target && e.target.closest && e.target.closest('a')) return;

                    state.isCommerceCardExpanded = !state.isCommerceCardExpanded;

                    if (state.isCommerceCardExpanded) {
                        body.classList.add('mbcdi-expanded');
                        toggleIcon.textContent = '▲';
                        bottomSheet.classList.add('mbcdi-expanded');
                        state.isSheetExpanded = true;
                    } else {
                        body.classList.remove('mbcdi-expanded');
                        toggleIcon.textContent = '▼';
                        bottomSheet.classList.remove('mbcdi-expanded');
                        state.isSheetExpanded = false;
                    }
                };

                header.addEventListener('click', toggleCard);
            }

            function attachCommerceBackEvent() {
                if (!sheetBody) return;
                var btn = sheetBody.querySelector('.mbcdi-btn-back-to-list');
                if (!btn) return;
                btn.addEventListener('click', function() {
                    resetCommerceSelection();
                });
            }

            function resetCommerceSelection() {
                // Utiliser la nouvelle fonction resetRoute qui fait tout
                resetRoute();
            }

            function renderStepsHTML(route) {
                var html = '';

                if (route.delivery_type === 'zone') {
                    html += '<div class="mbcdi-delivery-zone-info">';
                    html += '<div class="mbcdi-delivery-zone-header">📍 Livraison vers zone</div>';
                    html += '<div class="mbcdi-delivery-zone-details">';
                    html += '<strong>Zone:</strong> ' + escapeHtml(route.zone_name || 'Zone de livraison') + '<br/>';
                    html += '<strong>Commerce:</strong> ' + escapeHtml(route.commerce_name || '') + '<br/>';
                    if (route.walking_distance && route.walking_distance > 0) {
                        html += '<strong>À pied depuis la zone:</strong> ' + route.walking_distance + ' m 🚶';
                    }
                    html += '</div></div>';
                }

                if (route.source === 'manual') {
                    html += '<div class="mbcdi-route-source">📍 Itinéraire personnalisé</div>';
                }

                if (route.steps && route.steps.length) {
                    html += '<div class="mbcdi-steps-list">';
                    for (var idx = 0; idx < route.steps.length; idx++) {
                        var step = route.steps[idx];
                        html += '<div class="mbcdi-step-item">';
                        html += '<div class="mbcdi-step-num">' + (idx + 1) + '</div>';
                        html += '<div class="mbcdi-step-content">';
                        html += '<div class="mbcdi-step-text">' + escapeHtml(mbcdiGetStepText(step)) + '</div>';
                        if (step.distance && step.distance > 0) {
                            html += '<div class="mbcdi-step-dist">' + formatDistance(step.distance) + '</div>';
                        }
                        html += '</div></div>';
                    }
                    if (route.walking_distance && route.walking_distance > 0) {
                        html += '<div class="mbcdi-step-item">';
                        html += '<div class="mbcdi-step-num">' + (route.steps.length + 1) + '</div>';
                        html += '<div class="mbcdi-step-content">';
                        html += '<div class="mbcdi-step-text">' + escapeHtml(mbcdiT('finalWalk')) + '</div>';
                        html += '<div class="mbcdi-step-dist">' + route.walking_distance + ' m</div>';
                        html += '</div></div>';
                    }
                    html += '</div>';
                } else {
                    html += '<div class="mbcdi-step-item"><div class="mbcdi-step-content"><div class="mbcdi-step-text">' + escapeHtml(mbcdiT('followRoute')) + '</div></div></div>';
                }

                return html;
            }

            function displayRouteInCard(route) {
                if (!sheetBody) return;

                var loadingEl = sheetBody.querySelector('.mbcdi-route-loading');
                var contentEl = sheetBody.querySelector('.mbcdi-route-content');

                if (!contentEl) return;

                if (loadingEl) loadingEl.style.display = 'none';

                // V5.0.5: Pas d'affichage de distance/durée, pas d'étapes
                // L'itinéraire est visible sur la carte uniquement
                var html = '<div class="mbcdi-route-info">Itinéraire affiché sur la carte</div>';

                contentEl.innerHTML = html;
                contentEl.style.display = 'block';
            }

            function clearMapLayers() {
                [state.markers, state.commerceMarkers, state.pictoMarkers, state.startPointMarkers, state.deliveryZoneMarkers].forEach(function(arr) {
                    if (!arr) return;
                    arr.forEach(function(m) { try { state.map.removeLayer(m); } catch (e) {} });
                    arr.length = 0;
                });
                if (state.zoneLayer) { try { state.map.removeLayer(state.zoneLayer); } catch (e) {} state.zoneLayer = null; }
                if (state.deliveryZonePolygons) {
                    state.deliveryZonePolygons.forEach(function(p) { try { state.map.removeLayer(p); } catch (e) {} });
                    state.deliveryZonePolygons.length = 0;
                }
                if (state.walkingLineLayer) { try { state.map.removeLayer(state.walkingLineLayer); } catch (e) {} state.walkingLineLayer = null; }

                if (state.commerceClusterGroup) {
                    try { state.map.removeLayer(state.commerceClusterGroup); } catch (e) {}
                    try { state.commerceClusterGroup.clearLayers(); } catch (e) {}
                }
            }

            function createSquareIcon(url, defaultEmoji) {
                var html = '';
                if (url) {
                    html = '<div class="mbcdi-square-marker"><img src="' + url + '" alt="" /></div>';
                } else if (defaultEmoji) {
                    html = '<div class="mbcdi-square-marker mbcdi-square-marker-emoji">' + defaultEmoji + '</div>';
                } else {
                    html = '<div class="mbcdi-square-marker mbcdi-square-marker-default">📍</div>';
                }
                return L.divIcon({ html: html, className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });
            }

            function renderStartPointsOnMap() {
                if (!data.startPoints || !data.startPoints.length) return;
                data.startPoints.forEach(function(sp) {
                    if (typeof sp.lat === 'undefined' || typeof sp.lng === 'undefined') return;
                    var icon = createSquareIcon(sp.iconUrl, '🚪');
                    var m = L.marker([sp.lat, sp.lng], { icon: icon }).addTo(state.map);
                    if (sp.label) m.bindPopup('<strong>' + escapeHtml(sp.label) + '</strong>');
                    // Stocker l'ID du point de départ dans le marqueur
                    m.mbcdiStartPointId = sp.id;
                    state.startPointMarkers.push(m);
                });
            }

            function renderDeliveryZonesOnMap() {
                if (!data.deliveryZones || !data.deliveryZones.length) return;
                data.deliveryZones.forEach(function(z) {
                    var color = z.color || '#4CAF50';
                    if (z.geometry && z.geometry.length >= 3) {
                        var latlngs = z.geometry.map(function(p) { return [p.lat, p.lng]; });
                        var poly = L.polygon(latlngs, { color: color, fillColor: color, fillOpacity: 0.18, weight: 2 }).addTo(state.map);
                        // Stocker l'ID de la zone sur le polygone
                        poly.mbcdiDeliveryZoneId = z.id;
                        state.deliveryZonePolygons.push(poly);
                    }
                    if (z.lat && z.lng) {
                        var icon = createSquareIcon(z.iconUrl, '🅿️');
                        var mz = L.marker([z.lat, z.lng], { icon: icon }).addTo(state.map);
                        mz.bindPopup('<strong>' + escapeHtml(z.name || 'Zone de livraison') + '</strong>');
                        // Stocker l'ID de la zone sur le marqueur
                        mz.mbcdiDeliveryZoneId = z.id;
                        state.deliveryZoneMarkers.push(mz);
                    }
                });
            }

            function renderDestinationOnMap(dest) {
                clearMapLayers();
                renderChantierZone(dest); // V5.0.2: Affichage zone de chantier
                renderDeliveryZonesOnMap();
                renderStartPointsOnMap();

                // V4.9: Clustering des commerces
                if (dest.commerces && dest.commerces.length) {
                    renderCommercesWithClustering(dest.commerces);
                }
            }
            
            // V5.0.2: Afficher la zone de chantier (polygone)
            function renderChantierZone(dest) {
                if (state.zoneLayer) {
                    try { state.map.removeLayer(state.zoneLayer); } catch (e) {}
                    state.zoneLayer = null;
                }
                
                if (!dest.zone || !dest.zone.points || dest.zone.points.length < 3) {
                    mbcdiDebug('] Pas de zone de chantier à afficher');
                    return;
                }
                
                var coords = dest.zone.points.map(function(p) {
                    return [p.lat, p.lng];
                });
                
                state.zoneLayer = L.polygon(coords, {
                    color: dest.zone.color || '#FF6B6B',
                    fillColor: dest.zone.color || '#FF6B6B',
                    fillOpacity: dest.zone.opacity || 0.3,
                    weight: 2
                }).addTo(state.map);
                
                mbcdiDebug('] Zone de chantier affichée avec', coords.length, 'points');
            }

            function selectCommerce(commerceId) {
                var dest = data.destinations[0];
                if (!dest || !dest.commerces) return;

                var commerce = dest.commerces.find(function(c) { return c.id === commerceId; });
                if (!commerce) return;

                state.selectedCommerceId = commerceId;
                state.selectedDestinationId = dest.id;

                mbcdiDebug('] Commerce sélectionné:', commerce);
                mbcdiDebug('] deliveryZoneId:', commerce.deliveryZoneId);

                // V4.9.2: Permettre l'affichage même sans zone (warning au lieu de bloquer)
                if (!commerce.deliveryZoneId) {
                    console.warn('[MBCDI] Commerce sans zone de livraison, affichage limité');
                    // Ne pas return, continuer quand même
                }

                var startLat = selectStart && selectStart.value ?
                    parseFloat(selectStart.value.split(',')[0]) :
                    (state.userPosition ? state.userPosition.lat : null);
                var startLng = selectStart && selectStart.value ?
                    parseFloat(selectStart.value.split(',')[1]) :
                    (state.userPosition ? state.userPosition.lng : null);

                mbcdiDebug('] Point de départ:', { startLat, startLng });

                // V4.9.2: Afficher la fiche MÊME sans point de départ
                if (!startLat || !startLng) {
                    console.warn('[MBCDI] Pas de point de départ, affichage fiche seule');
                    // Afficher quand même la fiche (sans itinéraire)
                    state.selectedCommerce = commerce;
                    showCommerceCard(commerce, false);
                    return; // Ne pas calculer l'itinéraire
                }

                state.startPosition = { lat: startLat, lng: startLng };
                state.selectedCommerce = commerce;

                var zone = null;
                if (data.deliveryZones && data.deliveryZones.length) {
                    zone = data.deliveryZones.find(function(z) { return z.id === commerce.deliveryZoneId; });
                }
                state.selectedZone = zone;

                if (zone && zone.lat && zone.lng) {
                    state.destPosition = { lat: zone.lat, lng: zone.lng };
                } else {
                    state.destPosition = { lat: commerce.lat, lng: commerce.lng };
                }

                if (state.routeLayer) {
                    try { state.map.removeLayer(state.routeLayer); } catch (e) {}
                    state.routeLayer = null;
                }

                mbcdiDebug('] Appel showCommerceCard');
                showCommerceCard(commerce, false);

                mbcdiDebug('] Appel calculateRoute');
                calculateRoute();
            }

            // === GESTION DES ERREURS INLINE V5.2.4 ===
            
            /**
             * Affiche une erreur sous un champ avec contour rouge
             */
            function showFieldError(fieldElement, message) {
                if (!fieldElement) return;
                
                // Retirer les anciennes erreurs
                clearFieldError(fieldElement);
                
                // Ajouter classe d'erreur au champ
                fieldElement.classList.add('mbcdi-field-error');
                
                // Créer le message d'erreur
                var errorDiv = document.createElement('div');
                errorDiv.className = 'mbcdi-error-message';
                errorDiv.textContent = message;
                errorDiv.setAttribute('data-error-for', fieldElement.className);
                
                // Insérer après le champ (ou après son wrapper)
                var wrapper = fieldElement.closest('.mbcdi-field-group') || 
                             fieldElement.closest('.mbcdi-autocomplete-wrapper') ||
                             fieldElement.parentElement;
                
                if (wrapper) {
                    wrapper.appendChild(errorDiv);
                } else {
                    fieldElement.parentElement.insertBefore(errorDiv, fieldElement.nextSibling);
                }
                
                // Scroll vers le champ avec erreur
                setTimeout(function() {
                    fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    fieldElement.focus();
                }, 100);
                
                mbcdiDebug(' v5.2.4] Erreur affichée:', message);
            }
            
            /**
             * Retire l'erreur d'un champ
             */
            function clearFieldError(fieldElement) {
                if (!fieldElement) return;
                
                fieldElement.classList.remove('mbcdi-field-error');
                
                // Retirer les messages d'erreur associés
                var wrapper = fieldElement.closest('.mbcdi-field-group') || 
                             fieldElement.closest('.mbcdi-autocomplete-wrapper') ||
                             fieldElement.parentElement;
                
                if (wrapper) {
                    var errorMessages = wrapper.querySelectorAll('.mbcdi-error-message');
                    errorMessages.forEach(function(msg) {
                        msg.remove();
                    });
                }
            }
            
            /**
             * Retire toutes les erreurs du formulaire
             */
            function clearAllErrors() {
                var allErrors = app.querySelectorAll('.mbcdi-error-message');
                allErrors.forEach(function(err) { err.remove(); });
                
                var allErrorFields = app.querySelectorAll('.mbcdi-field-error');
                allErrorFields.forEach(function(field) {
                    field.classList.remove('mbcdi-field-error');
                });
            }
            
            // Retirer les erreurs quand l'utilisateur modifie un champ
            if (selectStart) {
                selectStart.addEventListener('change', function() {
                    clearFieldError(selectStart);
                });
            }
            
            if (selectDest) {
                selectDest.addEventListener('input', function() {
                    clearFieldError(selectDest);
                });
            }

            function searchRoute() {
                mbcdiDebug(' v5.2.4] searchRoute() appelé');
                
                // Nettoyer toutes les erreurs précédentes
                clearAllErrors();
                
                // Récupérer l'ID du commerce depuis l'attribut data
                var destId = selectDest ? selectDest.getAttribute('data-commerce-id') : null;
                var startVal = selectStart ? selectStart.value : null;

                // Validation destination
                if (!destId) {
                    mbcdiDebug(' v5.2.4] Erreur: Aucune destination sélectionnée');
                    showFieldError(selectDest, 'Veuillez sélectionner une destination');
                    return;
                }

                // Validation point de départ
                if (!startVal && !state.userPosition) {
                    mbcdiDebug(' v5.2.4] Erreur: Aucun point de départ');
                    showFieldError(selectStart, 'Veuillez sélectionner un point de départ');
                    return;
                }

                // Fermer la barre de recherche dépliée
                if (app.classList.contains('expanded')) {
                    app.classList.remove('expanded');
                    state.isExpanded = false;
                }

                // Fermer le bottom sheet s'il est ouvert
                hideBottomSheet();

                state.selectedCommerceId = parseInt(destId, 10);

                var commerce = null;
                if (data.destinations[0] && data.destinations[0].commerces) {
                    commerce = data.destinations[0].commerces.find(function(c) { return c.id === state.selectedCommerceId; });
                }

                if (!commerce) {
                    console.error('[MBCDI v5.2.4] Commerce introuvable ID:', state.selectedCommerceId);
                    showFieldError(selectDest, 'Commerce introuvable');
                    return;
                }

                if (!commerce.deliveryZoneId) {
                    console.error('[MBCDI v5.2.4] Aucune zone de livraison pour:', commerce.name);
                    showFieldError(selectDest, 'Ce commerce n\'a pas d\'itinéraire configuré');
                    return;
                }
                   showCommerceCard(commerce, false);

                showCommerceCard(commerce, false);

                var startLat = startVal === 'geoloc'
                    ? (state.userPosition ? state.userPosition.lat : null)
                    : (startVal ? parseFloat(startVal.split(',')[0]) : (state.userPosition ? state.userPosition.lat : null));

                var startLng = startVal === 'geoloc'
                    ? (state.userPosition ? state.userPosition.lng : null)
                    : (startVal ? parseFloat(startVal.split(',')[1]) : (state.userPosition ? state.userPosition.lng : null));

                if (!startLat || !startLng) {
                    console.error('[MBCDI v5.2.4] Position de départ invalide');
                    showFieldError(selectStart, 'Position de départ invalide');
                    return;
                }

                state.startPosition = { lat: startLat, lng: startLng };
                state.selectedCommerce = commerce;

                var zone = null;
                if (data.deliveryZones && data.deliveryZones.length) {
                    zone = data.deliveryZones.find(function(z) { return z.id === commerce.deliveryZoneId; });
                }
                state.selectedZone = zone;

                if (zone && zone.lat && zone.lng) {
                    state.destPosition = { lat: zone.lat, lng: zone.lng };
                } else {
                    state.destPosition = { lat: commerce.lat, lng: commerce.lng };
                }

                state.selectedDestinationId = data.destinations[0].id;

                if (state.routeLayer) {
                    state.map.removeLayer(state.routeLayer);
                    state.routeLayer = null;
                }

                // Préparer le bottom sheet (mais ne pas l'afficher encore)
                if (sheetBody) sheetBody.classList.add('mbcdi-loading');
                if (stepsContainer) stepsContainer.innerHTML = '';

                calculateRoute();
            }

            /**
             * Masque les points de départ et zones de livraison non utilisés pendant l'affichage d'un itinéraire
             * @param {number|string} activeStartPointId - ID du point de départ utilisé
             * @param {number|string} activeDeliveryZoneId - ID de la zone de livraison utilisée
             */
            function hideUnusedRoutePoints(activeStartPointId, activeDeliveryZoneId) {
                // Masquer tous les points de départ sauf celui utilisé
                if (state.startPointMarkers && state.startPointMarkers.length) {
                    state.startPointMarkers.forEach(function(marker) {
                        var markerId = marker.mbcdiStartPointId;
                        if (markerId && markerId.toString() === activeStartPointId.toString()) {
                            // Point de départ utilisé : afficher avec effet pulse
                            marker.setOpacity(1);
                            // Utiliser setTimeout pour s'assurer que l'élément est dans le DOM
                            setTimeout(function() {
                                var iconElement = marker.getElement();
                                if (iconElement) {
                                    var markerDiv = iconElement.querySelector('.mbcdi-square-marker');
                                    if (markerDiv) {
                                        markerDiv.classList.add('mbcdi-pulse-marker');
                                    }
                                }
                            }, 100);
                        } else {
                            // Point de départ non utilisé : masquer
                            marker.setOpacity(0);
                        }
                    });
                }

                // Masquer toutes les zones de livraison sauf celle utilisée
                if (state.deliveryZoneMarkers && state.deliveryZoneMarkers.length) {
                    state.deliveryZoneMarkers.forEach(function(marker) {
                        var zoneId = marker.mbcdiDeliveryZoneId;
                        if (zoneId && zoneId.toString() === activeDeliveryZoneId.toString()) {
                            // Zone utilisée : afficher
                            marker.setOpacity(1);
                        } else {
                            // Zone non utilisée : masquer
                            marker.setOpacity(0);
                        }
                    });
                }

                // Masquer tous les polygones de zones sauf celui utilisé
                if (state.deliveryZonePolygons && state.deliveryZonePolygons.length) {
                    state.deliveryZonePolygons.forEach(function(polygon) {
                        var zoneId = polygon.mbcdiDeliveryZoneId;
                        if (zoneId && zoneId.toString() === activeDeliveryZoneId.toString()) {
                            // Zone utilisée : afficher
                            polygon.setStyle({ opacity: 1, fillOpacity: 0.18 });
                        } else {
                            // Zone non utilisée : masquer
                            polygon.setStyle({ opacity: 0, fillOpacity: 0 });
                        }
                    });
                }

                // Masquer tous les commerces sauf celui sélectionné
                if (state.commerceClusterGroup && state.selectedCommerceId) {
                    state.commerceClusterGroup.eachLayer(function(layer) {
                        if (layer.commerceData && layer.commerceData.id) {
                            if (layer.commerceData.id === state.selectedCommerceId) {
                                // Commerce sélectionné : afficher
                                layer.setOpacity(1);
                            } else {
                                // Commerce non sélectionné : masquer
                                layer.setOpacity(0);
                            }
                        }
                    });
                }

                mbcdiDebug('[MBCDI] Points masqués - Point actif:', activeStartPointId, 'Zone active:', activeDeliveryZoneId, 'Commerce:', state.selectedCommerceId);
            }

            /**
             * Réaffiche tous les points de départ et zones de livraison (retire le masquage)
             */
            function showAllRoutePoints() {
                // Réafficher tous les points de départ et retirer le pulse
                if (state.startPointMarkers && state.startPointMarkers.length) {
                    state.startPointMarkers.forEach(function(marker) {
                        marker.setOpacity(1);
                        var iconElement = marker.getElement();
                        if (iconElement) {
                            var markerDiv = iconElement.querySelector('.mbcdi-square-marker');
                            if (markerDiv) {
                                markerDiv.classList.remove('mbcdi-pulse-marker');
                            }
                        }
                    });
                }

                // Réafficher tous les marqueurs de zones
                if (state.deliveryZoneMarkers && state.deliveryZoneMarkers.length) {
                    state.deliveryZoneMarkers.forEach(function(marker) {
                        marker.setOpacity(1);
                    });
                }

                // Réafficher tous les polygones de zones
                if (state.deliveryZonePolygons && state.deliveryZonePolygons.length) {
                    state.deliveryZonePolygons.forEach(function(polygon) {
                        polygon.setStyle({ opacity: 1, fillOpacity: 0.18 });
                    });
                }

                // Réafficher tous les commerces
                if (state.commerceClusterGroup) {
                    state.commerceClusterGroup.eachLayer(function(layer) {
                        layer.setOpacity(1);
                    });
                }

                mbcdiDebug('[MBCDI] Tous les points et commerces réaffichés');
            }

            /**
             * Réinitialise l'itinéraire et revient à l'écran de base
             */
            function resetRoute() {
                mbcdiDebug('[MBCDI] Réinitialisation de l\'itinéraire');

                // Effacer les tracés de la carte
                if (state.routeLayer) {
                    try { state.map.removeLayer(state.routeLayer); } catch (e) {}
                    state.routeLayer = null;
                }

                if (state.walkingLineLayer) {
                    try { state.map.removeLayer(state.walkingLineLayer); } catch (e) {}
                    state.walkingLineLayer = null;
                }

                // Réinitialiser la rotation de la carte (v5.5.0)
                if (typeof state.map.setBearing === 'function' && window.MBCDI_Modular && window.MBCDI_Modular.modules && window.MBCDI_Modular.modules.rotation) {
                    try {
                        window.MBCDI_Modular.modules.rotation.resetRotation(state.map, {
                            animate: true,
                            duration: 800
                        });
                        mbcdiDebug('[MBCDI v5.5.0] Rotation réinitialisée vers le Nord');
                    } catch (rotErr) {
                        console.warn('[MBCDI v5.5.0] Erreur réinitialisation rotation:', rotErr);
                    }
                }

                // Réafficher tous les points et commerces
                showAllRoutePoints();

                // Réinitialiser les sélections
                state.selectedCommerceId = 0;
                state.selectedCommerce = null;
                state.currentRoute = null;

                // Cacher le bottomsheet
                if (bottomSheet) {
                    bottomSheet.classList.remove('mbcdi-visible');
                    bottomSheet.classList.remove('mbcdi-expanded');
                }

                // Réinitialiser le zoom pour afficher toute la destination
                if (state.selectedDestinationId && data.destinations) {
                    var dest = data.destinations.find(function(d) { return d.id === state.selectedDestinationId; });
                    if (dest) {
                        var bounds = L.latLngBounds([]);

                        // Inclure la zone de chantier
                        if (dest.zone && dest.zone.points && dest.zone.points.length > 0) {
                            dest.zone.points.forEach(function(p) {
                                bounds.extend([p.lat, p.lng]);
                            });
                        }

                        // Inclure les points de départ
                        if (data.startPoints && data.startPoints.length) {
                            data.startPoints.forEach(function(sp) {
                                if (sp.lat && sp.lng) bounds.extend([sp.lat, sp.lng]);
                            });
                        }

                        // Inclure les zones de livraison
                        if (data.deliveryZones && data.deliveryZones.length) {
                            data.deliveryZones.forEach(function(z) {
                                if (z.lat && z.lng) bounds.extend([z.lat, z.lng]);
                            });
                        }

                        if (bounds.isValid()) {
                            state.map.fitBounds(bounds, { padding: [50, 50] });
                        }
                    }
                }

                mbcdiDebug('[MBCDI] Itinéraire réinitialisé');
            }

            function calculateRoute() {
                // V5.0.6: Itinéraire FIXE du BO + tracé piéton OSRM
                // Le serveur retourne 2 tracés distincts
                
                var ajaxUrl = (data.settings && data.settings.ajaxUrl) ? data.settings.ajaxUrl : '/wp-admin/admin-ajax.php';
                var nonce = (data.settings && data.settings.nonce) ? data.settings.nonce : '';

                var formData = new FormData();
                formData.append('action', 'mbcdi_get_route');
                formData.append('nonce', nonce);
                formData.append('start_lat', state.startPosition.lat);
                formData.append('start_lng', state.startPosition.lng);
                formData.append('profile', state.currentMode);

                if (state.selectedCommerceId) {
                    formData.append('commerce_id', state.selectedCommerceId);
                }
                if (state.selectedDestinationId) {
                    formData.append('destination_id', state.selectedDestinationId);
                }

                mbcdiDebug(' v5.0.6] Appel serveur pour itinéraire fixe BO');

                fetch(ajaxUrl, {
                    method: 'POST',
                    body: formData
                })
                .then(function(r) { return r.json(); })
                .then(function(response) {
                    if (response.success && response.data) {
                        var route = response.data;
                        state.currentRoute = route;

                        mbcdiDebug(' v5.0.6] Route reçue:', route.source);

                        // ===============================================
                        // 1. AFFICHER LE TRACÉ VÉHICULE (FIXE DU BO)
                        // ===============================================
                        if (route.vehicle_route && route.vehicle_route.geometry && route.vehicle_route.geometry.length >= 2) {
                            var vehicleCoords = [];
                            for (var i = 0; i < route.vehicle_route.geometry.length; i++) {
                                var pt = route.vehicle_route.geometry[i];
                                if (pt && typeof pt.lat !== 'undefined' && typeof pt.lng !== 'undefined') {
                                    vehicleCoords.push([pt.lat, pt.lng]);
                                }
                            }

                            if (vehicleCoords.length >= 2) {
                                // Supprimer l'ancien tracé véhicule
                                if (state.routeLayer) {
                                    try { state.map.removeLayer(state.routeLayer); } catch (e) {}
                                }
                                
                                // Nouveau tracé véhicule (bleu épais)
                                state.routeLayer = L.polyline(vehicleCoords, {
                                    color: '#007AFF',
                                    weight: 6,
                                    opacity: 0.9,
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }).addTo(state.map);

                                mbcdiDebug(' v5.0.6] Tracé véhicule affiché:', vehicleCoords.length, 'points');

                                // Rotation automatique de la carte vers l'itinéraire (v5.5.0)
                                if (typeof state.map.setBearing === 'function' && vehicleCoords.length >= 2 && window.MBCDI_Modular && window.MBCDI_Modular.modules && window.MBCDI_Modular.modules.rotation) {
                                    try {
                                        var bearing = window.MBCDI_Modular.modules.rotation.rotateToRoute(state.map, vehicleCoords, {
                                            animate: true,
                                            duration: 1200
                                        });
                                        mbcdiDebug('[MBCDI v5.5.0] Rotation automatique appliquée:', bearing, '°');
                                    } catch (rotErr) {
                                        console.warn('[MBCDI v5.5.0] Erreur rotation automatique:', rotErr);
                                    }
                                }
                            }
                        }

                        // ===============================================
                        // 2. AFFICHER LE TRACÉ PIÉTON (OSRM)
                        // ===============================================
                        if (route.walking_route && route.walking_route.geometry && route.walking_route.geometry.length >= 2) {
                            var walkingCoords = [];
                            for (var i = 0; i < route.walking_route.geometry.length; i++) {
                                var pt = route.walking_route.geometry[i];
                                if (pt && typeof pt.lat !== 'undefined' && typeof pt.lng !== 'undefined') {
                                    walkingCoords.push([pt.lat, pt.lng]);
                                }
                            }

                            if (walkingCoords.length >= 2) {
                                // Supprimer l'ancien tracé piéton
                                if (state.walkingLineLayer) {
                                    try { state.map.removeLayer(state.walkingLineLayer); } catch (e) {}
                                }
                                
                                // Nouveau tracé piéton (vert pointillés)
                                state.walkingLineLayer = L.polyline(walkingCoords, {
                                    color: '#34C759',  // Vert
                                    weight: 4,
                                    opacity: 0.8,
                                    dashArray: '8, 12', // Pointillés
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }).addTo(state.map);

                                mbcdiDebug(' v5.0.6] Tracé piéton affiché:', walkingCoords.length, 'points');
                            }
                        }

                        // Zoom pour afficher les 2 tracés
                        if (state.routeLayer && state.walkingLineLayer) {
                            var allBounds = L.latLngBounds([]);
                            allBounds.extend(state.routeLayer.getBounds());
                            allBounds.extend(state.walkingLineLayer.getBounds());
                            state.map.fitBounds(allBounds, { padding: [80, 120] });
                        } else if (state.routeLayer) {
                            state.map.fitBounds(state.routeLayer.getBounds(), { padding: [80, 120] });
                        }

                        // Masquer les points de départ et zones de livraison non utilisés
                        if (route.start_point_id && route.delivery_zone_id) {
                            hideUnusedRoutePoints(route.start_point_id, route.delivery_zone_id);
                        }

                        showResult(route);
                    } else {
                        // Erreur ou pas d'itinéraire
                        console.error('[MBCDI v5.2.4] Pas d\'itinéraire trouvé');
                        
                        var errorMsg = response.data && response.data.message 
                            ? response.data.message 
                            : 'Aucun itinéraire défini pour cette destination';
                        
                        console.error('[MBCDI v5.2.4]', errorMsg);
                        showFieldError(selectDest, errorMsg);
                    }
                })
                .catch(function(err) {
                    console.error('[MBCDI v5.2.4] Erreur calcul route:', err);
                    showFieldError(selectDest, 'Erreur lors du calcul de l\'itinéraire');
                });
            }

            // V5.0.6: renderWalkingLine supprimée - Le tracé piéton est géré dans calculateRoute()

            function displayDirectLine() {
                var coords = [
                    [state.startPosition.lat, state.startPosition.lng],
                    [state.destPosition.lat, state.destPosition.lng]
                ];

                state.routeLayer = L.polyline(coords, {
                    color: '#007AFF',
                    weight: 5,
                    opacity: 0.7,
                    dashArray: '10, 10'
                }).addTo(state.map);

                state.map.fitBounds(state.routeLayer.getBounds(), { padding: [80, 120] });

                var dist = haversine(state.startPosition.lat, state.startPosition.lng, state.destPosition.lat, state.destPosition.lng);
                var duration = dist / 1.4;

                showResult({
                    distance: dist,
                    duration: duration,
                    steps: [{ instruction: 'Suivez la direction indiquée', type: 'continue', modifier: 'straight', distance: dist }],
                    source: 'direct'
                });
            }

            /**
             * V4.4: Affichage des résultats avec infos zone de livraison
             */
            function showResult(route) {
                // V5.0.5: Pas d'affichage de distance/durée, pas d'étapes
                // L'itinéraire est visible uniquement sur la carte
                
                if (sheetBody) sheetBody.classList.remove('mbcdi-loading');

                // V5.0.5: Suppression complète de l'affichage des infos route
                // Juste afficher la fiche commerce
                displayRouteInCard(route);
            }

            function geolocateUser() {
                if (!navigator.geolocation) {
                    console.error('[MBCDI v5.2.4] Géolocalisation non disponible');
                    showFieldError(selectStart, 'Géolocalisation non disponible sur cet appareil');
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    function(pos) {
                        state.userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        
                        // V5.0.3: NE PAS zoomer sur la position user, garder la vue sur la zone
                        // Commenté: state.map.setView([state.userPosition.lat, state.userPosition.lng], 16);
                        mbcdiDebug('] Position GPS obtenue, pas de zoom (vue reste sur zone)');

                        if (data.startPoints && data.startPoints.length > 0 && selectStart) {
                            var nearest = null;
                            var minDist = Infinity;

                            data.startPoints.forEach(function(sp) {
                                if (sp.lat && sp.lng) {
                                    var dist = haversine(
                                        state.userPosition.lat,
                                        state.userPosition.lng,
                                        sp.lat,
                                        sp.lng
                                    );
                                    if (dist < minDist) {
                                        minDist = dist;
                                        nearest = sp;
                                    }
                                }
                            });

                            if (nearest) {
                                var coordsValue = nearest.lat + ',' + nearest.lng;
                                selectStart.value = coordsValue;
                                var selectedOption = selectStart.querySelector('option[value="' + coordsValue + '"]');
                                if (selectedOption) {
                                    selectedOption.selected = true;
                                    selectedOption.style.display = '';
                                }
                                mbcdiDebug('] Point de départ sélectionné:', nearest.label);

                                var tempMsg = document.createElement('div');
                                tempMsg.textContent = 'Point de départ le plus proche sélectionné : ' + (nearest.label || 'Sans nom');
                                tempMsg.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#34C759;color:#fff;padding:12px 20px;border-radius:8px;z-index:10000;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
                                document.body.appendChild(tempMsg);
                                setTimeout(function() {
                                    tempMsg.style.opacity = '0';
                                    tempMsg.style.transition = 'opacity 0.3s';
                                    setTimeout(function() { document.body.removeChild(tempMsg); }, 300);
                                }, 2500);
                            }
                        }
                    },
                    function(error) {
                        console.error('[MBCDI v5.2.4] Erreur géolocalisation:', error);
                        var errorMsg = 'Impossible d\'obtenir votre position';
                        if (error.code === 1) {
                            errorMsg = 'Permission de localisation refusée';
                        }
                        showFieldError(selectStart, errorMsg);
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            }

            // Mode démo
            if (data.settings && data.settings.demoMode && data.settings.demoFixedLat && data.settings.demoFixedLng) {
                state.userPosition = {
                    lat: parseFloat(data.settings.demoFixedLat),
                    lng: parseFloat(data.settings.demoFixedLng)
                };
            }

            // === UTILITAIRES ===

            function escapeHtml(str) {
                if (!str) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            }

            function formatDistance(m) {
                if (!m && m !== 0) return '—';
                m = parseFloat(m);
                if (m < 1000) return Math.round(m) + ' m';
                return (m / 1000).toFixed(1).replace('.', ',') + ' km';
            }

            function formatDuration(s) {
                if (!s && s !== 0) return '—';
                s = parseFloat(s);
                if (s < 60) return Math.round(s) + ' sec';
                var mins = Math.floor(s / 60);
                if (mins < 60) return mins + ' min';
                var h = Math.floor(mins / 60);
                var m = mins % 60;
                return h + 'h' + (m < 10 ? '0' : '') + m;
            }

            function haversine(lat1, lng1, lat2, lng2) {
                var R = 6371e3;
                var toRad = function(v) { return v * Math.PI / 180; };
                var dLat = toRad(lat2 - lat1);
                var dLng = toRad(lng2 - lng1);
                var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            }
        }
    };
})();
