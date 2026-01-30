<?php
/**
 * MBCDI Bottom Sheet - Exemples d'utilisation
 *
 * @package MBCDI
 * @version 1.0.0
 *
 * Ce fichier contient des exemples d'utilisation du composant Bottom Sheet
 * dans différents contextes WordPress.
 */

// ============================================================
// EXEMPLE 1 : Utilisation du shortcode (le plus simple)
// ============================================================

/**
 * Dans une page/post WordPress, utilisez simplement :
 *
 * [mbcdi_bottomsheet]
 *
 * Ou avec des paramètres personnalisés :
 *
 * [mbcdi_bottomsheet
 *   id="mon-bottomsheet"
 *   initial_state="peek"
 *   enable_search="true"
 *   list_title="Nos commerces"
 *   detail_title="Informations"]
 */


// ============================================================
// EXEMPLE 2 : Utilisation dans un template PHP
// ============================================================

/**
 * Dans un template WordPress (page.php, single.php, etc.)
 */
function exemple_template_bottomsheet() {
    ?>
    <div class="ma-page-avec-carte">
        <!-- Votre carte Leaflet ici -->
        <div id="map" style="height: 100vh;"></div>

        <!-- Bottom sheet via shortcode -->
        <?php echo do_shortcode('[mbcdi_bottomsheet initial_state="peek"]'); ?>
    </div>

    <script>
    // Initialiser votre carte Leaflet
    const map = L.map('map').setView([45.75, 4.85], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Récupérer les commerces et les passer au bottom sheet
    const commerces = <?php
        $commerces = MBCDI_BottomSheet::get_commerces();
        echo MBCDI_BottomSheet::commerces_to_json($commerces);
    ?>;

    // Attendre que le bottom sheet soit initialisé
    document.addEventListener('DOMContentLoaded', function() {
        if (window.MBCDI_BottomSheet) {
            window.MBCDI_BottomSheet.setItems(commerces);

            // Ajouter des markers sur la carte
            commerces.forEach(commerce => {
                if (commerce.lat && commerce.lng) {
                    const marker = L.marker([commerce.lat, commerce.lng]).addTo(map);
                    marker.bindPopup(`<b>${commerce.nom}</b><br>${commerce.adresse}`);

                    // Clic sur marker => ouvrir le détail
                    marker.on('click', () => {
                        window.MBCDI_BottomSheet.showDetail(commerce.id);
                    });
                }
            });
        }
    });
    </script>
    <?php
}


// ============================================================
// EXEMPLE 3 : Utilisation programmatique (sans shortcode)
// ============================================================

/**
 * Dans un fichier JS personnalisé, après avoir enqueue les assets
 */
function exemple_init_manuel() {
    // D'abord, enqueue les assets
    MBCDI_BottomSheet::enqueue();

    ?>
    <!-- HTML du bottom sheet (si pas via shortcode) -->
    <div id="mbcdi-bottomsheet"
         class="mbcdi-bottomsheet"
         data-state="closed"
         data-view="list"
         role="dialog"
         aria-modal="false">

        <div class="mbcdi-bottomsheet__handle-area">
            <div class="mbcdi-bottomsheet__handle"></div>
        </div>

        <header class="mbcdi-bottomsheet__header">
            <button type="button" class="mbcdi-bottomsheet__header-btn mbcdi-bottomsheet__btn-back">←</button>
            <h2 class="mbcdi-bottomsheet__header-title">Commerces</h2>
            <button type="button" class="mbcdi-bottomsheet__header-btn mbcdi-bottomsheet__btn-close">×</button>
        </header>

        <div class="mbcdi-bottomsheet__content">
            <div class="mbcdi-bottomsheet__list"></div>
            <div class="mbcdi-bottomsheet__detail"></div>
        </div>
    </div>

    <script>
    // Initialisation manuelle
    const bottomSheet = window.MBCDI_BottomSheet;

    bottomSheet.init({
        containerSelector: '#mbcdi-bottomsheet',
        initialState: 'closed',
        enableSearch: true,
        listTitle: 'Mes commerces',
        detailTitle: 'Détails',

        // Callbacks
        onSelect: function(commerce) {
            console.log('Commerce sélectionné:', commerce);
        },

        onRoute: function(commerce) {
            console.log('Calculer itinéraire vers:', commerce);
            // Votre logique de calcul d'itinéraire
        },

        onClose: function() {
            console.log('Bottom sheet fermé');
        }
    });

    // Charger les données
    const commerces = [
        {
            id: 1,
            nom: 'Boulangerie Dupont',
            adresse: '12 Rue de la Paix, Lyon',
            lat: 45.7578,
            lng: 4.8320,
            tel: '0123456789',
            site: 'https://example.com',
            description: 'Boulangerie artisanale depuis 1950',
            horaires: [
                { jour: 'Lundi', heures: '7h-19h' },
                { jour: 'Mardi', heures: '7h-19h' },
                { jour: 'Mercredi', heures: '7h-19h' },
                { jour: 'Jeudi', heures: '7h-19h' },
                { jour: 'Vendredi', heures: '7h-19h' },
                { jour: 'Samedi', heures: '7h-13h' },
                { jour: 'Dimanche', heures: 'Fermé' }
            ],
            distance: 250 // en mètres
        },
        {
            id: 2,
            nom: 'Pharmacie Martin',
            adresse: '45 Avenue du Général Leclerc, Lyon',
            lat: 45.7600,
            lng: 4.8350,
            tel: '0987654321',
            site: 'https://pharmacie-martin.fr',
            description: 'Pharmacie de garde le week-end',
            horaires: [
                { jour: 'Lundi-Samedi', heures: '9h-20h' },
                { jour: 'Dimanche', heures: '10h-13h' }
            ],
            distance: 500
        }
    ];

    bottomSheet.setItems(commerces);

    // Ouvrir en mode peek
    bottomSheet.openPeek();
    </script>
    <?php
}


// ============================================================
// EXEMPLE 4 : Écouter les événements personnalisés
// ============================================================

/**
 * Dans votre JavaScript personnalisé
 */
?>
<script>
// Écouter les changements d'état
window.addEventListener('mbcdi:sheet:statechange', function(e) {
    console.log('État changé:', e.detail.state);
    console.log('État précédent:', e.detail.previousState);

    // Exemples d'actions selon l'état
    if (e.detail.state === 'open') {
        // Désactiver les interactions de la carte
        if (window.myLeafletMap) {
            window.myLeafletMap.dragging.disable();
        }
    } else {
        // Réactiver les interactions
        if (window.myLeafletMap) {
            window.myLeafletMap.dragging.enable();
        }
    }
});

// Écouter les sélections de commerce
window.addEventListener('mbcdi:commerce:select', function(e) {
    const commerce = e.detail.commerce;
    console.log('Commerce sélectionné:', commerce);

    // Centrer la carte sur le commerce
    if (window.myLeafletMap && commerce.lat && commerce.lng) {
        window.myLeafletMap.setView([commerce.lat, commerce.lng], 16);
    }
});

// Écouter les demandes d'itinéraire
window.addEventListener('mbcdi:commerce:route', function(e) {
    const commerce = e.detail.commerce;
    console.log('Itinéraire demandé vers:', commerce);

    // Intégration avec votre système de routing
    if (window.MBCDI_Modular && window.MBCDI_Modular.modules.routing) {
        window.MBCDI_Modular.modules.routing.calculateRoute(
            userPosition,
            [commerce.lat, commerce.lng]
        );
    }
});

// Écouter les appels téléphoniques
window.addEventListener('mbcdi:commerce:call', function(e) {
    console.log('Appel vers:', e.detail.phone);
    // Analytics ou autre tracking
});

// Écouter les visites de sites web
window.addEventListener('mbcdi:commerce:website', function(e) {
    console.log('Visite du site:', e.detail.url);
    // Analytics
});
</script>
<?php


// ============================================================
// EXEMPLE 5 : Filtrer les données avec les hooks WordPress
// ============================================================

/**
 * Filtrer la configuration du bottom sheet
 */
add_filter('mbcdi_bottomsheet_config', function($config, $atts) {
    // Personnaliser selon le contexte
    if (is_user_logged_in()) {
        $config['listTitle'] = 'Vos commerces favoris';
    }

    return $config;
}, 10, 2);

/**
 * Filtrer les commerces avant l'affichage
 */
add_filter('mbcdi_bottomsheet_commerces', function($commerces, $args) {
    // Ajouter le calcul de distance depuis la position utilisateur
    $user_lat = $_SESSION['user_lat'] ?? null;
    $user_lng = $_SESSION['user_lng'] ?? null;

    if ($user_lat && $user_lng) {
        foreach ($commerces as &$commerce) {
            if ($commerce['lat'] && $commerce['lng']) {
                $commerce['distance'] = calculer_distance(
                    $user_lat,
                    $user_lng,
                    $commerce['lat'],
                    $commerce['lng']
                );
            }
        }

        // Trier par distance
        usort($commerces, function($a, $b) {
            return ($a['distance'] ?? PHP_INT_MAX) <=> ($b['distance'] ?? PHP_INT_MAX);
        });
    }

    return $commerces;
}, 10, 2);

/**
 * Fonction helper : Calcul de distance Haversine
 */
function calculer_distance($lat1, $lng1, $lat2, $lng2) {
    $earth_radius = 6371000; // mètres

    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);

    $a = sin($dLat/2) * sin($dLat/2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLng/2) * sin($dLng/2);

    $c = 2 * atan2(sqrt($a), sqrt(1-$a));

    return $earth_radius * $c;
}


// ============================================================
// EXEMPLE 6 : Actions avant/après le rendu
// ============================================================

/**
 * Action avant le rendu du shortcode
 */
add_action('mbcdi_bottomsheet_before', function($atts) {
    // Charger des scripts supplémentaires
    wp_enqueue_script('mon-script-custom');

    // Logger
    error_log('Bottom sheet rendu avec les attributs: ' . print_r($atts, true));
});

/**
 * Action après le rendu du shortcode
 */
add_action('mbcdi_bottomsheet_after', function($atts) {
    // Injecter du HTML supplémentaire
    echo '<div class="bottomsheet-footer">Powered by MBCDI</div>';
});


// ============================================================
// EXEMPLE 7 : Intégration avec AJAX
// ============================================================

/**
 * Endpoint AJAX pour charger les commerces dynamiquement
 */
add_action('wp_ajax_get_commerces_nearby', 'ajax_get_commerces_nearby');
add_action('wp_ajax_nopriv_get_commerces_nearby', 'ajax_get_commerces_nearby');

function ajax_get_commerces_nearby() {
    check_ajax_referer('mbcdi-nonce', 'nonce');

    $lat = floatval($_POST['lat'] ?? 0);
    $lng = floatval($_POST['lng'] ?? 0);
    $radius = intval($_POST['radius'] ?? 5000); // en mètres

    // Récupérer tous les commerces
    $commerces = MBCDI_BottomSheet::get_commerces();

    // Filtrer par distance
    $commerces_proches = array_filter($commerces, function($commerce) use ($lat, $lng, $radius) {
        if (!$commerce['lat'] || !$commerce['lng']) {
            return false;
        }

        $distance = calculer_distance($lat, $lng, $commerce['lat'], $commerce['lng']);
        $commerce['distance'] = $distance;

        return $distance <= $radius;
    });

    // Trier par distance
    usort($commerces_proches, function($a, $b) {
        return $a['distance'] <=> $b['distance'];
    });

    wp_send_json_success($commerces_proches);
}

?>
<script>
// Côté client : charger les commerces via AJAX
navigator.geolocation.getCurrentPosition(function(position) {
    const data = new FormData();
    data.append('action', 'get_commerces_nearby');
    data.append('nonce', '<?php echo wp_create_nonce("mbcdi-nonce"); ?>');
    data.append('lat', position.coords.latitude);
    data.append('lng', position.coords.longitude);
    data.append('radius', 5000);

    fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
        method: 'POST',
        body: data
    })
    .then(res => res.json())
    .then(result => {
        if (result.success && window.MBCDI_BottomSheet) {
            window.MBCDI_BottomSheet.setItems(result.data);
            window.MBCDI_BottomSheet.openPeek();
        }
    });
});
</script>
<?php


// ============================================================
// EXEMPLE 8 : API JavaScript - Toutes les méthodes disponibles
// ============================================================
?>
<script>
const bs = window.MBCDI_BottomSheet;

// Initialisation
bs.init({
    containerSelector: '#mbcdi-bottomsheet',
    initialState: 'closed',
    enableSearch: true,
    onSelect: (commerce) => console.log(commerce),
    onRoute: (commerce) => console.log(commerce),
    onClose: () => console.log('closed')
});

// Gestion des données
bs.setItems([...]); // Définir les commerces
const items = bs.getItems(); // Récupérer tous les commerces
const selected = bs.getSelectedItem(); // Commerce actuellement sélectionné

// Gestion des états
bs.openPeek(); // Ouvrir en mode peek (35vh)
bs.openFull(); // Ouvrir en plein écran (92vh)
bs.close(); // Fermer complètement
const state = bs.getState(); // 'closed', 'peek' ou 'open'

// Gestion des vues
bs.showList(); // Afficher la liste des commerces
bs.showDetail(123); // Afficher le détail du commerce #123
const view = bs.getView(); // 'list' ou 'detail'

// Personnalisation
bs.setTitle('Mon titre personnalisé'); // Changer le titre du header

// Destruction
bs.destroy(); // Nettoyer complètement (remove listeners, unlock body, etc.)
</script>
<?php


// ============================================================
// EXEMPLE 9 : CSS personnalisé via variables
// ============================================================
?>
<style>
/* Personnaliser les couleurs et espacements */
:root {
    /* Couleurs */
    --mbcdi-bs-bg: #f8f9fa;
    --mbcdi-bs-accent: #ff6b35;
    --mbcdi-bs-border: #dee2e6;

    /* Hauteurs */
    --mbcdi-bs-peek-height: 40vh;
    --mbcdi-bs-open-height: 95vh;

    /* Radius */
    --mbcdi-bs-radius: 24px;

    /* Timings */
    --mbcdi-bs-transition-duration: 350ms;
}

/* Personnaliser pour un bottom sheet spécifique */
#mon-bottomsheet {
    --mbcdi-bs-accent: #6c5ce7;
}

/* Thème sombre */
@media (prefers-color-scheme: dark) {
    :root {
        --mbcdi-bs-bg: #1e1e1e;
        --mbcdi-bs-text-primary: #ffffff;
        --mbcdi-bs-accent: #00d4ff;
    }
}
</style>
<?php


// ============================================================
// EXEMPLE 10 : Intégration complète avec carte Leaflet
// ============================================================

function exemple_complet_leaflet_bottomsheet() {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <!-- Leaflet CSS -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        <!-- Bottom Sheet CSS -->
        <link rel="stylesheet" href="<?php echo MBCDI_PLUGIN_URL; ?>assets/css/mbcdi-bottomsheet.css">

        <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        #map { position: absolute; top: 0; bottom: 0; left: 0; right: 0; z-index: 1; }
        </style>
    </head>
    <body>
        <div id="map"></div>

        <?php echo do_shortcode('[mbcdi_bottomsheet initial_state="peek"]'); ?>

        <!-- Leaflet JS -->
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <!-- Bottom Sheet JS -->
        <script src="<?php echo MBCDI_PLUGIN_URL; ?>assets/js/mbcdi-bottomsheet.js"></script>

        <script>
        // Initialiser la carte
        const map = L.map('map').setView([45.75, 4.85], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Récupérer les commerces
        const commerces = <?php
            echo MBCDI_BottomSheet::commerces_to_json(
                MBCDI_BottomSheet::get_commerces()
            );
        ?>;

        // Init bottom sheet
        const bs = window.MBCDI_BottomSheet;
        bs.setItems(commerces);

        // Ajouter markers
        commerces.forEach(commerce => {
            if (commerce.lat && commerce.lng) {
                const marker = L.marker([commerce.lat, commerce.lng]).addTo(map);

                marker.on('click', () => {
                    bs.showDetail(commerce.id);
                });
            }
        });

        // Synchroniser carte avec bottom sheet
        window.addEventListener('mbcdi:commerce:select', (e) => {
            const c = e.detail.commerce;
            if (c.lat && c.lng) {
                map.setView([c.lat, c.lng], 16, { animate: true });
            }
        });

        // Désactiver drag carte quand bottom sheet ouvert
        window.addEventListener('mbcdi:sheet:statechange', (e) => {
            if (e.detail.state === 'open') {
                map.dragging.disable();
                map.scrollWheelZoom.disable();
            } else {
                map.dragging.enable();
                map.scrollWheelZoom.enable();
            }
        });
        </script>
    </body>
    </html>
    <?php
}
