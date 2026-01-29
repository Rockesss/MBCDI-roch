<?php
/**
 * MBCDI AJAX Handler
 * 
 * Centralise tous les handlers AJAX du plugin :
 * - Calcul d'itinéraires (get_route, get_route_multi)
 * - Calcul de segments (calculate_segment)
 * - Tests et maintenance (test_osrm, clear_route_cache)
 * - Logging des erreurs JS
 * 
 * @package MBCDI
 * @version 5.4.2
 * @since 5.4.1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class MBCDI_Ajax_Handler {

    /**
     * Enregistrer tous les hooks AJAX
     */
    public static function register(): void {
        // Logging des erreurs JS (public)
        add_action( 'wp_ajax_mbcdi_log_error', [ __CLASS__, 'handle_log_error' ] );
        add_action( 'wp_ajax_nopriv_mbcdi_log_error', [ __CLASS__, 'handle_log_error' ] );
        
        // Routing OSRM (public)
        add_action( 'wp_ajax_mbcdi_get_route', [ __CLASS__, 'handle_get_route' ] );
        add_action( 'wp_ajax_nopriv_mbcdi_get_route', [ __CLASS__, 'handle_get_route' ] );
        add_action( 'wp_ajax_mbcdi_get_route_multi', [ __CLASS__, 'handle_get_route_multi' ] );
        add_action( 'wp_ajax_nopriv_mbcdi_get_route_multi', [ __CLASS__, 'handle_get_route_multi' ] );
        
        // Admin uniquement
        add_action( 'wp_ajax_mbcdi_test_osrm', [ __CLASS__, 'handle_test_osrm' ] );
        add_action( 'wp_ajax_mbcdi_clear_route_cache', [ __CLASS__, 'handle_clear_route_cache' ] );
        add_action( 'wp_ajax_mbcdi_calculate_segment', [ __CLASS__, 'handle_calculate_segment' ] );
    }

    // =========================================================================
    // HANDLERS PUBLICS
    // =========================================================================

    /**
     * Handler AJAX : Obtenir un itinéraire (V5.1.0 - SYSTÈME HYBRIDE)
     * 
     * Recherche par ID (start_point_id + delivery_zone_id) avec :
     * - Détection automatique du point QR le plus proche
     * - Fallback intelligent si pas de match exact
     * - 1 itinéraire = plusieurs commerces (scalable)
     */
    public static function handle_get_route(): void {
        check_ajax_referer( 'mbcdi_ajax', 'nonce' );
        
        // Paramètres reçus
        $start_lat = self::get_float_param( 'start_lat', 'from_lat' );
        $start_lng = self::get_float_param( 'start_lng', 'from_lng' );
        $commerce_id = isset( $_POST['commerce_id'] ) ? intval( $_POST['commerce_id'] ) : 0;
        $destination_id = isset( $_POST['destination_id'] ) ? intval( $_POST['destination_id'] ) : 0;
        $profile = isset( $_POST['profile'] ) ? sanitize_text_field( $_POST['profile'] ) : 'foot';
        $start_point_id = isset( $_POST['start_point_id'] ) ? intval( $_POST['start_point_id'] ) : 0;
        
        // Validation
        if ( ! $start_lat || ! $start_lng ) {
            wp_send_json_error( [ 'message' => 'Position de départ manquante' ] );
        }
        
        if ( ! $commerce_id ) {
            wp_send_json_error( [ 'message' => 'Commerce non spécifié' ] );
        }
        
        // Normaliser le profil
        $profile = MBCDI_Router::normalize_profile( $profile );
        
        // Récupérer les infos du commerce
        $commerce_lat = floatval( get_post_meta( $commerce_id, '_mbcdi_lat', true ) );
        $commerce_lng = floatval( get_post_meta( $commerce_id, '_mbcdi_lng', true ) );
        $commerce_name = get_the_title( $commerce_id );
        $delivery_zone_id = intval( get_post_meta( $commerce_id, '_mbcdi_delivery_zone_id', true ) );
        
        if ( ! $commerce_lat || ! $commerce_lng ) {
            wp_send_json_error( [ 'message' => 'Commerce sans coordonnées GPS' ] );
        }
        
        if ( ! $delivery_zone_id ) {
            wp_send_json_error( [ 'message' => 'Commerce sans zone de livraison associée' ] );
        }
        
        // Récupérer les infos de la zone de livraison
        $zone_lat = floatval( get_post_meta( $delivery_zone_id, '_mbcdi_lat', true ) );
        $zone_lng = floatval( get_post_meta( $delivery_zone_id, '_mbcdi_lng', true ) );
        $zone_name = get_the_title( $delivery_zone_id );
        
        if ( ! $zone_lat || ! $zone_lng ) {
            wp_send_json_error( [ 'message' => 'Zone de livraison sans coordonnées GPS' ] );
        }
        
        MBCDI_Logger::info( 'AJAX get_route - Recherche itinéraire hybride', [
            'start' => [ $start_lat, $start_lng ],
            'zone' => $zone_name,
            'commerce' => $commerce_name,
            'profile' => $profile,
        ] );
        
        // 1. DÉTERMINER LE POINT DE DÉPART (QR)
        if ( ! $start_point_id ) {
            $start_point_id = MBCDI_Route_Finder::find_nearest_start_point( $start_lat, $start_lng, $destination_id );
        }
        
        if ( ! $start_point_id ) {
            MBCDI_Logger::warning( 'AJAX get_route - Aucun point de départ trouvé' );
            wp_send_json_error( [ 
                'message' => 'Aucun point de départ configuré pour cette destination.',
                'code' => 'no_start_point'
            ] );
        }
        
        // 2. CHERCHER L'ITINÉRAIRE PAR ID
        $fixed_route = MBCDI_Route_Finder::find_by_ids( 
            $start_point_id,
            $delivery_zone_id,
            $profile,
            $destination_id
        );
        
        // 3. FALLBACK : N'IMPORTE QUEL ITINÉRAIRE VERS CETTE ZONE
        if ( ! $fixed_route ) {
            MBCDI_Logger::info( 'AJAX get_route - Pas d\'itinéraire exact, tentative fallback' );
            
            $fixed_route = MBCDI_Route_Finder::find_any_to_zone(
                $delivery_zone_id,
                $profile,
                $destination_id
            );
        }
        
        // 4. SI TOUJOURS AUCUN ITINÉRAIRE
        if ( ! $fixed_route ) {
            MBCDI_Logger::warning( 'AJAX get_route - Aucun itinéraire trouvé', [
                'start_point_id' => $start_point_id,
                'delivery_zone_id' => $delivery_zone_id,
                'profile' => $profile,
            ] );
            
            wp_send_json_error( [ 
                'message' => 'Aucun itinéraire défini pour cette zone de livraison en mode ' . $profile . '.',
                'code' => 'no_route_in_bo'
            ] );
        }
        
        MBCDI_Logger::info( 'AJAX get_route - Itinéraire trouvé', [
            'segments_count' => count( $fixed_route['geometry'] ?? [] ),
            'distance' => $fixed_route['distance'] ?? 0,
        ] );
        
        // 5. CALCULER LE TRACÉ PIÉTON OSRM (ZONE → COMMERCE)
        $walking_route = MBCDI_Router::get_route(
            $zone_lat, $zone_lng,
            $commerce_lat, $commerce_lng,
            'foot'
        );
        
        $walking_geometry = [];
        $walking_distance = 0;
        $walking_duration = 0;
        
        if ( ! is_wp_error( $walking_route ) && isset( $walking_route['geometry'] ) ) {
            $walking_geometry = $walking_route['geometry'];
            $walking_distance = $walking_route['distance'] ?? 0;
            $walking_duration = $walking_route['duration'] ?? 0;
        } else {
            MBCDI_Logger::warning( 'AJAX get_route - Tracé piéton impossible, ligne droite' );
            
            $walking_geometry = [
                [ 'lat' => $zone_lat, 'lng' => $zone_lng ],
                [ 'lat' => $commerce_lat, 'lng' => $commerce_lng ],
            ];
            $walking_distance = MBCDI_Route_Finder::haversine_distance( $zone_lat, $zone_lng, $commerce_lat, $commerce_lng );
        }
        
        // 6. CONSTRUIRE LA RÉPONSE
        $response = [
            'source' => 'hybrid_v5.1',
            'delivery_type' => 'zone',
            
            'vehicle_route' => [
                'geometry' => $fixed_route['geometry'],
                'distance' => $fixed_route['distance'] ?? 0,
                'duration' => $fixed_route['duration'] ?? 0,
                'profile' => $profile,
            ],
            
            'walking_route' => [
                'geometry' => $walking_geometry,
                'distance' => $walking_distance,
                'duration' => $walking_duration,
            ],
            
            'zone_name' => $zone_name,
            'zone_lat' => $zone_lat,
            'zone_lng' => $zone_lng,
            'commerce_name' => $commerce_name,
            'commerce_lat' => $commerce_lat,
            'commerce_lng' => $commerce_lng,
            
            // Compatibilité
            'geometry' => $fixed_route['geometry'],
            'distance' => ( $fixed_route['distance'] ?? 0 ) + $walking_distance,
            'duration' => ( $fixed_route['duration'] ?? 0 ) + $walking_duration,
        ];
        
        wp_send_json_success( $response );
    }

    /**
     * Handler AJAX : Itinéraire multi-commerces
     */
    public static function handle_get_route_multi(): void {
        check_ajax_referer( 'mbcdi_ajax', 'nonce' );
        
        // À implémenter si nécessaire
        wp_send_json_error( [ 'message' => 'Not implemented yet' ] );
    }

    /**
     * Handler AJAX : Log des erreurs JS
     */
    public static function handle_log_error(): void {
        $message = isset( $_POST['message'] ) ? sanitize_text_field( $_POST['message'] ) : 'Unknown error';
        $url = isset( $_POST['url'] ) ? esc_url_raw( $_POST['url'] ) : '';
        $line = isset( $_POST['line'] ) ? intval( $_POST['line'] ) : 0;
        
        MBCDI_Logger::error( 'JS Error', [
            'message' => $message,
            'url' => $url,
            'line' => $line,
        ] );
        
        wp_send_json_success();
    }

    // =========================================================================
    // HANDLERS ADMIN
    // =========================================================================

    /**
     * Handler AJAX : Calculer un segment via OSRM (admin)
     */
    public static function handle_calculate_segment(): void {
        check_ajax_referer( 'mbcdi_ajax', 'nonce' );
        
        if ( ! current_user_can( 'edit_posts' ) ) {
            wp_send_json_error( [ 'message' => 'Permission denied' ] );
        }
        
        $from_lat = isset( $_POST['from_lat'] ) ? floatval( $_POST['from_lat'] ) : 0;
        $from_lng = isset( $_POST['from_lng'] ) ? floatval( $_POST['from_lng'] ) : 0;
        $to_lat   = isset( $_POST['to_lat'] ) ? floatval( $_POST['to_lat'] ) : 0;
        $to_lng   = isset( $_POST['to_lng'] ) ? floatval( $_POST['to_lng'] ) : 0;
        
        $settings = get_option( 'mbcdi_settings', [] );
        $profile_raw = isset( $_POST['profile'] ) ? sanitize_text_field( (string) $_POST['profile'] ) : '';
        
        // Compat: certains fronts envoient 'mode' au lieu de 'profile'
        if ( $profile_raw === '' && isset( $_POST['mode'] ) ) {
            $profile_raw = sanitize_text_field( (string) $_POST['mode'] );
        }
        
        $profile = $profile_raw !== '' ? $profile_raw : ( (string) ( $settings['routing_default_profile'] ?? 'car' ) );
        
        // Waypoints intermédiaires optionnels
        $waypoints = [];
        if ( isset( $_POST['waypoints'] ) ) {
            $waypoints_raw = json_decode( wp_unslash( $_POST['waypoints'] ), true );
            if ( is_array( $waypoints_raw ) ) {
                foreach ( $waypoints_raw as $wp ) {
                    if ( isset( $wp['lat'], $wp['lng'] ) ) {
                        $waypoints[] = [
                            'lat' => floatval( $wp['lat'] ),
                            'lng' => floatval( $wp['lng'] ),
                        ];
                    }
                }
            }
        }
        
        // Calcul résilient (découpage automatique si trop de waypoints)
        $route = MBCDI_Router::get_route_with_waypoints_resilient( 
            $from_lat, $from_lng, 
            $to_lat, $to_lng, 
            $waypoints,
            $profile 
        );
        
        if ( is_wp_error( $route ) ) {
            wp_send_json_error( [
                'message' => $route->get_error_message(),
                'code'    => $route->get_error_code(),
            ] );
        }
        
        wp_send_json_success( $route );
    }

    /**
     * Handler AJAX : Tester la connexion OSRM
     */
    public static function handle_test_osrm(): void {
        check_ajax_referer( 'mbcdi_ajax', 'nonce' );
        
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( [ 'message' => 'Permission denied' ] );
        }
        
        $result = MBCDI_Router::test_osrm_connection();
        
        if ( is_wp_error( $result ) ) {
            wp_send_json_error( [ 'message' => $result->get_error_message() ] );
        }
        
        wp_send_json_success( $result );
    }

    /**
     * Handler AJAX : Vider le cache des routes
     */
    public static function handle_clear_route_cache(): void {
        check_ajax_referer( 'mbcdi_ajax', 'nonce' );
        
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( [ 'message' => 'Permission denied' ] );
        }
        
        global $wpdb;
        $wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_mbcdi_route_%'" );
        $wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_mbcdi_route_%'" );
        
        wp_send_json_success( [ 'message' => 'Cache vidé' ] );
    }

    // =========================================================================
    // UTILITAIRES
    // =========================================================================

    /**
     * Récupérer un paramètre float avec fallback
     * 
     * @param string $primary   Nom du paramètre principal
     * @param string $fallback  Nom du paramètre de fallback
     * @return float            Valeur du paramètre
     */
    private static function get_float_param( string $primary, string $fallback = '' ): float {
        if ( isset( $_POST[ $primary ] ) ) {
            return floatval( $_POST[ $primary ] );
        }
        if ( $fallback && isset( $_POST[ $fallback ] ) ) {
            return floatval( $_POST[ $fallback ] );
        }
        return 0.0;
    }
}
