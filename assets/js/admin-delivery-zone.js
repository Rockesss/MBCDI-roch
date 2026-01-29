/**
 * MBCDI Admin Delivery Zone
 * Gestion des zones de livraison avec helpers visuels
 * @version 5.5.0
 */
(function($) {
    'use strict';

    let zoneLocationMap = null;

    $(document).ready(function() {
        // Vérifier qu'on est sur la bonne page
        if (!$('#mbcdi-zone-pick-location').length) {
            return;
        }

        initLocationPicker();
        initCopyCoordinates();
    });

    /**
     * Initialiser le sélecteur de position sur carte
     */
    function initLocationPicker() {
        $('#mbcdi-zone-pick-location').on('click', function(e) {
            e.preventDefault();
            
            const $container = $('#mbcdi-zone-location-map-container');
            const $button = $(this);
            
            if ($container.is(':visible')) {
                $container.slideUp();
                $button.text('🗺️ Placer sur carte');
                if (zoneLocationMap) {
                    zoneLocationMap.remove();
                    zoneLocationMap = null;
                }
                return;
            }

            $container.slideDown();
            $button.text('✕ Fermer la carte');

            // Attendre que le conteneur soit visible
            setTimeout(function() {
                const mapEl = document.getElementById('mbcdi-zone-location-map');
                if (!mapEl) {
                    console.error('MBCDI: conteneur carte introuvable');
                    return;
                }

                if (typeof L === 'undefined') {
                    alert('Erreur: Leaflet non chargé. Rechargez la page.');
                    return;
                }

                try {
                    // Récupérer les coordonnées actuelles ou par défaut
                    let lat = parseFloat($('#mbcdi_lat').val()) || 48.8566;
                    let lng = parseFloat($('#mbcdi_lng').val()) || 2.3522;

                    // Nettoyer la carte existante
                    if (zoneLocationMap) {
                        zoneLocationMap.remove();
                    }

                    // Créer la carte
                    zoneLocationMap = L.map('mbcdi-zone-location-map').setView([lat, lng], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                        maxZoom: 19,
                        attribution: ''
                    }).addTo(zoneLocationMap);

                    // Ajouter un marqueur draggable
                    const marker = L.marker([lat, lng], { 
                        draggable: true,
                        title: 'Déplacez-moi pour positionner la zone'
                    }).addTo(zoneLocationMap);

                    marker.bindPopup('<strong>Zone de livraison</strong><br/>Déplacez le marqueur ou cliquez sur la carte').openPopup();

                    // Mettre à jour les coordonnées quand on déplace le marqueur
                    marker.on('dragend', function(e) {
                        const pos = e.target.getLatLng();
                        updateCoordinates(pos.lat, pos.lng);
                    });

                    // Permettre de cliquer sur la carte pour déplacer le marqueur
                    zoneLocationMap.on('click', function(e) {
                        marker.setLatLng(e.latlng);
                        updateCoordinates(e.latlng.lat, e.latlng.lng);
                        marker.openPopup();
                    });

                    // Forcer le redimensionnement
                    setTimeout(function() {
                        zoneLocationMap.invalidateSize();
                    }, 100);

                } catch (error) {
                    console.error('MBCDI: erreur init carte zone:', error);
                    alert('Impossible d\'initialiser la carte. Vérifiez que Leaflet est chargé.');
                }
            }, 100);
        });
    }

    /**
     * Mettre à jour les champs de coordonnées
     */
    function updateCoordinates(lat, lng) {
        $('#mbcdi_lat').val(lat.toFixed(6));
        $('#mbcdi_lng').val(lng.toFixed(6));
        
        // Feedback visuel
        $('#mbcdi_lat, #mbcdi_lng').css('background-color', '#d4edda');
        setTimeout(function() {
            $('#mbcdi_lat, #mbcdi_lng').css('background-color', '');
        }, 500);
    }

    /**
     * Initialiser les boutons "Copier coordonnées"
     */
    function initCopyCoordinates() {
        $(document).on('click', '.mbcdi-copy-coords', function(e) {
            e.preventDefault();
            
            const lat = $(this).data('lat');
            const lng = $(this).data('lng');
            const coords = lat + ', ' + lng;
            
            // Copier dans le presse-papier
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(coords).then(function() {
                    showCopyFeedback($(e.target), 'Coordonnées copiées !');
                }).catch(function(err) {
                    console.error('Erreur copie:', err);
                    fallbackCopy(coords, $(e.target));
                });
            } else {
                fallbackCopy(coords, $(e.target));
            }
        });
    }

    /**
     * Fallback pour la copie dans le presse-papier
     */
    function fallbackCopy(text, $button) {
        const $temp = $('<textarea>');
        $('body').append($temp);
        $temp.val(text).select();
        try {
            document.execCommand('copy');
            showCopyFeedback($button, 'Coordonnées copiées !');
        } catch (err) {
            showCopyFeedback($button, 'Erreur de copie', true);
        }
        $temp.remove();
    }

    /**
     * Afficher un feedback visuel après la copie
     */
    function showCopyFeedback($button, message, isError) {
        const originalText = $button.text();
        const color = isError ? '#dc3545' : '#28a745';
        
        $button.text(message).css({
            'color': color,
            'font-weight': 'bold'
        });
        
        setTimeout(function() {
            $button.text(originalText).css({
                'color': '',
                'font-weight': ''
            });
        }, 2000);
    }

})(jQuery);