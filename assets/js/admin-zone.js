/**
 * MBCDI Admin Zone
 * Gestion du dessin de la zone de chantier (polygon)
 * @version 5.5.0
 */
(function($) {
    'use strict';

    let zoneMap = null;
    let zonePolygon = null;
    let zoneData = null;
    let drawingMode = false;
    let tempPoints = [];
    let tempMarkers = [];
    let tempPolyline = null;

    $(document).ready(function() {
        // Vérifier qu'on est sur la bonne page
        if (!$('#mbcdi-zone-container').length) {
            return;
        }

        // Charger la zone existante
        if (typeof window.MBCDI_ZONE !== 'undefined' && window.MBCDI_ZONE !== null) {
            try {
                zoneData = typeof window.MBCDI_ZONE === 'string' ? JSON.parse(window.MBCDI_ZONE) : window.MBCDI_ZONE;
            } catch (e) {
                console.error('MBCDI: erreur parsing zone', e);
                zoneData = null;
            }
        }

        initZoneMap();
        bindEvents();
        updateOpacityDisplay();
    });

    function bindEvents() {
        // Dessiner la zone
        $('#mbcdi-draw-zone').on('click', function(e) {
            e.preventDefault();
            toggleDrawMode();
        });

        // Effacer la zone
        $('#mbcdi-clear-zone').on('click', function(e) {
            e.preventDefault();
            clearZone();
        });

        // Mise à jour de l'opacité
        $('#mbcdi_zone_opacity').on('input change', function() {
            updateOpacityDisplay();
            if (zonePolygon) {
                const opacity = parseFloat($(this).val());
                zonePolygon.setStyle({ fillOpacity: opacity });
            }
        });

        // Mise à jour de la couleur
        $('#mbcdi_zone_color').on('change', function() {
            if (zonePolygon) {
                const color = $(this).val();
                zonePolygon.setStyle({ color: color, fillColor: color });
            }
        });
    }

    function initZoneMap() {
        const mapContainer = document.getElementById('mbcdi-zone-map');
        if (!mapContainer) {
            console.log('MBCDI: conteneur carte zone introuvable');
            return;
        }

        if (typeof L === 'undefined') {
            console.error('MBCDI: Leaflet non chargé');
            return;
        }

        try {
            // Récupérer coordonnées de la destination
            const lat = parseFloat($('#mbcdi_lat').val()) || 48.8566;
            const lng = parseFloat($('#mbcdi_lng').val()) || 2.3522;

            zoneMap = L.map('mbcdi-zone-map').setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                maxZoom: 19,
                attribution: ''
            }).addTo(zoneMap);

            // Afficher la zone existante
            if (zoneData && zoneData.points && zoneData.points.length >= 3) {
                renderZone();
            }

        } catch (error) {
            console.error('MBCDI: erreur init carte zone:', error);
        }
    }

    function toggleDrawMode() {
        if (drawingMode) {
            // Arrêter le dessin
            finishDrawing();
        } else {
            // Commencer le dessin
            startDrawing();
        }
    }

    function startDrawing() {
        drawingMode = true;
        tempPoints = [];
        clearTempDrawing();

        $('#mbcdi-draw-zone').text('✓ Terminer le dessin').addClass('button-primary');

        // Supprimer l'ancien polygon
        if (zonePolygon) {
            zoneMap.removeLayer(zonePolygon);
            zonePolygon = null;
        }

        // Activer le clic sur la carte
        zoneMap.on('click', onMapClick);

        showNotification('Cliquez sur la carte pour ajouter des points (minimum 3)', 'info');
    }

    function onMapClick(e) {
        if (!drawingMode) return;

        tempPoints.push({ lat: e.latlng.lat, lng: e.latlng.lng });

        // Ajouter un marqueur temporaire
        const marker = L.circleMarker([e.latlng.lat, e.latlng.lng], {
            radius: 5,
            color: '#0073aa',
            fillColor: '#0073aa',
            fillOpacity: 1
        }).addTo(zoneMap);
        tempMarkers.push(marker);

        // Dessiner la ligne temporaire
        if (tempPoints.length >= 2) {
            if (tempPolyline) {
                zoneMap.removeLayer(tempPolyline);
            }
            const latlngs = tempPoints.map(p => [p.lat, p.lng]);
            tempPolyline = L.polyline(latlngs, { 
                color: '#0073aa', 
                weight: 2,
                dashArray: '5, 10'
            }).addTo(zoneMap);
        }

        showNotification(`${tempPoints.length} point(s) ajouté(s)`, 'success');
    }

    function finishDrawing() {
        if (tempPoints.length < 3) {
            alert('Vous devez ajouter au moins 3 points pour créer une zone.');
            return;
        }

        drawingMode = false;
        zoneMap.off('click', onMapClick);

        $('#mbcdi-draw-zone').text('🖊️ Dessiner la zone').removeClass('button-primary');

        // Créer le polygon final
        const color = $('#mbcdi_zone_color').val() || '#FF6B6B';
        const opacity = parseFloat($('#mbcdi_zone_opacity').val()) || 0.3;

        const latlngs = tempPoints.map(p => [p.lat, p.lng]);
        zonePolygon = L.polygon(latlngs, {
            color: color,
            fillColor: color,
            fillOpacity: opacity,
            weight: 2
        }).addTo(zoneMap);

        // Sauvegarder
        zoneData = {
            points: tempPoints,
            color: color,
            opacity: opacity
        };
        saveZone();

        // Nettoyer
        clearTempDrawing();

        showNotification('Zone créée avec succès !', 'success');
    }

    function clearTempDrawing() {
        tempMarkers.forEach(m => zoneMap.removeLayer(m));
        tempMarkers = [];
        if (tempPolyline) {
            zoneMap.removeLayer(tempPolyline);
            tempPolyline = null;
        }
    }

    function clearZone() {
        if (!confirm('Êtes-vous sûr de vouloir effacer la zone ?')) return;

        if (zonePolygon) {
            zoneMap.removeLayer(zonePolygon);
            zonePolygon = null;
        }

        clearTempDrawing();
        
        zoneData = null;
        tempPoints = [];
        drawingMode = false;

        $('#mbcdi-draw-zone').text('🖊️ Dessiner la zone').removeClass('button-primary');
        zoneMap.off('click', onMapClick);

        saveZone();
        showNotification('Zone effacée', 'info');
    }

    function renderZone() {
        if (!zoneMap || !zoneData || !zoneData.points) return;

        const color = zoneData.color || $('#mbcdi_zone_color').val() || '#FF6B6B';
        const opacity = zoneData.opacity || parseFloat($('#mbcdi_zone_opacity').val()) || 0.3;

        const latlngs = zoneData.points.map(p => [p.lat, p.lng]);
        
        if (zonePolygon) {
            zoneMap.removeLayer(zonePolygon);
        }

        zonePolygon = L.polygon(latlngs, {
            color: color,
            fillColor: color,
            fillOpacity: opacity,
            weight: 2
        }).addTo(zoneMap);

        // Zoomer sur la zone
        zoneMap.fitBounds(zonePolygon.getBounds());
    }

    function saveZone() {
        const dataStr = zoneData ? JSON.stringify(zoneData) : 'null';
        $('#mbcdi_zone_data').val(dataStr);
    }

    function updateOpacityDisplay() {
        const val = $('#mbcdi_zone_opacity').val();
        $('#mbcdi-zone-opacity-value').text(val);
    }

    function showNotification(message, type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#0073aa'
        };

        const $notif = $('<div>')
            .text(message)
            .css({
                position: 'fixed',
                top: '50px',
                right: '20px',
                background: colors[type] || colors.info,
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '4px',
                zIndex: 999999,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            })
            .appendTo('body');

        setTimeout(function() {
            $notif.fadeOut(function() {
                $notif.remove();
            });
        }, 3000);
    }

})(jQuery);
