<?php
/**
 * MBCDI Route Finder
 * 
 * Centralise la logique de recherche d'itinéraires :
 * - Recherche par ID (start_point_id + delivery_zone_id)
 * - Fallback intelligent
 * - Construction de géométrie depuis les segments
 * - Calcul du point QR le plus proche
 * 
 * @package MBCDI
 * @version 5.4.2
 * @since 5.4.1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class MBCDI_Route_Finder {

    /**
     * Chercher un itinéraire par ID (V5.1.0 - SYSTÈME HYBRIDE)
     * 
     * Matching par ID au lieu de coordonnées GPS :
     * - start_point_id : ID du point QR de départ
     * - delivery_zone_id : ID de la zone de livraison
     * - profile : Mode de transport
     * 
     * AVANTAGE : 1 itinéraire = plusieurs commerces (même zone)
     * 
     * @param int    $start_point_id   ID du point de départ
     * @param int    $delivery_zone_id ID de la zone de livraison
     * @param string $profile          Mode de transport normalisé (car/bike/foot)
     * @param int    $destination_id   ID de la destination
     * @return array|null              Itinéraire trouvé ou null
     */
    public static function find_by_ids(
        int $start_point_id,
        int $delivery_zone_id,
        string $profile,
        int $destination_id
    ): ?array {
        
        MBCDI_Logger::info( 'Route Finder - Recherche par ID', [
            'start_point_id' => $start_point_id,
            'delivery_zone_id' => $delivery_zone_id,
            'profile' => $profile,
            'destination_id' => $destination_id,
        ] );
        
        $itineraries = self::get_itineraries( $destination_id );
        
        if ( empty( $itineraries ) ) {
            MBCDI_Logger::warning( 'Route Finder - Aucun itinéraire trouvé' );
            return null;
        }
        
        MBCDI_Logger::info( 'Route Finder - Itinéraires trouvés', [
            'count' => count( $itineraries ),
        ] );
        
        // Chercher l'itinéraire correspondant
        foreach ( $itineraries as $itin_index => $itin ) {
            
            // 1. Vérifier le statut
            if ( ( $itin['status'] ?? 'active' ) !== 'active' ) {
                continue;
            }
            
            // 2. Vérifier le profil
            $itin_profile = MBCDI_Router::normalize_profile( $itin['profile'] ?? $itin['mode'] ?? 'foot' );
            if ( $itin_profile !== $profile ) {
                continue;
            }
            
            // 3. Vérifier les ID
            $itin_start_id = intval( $itin['start_point_id'] ?? 0 );
            $itin_zone_id = intval( $itin['delivery_zone_id'] ?? 0 );
            
            MBCDI_Logger::info( "Route Finder - Test itinéraire #{$itin_index}", [
                'cherché' => [ 'start' => $start_point_id, 'zone' => $delivery_zone_id ],
                'itinéraire' => [ 'start' => $itin_start_id, 'zone' => $itin_zone_id ],
            ] );
            
            // Match exact par ID
            if ( $itin_start_id === $start_point_id && $itin_zone_id === $delivery_zone_id ) {
                
                MBCDI_Logger::info( "Route Finder - ✅ ITINÉRAIRE TROUVÉ #{$itin_index}" );
                
                return self::build_route_from_segments( $itin );
            }
        }
        
        MBCDI_Logger::warning( 'Route Finder - Aucun itinéraire ne matche les critères' );
        return null;
    }

    /**
     * Fallback : Chercher n'importe quel itinéraire vers la zone
     * 
     * @param int    $delivery_zone_id ID de la zone de livraison
     * @param string $profile          Mode de transport normalisé
     * @param int    $destination_id   ID de la destination
     * @return array|null              Itinéraire trouvé ou null
     */
    public static function find_any_to_zone(
        int $delivery_zone_id,
        string $profile,
        int $destination_id
    ): ?array {
        
        MBCDI_Logger::info( 'Route Finder - FALLBACK : Recherche vers zone (n\'importe quel départ)' );
        
        $itineraries = self::get_itineraries( $destination_id );
        
        if ( empty( $itineraries ) ) {
            return null;
        }
        
        foreach ( $itineraries as $itin ) {
            if ( ( $itin['status'] ?? 'active' ) !== 'active' ) {
                continue;
            }
            
            $itin_profile = MBCDI_Router::normalize_profile( $itin['profile'] ?? $itin['mode'] ?? 'foot' );
            if ( $itin_profile !== $profile ) {
                continue;
            }
            
            $itin_zone_id = intval( $itin['delivery_zone_id'] ?? 0 );
            
            if ( $itin_zone_id === $delivery_zone_id ) {
                MBCDI_Logger::info( 'Route Finder - FALLBACK : Itinéraire trouvé', [
                    'start_point_id' => $itin['start_point_id'] ?? 'unknown',
                ] );
                
                return self::build_route_from_segments( $itin );
            }
        }
        
        return null;
    }

    /**
     * Trouver le point QR le plus proche de l'utilisateur
     * 
     * @param float $user_lat       Latitude utilisateur
     * @param float $user_lng       Longitude utilisateur
     * @param int   $destination_id ID de la destination
     * @return int|null             ID du point le plus proche ou null
     */
    public static function find_nearest_start_point(
        float $user_lat,
        float $user_lng,
        int $destination_id
    ): ?int {
        
        $start_points_json = get_post_meta( $destination_id, '_mbcdi_start_points', true );
        
        if ( ! $start_points_json ) {
            MBCDI_Logger::warning( 'Route Finder - Aucun point de départ configuré' );
            return null;
        }
        
        $start_points = json_decode( $start_points_json, true );
        if ( ! is_array( $start_points ) || empty( $start_points ) ) {
            return null;
        }
        
        $nearest_id = null;
        $min_distance = PHP_FLOAT_MAX;
        
        foreach ( $start_points as $point ) {
            $point_lat = floatval( $point['lat'] ?? 0 );
            $point_lng = floatval( $point['lng'] ?? 0 );
            $point_id = intval( $point['id'] ?? 0 );
            
            if ( ! $point_lat || ! $point_lng || ! $point_id ) {
                continue;
            }
            
            $distance = self::haversine_distance( $user_lat, $user_lng, $point_lat, $point_lng );
            
            if ( $distance < $min_distance ) {
                $min_distance = $distance;
                $nearest_id = $point_id;
            }
        }
        
        if ( $nearest_id ) {
            MBCDI_Logger::info( 'Route Finder - Point QR le plus proche', [
                'point_id' => $nearest_id,
                'distance' => round( $min_distance ) . 'm',
            ] );
        }
        
        return $nearest_id;
    }

    /**
     * Chercher un itinéraire manuel par coordonnées (legacy v4.4)
     * 
     * @param float  $start_lat        Latitude de départ
     * @param float  $start_lng        Longitude de départ
     * @param float  $end_lat          Latitude d'arrivée
     * @param float  $end_lng          Longitude d'arrivée
     * @param int    $delivery_zone_id ID de la zone de livraison
     * @param int    $destination_id   ID de la destination (0 = toutes)
     * @param string $profile          Mode de transport
     * @return array|null              Itinéraire trouvé ou null
     */
    public static function find_manual_route( 
        float $start_lat, 
        float $start_lng, 
        float $end_lat, 
        float $end_lng, 
        int $delivery_zone_id, 
        int $destination_id, 
        string $profile 
    ): ?array {
        if ( $destination_id <= 0 ) {
            // Chercher dans toutes les destinations
            $destinations = get_posts( [
                'post_type' => 'mbcdi_chantier',
                'posts_per_page' => -1,
                'post_status' => 'publish',
            ] );
            
            foreach ( $destinations as $dest ) {
                $route = self::find_manual_route_for_destination( 
                    $dest->ID, 
                    $start_lat, $start_lng, 
                    $end_lat, $end_lng, 
                    $profile 
                );
                if ( $route ) {
                    return $route;
                }
            }
            return null;
        }
        
        return self::find_manual_route_for_destination( 
            $destination_id, 
            $start_lat, $start_lng, 
            $end_lat, $end_lng, 
            $profile 
        );
    }

    /**
     * Construire une ligne directe (fallback)
     * 
     * @param float $start_lat Latitude de départ
     * @param float $start_lng Longitude de départ
     * @param float $end_lat   Latitude d'arrivée
     * @param float $end_lng   Longitude d'arrivée
     * @return array           Itinéraire en ligne droite
     */
    public static function build_direct_line( 
        float $start_lat, 
        float $start_lng, 
        float $end_lat, 
        float $end_lng 
    ): array {
        $distance = self::haversine_distance( $start_lat, $start_lng, $end_lat, $end_lng );
        $duration = $distance / 1.4; // ~5 km/h
        
        return [
            'distance' => $distance,
            'duration' => $duration,
            'geometry' => [
                [ 'lat' => $start_lat, 'lng' => $start_lng ],
                [ 'lat' => $end_lat, 'lng' => $end_lng ],
            ],
            'steps' => [
                [ 'instruction' => 'Direction vers la zone de livraison', 'distance' => $distance, 'duration' => $duration ],
            ],
            'source' => 'direct',
        ];
    }

    /**
     * Calcul distance Haversine
     * 
     * @param float $lat1 Latitude point 1
     * @param float $lng1 Longitude point 1
     * @param float $lat2 Latitude point 2
     * @param float $lng2 Longitude point 2
     * @return float      Distance en mètres
     */
    public static function haversine_distance( float $lat1, float $lng1, float $lat2, float $lng2 ): float {
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

    // =========================================================================
    // MÉTHODES PRIVÉES
    // =========================================================================

    /**
     * Récupérer les itinéraires d'une destination
     * 
     * @param int $destination_id ID de la destination
     * @return array              Liste des itinéraires
     */
    private static function get_itineraries( int $destination_id ): array {
        // Essayer v5 d'abord
        $itineraries_json = get_post_meta( $destination_id, '_mbcdi_itineraries_v5', true );
        
        // Fallback v4
        if ( ! $itineraries_json ) {
            $itineraries_json = get_post_meta( $destination_id, '_mbcdi_itineraries_v4', true );
        }
        
        if ( ! $itineraries_json ) {
            return [];
        }
        
        $itineraries = json_decode( $itineraries_json, true );
        
        return is_array( $itineraries ) ? $itineraries : [];
    }

    /**
     * Construire un itinéraire depuis ses segments
     * 
     * @param array $itinerary Données de l'itinéraire
     * @return array           Itinéraire formaté
     */
    private static function build_route_from_segments( array $itinerary ): array {

        // Itinéraire stocké directement avec une géométrie (pas de segments)
        if ( ! empty( $itinerary['geometry'] ) && is_array( $itinerary['geometry'] ) ) {
            $geometry = [];
            foreach ( $itinerary['geometry'] as $point ) {
                if ( isset( $point['lat'], $point['lng'] ) ) {
                    $geometry[] = [
                        'lat' => floatval( $point['lat'] ),
                        'lng' => floatval( $point['lng'] ),
                    ];
                }
            }

            return [
                'geometry' => $geometry,
                'distance' => floatval( $itinerary['distance'] ?? 0 ),
                'duration' => floatval( $itinerary['duration'] ?? 0 ),
                'itinerary_id' => $itinerary['id'] ?? '',
                'source' => 'fixed_bo',
            ];
        }
        
        if ( empty( $itinerary['segments'] ) || ! is_array( $itinerary['segments'] ) ) {
            return [
                'geometry' => [],
                'distance' => 0,
                'duration' => 0,
                'source' => 'fixed_bo',
            ];
        }
        
        $geometry = [];
        $total_distance = 0;
        $total_duration = 0;
        
        foreach ( $itinerary['segments'] as $segment ) {
            // Ajouter la géométrie du segment
            if ( isset( $segment['geometry'] ) && is_array( $segment['geometry'] ) ) {
                foreach ( $segment['geometry'] as $point ) {
                    if ( isset( $point['lat'], $point['lng'] ) ) {
                        $geometry[] = [
                            'lat' => floatval( $point['lat'] ),
                            'lng' => floatval( $point['lng'] ),
                        ];
                    }
                }
            }
            
            // Additionner distance et durée
            $total_distance += floatval( $segment['distance'] ?? 0 );
            $total_duration += floatval( $segment['duration'] ?? 0 );
        }
        
        return [
            'geometry' => $geometry,
            'distance' => $total_distance,
            'duration' => $total_duration,
            'itinerary_id' => $itinerary['id'] ?? '',
            'source' => 'fixed_bo',
        ];
    }

    /**
     * Obtenir l'itinéraire manuel pour une destination donnée (legacy)
     * 
     * @param int    $destination_id ID de la destination
     * @param float  $start_lat      Latitude de départ
     * @param float  $start_lng      Longitude de départ
     * @param float  $end_lat        Latitude d'arrivée
     * @param float  $end_lng        Longitude d'arrivée
     * @param string $profile        Mode de transport
     * @return array|null            Itinéraire trouvé ou null
     */
    private static function find_manual_route_for_destination( 
        int $destination_id, 
        float $start_lat, 
        float $start_lng, 
        float $end_lat, 
        float $end_lng, 
        string $profile 
    ): ?array {
        $itineraries_json = get_post_meta( $destination_id, '_mbcdi_itineraries_v4', true );
        if ( ! $itineraries_json ) {
            return null;
        }
        
        $itineraries = json_decode( $itineraries_json, true );
        if ( ! is_array( $itineraries ) || empty( $itineraries ) ) {
            return null;
        }
        
        // Tolérance pour la comparaison de coordonnées (environ 100m)
        $tolerance = 0.001;
        
        // Chercher un itinéraire correspondant au profil et actif
        foreach ( $itineraries as $itin ) {
            if ( ( $itin['status'] ?? 'active' ) !== 'active' ) {
                continue;
            }
            
            // Vérifier le profil
            $itin_profile = MBCDI_Router::normalize_profile( $itin['profile'] ?? $itin['mode'] ?? 'foot' );
            
            if ( $itin_profile !== $profile ) {
                continue;
            }
            
            // Vérifier s'il y a des segments
            $segments = $itin['segments'] ?? [];
            if ( empty( $segments ) ) {
                continue;
            }
            
            // Extraire les coordonnées de départ et d'arrivée
            $route_coords = self::extract_route_coordinates( $segments );
            
            if ( ! $route_coords ) {
                MBCDI_Logger::warning( 'Itinéraire sans points identifiables', [
                    'destination_id' => $destination_id,
                    'name' => $itin['name'] ?? '',
                ] );
                continue;
            }
            
            // Vérifier la correspondance avec tolérance
            $start_matches = ( abs( $route_coords['start_lat'] - $start_lat ) < $tolerance && 
                              abs( $route_coords['start_lng'] - $start_lng ) < $tolerance );
            $end_matches = ( abs( $route_coords['end_lat'] - $end_lat ) < $tolerance && 
                            abs( $route_coords['end_lng'] - $end_lng ) < $tolerance );
            
            if ( ! $start_matches || ! $end_matches ) {
                continue;
            }
            
            MBCDI_Logger::info( 'Itinéraire manuel correspondant trouvé', [
                'name' => $itin['name'] ?? '',
            ] );
            
            return self::build_manual_route( $itin, $segments, $destination_id );
        }
        
        return null;
    }

    /**
     * Extraire les coordonnées de départ et d'arrivée des segments
     * 
     * @param array $segments Liste des segments
     * @return array|null     Coordonnées ou null
     */
    private static function extract_route_coordinates( array $segments ): ?array {
        $first_segment = $segments[0];
        $last_segment = $segments[ count( $segments ) - 1 ];
        
        // Extraire les coordonnées du premier point
        $start_lat = null;
        $start_lng = null;
        if ( ! empty( $first_segment['from']['lat'] ) && ! empty( $first_segment['from']['lng'] ) ) {
            $start_lat = floatval( $first_segment['from']['lat'] );
            $start_lng = floatval( $first_segment['from']['lng'] );
        } elseif ( ! empty( $first_segment['from_lat'] ) && ! empty( $first_segment['from_lng'] ) ) {
            $start_lat = floatval( $first_segment['from_lat'] );
            $start_lng = floatval( $first_segment['from_lng'] );
        } elseif ( ! empty( $first_segment['cached_geometry'][0] ) ) {
            $start_lat = floatval( $first_segment['cached_geometry'][0]['lat'] );
            $start_lng = floatval( $first_segment['cached_geometry'][0]['lng'] );
        }
        
        // Extraire les coordonnées du dernier point
        $end_lat = null;
        $end_lng = null;
        if ( ! empty( $last_segment['to']['lat'] ) && ! empty( $last_segment['to']['lng'] ) ) {
            $end_lat = floatval( $last_segment['to']['lat'] );
            $end_lng = floatval( $last_segment['to']['lng'] );
        } elseif ( ! empty( $last_segment['to_lat'] ) && ! empty( $last_segment['to_lng'] ) ) {
            $end_lat = floatval( $last_segment['to_lat'] );
            $end_lng = floatval( $last_segment['to_lng'] );
        } elseif ( ! empty( $last_segment['cached_geometry'] ) ) {
            $last_geom = $last_segment['cached_geometry'];
            $last_point = end( $last_geom );
            if ( $last_point && isset( $last_point['lat'], $last_point['lng'] ) ) {
                $end_lat = floatval( $last_point['lat'] );
                $end_lng = floatval( $last_point['lng'] );
            }
        }
        
        if ( $start_lat === null || $start_lng === null || $end_lat === null || $end_lng === null ) {
            return null;
        }
        
        return [
            'start_lat' => $start_lat,
            'start_lng' => $start_lng,
            'end_lat' => $end_lat,
            'end_lng' => $end_lng,
        ];
    }

    /**
     * Construire un itinéraire manuel depuis ses segments
     * 
     * @param array $itin           Données de l'itinéraire
     * @param array $segments       Liste des segments
     * @param int   $destination_id ID de la destination
     * @return array                Itinéraire formaté
     */
    private static function build_manual_route( array $itin, array $segments, int $destination_id ): array {
        $geometry = [];
        $steps = [];
        $total_distance = 0;
        $total_duration = 0;
        
        $segment_count = count( $segments );
        for ( $idx = 0; $idx < $segment_count; $idx++ ) {
            $segment = $segments[ $idx ];
            
            // Utiliser cached_geometry en PRIORITÉ
            $seg_geometry = [];
            
            if ( ! empty( $segment['cached_geometry'] ) && is_array( $segment['cached_geometry'] ) ) {
                $seg_geometry = $segment['cached_geometry'];
            } elseif ( ! empty( $segment['geometry'] ) && is_array( $segment['geometry'] ) ) {
                $seg_geometry = $segment['geometry'];
            } elseif ( isset( $segment['from_lat'], $segment['from_lng'], $segment['to_lat'], $segment['to_lng'] ) ) {
                $seg_geometry = [
                    [ 'lat' => floatval( $segment['from_lat'] ), 'lng' => floatval( $segment['from_lng'] ) ],
                    [ 'lat' => floatval( $segment['to_lat'] ), 'lng' => floatval( $segment['to_lng'] ) ]
                ];
            }
            
            // Ajouter la géométrie dans l'ordre strict
            foreach ( $seg_geometry as $pt ) {
                if ( isset( $pt['lat'], $pt['lng'] ) ) {
                    $geometry[] = [ 
                        'lat' => floatval( $pt['lat'] ), 
                        'lng' => floatval( $pt['lng'] ) 
                    ];
                }
            }
            
            // Distance/durée
            $seg_distance = floatval( $segment['cached_distance'] ?? $segment['distance'] ?? 0 );
            $seg_duration = floatval( $segment['cached_duration'] ?? $segment['duration'] ?? 0 );
            $total_distance += $seg_distance;
            $total_duration += $seg_duration;
            
            // Étape
            $steps[] = [
                'instruction' => $segment['name'] ?? $segment['instruction'] ?? ( 'Étape ' . ( $idx + 1 ) ),
                'distance' => $seg_distance,
                'duration' => $seg_duration,
                'order' => $idx,
            ];
        }
        
        if ( count( $geometry ) < 2 ) {
            MBCDI_Logger::warning( 'Itinéraire sans géométrie suffisante', [
                'destination_id' => $destination_id,
                'name' => $itin['name'] ?? '',
                'geometry_points' => count( $geometry ),
            ] );
            return null;
        }
        
        // Utiliser distance/durée globale si définie
        if ( ! empty( $itin['total_distance'] ) ) {
            $total_distance = floatval( $itin['total_distance'] );
        }
        if ( ! empty( $itin['total_duration'] ) ) {
            $total_duration = floatval( $itin['total_duration'] );
        }
        
        return [
            'distance' => $total_distance,
            'duration' => $total_duration,
            'geometry' => $geometry,
            'steps' => $steps,
            'source' => 'manual',
            'itinerary_name' => $itin['name'] ?? '',
        ];
    }
}
