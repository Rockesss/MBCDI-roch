/**
 * MBCDI Admin Itineraries - JavaScript
 * @version 5.5.0
 */
(function($) {
    'use strict';
    
    let itineraries = [];
    let startPoints = [];
    let deliveryZones = [];
    let currentIndex = -1; // -1 = nouveau, >= 0 = édition
    
    // Éditeur de tracé
    let traceMap = null;
    let traceMarkers = [];
    let tracePolyline = null;
    let currentWaypoints = [];
    
    $(document).ready(function() {
        console.log('MBCDI Admin Itineraries: Initialisation');
        
        loadData();
        initEvents();
    });
    
    /**
     * Charger les données
     */
    function loadData() {
        // Itinéraires
        const itinData = $('#mbcdi_itineraries_data').val();
        itineraries = itinData ? JSON.parse(itinData) : [];
        
        // Points de départ
        const pointsData = $('#mbcdi_start_points_js').val();
        startPoints = pointsData ? JSON.parse(pointsData) : [];
        
        // Zones
        const zonesData = $('#mbcdi_delivery_zones_js').val();
        deliveryZones = zonesData ? JSON.parse(zonesData) : [];
        
        console.log('Données chargées:', {
            itineraries: itineraries.length,
            startPoints: startPoints.length,
            deliveryZones: deliveryZones.length
        });
    }
    
    /**
     * Initialiser les événements
     */
    function initEvents() {
        // Créer
        $(document).on('click', '#mbcdi-create-itinerary', function(e) {
            e.preventDefault();
            currentIndex = -1;
            openInfoModal();
        });
        
        // Modifier
        $(document).on('click', '.mbcdi-edit-itin', function(e) {
            e.preventDefault();
            currentIndex = $(this).data('index');
            openInfoModal();
        });
        
        // Tracer
        $(document).on('click', '.mbcdi-trace-itin', function(e) {
            e.preventDefault();
            currentIndex = $(this).data('index');
            openTraceModal();
        });
        
        // Supprimer
        $(document).on('click', '.mbcdi-delete-itin', function(e) {
            e.preventDefault();
            const confirmMsg = (window.MBCDI_ADMIN && MBCDI_ADMIN.labels && MBCDI_ADMIN.labels.confirmDelete)
                ? MBCDI_ADMIN.labels.confirmDelete
                : 'Supprimer cet itinéraire ?';
            if (!confirm(confirmMsg)) return;
            
            const index = $(this).data('index');
            itineraries.splice(index, 1);
            saveAndRefresh();
        });
        
        // Modal Info - Annuler
        $(document).on('click', '#mbcdi-modal-cancel, #mbcdi-modal-info .mbcdi-modal-close', function(e) {
            e.preventDefault();
            closeInfoModal();
        });
        
        // Modal Info - Suivant
        $(document).on('click', '#mbcdi-modal-next', function(e) {
            e.preventDefault();
            if (saveInfo()) {
                closeInfoModal();
                openTraceModal();
            }
        });
        
        // Modal Trace - Retour
        $(document).on('click', '#mbcdi-trace-back', function(e) {
            e.preventDefault();
            closeTraceModal();
            openInfoModal();
        });
        
        // Modal Trace - Sauvegarder
        $(document).on('click', '#mbcdi-trace-save', function(e) {
            e.preventDefault();
            saveTrace();
            closeTraceModal();
            saveAndRefresh();
        });
        
        // Modal Trace - Fermer
        $(document).on('click', '#mbcdi-modal-trace .mbcdi-modal-close', function(e) {
            e.preventDefault();
            const confirmMsg = (window.MBCDI_ADMIN && MBCDI_ADMIN.labels && MBCDI_ADMIN.labels.closeWithoutSave)
                ? MBCDI_ADMIN.labels.closeWithoutSave
                : 'Fermer sans sauvegarder le tracé ?';
            if (confirm(confirmMsg)) {
                closeTraceModal();
            }
        });
        
        // Trace - Ajouter waypoint
        $(document).on('click', '#trace-add-waypoint', function(e) {
            e.preventDefault();
            // Le waypoint sera ajouté au clic sur la carte
            const msg = (window.MBCDI_ADMIN && MBCDI_ADMIN.labels && MBCDI_ADMIN.labels.clickToAdd)
                ? MBCDI_ADMIN.labels.clickToAdd
                : 'Cliquez sur la carte pour ajouter un waypoint';
            alert(msg);
        });
        
        // Trace - OSRM
        $(document).on('click', '#trace-osrm', function(e) {
            e.preventDefault();
            calculateOSRM();
        });
        
        // Trace - Supprimer waypoint
        $(document).on('click', '.mbcdi-delete-waypoint', function(e) {
            e.preventDefault();
            const index = $(this).data('index');
            if (index > 0 && index < currentWaypoints.length - 1) { // Pas départ ni arrivée
                currentWaypoints.splice(index, 1);
                updateTraceMap();
            }
        });
    }
    
    /**
     * Ouvrir modal Info
     */
    function openInfoModal() {
        const isNew = currentIndex === -1;
        const itin = isNew ? getDefaultItinerary() : itineraries[currentIndex];
        
        // Titre
        $('#mbcdi-modal-title').text(isNew ? 'Nouvel Itinéraire' : 'Modifier l\'Itinéraire');
        
        // Remplir les champs
        $('#itin-name').val(itin.name || '');
        
        // Points de départ
        $('#itin-start-point').html('<option value="">-- Sélectionner --</option>');
        startPoints.forEach(function(point) {
            const selected = point.id == itin.start_point_id ? ' selected' : '';
            $('#itin-start-point').append(
                '<option value="' + point.id + '"' + selected + '>' + 
                escapeHtml(point.name) + ' (ID: ' + point.id + ')' +
                '</option>'
            );
        });
        
        // Zones
        $('#itin-zone').html('<option value="">-- Sélectionner --</option>');
        deliveryZones.forEach(function(zone) {
            const selected = zone.id == itin.delivery_zone_id ? ' selected' : '';
            $('#itin-zone').append(
                '<option value="' + zone.id + '"' + selected + '>' + 
                escapeHtml(zone.name) + ' (ID: ' + zone.id + ')' +
                '</option>'
            );
        });
        
        // Mode
        $('input[name="itin-mode"][value="' + itin.mode + '"]').prop('checked', true);

        // Statut
        $('#itin-status').val(itin.status || 'active');
        
        // Afficher
        $('#mbcdi-modal-info').fadeIn(200);
    }
    
    /**
     * Fermer modal Info
     */
    function closeInfoModal() {
        $('#mbcdi-modal-info').fadeOut(200);
    }
    
    /**
     * Sauvegarder les infos
     */
    function saveInfo() {
        const name = $('#itin-name').val().trim();
        const startPointId = parseInt($('#itin-start-point').val());
        const zoneId = parseInt($('#itin-zone').val());
        const mode = $('input[name="itin-mode"]:checked').val();
        const status = $('#itin-status').val() || 'active';
        
        // Validation
        if (!name) {
            alert('Veuillez saisir un nom');
            return false;
        }
        if (!startPointId) {
            alert('Veuillez sélectionner un point de départ');
            return false;
        }
        if (!zoneId) {
            alert('Veuillez sélectionner une zone de livraison');
            return false;
        }
        
        // Créer/modifier
        const isNew = currentIndex === -1;
        const itin = isNew ? getDefaultItinerary() : itineraries[currentIndex];
        
        itin.name = name;
        itin.start_point_id = startPointId;
        itin.delivery_zone_id = zoneId;
        itin.mode = mode;
        itin.status = status;
        
        if (isNew) {
            currentIndex = itineraries.length;
            itineraries.push(itin);
        }

        return true;
    }
    
    /**
     * Itinéraire par défaut
     */
    function getDefaultItinerary() {
        return {
            id: 'itin_' + Date.now(),
            name: '',
            start_point_id: 0,
            delivery_zone_id: 0,
            mode: 'car',
            status: 'active',
            waypoints: [],
            geometry: [],
            distance: 0,
            duration: 0
        };
    }
    
    /**
     * Sauvegarder et rafraîchir
     */
    function saveAndRefresh() {
        // Sauvegarder dans le champ caché (sera persisté à la sauvegarde WordPress)
        $('#mbcdi_itineraries_data').val(JSON.stringify(itineraries));

        // Rafraîchir la liste sans recharger (sinon on perd les données non enregistrées)
        refreshItinerariesList();

        // Message d'aide : l'utilisateur doit cliquer sur "Mettre à jour" / "Publier"
        if (window.MBCDIUtils && typeof window.MBCDIUtils.showToast === 'function') {
            window.MBCDIUtils.showToast('Itinéraire mis à jour. Pensez à cliquer sur « Mettre à jour » pour enregistrer en base.', 'info', 5000);
        }
    }

    /**
     * Rafraîchir la liste des cartes itinéraires côté BO (sans reload)
     */
    function refreshItinerariesList() {
        const $list = $('#mbcdi-itineraries-list');
        if (!$list.length) return;

        // Mettre à jour le compteur
        $list.find('h4').first().text('Itinéraires configurés (' + itineraries.length + ')');

        // Vider les cartes existantes
        $list.find('.mbcdi-itinerary-card, .mbcdi-empty-message').remove();

        if (!itineraries.length) {
            $list.append('<p class="mbcdi-empty-message">Aucun itinéraire configuré. Cliquez sur "Créer" pour commencer.</p>');
            return;
        }

        // Reconstruire
        itineraries.forEach(function(itin, index) {
            const sp = startPoints.find(p => String(p.id) === String(itin.start_point_id));
            const zone = deliveryZones.find(z => String(z.id) === String(itin.delivery_zone_id));

            const hasRoute = Array.isArray(itin.geometry) && itin.geometry.length > 1;
            const status = (itin.status === 'inactive') ? 'inactive' : 'active';
            const statusText = (status === 'inactive') ? 'Inactif' : 'Actif';
            const modeLabel = itin.mode === 'car' ? 'Voiture' : (itin.mode === 'bike' ? 'Vélo' : (itin.mode === 'foot' ? 'Piéton' : (itin.mode || '')));

            const wpCount = Array.isArray(itin.waypoints) ? itin.waypoints.length : 0;
            const distance = itin.distance ? itin.distance : 0;
            const duration = itin.duration ? itin.duration : 0;

            const distanceLabel = distance < 1000 ? Math.round(distance) + 'm' : (Math.round(distance / 100) / 10) + 'km';
            const durationLabel = duration < 60 ? duration + 's' : Math.round(duration / 60) + 'min';

            const traceLine = hasRoute
                ? (wpCount + ' waypoints • ' + distanceLabel + ' • ' + durationLabel)
                : 'Non configuré';

            const html =
                '<div class="mbcdi-itinerary-card" data-index="' + index + '">' +
                    '<div class="mbcdi-card-header">' +
                        '<h4>' + escapeHtml(itin.name || '') + '</h4>' +
                        '<span class="mbcdi-status mbcdi-status-' + status + '">' + statusText + '</span>' +
                    '</div>' +
                    '<div class="mbcdi-card-body">' +
                        '<p><strong>Point de départ :</strong> ' + escapeHtml((sp && sp.name) ? sp.name : 'Inconnu') + ' (ID: ' + escapeHtml(itin.start_point_id) + ')</p>' +
                        '<p><strong>Zone de livraison :</strong> ' + escapeHtml((zone && zone.name) ? zone.name : 'Inconnue') + ' (ID: ' + escapeHtml(itin.delivery_zone_id) + ')</p>' +
                        '<p><strong>Mode :</strong> ' + escapeHtml(modeLabel) + '</p>' +
                        '<p><strong>Tracé :</strong> ' + escapeHtml(traceLine) + '</p>' +
                    '</div>' +
                    '<div class="mbcdi-card-footer">' +
                        '<button type="button" class="button button-small mbcdi-edit-itin" data-index="' + index + '">Modifier</button>' +
                        '<button type="button" class="button button-small mbcdi-trace-itin" data-index="' + index + '">Tracer</button>' +
                        '<button type="button" class="button button-small button-link-delete mbcdi-delete-itin" data-index="' + index + '">Supprimer</button>' +
                    '</div>' +
                '</div>';
            $list.append(html);
        });
    }
    
    /**
     * Échapper HTML
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text || '').replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    // Exposer pour debug
    window.MBCDI_DEBUG = {
        itineraries: function() { return itineraries; },
        startPoints: function() { return startPoints; },
        deliveryZones: function() { return deliveryZones; }
    };
    
    /**
     * ========================================
     * ÉDITEUR DE TRACÉ
     * ========================================
     */
    
    /**
     * Ouvrir modal Tracé
     */
    function openTraceModal() {
        const itin = itineraries[currentIndex];
        if (!itin) {
            alert('Erreur: Itinéraire introuvable');
            return;
        }
        
        // Titre
        $('#mbcdi-trace-title').text('Tracer l\'itinéraire "' + itin.name + '"');
        
        // Récupérer les coordonnées
        const startPoint = findById(startPoints, itin.start_point_id);
        const zone = findById(deliveryZones, itin.delivery_zone_id);
        
        if (!startPoint || !zone) {
            alert('Erreur: Point de départ ou zone introuvable');
            return;
        }
        
        // Afficher infos
        $('#trace-start-name').text(startPoint.name);
        $('#trace-start-coords').text(startPoint.lat.toFixed(6) + ', ' + startPoint.lng.toFixed(6));
        $('#trace-end-name').text(zone.name);
        $('#trace-end-coords').text(zone.lat.toFixed(6) + ', ' + zone.lng.toFixed(6));
        
        // Initialiser waypoints
        if (itin.waypoints && itin.waypoints.length > 0) {
            currentWaypoints = JSON.parse(JSON.stringify(itin.waypoints));
        } else {
            currentWaypoints = [
                { lat: startPoint.lat, lng: startPoint.lng, type: 'start' },
                { lat: zone.lat, lng: zone.lng, type: 'end' }
            ];
        }
        
        // Afficher modal
        $('#mbcdi-modal-trace').fadeIn(200, function() {
            initTraceMap();
        });
    }
    
    /**
     * Fermer modal Tracé
     */
    function closeTraceModal() {
        $('#mbcdi-modal-trace').fadeOut(200);
        if (traceMap) {
            traceMap.remove();
            traceMap = null;
        }
    }
    
    /**
     * Initialiser la carte de tracé
     */
    function initTraceMap() {
        if (traceMap) {
            traceMap.remove();
        }
        
        // Créer la carte
        const center = currentWaypoints[0];
        traceMap = L.map('mbcdi-trace-map').setView([center.lat, center.lng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(traceMap);
        
        // Clic sur carte pour ajouter waypoint
        traceMap.on('click', function(e) {
            addWaypoint(e.latlng.lat, e.latlng.lng);
        });
        
        // Afficher les waypoints
        updateTraceMap();
    }
    
    /**
     * Mettre à jour la carte
     */
    function updateTraceMap() {
        if (!traceMap) return;
        
        // Effacer les marqueurs
        traceMarkers.forEach(function(marker) {
            traceMap.removeLayer(marker);
        });
        traceMarkers = [];
        
        // Effacer la polyline
        if (tracePolyline) {
            traceMap.removeLayer(tracePolyline);
            tracePolyline = null;
        }
        
        // Afficher les waypoints
        currentWaypoints.forEach(function(wp, index) {
            let icon;
            if (wp.type === 'start') {
                icon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                });
            } else if (wp.type === 'end') {
                icon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                });
            } else {
                icon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                });
            }
            
            const marker = L.marker([wp.lat, wp.lng], { icon: icon }).addTo(traceMap);
            traceMarkers.push(marker);
        });
        
        // Afficher ligne simple entre les points
        if (currentWaypoints.length >= 2) {
            const latlngs = currentWaypoints.map(function(wp) {
                return [wp.lat, wp.lng];
            });
            tracePolyline = L.polyline(latlngs, { color: '#0073aa', weight: 3 }).addTo(traceMap);
            traceMap.fitBounds(tracePolyline.getBounds(), { padding: [50, 50] });
        }
        
        // Mettre à jour la liste
        updateWaypointsList();
    }
    
    /**
     * Mettre à jour la liste des waypoints
     */
    function updateWaypointsList() {
        const $list = $('#trace-waypoints-list');
        $list.empty();
        
        currentWaypoints.forEach(function(wp, index) {
            let label = '';
            if (wp.type === 'start') {
                label = 'Départ (fixe)';
            } else if (wp.type === 'end') {
                label = 'Arrivée (fixe)';
            } else {
                label = 'Point ' + index;
            }
            
            const canDelete = wp.type !== 'start' && wp.type !== 'end';
            const deleteBtn = canDelete ? 
                '<button type="button" class="button button-small mbcdi-delete-waypoint" data-index="' + index + '">Supprimer</button>' : 
                '';
            
            $list.append(
                '<div class="mbcdi-waypoint-item">' +
                    '<div>' +
                        '<div>' + label + '</div>' +
                        '<div class="mbcdi-coords">' + wp.lat.toFixed(6) + ', ' + wp.lng.toFixed(6) + '</div>' +
                    '</div>' +
                    deleteBtn +
                '</div>'
            );
        });
    }
    
    /**
     * Ajouter un waypoint
     */
    function addWaypoint(lat, lng) {
        // Ajouter avant le dernier (qui est l'arrivée)
        currentWaypoints.splice(currentWaypoints.length - 1, 0, {
            lat: lat,
            lng: lng,
            type: 'intermediate'
        });
        
        updateTraceMap();
    }
    
    /**
     * Calculer avec OSRM
     */
    function calculateOSRM() {
        if (currentWaypoints.length < 2) {
            alert('Ajoutez au moins 2 points');
            return;
        }
        
        const itin = itineraries[currentIndex] || {};
        const mode = itin.mode || (window.MBCDI_ADMIN && MBCDI_ADMIN.defaultProfile) || 'car';

        // Utiliser l'AJAX WordPress (évite CORS + respecte les réglages serveurs OSRM)
        if (!window.MBCDI_ADMIN || !MBCDI_ADMIN.ajaxUrl || !MBCDI_ADMIN.nonce) {
            $('#trace-status').text('✗ Erreur').css('color', '#dc3232');
            alert('Configuration AJAX manquante');
            return;
        }

        const from = currentWaypoints[0];
        const to = currentWaypoints[currentWaypoints.length - 1];
        const intermediate = currentWaypoints.slice(1, currentWaypoints.length - 1).map(function(wp) {
            return { lat: wp.lat, lng: wp.lng };
        });

        $('#trace-status').text('Calcul en cours...').css('color', '');

        $.ajax({
            url: MBCDI_ADMIN.ajaxUrl,
            method: 'POST',
            dataType: 'json',
            data: {
                action: 'mbcdi_calculate_segment',
                nonce: MBCDI_ADMIN.nonce,
                from_lat: from.lat,
                from_lng: from.lng,
                to_lat: to.lat,
                to_lng: to.lng,
                profile: mode,
                waypoints: JSON.stringify(intermediate)
            },
            success: function(resp) {
                if (resp && resp.success && resp.data && resp.data.geometry && resp.data.geometry.length) {
                    const route = resp.data;

                    const geometry = route.geometry.map(function(pt) {
                        return { lat: pt.lat, lng: pt.lng };
                    });

                    if (tracePolyline) {
                        traceMap.removeLayer(tracePolyline);
                    }

                    const latlngs = geometry.map(function(g) { return [g.lat, g.lng]; });
                    tracePolyline = L.polyline(latlngs, { color: '#0073aa', weight: 4 }).addTo(traceMap);
                    traceMap.fitBounds(tracePolyline.getBounds(), { padding: [50, 50] });

                    itineraries[currentIndex].geometry = geometry;
                    itineraries[currentIndex].distance = route.distance || 0;
                    itineraries[currentIndex].duration = route.duration || 0;

                    $('#trace-distance').text(formatDistance(itineraries[currentIndex].distance));
                    $('#trace-duration').text(formatDuration(itineraries[currentIndex].duration));
                    $('#trace-status').text('✓ OK').css('color', '#28a745');
                } else {
                    $('#trace-status').text('✗ Erreur').css('color', '#dc3232');
                    const msg = (resp && resp.data && resp.data.message) ? resp.data.message : 'Impossible de calculer la route';
                    alert('OSRM: ' + msg);
                }
            },
            error: function() {
                $('#trace-status').text('✗ Erreur').css('color', '#dc3232');
                alert('OSRM: Erreur de connexion');
            }
        });
    }
    
    /**
     * Sauvegarder le tracé
     */
    function saveTrace() {
        const itin = itineraries[currentIndex];
        itin.waypoints = currentWaypoints;
        
        // Si geometry existe (calculé par OSRM), on la garde
        // Sinon on crée une ligne simple
        if (!itin.geometry || itin.geometry.length === 0) {
            itin.geometry = currentWaypoints.map(function(wp) {
                return { lat: wp.lat, lng: wp.lng };
            });
            
            // Calculer distance approximative (ligne droite)
            itin.distance = calculateStraightDistance(currentWaypoints);
            itin.duration = Math.round(itin.distance / 10); // Approximation
        }
        
        itin.status = 'active';
    }
    
    /**
     * Calculer distance à vol d'oiseau
     */
    function calculateStraightDistance(waypoints) {
        let total = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            total += haversine(waypoints[i], waypoints[i + 1]);
        }
        return total;
    }
    
    /**
     * Formule de Haversine
     */
    function haversine(point1, point2) {
        const R = 6371e3; // Rayon terre en mètres
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
     * Formater distance
     */
    function formatDistance(meters) {
        if (meters < 1000) {
            return Math.round(meters) + 'm';
        }
        return (meters / 1000).toFixed(1) + 'km';
    }
    
    /**
     * Formater durée
     */
    function formatDuration(seconds) {
        if (seconds < 60) {
            return Math.round(seconds) + 's';
        }
        return Math.round(seconds / 60) + 'min';
    }
    
    /**
     * Trouver par ID
     */
    function findById(array, id) {
        for (let i = 0; i < array.length; i++) {
            if (array[i].id == id) {
                return array[i];
            }
        }
        return null;
    }
    
})(jQuery);
