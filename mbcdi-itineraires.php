<?php
/**
 * Plugin Name: MBCDI - Itinéraires V5.5.8
 * Description: Gestion d'itinéraires par zones de livraison. Bottom sheet v5.5.8 - Résolution conflits legacy/modal.
 * Version: 5.5.8
 * Author: Roch de Dinechin
 * Text Domain: mbcdi
 * Requires PHP: 8.0
 * Requires at least: 6.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Version plugin: 5.5.8
define( 'MBCDI_VERSION', '5.5.8' );
define( 'MBCDI_PLUGIN_FILE', __FILE__ );
define( 'MBCDI_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MBCDI_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'MBCDI_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// Classes utilitaires (charger en premier car utilisées par les autres)
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-validator.php';
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-logger.php';

// Classe Router OSRM (utilisée par Route Finder et Ajax Handler)
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-router.php';

// Classes métier extraites (v5.4.1)
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-route-finder.php';
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-ajax-handler.php';

// Classes principales
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-cpt.php';
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-cpt-itineraries.php';
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-frontend.php';
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-csv-importer.php';
// Ancien système bottom sheet désactivé - remplacé par v5.5.0
// require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-bottomsheet.php';

final class MBCDI_Plugin {

    private static ?MBCDI_Plugin $instance = null;

    public static function instance(): MBCDI_Plugin {
        if ( self::$instance === null ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'init', [ $this, 'init' ] );
        add_action( 'admin_init', [ $this, 'register_settings' ] );
        add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
        
        // Action admin: purge cache OSRM
        add_action( 'admin_post_mbcdi_purge_osrm_cache', [ $this, 'handle_purge_osrm_cache' ] );

        // Enregistrer les handlers AJAX via la classe dédiée
        MBCDI_Ajax_Handler::register();
    }

    public function init(): void {
        // Initialiser le logger
        MBCDI_Logger::init( defined( 'WP_DEBUG' ) && WP_DEBUG ? 'debug' : 'info' );
        
        MBCDI_CPT::register();
        MBCDI_Frontend::register();
        
        // Consigner l'initialisation avec la version actuelle du plugin
        MBCDI_Logger::info( 'Plugin MBCDI v' . MBCDI_VERSION . ' initialisé - Mode zones de livraison' );
    }
    
    public function get_settings(): array {
        $defaults = [
            'enable_geolocation' => true,
            'routing_enabled' => true,
            'routing_default_profile' => 'car',
            'routing_cache_duration' => 3600,
            'demo_mode' => false,
            'demo_fixed_lat' => '',
            'demo_fixed_lng' => '',
        'transport_change_url' => '',
        ];
        return array_merge( $defaults, get_option( 'mbcdi_settings', [] ) );
    }

    public function register_settings(): void {
        register_setting( 'mbcdi_settings', 'mbcdi_settings', [ $this, 'sanitize_settings' ] );
    }

    public function sanitize_settings( $input ): array {
    return [
        'enable_geolocation'       => ! empty( $input['enable_geolocation'] ),
        'routing_enabled'          => ! empty( $input['routing_enabled'] ),
        'routing_default_profile'  => in_array( $input['routing_default_profile'] ?? 'car', ['car', 'bike', 'foot'], true )
            ? $input['routing_default_profile']
            : 'car',
        'routing_cache_duration'   => max( 300, min( 86400, (int) ( $input['routing_cache_duration'] ?? 3600 ) ) ),
        'demo_mode'                => ! empty( $input['demo_mode'] ),
        'demo_fixed_lat'           => $input['demo_fixed_lat'] ?? '',
        'demo_fixed_lng'           => $input['demo_fixed_lng'] ?? '',
        'osrm_server_car'          => $input['osrm_server_car'] ?? '',
        'osrm_server_bike'         => $input['osrm_server_bike'] ?? '',
        'osrm_server_foot'         => $input['osrm_server_foot'] ?? '',
        'transport_change_url'     => isset( $input['transport_change_url'] ) ? esc_url_raw( $input['transport_change_url'] ) : '',

        // AJOUT : logo UI frontend
        'ui_logo_id'               => isset( $input['ui_logo_id'] ) ? absint( $input['ui_logo_id'] ) : 0,
    ];
}


    public function add_settings_page(): void {
        // V4.4+ : placer les réglages au sein du menu du CPT "Destinations" (mbcdi_chantier)
        // pour éviter l'aller-retour dans "Réglages" et rester dans le flux métier.
        add_submenu_page(
            'edit.php?post_type=mbcdi_chantier',
            __( 'Réglages MBCDI', 'mbcdi' ),
            __( 'Réglages', 'mbcdi' ),
            'manage_options',
            'mbcdi-settings',
            [ $this, 'render_settings_page' ]
        );
    }

    /**
     * Purge le cache OSRM (transients + géométries en cache dans les itinéraires V4)
     */
    public function handle_purge_osrm_cache(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Accès refusé' );
        }
        check_admin_referer( 'mbcdi_purge_osrm_cache' );

        // 1) Supprimer les transients de routes
        global $wpdb;
        // 1) Supprimer les transients de routes (anciens + V4)
        global $wpdb;
        $patterns = [
            // Legacy
            '_transient_mbcdi_route_%',
            '_transient_timeout_mbcdi_route_%',
            '_transient_mbcdi_route_multi_%',
            '_transient_timeout_mbcdi_route_multi_%',
            // V4 Router (class-mbcdi-router)
            '_transient_mbcdi_route_v4_%',
            '_transient_timeout_mbcdi_route_v4_%',
        ];

        foreach ( $patterns as $pat ) {
            $like = $wpdb->esc_like( $pat );
            // esc_like() n'est pas faite pour les % déjà présents dans la chaîne.
            // On garde le pattern tel quel, en remplaçant le % final par % après esc_like.
            // Ici, nos patterns finissent déjà par %, on retire d'abord le % final.
            $raw = rtrim( $pat, '%' );
            $like = $wpdb->esc_like( $raw ) . '%';
            $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like ) );
        }


        // 2) Vider les cached_geometry des itinéraires V4 sur toutes les destinations
        $destinations = get_posts( [
            'post_type'      => ['mbcdi_chantier','destination'],
            'post_status'    => 'any',
            'numberposts'    => -1,
            'fields'         => 'ids',
            'no_found_rows'  => true,
        ] );

        foreach ( $destinations as $dest_id ) {
            $itineraries = get_post_meta( $dest_id, '_mbcdi_itineraries_v4', true );
            if ( empty( $itineraries ) || ! is_array( $itineraries ) ) {
                continue;
            }
            $changed = false;
            foreach ( $itineraries as &$it ) {
                if ( empty( $it['segments'] ) || ! is_array( $it['segments'] ) ) {
                    continue;
                }
                foreach ( $it['segments'] as &$seg ) {
                    if ( isset( $seg['cached_geometry'] ) && $seg['cached_geometry'] !== '' ) {
                        $seg['cached_geometry'] = '';
                        $changed = true;
                    }
                    if ( isset( $seg['cached_route'] ) && ! empty( $seg['cached_route'] ) ) {
                        $seg['cached_route'] = [];
                        $changed = true;
                    }
                }
            }
            unset( $it, $seg );
            if ( $changed ) {
                update_post_meta( $dest_id, '_mbcdi_itineraries_v4', $itineraries );
            }
        }

        wp_safe_redirect( add_query_arg( [ 'page' => 'mbcdi-settings', 'mbcdi_cache_purged' => '1' ], admin_url( 'edit.php?post_type=mbcdi_chantier' ) ) );
        exit;
    }


function render_settings_page(): void {
        wp_enqueue_media(); // AJOUT : Charger l'uploader média WordPress
        $settings = $this->get_settings();
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( sprintf( __( 'Réglages MBCDI - Itinéraires Destinations V%s', 'mbcdi' ), MBCDI_VERSION ) ); ?></h1>
            <p class="description">
                <strong>Nouveauté V4.4 :</strong> Les itinéraires mènent maintenant vers des <strong>zones de livraison</strong> communes à plusieurs commerces.
            </p>
            <form method="post" action="options.php">
                <?php settings_fields( 'mbcdi_settings' ); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Géolocalisation', 'mbcdi' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="mbcdi_settings[enable_geolocation]" value="1" <?php checked( $settings['enable_geolocation'] ); ?> />
                                <?php esc_html_e( 'Activer la géolocalisation', 'mbcdi' ); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Lien page modes de transport', 'mbcdi' ); ?></th>
                        <td>
                            <input type="url" class="regular-text" name="mbcdi_settings[transport_change_url]" value="<?php echo esc_attr( $settings['transport_change_url'] ?? '' ); ?>" placeholder="https://exemple.com/choix-vehicule" />
                            <p class="description"><?php esc_html_e( 'URL de redirection du bouton (sans modale) pour informer/choisir le mode de transport. Laisser vide pour masquer le bouton.', 'mbcdi' ); ?></p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row"><?php esc_html_e( 'Routing automatique', 'mbcdi' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="mbcdi_settings[routing_enabled]" value="1" <?php checked( $settings['routing_enabled'] ); ?> />
                                <?php esc_html_e( 'Activer le calcul d\'itinéraire OSRM', 'mbcdi' ); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Mode de transport par défaut', 'mbcdi' ); ?></th>
                        <td>
                            <select name="mbcdi_settings[routing_default_profile]">
                                <option value="foot" <?php selected( $settings['routing_default_profile'], 'foot' ); ?>>🚶 <?php esc_html_e( 'Piéton', 'mbcdi' ); ?></option>
                                <option value="bike" <?php selected( $settings['routing_default_profile'], 'bike' ); ?>>🚲 <?php esc_html_e( 'Vélo', 'mbcdi' ); ?></option>
                                <option value="car" <?php selected( $settings['routing_default_profile'], 'car' ); ?>>🚗 <?php esc_html_e( 'Voiture', 'mbcdi' ); ?></option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Cache des itinéraires', 'mbcdi' ); ?></th>
                        <td>
                            <input type="number" name="mbcdi_settings[routing_cache_duration]" value="<?php echo esc_attr( $settings['routing_cache_duration'] ); ?>" min="300" max="86400" />
                            <?php esc_html_e( 'secondes', 'mbcdi' ); ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Mode démo', 'mbcdi' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="mbcdi_settings[demo_mode]" value="1" <?php checked( $settings['demo_mode'] ); ?> />
                                <?php esc_html_e( 'Activer le mode démo (position fixe)', 'mbcdi' ); ?>
                            </label><br/>
                            <label>
                                Lat: <input type="text" name="mbcdi_settings[demo_fixed_lat]" value="<?php echo esc_attr( $settings['demo_fixed_lat'] ); ?>" style="width:150px;" />
                            </label>
                            <label>
                                Lng: <input type="text" name="mbcdi_settings[demo_fixed_lng]" value="<?php echo esc_attr( $settings['demo_fixed_lng'] ); ?>" style="width:150px;" />
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Logo UI (frontend)', 'mbcdi' ); ?></th>
                        <td>
                            <p class="description" style="margin-bottom:10px;">
                                <?php esc_html_e( 'Logo affiché au-dessus du champ "Sélectionnez votre destination" sur le frontend.', 'mbcdi' ); ?>
                            </p>
                            <?php 
                            $ui_logo_id = isset( $settings['ui_logo_id'] ) ? intval( $settings['ui_logo_id'] ) : 0;
                            $ui_logo_url = $ui_logo_id ? wp_get_attachment_url( $ui_logo_id ) : '';
                            ?>
                            <?php if ( $ui_logo_url ): ?>
                                <img src="<?php echo esc_url( $ui_logo_url ); ?>" id="mbcdi-settings-ui-logo-preview" style="max-width:220px;max-height:80px;display:block;margin-bottom:10px;background:#fff;padding:8px;border:1px solid #ddd;border-radius:4px;" />
                            <?php else: ?>
                                <div id="mbcdi-settings-ui-logo-preview" style="display:none;margin-bottom:10px;"></div>
                            <?php endif; ?>
                            <input type="hidden" id="mbcdi_settings_ui_logo_id" name="mbcdi_settings[ui_logo_id]" value="<?php echo esc_attr( $ui_logo_id ); ?>" />
                            <button type="button" class="button" id="mbcdi_upload_settings_ui_logo"><?php esc_html_e( 'Choisir une image', 'mbcdi' ); ?></button>
                            <button type="button" class="button" id="mbcdi_remove_settings_ui_logo" <?php echo ! $ui_logo_id ? 'style="display:none;"' : ''; ?>><?php esc_html_e( 'Retirer', 'mbcdi' ); ?></button>
                        </td>
                    </tr>
                </table>
                <h2>Serveurs OSRM personnalisés (optionnel)</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">Serveur voiture</th>
                        <td><input type="url" name="mbcdi_settings[osrm_server_car]" value="<?php echo esc_attr( $settings['osrm_server_car'] ?? '' ); ?>" class="regular-text" placeholder="https://routing.openstreetmap.de/routed-car" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Serveur vélo</th>
                        <td><input type="url" name="mbcdi_settings[osrm_server_bike]" value="<?php echo esc_attr( $settings['osrm_server_bike'] ?? '' ); ?>" class="regular-text" placeholder="https://routing.openstreetmap.de/routed-bike" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Serveur piéton</th>
                        <td><input type="url" name="mbcdi_settings[osrm_server_foot]" value="<?php echo esc_attr( $settings['osrm_server_foot'] ?? '' ); ?>" class="regular-text" placeholder="https://routing.openstreetmap.de/routed-foot" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            
            <script>
            jQuery(document).ready(function($) {
                // Upload logo UI dans les réglages
                var logoUploader;
                $('#mbcdi_upload_settings_ui_logo').on('click', function(e) {
                    e.preventDefault();
                    if (logoUploader) {
                        logoUploader.open();
                        return;
                    }
                    logoUploader = wp.media({
                        title: 'Choisir un logo',
                        button: { text: 'Utiliser cette image' },
                        multiple: false,
                        library: { type: 'image' }
                    });
                    logoUploader.on('select', function() {
                        var attachment = logoUploader.state().get('selection').first().toJSON();
                        $('#mbcdi_settings_ui_logo_id').val(attachment.id);
                        var $preview = $('#mbcdi-settings-ui-logo-preview');
                        if ($preview.is('img')) {
                            $preview.attr('src', attachment.url).show();
                        } else {
                            $preview.replaceWith('<img src="' + attachment.url + '" id="mbcdi-settings-ui-logo-preview" style="max-width:220px;max-height:80px;display:block;margin-bottom:10px;background:#fff;padding:8px;border:1px solid #ddd;border-radius:4px;" />');
                        }
                        $('#mbcdi_remove_settings_ui_logo').show();
                    });
                    logoUploader.open();
                });
                
                $('#mbcdi_remove_settings_ui_logo').on('click', function(e) {
                    e.preventDefault();
                    $('#mbcdi_settings_ui_logo_id').val('');
                    $('#mbcdi-settings-ui-logo-preview').hide();
                    $(this).hide();
                });
            });
            </script>

            <?php if ( isset( $_GET['mbcdi_cache_purged'] ) && $_GET['mbcdi_cache_purged'] === '1' ) : ?>
                <div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Cache OSRM purgé.', 'mbcdi' ); ?></p></div>
            <?php endif; ?>

            <hr />
            <h2><?php esc_html_e( 'Maintenance', 'mbcdi' ); ?></h2>
            <p><?php esc_html_e( "Si le front continue d'afficher d'anciens itinéraires ou si le routage semble incohérent, vous pouvez purger le cache OSRM (routes + géométries mises en cache).", 'mbcdi' ); ?></p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <input type="hidden" name="action" value="mbcdi_purge_osrm_cache" />
                <?php wp_nonce_field( 'mbcdi_purge_osrm_cache' ); ?>
                <?php submit_button( __( 'Purger le cache OSRM', 'mbcdi' ), 'secondary', 'submit', false ); ?>
            </form>
        </div>
        <?php
    }
}

/**
 * Fonction helper pour obtenir l'instance du plugin
 */
function mbcdi(): MBCDI_Plugin {
    return MBCDI_Plugin::instance();
}

// Initialiser le plugin
mbcdi();
