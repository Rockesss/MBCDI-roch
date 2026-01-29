/**
 * MBCDI Admin Delivery Zone Geometry
 * - Dessin d'une surface de zone de livraison (polygone)
 * - Upload d'un pictogramme (SVG/PNG) pour le point de zone
 * @version 5.5.0
 */
(function($) {
    'use strict';

    let zoneMap = null;
    let zonePolygon = null;
    let drawingMode = false;
    let tempPoints = [];
    let tempMarkers = [];
    let tempPolyline = null;

    $(document).ready(function() {
        // Icon uploader (peut exister même sans géométrie)
        initIconUploader();

        // Geometry editor
        if (!$('#mbcdi-delivery-geometry-container').length) {
            return;
        }
        initGeometryMap();
        bindGeometryEvents();
    });

    function initIconUploader() {
        if (!$('#mbcdi_upload_zone_icon').length) return;

        $('#mbcdi_upload_zone_icon').on('click', function(e) {
            e.preventDefault();
            if (typeof wp === 'undefined' || !wp.media) {
                alert('Media uploader non disponible. Rechargez la page.');
                return;
            }
            const frame = wp.media({
                title: 'Choisir un pictogramme (SVG/PNG)',
                button: { text: 'Utiliser cette image' },
                multiple: false
            });

            frame.on('select', function() {
                const attachment = frame.state().get('selection').first().toJSON();
                const url = attachment.url || '';
                $('#mbcdi_delivery_zone_icon_url').val(url);
                $('#mbcdi-zone-icon-placeholder').hide();
                $('#mbcdi-zone-icon-preview').attr('src', url).show();
                $('#mbcdi_remove_zone_icon').show();
            });

            frame.open();
        });

        $('#mbcdi_remove_zone_icon').on('click', function(e) {
            e.preventDefault();
            $('#mbcdi_delivery_zone_icon_url').val('');
            $('#mbcdi-zone-icon-preview').attr('src', '').hide();
            $('#mbcdi-zone-icon-placeholder').show();
            $('#mbcdi_remove_zone_icon').hide();
        });
    }

    function bindGeometryEvents() {
        $('#mbcdi-draw-delivery-geometry').on('click', function(e) {
            e.preventDefault();
            if (!zoneMap) return;
            if (drawingMode) {
                finishDrawing();
            } else {
                startDrawing();
            }
        });

        $('#mbcdi-clear-delivery-geometry').on('click', function(e) {
            e.preventDefault();
            clearGeometry();
        });

        $('#mbcdi_zone_color').on('change', function() {
            if (zonePolygon) {
                const c = getColor();
                zonePolygon.setStyle({ color: c, fillColor: c });
            }
        });
    }

    function initGeometryMap() {
        const mapEl = document.getElementById('mbcdi-delivery-geometry-map');
        if (!mapEl) return;

        if (typeof L === 'undefined') {
            console.error('MBCDI: Leaflet non chargé');
            return;
        }

        const lat = parseFloat($('#mbcdi_lat').val()) || 48.8566;
        const lng = parseFloat($('#mbcdi_lng').val()) || 2.3522;

        zoneMap = L.map('mbcdi-delivery-geometry-map').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '' }).addTo(zoneMap);

        // Load existing geometry if present
        let existing = null;
        if (typeof window.MBCDI_DELIVERY_ZONE_GEOMETRY !== 'undefined' && window.MBCDI_DELIVERY_ZONE_GEOMETRY) {
            try {
                existing = (typeof window.MBCDI_DELIVERY_ZONE_GEOMETRY === 'string')
                    ? JSON.parse(window.MBCDI_DELIVERY_ZONE_GEOMETRY)
                    : window.MBCDI_DELIVERY_ZONE_GEOMETRY;
            } catch (err) {
                existing = null;
            }
        }

        if (Array.isArray(existing) && existing.length >= 3) {
            const latlngs = existing.map(p => [p.lat, p.lng]);
            const c = getColor();
            zonePolygon = L.polygon(latlngs, { color: c, fillColor: c, fillOpacity: 0.25, weight: 2 }).addTo(zoneMap);
            zoneMap.fitBounds(zonePolygon.getBounds(), { padding: [20, 20] });
            saveGeometry(existing);
        }
    }

    function startDrawing() {
        drawingMode = true;
        tempPoints = [];
        clearTempDrawing();

        $('#mbcdi-draw-delivery-geometry').text('✓ Terminer le dessin').addClass('button-primary');

        if (zonePolygon) {
            zoneMap.removeLayer(zonePolygon);
            zonePolygon = null;
        }

        zoneMap.on('click', onMapClick);
    }

    function onMapClick(e) {
        if (!drawingMode) return;

        tempPoints.push({ lat: e.latlng.lat, lng: e.latlng.lng });

        const marker = L.circleMarker([e.latlng.lat, e.latlng.lng], {
            radius: 5,
            color: '#0073aa',
            fillColor: '#0073aa',
            fillOpacity: 1
        }).addTo(zoneMap);
        tempMarkers.push(marker);

        if (tempPoints.length >= 2) {
            if (tempPolyline) zoneMap.removeLayer(tempPolyline);
            const latlngs = tempPoints.map(p => [p.lat, p.lng]);
            tempPolyline = L.polyline(latlngs, { color: '#0073aa', weight: 2, dashArray: '5,10' }).addTo(zoneMap);
        }
    }

    function finishDrawing() {
        if (tempPoints.length < 3) {
            alert('Ajoutez au moins 3 points pour créer une zone.');
            return;
        }

        drawingMode = false;
        zoneMap.off('click', onMapClick);
        $('#mbcdi-draw-delivery-geometry').text('🖊️ Dessiner la zone').removeClass('button-primary');

        const c = getColor();
        const latlngs = tempPoints.map(p => [p.lat, p.lng]);
        zonePolygon = L.polygon(latlngs, { color: c, fillColor: c, fillOpacity: 0.25, weight: 2 }).addTo(zoneMap);

        saveGeometry(tempPoints);
        clearTempDrawing();
    }

    function clearGeometry() {
        if (!confirm('Effacer la zone dessinée ?')) return;

        if (zonePolygon) {
            zoneMap.removeLayer(zonePolygon);
            zonePolygon = null;
        }
        clearTempDrawing();
        tempPoints = [];
        drawingMode = false;

        $('#mbcdi-draw-delivery-geometry').text('🖊️ Dessiner la zone').removeClass('button-primary');
        zoneMap.off('click', onMapClick);

        saveGeometry(null);
    }

    function clearTempDrawing() {
        tempMarkers.forEach(m => { try { zoneMap.removeLayer(m); } catch(e) {} });
        tempMarkers = [];
        if (tempPolyline) {
            try { zoneMap.removeLayer(tempPolyline); } catch(e) {}
            tempPolyline = null;
        }
    }

    function saveGeometry(points) {
        const val = points && Array.isArray(points) ? JSON.stringify(points) : '';
        $('#mbcdi_delivery_zone_geometry_data').val(val);
    }

    function getColor() {
        return $('#mbcdi_zone_color').val() || '#4CAF50';
    }
})(jQuery);
