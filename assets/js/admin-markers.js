/**
 * MBCDI Admin Markers
 * Gestion des pictogrammes sur la carte
 * @version 5.5.0
 */
(function($) {
    'use strict';

    let markersMap = null;
    let markers = [];
    let mapMarkers = [];
    let pictos = [];

    $(document).ready(function() {
        // Vérifier qu'on est sur la bonne page
        if (!$('#mbcdi-markers-container').length) {
            return;
        }

        // Charger les données
        if (typeof window.MBCDI_MARKERS !== 'undefined') {
            try {
                markers = typeof window.MBCDI_MARKERS === 'string' ? JSON.parse(window.MBCDI_MARKERS) : window.MBCDI_MARKERS;
            } catch (e) {
                markers = [];
            }
        }

        if (!Array.isArray(markers)) {
            markers = [];
        }

        if (typeof window.MBCDI_PICTOS !== 'undefined') {
            pictos = window.MBCDI_PICTOS || [];
        }

        initMarkersMap();
        bindEvents();
    });

    function bindEvents() {
        // Ajouter un marqueur
        $('#mbcdi-add-marker').on('click', function(e) {
            e.preventDefault();
            addMarker();
        });

        // Supprimer un marqueur de la liste
        $(document).on('click', '.mbcdi-delete-marker', function(e) {
            e.preventDefault();
            const index = $(this).data('index');
            deleteMarker(index);
        });
    }

    function initMarkersMap() {
        const mapContainer = document.getElementById('mbcdi-markers-map');
        if (!mapContainer) {
            console.log('MBCDI: conteneur carte markers introuvable');
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

            markersMap = L.map('mbcdi-markers-map').setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                maxZoom: 19,
                attribution: ''
            }).addTo(markersMap);

            // Afficher les marqueurs existants
            renderMarkers();

        } catch (error) {
            console.error('MBCDI: erreur init carte markers:', error);
        }
    }

    function addMarker() {
        const pictoId = $('#mbcdi-marker-picto-select').val();
        
        if (!pictoId) {
            alert('Veuillez sélectionner un pictogramme.');
            return;
        }

        // Trouver le pictogramme
        const picto = pictos.find(p => p.id == pictoId);
        if (!picto) {
            alert('Pictogramme introuvable.');
            return;
        }

        // Position au centre de la carte
        const center = markersMap.getCenter();

        const label = prompt('Label du pictogramme (optionnel) :') || picto.title;

        markers.push({
            picto_id: parseInt(pictoId),
            lat: center.lat,
            lng: center.lng,
            label: label,
            iconUrl: picto.thumb
        });

        saveAndRender();
        showNotification('Pictogramme ajouté ! Déplacez-le sur la carte.', 'success');
    }

    function deleteMarker(index) {
        if (!confirm('Supprimer ce pictogramme ?')) return;
        markers.splice(index, 1);
        saveAndRender();
    }

    function renderMarkers() {
        if (!markersMap) return;

        // Nettoyer les marqueurs existants
        mapMarkers.forEach(m => markersMap.removeLayer(m));
        mapMarkers = [];

        // Ajouter les marqueurs
        markers.forEach(function(marker, index) {
            if (!marker.lat || !marker.lng) return;

            let leafletMarker;

            if (marker.iconUrl) {
                const icon = L.icon({
                    iconUrl: marker.iconUrl,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20]
                });
                leafletMarker = L.marker([marker.lat, marker.lng], { 
                    icon: icon,
                    draggable: true 
                });
            } else {
                leafletMarker = L.marker([marker.lat, marker.lng], { 
                    draggable: true 
                });
            }

            leafletMarker.addTo(markersMap);

            // Popup avec infos
            const popupContent = `
                <div>
                    <strong>${escapeHtml(marker.label || 'Pictogramme')}</strong><br/>
                    <small>${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}</small><br/>
                    <button class="button button-small mbcdi-delete-marker" data-index="${index}" style="margin-top:5px;">Supprimer</button>
                </div>
            `;
            leafletMarker.bindPopup(popupContent);

            // Drag event
            leafletMarker.on('dragend', function(e) {
                const pos = e.target.getLatLng();
                markers[index].lat = pos.lat;
                markers[index].lng = pos.lng;
                saveMarkers();
                showNotification('Position mise à jour', 'success');
            });

            mapMarkers.push(leafletMarker);
        });
    }

    function saveAndRender() {
        saveMarkers();
        renderMarkers();
    }

    function saveMarkers() {
        $('#mbcdi_markers_data').val(JSON.stringify(markers));
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

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})(jQuery);
