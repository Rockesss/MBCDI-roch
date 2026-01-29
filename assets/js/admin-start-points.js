/**
 * MBCDI Admin Start Points
 * Gestion des points de départ fixes (QR codes)
 * @version 5.5.0
 */
(function($) {
    'use strict';

    let startPointsMap = null;
    let startPoints = [];
    let tempMarkers = [];

    $(document).ready(function() {
        // Vérifier qu'on est sur la bonne page
        if (!$('#mbcdi-start-points-container').length) {
            return;
        }

        // Charger les points existants
        if (typeof window.MBCDI_START_POINTS !== 'undefined') {
            try {
                startPoints = JSON.parse(window.MBCDI_START_POINTS);
            } catch (e) {
                startPoints = window.MBCDI_START_POINTS || [];
            }
        }

        if (!Array.isArray(startPoints)) {
            startPoints = [];
        }

        renderStartPointsList();
        initStartPointsMap();
        bindEvents();
    });

    function bindEvents() {
        // Ajouter un point
        $(document).on('click', '#mbcdi-add-start-point', function(e) {
            e.preventDefault();
            addStartPoint();
        });

        // Supprimer un point
        $(document).on('click', '.mbcdi-delete-start-point', function(e) {
            e.preventDefault();
            const index = $(this).data('index');
            deleteStartPoint(index);
        });


        // Uploader / changer l'icône (SVG/PNG) d'un point
        $(document).on('click', '.mbcdi-upload-start-point-icon', function(e) {
            e.preventDefault();
            const $item = $(this).closest('.mbcdi-start-point-item');
            const index = $item.data('index');
            if (typeof wp === 'undefined' || !wp.media) {
                alert('Media uploader non disponible. Vérifiez que wp_enqueue_media() est chargé.');
                return;
            }
            const frame = wp.media({
                title: 'Choisir une icône (SVG/PNG)',
                button: { text: 'Utiliser cette icône' },
                multiple: false
            });
            frame.on('select', function() {
                const attachment = frame.state().get('selection').first().toJSON();
                const url = attachment.url || '';
                if (!startPoints[index]) return;
                startPoints[index].iconUrl = url;
                saveAndRender();
            });
            frame.open();
        });

        // Modifier un point
        $(document).on('change', '.mbcdi-start-point-name, .mbcdi-start-point-lat, .mbcdi-start-point-lng', function() {
            const $item = $(this).closest('.mbcdi-start-point-item');
            const index = $item.data('index');
            updateStartPoint(index);
        });
    }

    function initStartPointsMap() {
        const mapContainer = document.getElementById('mbcdi-start-points-map');
        if (!mapContainer) {
            console.log('MBCDI: conteneur carte start points introuvable');
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

            startPointsMap = L.map('mbcdi-start-points-map').setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                maxZoom: 19,
                attribution: ''
            }).addTo(startPointsMap);

            // Afficher les points existants
            renderPointsOnMap();

            // Permettre d'ajouter des points en cliquant sur la carte
            startPointsMap.on('click', function(e) {
                const name = prompt('Nom du point de départ (ex: "Entrée Nord") :');
                if (name) {
                    startPoints.push({
                        name: name,
                        lat: e.latlng.lat,
                        lng: e.latlng.lng,
                        iconUrl: ''
                    });
                    saveAndRender();
                }
            });

        } catch (error) {
            console.error('MBCDI: erreur init carte start points:', error);
        }
    }

    function renderPointsOnMap() {
        if (!startPointsMap) return;

        // Nettoyer les marqueurs existants
        tempMarkers.forEach(m => startPointsMap.removeLayer(m));
        tempMarkers = [];

        // Ajouter les marqueurs
        startPoints.forEach(function(point, index) {
            const marker = L.marker([point.lat, point.lng], { draggable: true })
                .addTo(startPointsMap)
                .bindPopup('<strong>' + escapeHtml(point.name) + '</strong>');

            marker.on('dragend', function(e) {
                const pos = e.target.getLatLng();
                startPoints[index].lat = pos.lat;
                startPoints[index].lng = pos.lng;
                saveAndRender();
            });

            tempMarkers.push(marker);
        });
    }

    function addStartPoint() {
        const name = prompt('Nom du point de départ (ex: "Entrée Nord") :');
        if (!name) return;

        // Position par défaut au centre de la carte
        const center = startPointsMap ? startPointsMap.getCenter() : { lat: 48.8566, lng: 2.3522 };

        startPoints.push({
            name: name,
            lat: center.lat,
            lng: center.lng,
            iconUrl: ''
        });

        saveAndRender();
    }

    function deleteStartPoint(index) {
        if (!confirm('Supprimer ce point de départ ?')) return;
        startPoints.splice(index, 1);
        saveAndRender();
    }

    function updateStartPoint(index) {
        const $item = $('.mbcdi-start-point-item[data-index="' + index + '"]');
        const name = $item.find('.mbcdi-start-point-name').val();
        const lat = parseFloat($item.find('.mbcdi-start-point-lat').val());
        const lng = parseFloat($item.find('.mbcdi-start-point-lng').val());

        if (name && !isNaN(lat) && !isNaN(lng)) {
            startPoints[index] = { name: name, lat: lat, lng: lng, iconUrl: (startPoints[index] && startPoints[index].iconUrl) ? startPoints[index].iconUrl : '' };
            saveAndRender();
        }
    }

    function renderStartPointsList() {
        const $list = $('#mbcdi-start-points-list');
        if (!$list.length) return;

        $list.empty();

        if (startPoints.length === 0) {
            $list.html('<p style="color:#999;font-style:italic;">Aucun point de départ. Cliquez sur "Ajouter" ou cliquez sur la carte ci-dessous.</p>');
            return;
        }

        startPoints.forEach(function(point, index) {
            const iconHtml = point.iconUrl ? '<img src="' + point.iconUrl + '" alt="" style="max-width:100%;max-height:100%;object-fit:contain;" />' : '<span style="font-size:11px;color:#777;">Aucune</span>';
            const html = `
                <div class="mbcdi-start-point-item" data-index="${index}" style="padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px;background:#fafafa;">
                    <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
                        <div class="mbcdi-start-point-icon-preview" style="width:44px;height:44px;border:1px solid #ddd;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">${iconHtml}</div>
                        <button type="button" class="button button-small mbcdi-upload-start-point-icon" data-index="${index}">🖼️ Icône</button>
                        <input type="text" class="mbcdi-start-point-name" value="${escapeHtml(point.name)}" placeholder="Nom" style="flex:2;" />
                        <button type="button" class="button button-small mbcdi-delete-start-point" data-index="${index}" style="color:#dc3232;">✕ Supprimer</button>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <div style="flex:1;">
                            <label style="font-size:11px;color:#666;">Latitude</label>
                            <input type="text" class="mbcdi-start-point-lat" value="${point.lat.toFixed(6)}" style="width:100%;" />
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px;color:#666;">Longitude</label>
                            <input type="text" class="mbcdi-start-point-lng" value="${point.lng.toFixed(6)}" style="width:100%;" />
                        </div>
                    </div>
                </div>
            `;
            $list.append(html);
        });
    }

    function saveAndRender() {
        // Sauvegarder dans le champ hidden
        $('#mbcdi_start_points_data').val(JSON.stringify(startPoints));
        
        // Re-render
        renderStartPointsList();
        renderPointsOnMap();
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})(jQuery);
