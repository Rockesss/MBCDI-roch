<?php
/**
 * MBCDI Router V4 - Intégration OSRM avec support hybride
 * Utilise le serveur FOSSGIS (https://routing.openstreetmap.de)
 * Support des waypoints multiples et segments manuels
 * 
 * @package MBCDI
 * @version 5.4.2
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class MBCDI_Router {

    /**
     * Limite prudente de points (départ + waypoints + arrivée) par requête OSRM.
     * Au-delà, on découpe automatiquement en plusieurs appels et on recompose.
     */
    private const MAX_POINTS_PER_REQUEST = 50;

    /**
     * URLs des serveurs OSRM FOSSGIS
     */
    private const OSRM_SERVERS = [
        'car'  => 'https://routing.openstreetmap.de/routed-car',
        'bike' => 'https://routing.openstreetmap.de/routed-bike',
        'foot' => 'https://routing.openstreetmap.de/routed-foot',
    ];

    /**
     * Mapping des profils internes vers OSRM
     */
    private const PROFILE_MAP = [
        'driving'  => 'car',
        'voiture'  => 'car',
        'car'      => 'car',
        'cycling'  => 'bike',
        'velo'     => 'bike',
        'vélo'     => 'bike',
        'bike'     => 'bike',
        'walking'  => 'foot',
        'pieton'   => 'foot',
        'piéton'   => 'foot',
        'foot'     => 'foot',
        'marche'   => 'foot',
    ];

    /**
     * Cache des routes (transient WordPress)
     */
    private const CACHE_PREFIX = 'mbcdi_route_v4_';
    
    /**
     * Obtenir la durée du cache depuis les settings
     */
    private static function get_cache_duration(): int {
        $settings = get_option( 'mbcdi_settings', [] );
        return isset( $settings['routing_cache_duration'] ) ? (int) $settings['routing_cache_duration'] : 3600;
    }

    /**
     * Obtenir l'URL du serveur OSRM (supporte une surcharge via les réglages)
     */
    private static function get_server_url( string $profile ): string {
        $settings = get_option( 'mbcdi_settings', [] );

        if ( $profile === 'car' && ! empty( $settings['osrm_server_car'] ) ) {
            return rtrim( (string) $settings['osrm_server_car'], '/' );
        }
        if ( $profile === 'bike' && ! empty( $settings['osrm_server_bike'] ) ) {
            return rtrim( (string) $settings['osrm_server_bike'], '/' );
        }
        if ( $profile === 'foot' && ! empty( $settings['osrm_server_foot'] ) ) {
            return rtrim( (string) $settings['osrm_server_foot'], '/' );
        }

        return rtrim( self::OSRM_SERVERS[ $profile ] ?? self::OSRM_SERVERS['foot'], '/' );
    }


    /**
     * Obtenir un itinéraire entre deux points
     * 
     * @param float  $start_lat  Latitude de départ
     * @param float  $start_lng  Longitude de départ
     * @param float  $end_lat    Latitude d'arrivée
     * @param float  $end_lng    Longitude d'arrivée
     * @param string $profile    Profil de transport (car, bike, foot)
     * @param array  $options    Options supplémentaires
     * @return array|WP_Error    Données de l'itinéraire ou erreur
     */
    public static function get_route( 
        float $start_lat, 
        float $start_lng, 
        float $end_lat, 
        float $end_lng, 
        string $profile = 'foot',
        array $options = []
    ) {
        return self::get_route_with_waypoints(
            $start_lat, $start_lng,
            $end_lat, $end_lng,
            [], // Pas de waypoints
            $profile,
            $options
        );
    }

    /**
     * Obtenir un itinéraire avec waypoints intermédiaires
     * C'est la méthode principale pour la V4
     * 
     * @param float  $start_lat   Latitude de départ
     * @param float  $start_lng   Longitude de départ
     * @param float  $end_lat     Latitude d'arrivée
     * @param float  $end_lng     Longitude d'arrivée
     * @param array  $waypoints   Liste de waypoints [{lat, lng}, ...]
     * @param string $profile     Profil de transport
     * @param array  $options     Options supplémentaires
     * @return array|WP_Error
     */
    public static function get_route_with_waypoints(
        float $start_lat,
        float $start_lng,
        float $end_lat,
        float $end_lng,
        array $waypoints = [],
        string $profile = 'foot',
        array $options = []
    ) {
        // Normaliser le profil
        $profile = self::normalize_profile( $profile );
        
        // Valider les coordonnées
        if ( ! MBCDI_Validator::validate_coordinates( $start_lat, $start_lng ) ) {
            return new WP_Error( 'invalid_start', __( 'Coordonnées de départ invalides', 'mbcdi' ) );
        }
        if ( ! MBCDI_Validator::validate_coordinates( $end_lat, $end_lng ) ) {
            return new WP_Error( 'invalid_end', __( 'Coordonnées d\'arrivée invalides', 'mbcdi' ) );
        }
        
        // Valider les waypoints
        $valid_waypoints = [];
        foreach ( $waypoints as $wp ) {
            if ( isset( $wp['lat'], $wp['lng'] ) && 
                 MBCDI_Validator::validate_coordinates( $wp['lat'], $wp['lng'] ) ) {
                $valid_waypoints[] = [
                    'lat' => floatval( $wp['lat'] ),
                    'lng' => floatval( $wp['lng'] ),
                ];
            }
        }

        // Vérifier le cache
        $cache_key = self::get_cache_key_multi( $start_lat, $start_lng, $end_lat, $end_lng, $valid_waypoints, $profile );
        $cached = get_transient( $cache_key );
        if ( $cached !== false ) {
            MBCDI_Logger::debug( 'Route V4 récupérée du cache', [ 'cache_key' => $cache_key ] );
            return $cached;
        }

        // Construire les coordonnées pour OSRM
        $server_url = self::get_server_url( $profile );
        
        // OSRM utilise le format longitude,latitude
        $coords_array = [];
        $coords_array[] = sprintf( '%s,%s', $start_lng, $start_lat );
        
        foreach ( $valid_waypoints as $wp ) {
            $coords_array[] = sprintf( '%s,%s', $wp['lng'], $wp['lat'] );
        }
        
        $coords_array[] = sprintf( '%s,%s', $end_lng, $end_lat );
        
        $coordinates = implode( ';', $coords_array );
        
        // Profil OSRM
        $osrm_profile = $profile === 'car' ? 'driving' : ( $profile === 'bike' ? 'cycling' : 'walking' );

        $url = sprintf(
            '%s/route/v1/%s/%s',
            $server_url,
            $osrm_profile,
            $coordinates
        );

        // Paramètres de la requête
        $params = [
            'overview'       => 'full',
            'geometries'     => 'geojson',
            'steps'          => 'true',
            'annotations'    => 'true',
            'generate_hints' => 'false',
        ];

        $params = array_merge( $params, $options );
        $url .= '?' . http_build_query( $params );

        MBCDI_Logger::debug( 'Requête OSRM V4', [ 
            'url' => $url, 
            'profile' => $profile,
            'waypoints_count' => count( $valid_waypoints ),
        ] );

        // Effectuer la requête
        $response = wp_remote_get( $url, [
            'timeout'    => 20,
            'user-agent' => 'MBCDI-WordPress-Plugin/4.8.0 (https://wordpress.org)',
            'headers'    => [
                'Accept' => 'application/json',
            ],
        ] );

        if ( is_wp_error( $response ) ) {
            MBCDI_Logger::error( 'Erreur requête OSRM V4', [
                'error' => $response->get_error_message(),
            ] );
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );

        if ( $status_code !== 200 ) {
            MBCDI_Logger::error( 'Erreur HTTP OSRM V4', [
                'status' => $status_code,
                'body'   => substr( $body, 0, 500 ),
            ] );
            return new WP_Error( 
                'osrm_http_error', 
                sprintf( __( 'Erreur serveur OSRM (code %d)', 'mbcdi' ), $status_code )
            );
        }

        $data = json_decode( $body, true );

        if ( json_last_error() !== JSON_ERROR_NONE ) {
            MBCDI_Logger::error( 'Erreur parsing JSON OSRM V4', [
                'error' => json_last_error_msg(),
            ] );
            return new WP_Error( 'osrm_json_error', __( 'Réponse OSRM invalide', 'mbcdi' ) );
        }

        if ( ! isset( $data['code'] ) || $data['code'] !== 'Ok' ) {
            $error_msg = $data['message'] ?? __( 'Itinéraire non trouvé', 'mbcdi' );
            MBCDI_Logger::warning( 'OSRM V4 route non trouvée', [
                'code'    => $data['code'] ?? 'unknown',
                'message' => $error_msg,
            ] );
            return new WP_Error( 'osrm_no_route', $error_msg );
        }

        // Parser et formater la réponse
        $route = self::parse_route_response( $data, $profile, $valid_waypoints );

        // Mettre en cache
        set_transient( $cache_key, $route, self::get_cache_duration() );

        MBCDI_Logger::info( 'Route OSRM V4 calculée', [
            'profile'   => $profile,
            'distance'  => $route['distance'],
            'duration'  => $route['duration'],
            'waypoints' => count( $valid_waypoints ),
        ] );

        return $route;
    }

    /**
     * Variante "résiliente" : découpe automatiquement en sous-requêtes si nécessaire
     * (trop de points, URL trop longue, erreurs type 414/TooBig), puis recompose.
     *
     * Retourne exactement le même format que get_route_with_waypoints().
     */
    public static function get_route_with_waypoints_resilient(
        float $start_lat,
        float $start_lng,
        float $end_lat,
        float $end_lng,
        array $waypoints = [],
        string $profile = 'foot',
        array $options = []
    ) {
        $profile = self::normalize_profile( $profile );

        // Construire la liste complète des points
        $points = [ [ 'lat' => $start_lat, 'lng' => $start_lng ] ];
        foreach ( $waypoints as $wp ) {
            if ( isset( $wp['lat'], $wp['lng'] ) ) {
                $points[] = [ 'lat' => floatval( $wp['lat'] ), 'lng' => floatval( $wp['lng'] ) ];
            }
        }
        $points[] = [ 'lat' => $end_lat, 'lng' => $end_lng ];

        // Si dans la limite : appel direct
        if ( count( $points ) <= self::MAX_POINTS_PER_REQUEST ) {
            return self::get_route_with_waypoints( $start_lat, $start_lng, $end_lat, $end_lng, $waypoints, $profile, $options );
        }

        // Découpage en chunks avec recouvrement (le dernier point de N = premier point de N+1)
        $routes = [];
        $i = 0;
        $max = self::MAX_POINTS_PER_REQUEST;
        while ( $i < count( $points ) - 1 ) {
            $chunk = array_slice( $points, $i, $max );
            if ( count( $chunk ) < 2 ) {
                break;
            }

            $chunk_start = $chunk[0];
            $chunk_end   = $chunk[ count( $chunk ) - 1 ];
            $chunk_wps   = array_slice( $chunk, 1, -1 );

            $r = self::get_route_with_waypoints(
                floatval( $chunk_start['lat'] ),
                floatval( $chunk_start['lng'] ),
                floatval( $chunk_end['lat'] ),
                floatval( $chunk_end['lng'] ),
                $chunk_wps,
                $profile,
                $options
            );

            if ( is_wp_error( $r ) ) {
                // Si le découpage a échoué, on remonte l'erreur (évite une recomposition incohérente)
                return $r;
            }
            $routes[] = $r;

            // Avancer en gardant 1 point de recouvrement
            $i = $i + $max - 1;
        }

        return self::assemble_routes( $routes, $profile );
    }

    /**
     * Recomposer plusieurs routes OSRM (issues d'un découpage) en une seule.
     */
    private static function assemble_routes( array $routes, string $profile ): array {
        $total_distance = 0;
        $total_duration = 0;
        $all_geometry   = [];
        $all_steps      = [];

        foreach ( $routes as $r ) {
            if ( empty( $r['geometry'] ) ) {
                continue;
            }
            $total_distance += floatval( $r['distance'] ?? 0 );
            $total_duration += floatval( $r['duration'] ?? 0 );

            $geometry = $r['geometry'];
            if ( ! empty( $all_geometry ) && ! empty( $geometry ) ) {
                $last = end( $all_geometry );
                $first = reset( $geometry );
                if ( $last && $first && abs( $last['lat'] - $first['lat'] ) < 0.00001 && abs( $last['lng'] - $first['lng'] ) < 0.00001 ) {
                    array_shift( $geometry );
                }
            }
            $all_geometry = array_merge( $all_geometry, $geometry );
            if ( ! empty( $r['steps'] ) && is_array( $r['steps'] ) ) {
                $all_steps = array_merge( $all_steps, $r['steps'] );
            }
        }

        return [
            'distance'   => round( $total_distance ),
            'duration'   => round( $total_duration ),
            'profile'    => $profile,
            'geometry'   => $all_geometry,
            'steps'      => $all_steps,
            'bounds'     => self::calculate_bounds( $all_geometry ),
            'assembled'  => true,
            'chunks'     => count( $routes ),
        ];
    }

    /**
     * Assembler des segments (auto + manuels) en un itinéraire complet
     * C'est la fonction clé pour le mode hybride V4
     * 
     * @param array  $segments Liste des segments
     * @param string $profile  Profil de transport
     * @return array Itinéraire complet assemblé
     */
    public static function assemble_segments( array $segments, string $profile = 'foot' ): array {
        $profile = self::normalize_profile( $profile );
        
        $total_distance = 0;
        $total_duration = 0;
        $all_geometry = [];
        $all_steps = [];
        
        foreach ( $segments as $index => $segment ) {
            $segment_type = $segment['type'] ?? 'auto';
            
            if ( $segment_type === 'auto' ) {
                // Segment calculé par OSRM
                $from = $segment['from'] ?? null;
                $to = $segment['to'] ?? null;
                $waypoints = $segment['waypoints'] ?? [];
                
                if ( ! $from || ! $to ) {
                    continue;
                }
                
                // Vérifier si on a un cache
                if ( ! empty( $segment['cached_geometry'] ) && ! empty( $segment['cached_at'] ) ) {
                    // Utiliser le cache du segment
                    $geometry = $segment['cached_geometry'];
                    $distance = $segment['cached_distance'] ?? 0;
                    $duration = $segment['cached_duration'] ?? 0;
                    $steps = $segment['cached_steps'] ?? [];
                } else {
                    // Calculer via OSRM
                    $route = self::get_route_with_waypoints_resilient(
                        floatval( $from['lat'] ),
                        floatval( $from['lng'] ),
                        floatval( $to['lat'] ),
                        floatval( $to['lng'] ),
                        $waypoints,
                        $profile
                    );
                    
                    if ( is_wp_error( $route ) ) {
                        MBCDI_Logger::warning( 'Segment auto impossible à calculer', [
                            'index' => $index,
                            'error' => $route->get_error_message(),
                        ] );
                        continue;
                    }
                    
                    $geometry = $route['geometry'];
                    $distance = $route['distance'];
                    $duration = $route['duration'];
                    $steps = $route['steps'];
                }
                
            } else {
                // Segment manuel
                // Le format cible stocke la polyline complète (départ + arrivée) dans waypoints.
                // Pour compatibilité rétro (anciennes versions) : si waypoints est vide mais from/to existent,
                // on reconstruit une polyline minimale.
                $manual_points = $segment['waypoints'] ?? [];
                if ( ( ! is_array( $manual_points ) || count( $manual_points ) < 2 ) && ! empty( $segment['from'] ) && ! empty( $segment['to'] ) ) {
                    $manual_points = [];
                    $manual_points[] = $segment['from'];
                    if ( ! empty( $segment['waypoints'] ) && is_array( $segment['waypoints'] ) ) {
                        // Anciennes versions : waypoints = points intermédiaires
                        $manual_points = array_merge( $manual_points, $segment['waypoints'] );
                    }
                    $manual_points[] = $segment['to'];
                }
                
                if ( ! is_array( $manual_points ) || count( $manual_points ) < 2 ) {
                    continue;
                }
                
                // Convertir en géométrie
                $geometry = [];
                foreach ( $manual_points as $point ) {
                    if ( isset( $point['lat'], $point['lng'] ) ) {
                        $geometry[] = [
                            'lat' => floatval( $point['lat'] ),
                            'lng' => floatval( $point['lng'] ),
                        ];
                    }
                }
                
                // Calculer la distance du segment manuel (ligne droite entre points)
                $distance = self::calculate_polyline_distance( $geometry );
                
                // Estimer la durée selon le profil
                $speed = self::get_speed_for_profile( $profile );
                $duration = $distance / $speed;
                
                // Créer une étape pour le segment manuel
                $steps = [ [
                    'instruction' => $segment['note'] ?? __( 'Suivez le tracé manuel', 'mbcdi' ),
                    'name'        => $segment['note'] ?? '',
                    'distance'    => round( $distance ),
                    'duration'    => round( $duration ),
                    'type'        => 'manual',
                    'modifier'    => '',
                    'location'    => $geometry[0] ?? null,
                ] ];
            }
            
            // Ajouter à l'itinéraire global
            $total_distance += $distance;
            $total_duration += $duration;
            
            // Fusionner la géométrie (éviter les doublons au point de jonction)
            if ( ! empty( $all_geometry ) && ! empty( $geometry ) ) {
                // Supprimer le premier point s'il est identique au dernier
                $last_point = end( $all_geometry );
                $first_point = reset( $geometry );
                
                if ( $last_point && $first_point &&
                     abs( $last_point['lat'] - $first_point['lat'] ) < 0.00001 &&
                     abs( $last_point['lng'] - $first_point['lng'] ) < 0.00001 ) {
                    array_shift( $geometry );
                }
            }
            
            $all_geometry = array_merge( $all_geometry, $geometry );
            $all_steps = array_merge( $all_steps, $steps );
        }
        
        return [
            'distance'   => round( $total_distance ),
            'duration'   => round( $total_duration ),
            'profile'    => $profile,
            'geometry'   => $all_geometry,
            'steps'      => $all_steps,
            'bounds'     => self::calculate_bounds( $all_geometry ),
            'assembled'  => true,
            'segments_count' => count( $segments ),
        ];
    }

    /**
     * Parser la réponse OSRM en format utilisable
     */
    private static function parse_route_response( array $data, string $profile, array $waypoints = [] ): array {
        $route_data = $data['routes'][0] ?? [];
        $osrm_waypoints = $data['waypoints'] ?? [];

        // Extraire la géométrie (format GeoJSON)
        $geometry = $route_data['geometry'] ?? null;
        $coordinates = [];
        
        if ( $geometry && isset( $geometry['coordinates'] ) ) {
            // GeoJSON utilise [lng, lat], on convertit en [lat, lng]
            foreach ( $geometry['coordinates'] as $coord ) {
                $coordinates[] = [
                    'lat' => $coord[1],
                    'lng' => $coord[0],
                ];
            }
        }

        // Parser les étapes de navigation
        $steps = [];
        $legs = $route_data['legs'] ?? [];
        
        foreach ( $legs as $leg_index => $leg ) {
            foreach ( ( $leg['steps'] ?? [] ) as $step ) {
                $maneuver = $step['maneuver'] ?? [];
                
                $steps[] = [
                    'instruction' => self::format_instruction( $step, $maneuver ),
                    'name'        => $step['name'] ?? '',
                    'distance'    => round( $step['distance'] ?? 0 ),
                    'duration'    => round( $step['duration'] ?? 0 ),
                    'type'        => $maneuver['type'] ?? 'unknown',
                    'modifier'    => $maneuver['modifier'] ?? '',
                    'location'    => isset( $maneuver['location'] ) ? [
                        'lat' => $maneuver['location'][1],
                        'lng' => $maneuver['location'][0],
                    ] : null,
                    'leg_index'   => $leg_index,
                ];
            }
        }

        return [
            'distance'     => round( $route_data['distance'] ?? 0 ),
            'duration'     => round( $route_data['duration'] ?? 0 ),
            'profile'      => $profile,
            'geometry'     => $coordinates,
            'steps'        => $steps,
            'waypoints'    => array_map( function( $wp ) {
                return [
                    'lat'  => $wp['location'][1] ?? 0,
                    'lng'  => $wp['location'][0] ?? 0,
                    'name' => $wp['name'] ?? '',
                ];
            }, $osrm_waypoints ),
            'summary'      => $legs[0]['summary'] ?? '',
            'bounds'       => self::calculate_bounds( $coordinates ),
            'legs_count'   => count( $legs ),
            'raw'          => $route_data,
        ];
    }

    /**
     * Formater une instruction de navigation en français
     */
    private static function format_instruction( array $step, array $maneuver ): string {
        $type = $maneuver['type'] ?? 'unknown';
        $modifier = $maneuver['modifier'] ?? '';
        $name = $step['name'] ?? '';

        $translations = [
            'depart'           => 'Partez',
            'arrive'           => 'Arrivée',
            'turn'             => 'Tournez',
            'continue'         => 'Continuez',
            'merge'            => 'Rejoignez',
            'on ramp'          => 'Prenez la bretelle',
            'off ramp'         => 'Sortez par la bretelle',
            'fork'             => 'À la fourche',
            'end of road'      => 'En fin de route',
            'new name'         => 'Continuez sur',
            'roundabout'       => 'Au rond-point',
            'rotary'           => 'Au rond-point',
            'roundabout turn'  => 'Au rond-point',
            'exit roundabout'  => 'Sortez du rond-point',
            'notification'     => '',
        ];

        $modifier_translations = [
            'left'         => 'à gauche',
            'right'        => 'à droite',
            'slight left'  => 'légèrement à gauche',
            'slight right' => 'légèrement à droite',
            'sharp left'   => 'fortement à gauche',
            'sharp right'  => 'fortement à droite',
            'straight'     => 'tout droit',
            'uturn'        => 'faites demi-tour',
        ];

        $base = $translations[ $type ] ?? 'Continuez';
        $mod = $modifier_translations[ $modifier ] ?? '';

        $instruction = $base;
        
        if ( $mod ) {
            $instruction .= ' ' . $mod;
        }
        
        if ( $name && $type !== 'depart' && $type !== 'arrive' ) {
            $instruction .= ' sur ' . $name;
        } elseif ( $name && $type === 'arrive' ) {
            $instruction .= ' : ' . $name;
        }

        return $instruction;
    }

    /**
     * Calculer les limites géographiques
     */
    private static function calculate_bounds( array $coordinates ): ?array {
        if ( empty( $coordinates ) ) {
            return null;
        }

        $min_lat = PHP_FLOAT_MAX;
        $max_lat = -PHP_FLOAT_MAX;
        $min_lng = PHP_FLOAT_MAX;
        $max_lng = -PHP_FLOAT_MAX;

        foreach ( $coordinates as $coord ) {
            if ( isset( $coord['lat'], $coord['lng'] ) ) {
                $min_lat = min( $min_lat, $coord['lat'] );
                $max_lat = max( $max_lat, $coord['lat'] );
                $min_lng = min( $min_lng, $coord['lng'] );
                $max_lng = max( $max_lng, $coord['lng'] );
            }
        }

        return [
            'southWest' => [ 'lat' => $min_lat, 'lng' => $min_lng ],
            'northEast' => [ 'lat' => $max_lat, 'lng' => $max_lng ],
        ];
    }

    /**
     * Calculer la distance d'une polyline (somme des distances entre points)
     */
    private static function calculate_polyline_distance( array $points ): float {
        $total = 0;
        
        for ( $i = 0; $i < count( $points ) - 1; $i++ ) {
            $total += self::haversine_distance(
                $points[ $i ]['lat'],
                $points[ $i ]['lng'],
                $points[ $i + 1 ]['lat'],
                $points[ $i + 1 ]['lng']
            );
        }
        
        return $total;
    }

    /**
     * Calcul de distance Haversine entre deux points
     */
    private static function haversine_distance( float $lat1, float $lng1, float $lat2, float $lng2 ): float {
        $earth_radius = 6371000; // mètres
        
        $lat1_rad = deg2rad( $lat1 );
        $lat2_rad = deg2rad( $lat2 );
        $delta_lat = deg2rad( $lat2 - $lat1 );
        $delta_lng = deg2rad( $lng2 - $lng1 );
        
        $a = sin( $delta_lat / 2 ) * sin( $delta_lat / 2 ) +
             cos( $lat1_rad ) * cos( $lat2_rad ) *
             sin( $delta_lng / 2 ) * sin( $delta_lng / 2 );
        
        $c = 2 * atan2( sqrt( $a ), sqrt( 1 - $a ) );
        
        return $earth_radius * $c;
    }

    /**
     * Obtenir la vitesse moyenne selon le profil (m/s)
     */
    private static function get_speed_for_profile( string $profile ): float {
        $speeds = [
            'foot' => 1.4,   // ~5 km/h
            'bike' => 4.2,   // ~15 km/h
            'car'  => 8.3,   // ~30 km/h (en ville)
        ];
        
        return $speeds[ $profile ] ?? 1.4;
    }

    /**
     * Formater une distance
     */
    public static function format_distance( float $meters ): string {
        if ( $meters < 1000 ) {
            return round( $meters ) . ' m';
        }
        return number_format( $meters / 1000, 1, ',', ' ' ) . ' km';
    }

    /**
     * Formater une durée
     */
    public static function format_duration( int $seconds ): string {
        if ( $seconds < 60 ) {
            return $seconds . ' sec';
        }
        
        $minutes = floor( $seconds / 60 );
        
        if ( $minutes < 60 ) {
            return $minutes . ' min';
        }
        
        $hours = floor( $minutes / 60 );
        $remaining = $minutes % 60;
        
        if ( $remaining > 0 ) {
            return $hours . 'h' . str_pad( $remaining, 2, '0', STR_PAD_LEFT );
        }
        
        return $hours . 'h';
    }

    /**
     * Normaliser le nom du profil
     * 
     * @param string $profile Profil brut (voiture, car, pieton, foot, etc.)
     * @return string Profil normalisé (car, bike, foot)
     */
    public static function normalize_profile( string $profile ): string {
        $profile = strtolower( trim( $profile ) );

        // 1) Mapping connu (compat historique : voiture/driving/pieton/etc.)
        if ( isset( self::PROFILE_MAP[ $profile ] ) ) {
            return self::PROFILE_MAP[ $profile ];
        }

        // 2) Fallback contrôlé : utiliser le profil par défaut configuré dans les réglages
        $settings = get_option( 'mbcdi_settings', [] );
        $default = isset( $settings['routing_default_profile'] ) ? (string) $settings['routing_default_profile'] : 'car';
        $default = in_array( $default, [ 'car', 'bike', 'foot' ], true ) ? $default : 'car';

        MBCDI_Logger::warning( 'Profil OSRM inconnu, fallback vers le profil par défaut', [
            'input_profile' => $profile,
            'fallback'      => $default,
        ] );

        return $default;
    }

    /**
     * Générer une clé de cache pour route avec waypoints
     */
    private static function get_cache_key_multi( 
        float $start_lat, 
        float $start_lng, 
        float $end_lat, 
        float $end_lng,
        array $waypoints,
        string $profile 
    ): string {
        $key_parts = [
            sprintf( '%.5f_%.5f', $start_lat, $start_lng ),
        ];
        
        foreach ( $waypoints as $wp ) {
            $key_parts[] = sprintf( '%.5f_%.5f', $wp['lat'], $wp['lng'] );
        }
        
        $key_parts[] = sprintf( '%.5f_%.5f', $end_lat, $end_lng );
        $key_parts[] = $profile;
        
        return self::CACHE_PREFIX . md5( implode( '_', $key_parts ) );
    }

    /**
     * Vider le cache des routes
     */
    public static function clear_cache(): int {
        global $wpdb;
        
        $deleted = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_' . self::CACHE_PREFIX . '%'
            )
        );

        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_timeout_' . self::CACHE_PREFIX . '%'
            )
        );

        MBCDI_Logger::info( 'Cache routes V4 vidé', [ 'deleted' => $deleted ] );
        
        return (int) $deleted;
    }

    /**
     * Tester la connectivité avec le serveur OSRM
     */
    public static function test_connection( string $profile = 'foot' ): array {
        $profile = self::normalize_profile( $profile );
        $server_url = self::get_server_url( $profile );

        // Profil OSRM attendu dans l'URL
        $osrm_profile = $profile === 'car' ? 'driving' : ( $profile === 'bike' ? 'cycling' : 'walking' );

        // Petite route test (Paris)
        $test_url = sprintf(
            '%s/route/v1/%s/2.3522,48.8566;2.3530,48.8570?overview=false',
            $server_url,
            $osrm_profile
        );

        $start_time = microtime( true );

        $response = wp_remote_get( $test_url, [
            'timeout'    => 10,
            'user-agent' => 'MBCDI-WordPress-Plugin/' . ( defined( 'MBCDI_VERSION' ) ? MBCDI_VERSION : '4.x' ),
            'headers'    => [ 'Accept' => 'application/json' ],
        ] );

        $elapsed = round( ( microtime( true ) - $start_time ) * 1000 );

        if ( is_wp_error( $response ) ) {
            return [
                'success' => false,
                'profile' => $profile,
                'server'  => $server_url,
                'error'   => $response->get_error_message(),
                'latency' => $elapsed . ' ms',
            ];
        }

        $status_code = wp_remote_retrieve_response_code( $response );

        return [
            'success'     => $status_code === 200,
            'profile'     => $profile,
            'server'      => $server_url,
            'status_code' => $status_code,
            'latency'     => $elapsed . ' ms',
        ];
    }

    /**
     * Alias rétrocompatible (certaines versions appellent test_osrm_connection()).
     */
    public static function test_osrm_connection( string $profile = 'foot' ): array {
        return self::test_connection( $profile );
    }

    /**
     * Obtenir les profils disponibles
     */
    public static function get_available_profiles(): array {
        return [
            'foot' => [
                'label'       => __( 'À pied', 'mbcdi' ),
                'icon'        => '🚶',
                'description' => __( 'Itinéraire piéton (ignore les sens uniques)', 'mbcdi' ),
            ],
            'bike' => [
                'label'       => __( 'Vélo', 'mbcdi' ),
                'icon'        => '🚲',
                'description' => __( 'Itinéraire cyclable', 'mbcdi' ),
            ],
            'car' => [
                'label'       => __( 'Voiture', 'mbcdi' ),
                'icon'        => '🚗',
                'description' => __( 'Itinéraire routier', 'mbcdi' ),
            ],
        ];
    }
}
