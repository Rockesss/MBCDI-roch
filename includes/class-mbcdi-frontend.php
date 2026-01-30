<?php
/**
 * MBCDI Frontend
 * Rendu de la carte interactive et gestion des assets frontend
 * @package MBCDI
 * @version 5.5.1
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class MBCDI_Frontend {

    private static bool $shortcode_used = false;

    public static function register(): void {
        add_shortcode( 'itineraire_destination', [ __CLASS__, 'shortcode_destination' ] );
        add_shortcode( 'itineraire_chantier', [ __CLASS__, 'shortcode_destination' ] );
        add_action( 'wp', [ __CLASS__, 'detect_shortcode' ] );
        add_action( 'wp_enqueue_scripts', [ __CLASS__, 'register_assets' ] );
    }

    public static function detect_shortcode(): void {
        global $post;
        if ( ! is_a( $post, 'WP_Post' ) ) return;
        if ( has_shortcode( $post->post_content, 'itineraire_destination' ) || has_shortcode( $post->post_content, 'itineraire_chantier' ) ) {
            self::$shortcode_used = true;
        }
    }

    public static function register_assets(): void {
        wp_register_style( 'leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4' );
        wp_register_script( 'leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true );

        // Leaflet.Rotate - Support rotation de carte
        wp_register_style( 'leaflet-rotate', 'https://unpkg.com/@raruto/leaflet-rotate@0.2/dist/leaflet-rotate.css', [ 'leaflet' ], '0.2' );
        wp_register_script( 'leaflet-rotate', 'https://unpkg.com/@raruto/leaflet-rotate@0.2/dist/leaflet-rotate.js', [ 'leaflet' ], '0.2', true );

        // Nouveaux fichiers CSS v5.3.0 - Architecture modernisée
        wp_register_style(
            'mbcdi-frontend-core',
            MBCDI_PLUGIN_URL . 'assets/css/frontend-core.css',
            [ 'leaflet' ],
            MBCDI_VERSION
        );
        
        wp_register_style(
            'mbcdi-frontend-components',
            MBCDI_PLUGIN_URL . 'assets/css/frontend-components.css',
            [ 'mbcdi-frontend-core' ],
            MBCDI_VERSION
        );
        
        wp_register_style(
            'mbcdi-frontend-responsive',
            MBCDI_PLUGIN_URL . 'assets/css/frontend-responsive.css',
            [ 'mbcdi-frontend-components' ],
            MBCDI_VERSION
        );

        // Styles de rotation de carte (v5.5.0)
        wp_register_style(
            'mbcdi-frontend-rotation',
            MBCDI_PLUGIN_URL . 'assets/css/frontend-rotation.css',
            [ 'leaflet-rotate' ],
            MBCDI_VERSION
        );

        wp_register_style( 'mbcdi-frontend', MBCDI_PLUGIN_URL . 'assets/css/frontend.css', [ 'mbcdi-frontend-core' ], MBCDI_VERSION );
        
        // ========================================================================
        // BOTTOM SHEET V5.5.0 - Nouveau système
        // ========================================================================
        
        wp_register_style(
            'mbcdi-bottom-sheet-v5',
            MBCDI_PLUGIN_URL . 'assets/css/bottom-sheet-v5.5.0.css',
            [ 'mbcdi-frontend' ],
            MBCDI_VERSION
        );
        
        wp_register_script(
            'mbcdi-bottom-sheet-v5',
            MBCDI_PLUGIN_URL . 'assets/js/bottom-sheet-v5.5.0.js',
            [],
            MBCDI_VERSION,
            true
        );
        
        wp_register_script(
            'mbcdi-bottom-sheet-manager-v5',
            MBCDI_PLUGIN_URL . 'assets/js/bottom-sheet-manager-v5.5.0.js',
            [ 'mbcdi-bottom-sheet-v5' ],
            MBCDI_VERSION,
            true
        );
        
        wp_register_script(
            'mbcdi-integration-v5',
            MBCDI_PLUGIN_URL . 'assets/js/integration-v5.5.0.js',
            [ 'mbcdi-bottom-sheet-manager-v5' ],
            MBCDI_VERSION,
            true
        );
        
        wp_register_script(
            'mbcdi-frontend-patch-v5',
            MBCDI_PLUGIN_URL . 'assets/js/frontend-patch-v5.5.0.js',
            [],
            MBCDI_VERSION,
            true
        );
        
        // Patch pour exposer selectCommerce et gérer les événements des nouvelles cartes
        wp_register_script(
            'mbcdi-frontend-patch',
            MBCDI_PLUGIN_URL . 'assets/js/frontend-patch.js',
            [],
            MBCDI_VERSION,
            true
        );

        wp_register_script( 'mbcdi-frontend', MBCDI_PLUGIN_URL . 'assets/js/frontend.js', [ 'leaflet', 'mbcdi-frontend-patch', 'mbcdi-frontend-patch-v5' ], MBCDI_VERSION, true );

        // Frontend Main - Point d'entrée modulaire ES6 (v5.4.0)
        wp_register_script(
            'mbcdi-frontend-main',
            MBCDI_PLUGIN_URL . 'assets/js/frontend-main.js',
            [ 'leaflet', 'leaflet-rotate', 'leaflet-markercluster' ],
            MBCDI_VERSION,
            true
        );
        
        // Définir le type comme module ES6
        add_filter('script_loader_tag', function($tag, $handle) {
            if ('mbcdi-frontend-main' === $handle) {
                $tag = str_replace(' src', ' type="module" src', $tag);
            }
            return $tag;
        }, 10, 2);

        // Leaflet.markercluster pour clustering des commerces V4.9
        wp_register_style(
            'leaflet-markercluster',
            'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
            [ 'leaflet' ],
            '1.5.3'
        );

        wp_register_style(
            'leaflet-markercluster-default',
            'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
            [ 'leaflet-markercluster' ],
            '1.5.3'
        );

        wp_register_script(
            'leaflet-markercluster',
            'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
            [ 'leaflet' ],
            '1.5.3',
            true
        );

        // Nouveaux CSS V4.9
        wp_register_style(
            'mbcdi-frontend-clustering',
            MBCDI_PLUGIN_URL . 'assets/css/frontend-clustering.css',
            [ 'mbcdi-frontend' ],
            MBCDI_VERSION
        );

        wp_register_style(
            'mbcdi-autocomplete',
            MBCDI_PLUGIN_URL . 'assets/css/autocomplete.css',
            [ 'mbcdi-frontend' ],
            MBCDI_VERSION
        );

        // Cartes commerces v2 (nouveau design iOS avec SVG)
        wp_register_style(
            'mbcdi-commerce-cards-v2',
            MBCDI_PLUGIN_URL . 'assets/css/frontend-commerce-cards-v2.css',
            [ 'mbcdi-frontend' ],
            MBCDI_VERSION
        );

        wp_register_script(
            'mbcdi-commerce-cards-v2',
            MBCDI_PLUGIN_URL . 'assets/js/frontend-commerce-cards-v2.js',
            [],
            MBCDI_VERSION,
            true
        );

        // Smart Location (géolocalisation silencieuse)
        wp_register_script(
            'mbcdi-smart-location',
            MBCDI_PLUGIN_URL . 'assets/js/frontend-smart-location.js',
            [],
            MBCDI_VERSION,
            true
        );

        wp_register_style(
            'mbcdi-smart-location',
            MBCDI_PLUGIN_URL . 'assets/css/smart-location.css',
            [ 'mbcdi-frontend' ],
            MBCDI_VERSION
        );

        // Autocomplétion avancée (recherche nom + adresse, highlight)
        wp_register_script(
            'mbcdi-autocomplete',
            MBCDI_PLUGIN_URL . 'assets/js/autocomplete.js',
            [],
            MBCDI_VERSION,
            true
        );

        // Barre de recherche simplifiée
        wp_register_style(
            'mbcdi-searchbar',
            MBCDI_PLUGIN_URL . 'assets/css/searchbar.css',
            [ 'mbcdi-frontend' ],
            MBCDI_VERSION
        );

        // Interface utilisateur (modale localisation + liste commerces)
        wp_register_style(
            'mbcdi-frontend-ui',
            MBCDI_PLUGIN_URL . 'assets/css/frontend-ui.css',
            [ 'mbcdi-frontend' ],
            MBCDI_VERSION
        );

        // Intégration frontend (doit être chargé après tous les autres)
        wp_register_script(
            'mbcdi-integration',
            MBCDI_PLUGIN_URL . 'assets/js/frontend-integration.js',
            [ 'mbcdi-frontend', 'mbcdi-smart-location', 'mbcdi-autocomplete' ],
            MBCDI_VERSION,
            true
        );


        if ( self::$shortcode_used ) {
            self::enqueue_frontend_assets();
        }
}

    private static function enqueue_frontend_assets(): void {
        // Évite les doublons d'enqueue (ex: shortcode dans un widget + détection de shortcode).
        if ( wp_script_is( 'mbcdi-integration', 'enqueued' ) ) {
            return;
        }

        wp_enqueue_style( 'leaflet' );
        wp_enqueue_script( 'leaflet' );

        // Leaflet.Rotate pour rotation de carte
        wp_enqueue_style( 'leaflet-rotate' );
        wp_enqueue_script( 'leaflet-rotate' );

        // Architecture CSS v5.5.1 - Ordre optimisé pour bottom sheet
        wp_enqueue_style( 'mbcdi-frontend-core' );       // 1. Variables + reset
        wp_enqueue_style( 'mbcdi-frontend-components' ); // 2. Composants (CONSOLIDÉ 6 fichiers)
        wp_enqueue_style( 'mbcdi-frontend' );            // 3. Styles Leaflet
        wp_enqueue_style( 'mbcdi-frontend-rotation' );   // 4. Styles rotation (v5.5.0)
        wp_enqueue_style( 'mbcdi-frontend-responsive' ); // 5. Media queries
        wp_enqueue_style( 'mbcdi-bottom-sheet-v5' );     // 6. Bottom sheet (APRÈS responsive)

        wp_enqueue_style( 'leaflet-markercluster' );
        wp_enqueue_style( 'leaflet-markercluster-default' );
        wp_enqueue_script( 'leaflet-markercluster' );

        // CSS fusionnés dans frontend-components.css (v5.3.1) :
        // - frontend-clustering.css
        // - autocomplete.css
        // - frontend-ui.css
        // - commerce-cards-v2.css
        // - smart-location.css
        // - searchbar.css

        // Scripts frontend (JS toujours nécessaires)
        wp_enqueue_script( 'mbcdi-commerce-cards-v2' );
        wp_enqueue_script( 'mbcdi-smart-location' );
        wp_enqueue_script( 'mbcdi-autocomplete' );

        // SYSTÈME HYBRIDE v5.4.0 :
        // - frontend.js : Legacy (fallback pour navigateurs anciens)
        // - frontend-main.js : Modules ES6 (navigateurs modernes)
        // Les deux peuvent coexister, frontend-main.js prend le relai si supporté
        
        wp_enqueue_script( 'mbcdi-frontend' ); // Legacy
        wp_enqueue_script( 'mbcdi-frontend-main' ); // ES6 Modules

        // Integration APRÈS frontend.js (important pour l'ordre)
        wp_enqueue_script( 'mbcdi-integration' );
        
        // ========================================================================
        // BOTTOM SHEET V5.5.0 - Scripts seulement (CSS déjà chargé plus haut)
        // ========================================================================
        wp_enqueue_script( 'mbcdi-bottom-sheet-v5' );
        wp_enqueue_script( 'mbcdi-bottom-sheet-manager-v5' );
        wp_enqueue_script( 'mbcdi-integration-v5' );
    }


    public static function shortcode_destination( $atts ): string {
        self::enqueue_frontend_assets();

        $atts = shortcode_atts( [ 'chantier_id' => '', 'destination_id' => '' ], $atts );
        $destination_id = $atts['destination_id'] ?: $atts['chantier_id'];
        $settings = mbcdi()->get_settings();
        
        $args = [ 'post_type' => 'mbcdi_chantier', 'posts_per_page' => -1, 'post_status' => 'publish' ];
        if ( $destination_id ) {
            $args['p'] = (int) $destination_id;
        } else {
            $args['meta_query'] = [ 'relation' => 'OR', [ 'key' => '_mbcdi_status', 'value' => 'active' ], [ 'key' => '_mbcdi_status', 'compare' => 'NOT EXISTS' ] ];
        }

        $destinations = get_posts( $args );
        if ( ! $destinations ) return '<div class="mbcdi-error">Aucune destination configurée.</div>';

        $demo_mode = ! empty( $settings['demo_mode'] );

        $data = [
            'settings' => [
                // Langue (2 lettres) utilisée côté front pour localiser les instructions de navigation.
                // Ex: fr_FR -> fr, en_US -> en
                'lang' => strtolower( substr( determine_locale(), 0, 2 ) ),
                // La géolocalisation reste disponible même en mode démo (la position « démo » sert juste de valeur par défaut).
                'enableGeolocation' => (bool) ( $settings['enable_geolocation'] ?? false ),
                'demoMode' => $demo_mode,
                'demoFixedLat' => $settings['demo_fixed_lat'] ?? '',
                'demoFixedLng' => $settings['demo_fixed_lng'] ?? '',
                'routingEnabled' => ! empty( $settings['routing_enabled'] ),
                'defaultProfile' => $settings['routing_default_profile'] ?? 'car',
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'nonce' => wp_create_nonce( 'mbcdi_ajax' ),
                // Lien vers une page externe (BO) pour gérer/présenter le choix de véhicule.
                'transportChangeUrl' => $settings['transport_change_url'] ?? '',
            ],
            'destinations' => [],
            'startPoints' => [],
            'deliveryZones' => [],
        ];

        foreach ( $destinations as $dest ) {
            $lat = get_post_meta( $dest->ID, '_mbcdi_lat', true );
            $lng = get_post_meta( $dest->ID, '_mbcdi_lng', true );
            if ( ! $lat || ! $lng ) continue;

            // Points de départ fixes
            $start_points_json = get_post_meta( $dest->ID, '_mbcdi_start_points', true );
            if ( $start_points_json ) {
                $sp_decoded = json_decode( $start_points_json, true );
                if ( is_array( $sp_decoded ) ) {
                    foreach ( $sp_decoded as $sp ) {
                        if ( ! empty( $sp['name'] ) && ! empty( $sp['lat'] ) && ! empty( $sp['lng'] ) ) {
                            $data['startPoints'][] = [
                                'label' => $sp['name'],
                                'lat' => (float) $sp['lat'],
                                'lng' => (float) $sp['lng'],
                                'iconUrl' => isset($sp['iconUrl']) ? $sp['iconUrl'] : (isset($sp['icon_url']) ? $sp['icon_url'] : ''),
                            ];
                        }
                    }
                }
            }

            // Zone de chantier
            $zone_json = get_post_meta( $dest->ID, '_mbcdi_zone', true );
            $zone = null;
            if ( $zone_json ) {
                $zone_decoded = json_decode( $zone_json, true );
                if ( is_array( $zone_decoded ) && count( $zone_decoded ) >= 3 ) {
                    $zone = [
                        'points' => $zone_decoded,
                        'color' => get_post_meta( $dest->ID, '_mbcdi_zone_color', true ) ?: '#FF6B6B',
                        'opacity' => (float) ( get_post_meta( $dest->ID, '_mbcdi_zone_opacity', true ) ?: 0.3 ),
                    ];
                }
            }

			// Itinéraires (V5 prioritaire, fallback V4)
			$itineraries = [];
			$itin_json = get_post_meta( $dest->ID, '_mbcdi_itineraries_v5', true );
			if ( ! $itin_json ) {
				$itin_json = get_post_meta( $dest->ID, '_mbcdi_itineraries_v4', true );
			}
			if ( $itin_json ) {
				$decoded = json_decode( $itin_json, true );
				if ( is_array( $decoded ) ) {
					foreach ( $decoded as $it ) {
						// Statut explicite (par défaut: active)
						if ( ( $it['status'] ?? 'active' ) === 'active' ) {
							$itineraries[] = $it;
						}
					}
				}
			}

            // Pictogrammes
            $markers = [];
            $markers_json = get_post_meta( $dest->ID, '_mbcdi_markers', true );
            if ( $markers_json ) {
                $m = json_decode( $markers_json, true );
                if ( is_array( $m ) ) $markers = $m;
            }

            $data['destinations'][] = [
                'id' => $dest->ID,
                'title' => get_the_title( $dest->ID ),
                'lat' => (float) $lat,
                'lng' => (float) $lng,
                'address' => get_post_meta( $dest->ID, '_mbcdi_address', true ),
                'zone' => $zone,
                'itineraries' => $itineraries,
                'commerces' => self::get_commerces( $dest->ID ),
                'markers' => $markers,
            ];
        }

        
        // Zones de livraison (pour affichage front et lookup)
        $zones = get_posts( [
            'post_type' => 'mbcdi_delivery_zone',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ] );
        if ( $zones ) {
            foreach ( $zones as $z ) {
                $z_lat = get_post_meta( $z->ID, '_mbcdi_lat', true );
                $z_lng = get_post_meta( $z->ID, '_mbcdi_lng', true );
                $geom_json = get_post_meta( $z->ID, '_mbcdi_delivery_zone_geometry', true );
                $geom = null;
                if ( $geom_json ) {
                    $geom_dec = json_decode( $geom_json, true );
                    if ( is_array( $geom_dec ) && count( $geom_dec ) >= 3 ) {
                        $geom = $geom_dec;
                    }
                }
                $data['deliveryZones'][] = [
                    'id' => (int) $z->ID,
                    'name' => get_the_title( $z->ID ),
                    'lat' => $z_lat ? (float) $z_lat : null,
                    'lng' => $z_lng ? (float) $z_lng : null,
                    'address' => get_post_meta( $z->ID, '_mbcdi_address', true ),
                    'color' => get_post_meta( $z->ID, '_mbcdi_color', true ) ?: '#2D9CDB',
                    'iconUrl' => get_post_meta( $z->ID, '_mbcdi_delivery_zone_icon_url', true ),
                    'geometry' => $geom,
                ];
            }
        }

        
        // Logo UI (frontend) : toujours depuis les réglages globales
        $ui_logo_id = isset( $settings['ui_logo_id'] ) ? intval( $settings['ui_logo_id'] ) : 0;
        if ( $ui_logo_id ) {
            $logo_url = wp_get_attachment_url( $ui_logo_id );
            if ( $logo_url ) {
                $data['settings']['uiLogoUrl'] = $logo_url;
            }
        }

        $data['chantiers'] = $data['destinations'];
        
        $uid = wp_generate_uuid4();
        $var = 'MBCDI_DATA_' . str_replace( '-', '_', $uid );

        wp_localize_script( 'mbcdi-frontend', $var, $data );
        wp_add_inline_script( 'mbcdi-frontend', "document.addEventListener('DOMContentLoaded',function(){if(window.MBCDI){MBCDI.init('{$uid}','{$var}');}});" );

        $defaultMode = $settings['routing_default_profile'] ?? 'foot';
        $modeLabels = [ 'foot' => 'Piéton', 'bike' => 'Vélo', 'car' => 'Voiture' ];
        $transportChangeUrl = $settings['transport_change_url'] ?? '';
        
        // Modes disponibles (tous sauf le mode actuel)
        $otherModes = [];
        foreach ( $modeLabels as $key => $label ) {
            if ( $key !== $defaultMode ) {
                $otherModes[$key] = $label;
            }
        }

        ob_start();
        ?>
        <div class="mbcdi-app" data-mbcdi-instance="<?php echo esc_attr( $uid ); ?>">
            
            <!-- Barre de recherche compacte (par défaut: seul destination visible) -->
            <div class="mbcdi-topbar">
                <!-- Logo UI -->
                <?php if ( ! empty( $data['settings']['uiLogoUrl'] ) ) : ?>
                    <div class="mbcdi-ui-logo">
                        <img src="<?php echo esc_url( $data['settings']['uiLogoUrl'] ); ?>" alt="Logo" />
                    </div>
                <?php endif; ?>
                
                <!-- État replié: champ destination seul -->
                <div class="mbcdi-search-collapsed">
                    <div class="mbcdi-search-input-wrapper mbcdi-autocomplete-wrapper">
                        <input 
                            type="text" 
                            class="mbcdi-input-dest-main mbcdi-autocomplete-input" 
                            placeholder="Recherchez une destination..."
                            autocomplete="off"
                            data-commerce-id=""
                            data-lat=""
                            data-lng=""
                        />
                        <div class="mbcdi-autocomplete-results"></div>
                    </div>
                    <button type="button" class="mbcdi-btn-expand" title="Plus d'options">⋯</button>
                </div>
                
                <!-- État déplié: tous les champs -->
                <div class="mbcdi-search-expanded">
                    <div class="mbcdi-expanded-header">
                        <span class="mbcdi-expanded-title">Itinéraire</span>
                        <button type="button" class="mbcdi-btn-collapse">✕</button>
                    </div>
                    
                    <div class="mbcdi-expanded-fields">
                        <div class="mbcdi-field-group">
                            <label>Point de départ</label>
                            <select class="mbcdi-input-start">
                                <option value="">— Choisir —</option>
                                <?php if ( ! $demo_mode && $settings['enable_geolocation'] ) : ?>
                                <option value="geoloc">📍 Ma position</option>
                                <?php endif; ?>
                                <?php foreach ( $data['startPoints'] as $sp ) : ?>
                                <option value="<?php echo esc_attr( $sp['lat'] . ',' . $sp['lng'] ); ?>"><?php echo esc_html( $sp['label'] ); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="mbcdi-field-group">
                            <label>Destination</label>
                            <div class="mbcdi-autocomplete-wrapper">
                                <input 
                                    type="text" 
                                    class="mbcdi-input-dest mbcdi-autocomplete-input" 
                                    placeholder="Recherchez une destination..."
                                    autocomplete="off"
                                    data-commerce-id=""
                                    data-lat=""
                                    data-lng=""
                                />
                                <div class="mbcdi-autocomplete-results"></div>
                            </div>
                        </div>

                        <?php if ( ! empty( $transportChangeUrl ) ) : ?>
                        <div class="mbcdi-search-options">
                            <a class="mbcdi-transport-link" href="<?php echo esc_url( $transportChangeUrl ); ?>">Changer de mode de transport</a>
                        </div>
                        <?php endif; ?>

                        <button type="button" class="mbcdi-btn-search">Y aller</button>
                    </div>
                </div>
            </div>
            
            <!-- Carte plein écran -->
            <div class="mbcdi-map mbcdi-skeleton"></div>
            <div class="mbcdi-map-controls">
                <button type="button" class="mbcdi-btn-control mbcdi-btn-locate" title="Me localiser">📍</button>
                <?php if ( ! empty( $transportChangeUrl ) ) : ?>
                    <button type="button" class="mbcdi-btn-control mbcdi-btn-mode" title="Changer de mode de transport">🧭</button>
                <?php endif; ?>
            </div>
            
            <!-- Modale de demande de localisation -->
            <?php if ( ! $demo_mode && $settings['enable_geolocation'] ) : ?>
            <div class="mbcdi-location-modal" id="mbcdi-location-modal">
                <div class="mbcdi-location-modal-content">
                    <h2 class="mbcdi-location-modal-title">Autoriser la localisation</h2>
                    <p class="mbcdi-location-modal-text">Pour vous guider au mieux, nous avons besoin de votre localisation.</p>
                    <div class="mbcdi-location-modal-buttons">
                        <button type="button" class="mbcdi-btn-location-allow">Autoriser</button>
                        <button type="button" class="mbcdi-btn-location-deny">Refuser</button>
                    </div>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- Bottom sheet v5.5.0 - Structure simplifiée -->
            <div class="mbcdi-bottomsheet">
                <div class="mbcdi-bottomsheet-handle"></div>
                <div class="mbcdi-bottomsheet-body">
                    <!-- Le contenu sera injecté par JavaScript -->
                </div>
            </div>
            
        </div>
        <?php
        return ob_get_clean();
    }

    private static function get_commerces( int $dest_id ): array {
        $commerces = [];
        $posts = get_posts( [
            'post_type' => 'mbcdi_commerce',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'meta_query' => [ [ 'key' => '_mbcdi_chantiers', 'value' => $dest_id, 'compare' => 'LIKE' ] ],
        ] );
        foreach ( $posts as $p ) {
            $lat = get_post_meta( $p->ID, '_mbcdi_lat', true );
            $lng = get_post_meta( $p->ID, '_mbcdi_lng', true );
            if ( ! $lat || ! $lng ) continue;
            if ( get_post_meta( $p->ID, '_mbcdi_status', true ) === 'inactive' ) continue;
            $logo_id = get_post_meta( $p->ID, '_mbcdi_logo_id', true );

            // V4.4+ : un commerce est desservi via une zone de livraison.
            $delivery_zone_id = (int) get_post_meta( $p->ID, '_mbcdi_delivery_zone_id', true );
            $walking_distance = (int) get_post_meta( $p->ID, '_mbcdi_walking_distance', true );

            $commerces[] = [
                'id' => $p->ID,
                'name' => get_the_title( $p->ID ),
                'address' => get_post_meta( $p->ID, '_mbcdi_address', true ),
                'lat' => (float) $lat,
                'lng' => (float) $lng,
                'phone' => get_post_meta( $p->ID, '_mbcdi_phone', true ),
                'website' => get_post_meta( $p->ID, '_mbcdi_website', true ),
                'hours' => get_post_meta( $p->ID, '_mbcdi_hours', true ),
                'shortDesc' => get_post_meta( $p->ID, '_mbcdi_short_description', true ),
                'logoUrl' => $logo_id ? wp_get_attachment_image_url( $logo_id, 'thumbnail' ) : '',
                'deliveryZoneId' => $delivery_zone_id,
                'walkingDistance' => $walking_distance,
            ];
        }
        return $commerces;
    }
}
