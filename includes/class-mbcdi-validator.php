<?php
/**
 * MBCDI Validator V4
 * @package MBCDI
 * @version 5.4.2
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class MBCDI_Validator {

    public static function validate_coordinates( $lat, $lng ): bool {
        $lat = floatval( $lat );
        $lng = floatval( $lng );
        return $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180;
    }

    public static function sanitize_coordinate_point( $point ): array {
        if ( ! is_array( $point ) || ! isset( $point['lat'], $point['lng'] ) ) {
            return [ 'lat' => 0, 'lng' => 0 ];
        }
        $lat = floatval( str_replace( ',', '.', $point['lat'] ) );
        $lng = floatval( str_replace( ',', '.', $point['lng'] ) );
        if ( ! self::validate_coordinates( $lat, $lng ) ) {
            return [ 'lat' => 0, 'lng' => 0 ];
        }
        return [ 'lat' => $lat, 'lng' => $lng ];
    }

    public static function sanitize_plugin_settings( array $input ): array {
        $output = [];
        
        $output['map_provider'] = isset( $input['map_provider'] ) && $input['map_provider'] === 'mapbox' ? 'mapbox' : 'leaflet';
        $output['mapbox_api_key'] = isset( $input['mapbox_api_key'] ) ? sanitize_text_field( $input['mapbox_api_key'] ) : '';
        $output['enable_geolocation'] = ! empty( $input['enable_geolocation'] ) ? 1 : 0;
        $output['demo_mode'] = ! empty( $input['demo_mode'] ) ? 1 : 0;
        
        $lat = isset( $input['demo_fixed_lat'] ) ? trim( $input['demo_fixed_lat'] ) : '';
        $lng = isset( $input['demo_fixed_lng'] ) ? trim( $input['demo_fixed_lng'] ) : '';
        if ( $lat !== '' && $lng !== '' && self::validate_coordinates( $lat, $lng ) ) {
            $output['demo_fixed_lat'] = (string) floatval( $lat );
            $output['demo_fixed_lng'] = (string) floatval( $lng );
        } else {
            $output['demo_fixed_lat'] = '';
            $output['demo_fixed_lng'] = '';
        }
        
        $output['theme'] = isset( $input['theme'] ) && $input['theme'] === 'dark' ? 'dark' : 'light';
        $output['marker_icon_id'] = isset( $input['marker_icon_id'] ) ? (int) $input['marker_icon_id'] : 0;
        $output['geoloc_icon_id'] = isset( $input['geoloc_icon_id'] ) ? (int) $input['geoloc_icon_id'] : 0;
        
        $radius = isset( $input['nearby_radius'] ) ? (int) $input['nearby_radius'] : 500;
        $output['nearby_radius'] = ( $radius >= 100 && $radius <= 10000 ) ? $radius : 500;
        
        $output['transport_change_url'] = isset( $input['transport_change_url'] ) ? esc_url_raw( $input['transport_change_url'] ) : ( isset( $input['transport_link_url'] ) ? esc_url_raw( $input['transport_link_url'] ) : '' );

        
        $output['routing_enabled'] = ! empty( $input['routing_enabled'] ) ? 1 : 0;
        $output['routing_default_profile'] = isset( $input['routing_default_profile'] ) && in_array( $input['routing_default_profile'], [ 'foot', 'bike', 'car' ] ) ? $input['routing_default_profile'] : 'foot';
        $output['routing_cache_duration'] = isset( $input['routing_cache_duration'] ) ? (int) $input['routing_cache_duration'] : 3600;
        
        
        // Serveurs OSRM personnalisés (optionnels)
        $output['osrm_server_car']  = isset( $input['osrm_server_car'] ) ? esc_url_raw( $input['osrm_server_car'] ) : '';
        $output['osrm_server_bike'] = isset( $input['osrm_server_bike'] ) ? esc_url_raw( $input['osrm_server_bike'] ) : '';
        $output['osrm_server_foot'] = isset( $input['osrm_server_foot'] ) ? esc_url_raw( $input['osrm_server_foot'] ) : '';
        
        // Logo UI (frontend)
        $output['ui_logo_id'] = isset( $input['ui_logo_id'] ) ? intval( $input['ui_logo_id'] ) : 0;

return $output;
    }
}
