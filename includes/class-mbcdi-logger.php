<?php
/**
 * MBCDI Logger V4
 * @package MBCDI
 * @version 5.4.2
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class MBCDI_Logger {

    private static string $log_file = '';
    private static string $min_level = 'info';
    private static array $levels = [ 'debug' => 0, 'info' => 1, 'warning' => 2, 'error' => 3 ];

    public static function init( string $min_level = 'info' ): void {
        $upload_dir = wp_upload_dir();
        $log_dir = $upload_dir['basedir'] . '/mbcdi-logs';
        
        if ( ! file_exists( $log_dir ) ) {
            wp_mkdir_p( $log_dir );
            file_put_contents( $log_dir . '/.htaccess', "Deny from all\n" );
        }
        
        self::$log_file = $log_dir . '/mbcdi-' . gmdate( 'Y-m-d' ) . '.log';
        self::$min_level = $min_level;
        
        // Cleanup old logs (7 days)
        $files = glob( $log_dir . '/mbcdi-*.log' );
        $now = time();
        foreach ( $files as $file ) {
            if ( ( $now - filemtime( $file ) ) > 7 * 86400 ) {
                unlink( $file );
            }
        }
    }

    public static function log( string $message, string $level = 'info', array $context = [] ): void {
        if ( ! isset( self::$levels[ $level ] ) || self::$levels[ $level ] < self::$levels[ self::$min_level ] ) {
            return;
        }
        
        if ( empty( self::$log_file ) ) {
            self::init();
        }
        
        $entry = sprintf( "[%s] [%s] %s\n", gmdate( 'Y-m-d H:i:s' ), strtoupper( $level ), $message );
        if ( $context ) {
            $entry .= "Context: " . wp_json_encode( $context ) . "\n";
        }
        
        file_put_contents( self::$log_file, $entry, FILE_APPEND | LOCK_EX );
        
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( "MBCDI [{$level}]: {$message}" );
        }
    }

    public static function error( string $message, array $context = [] ): void {
        self::log( $message, 'error', $context );
    }

    public static function warning( string $message, array $context = [] ): void {
        self::log( $message, 'warning', $context );
    }

    public static function info( string $message, array $context = [] ): void {
        self::log( $message, 'info', $context );
    }

    public static function debug( string $message, array $context = [] ): void {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            self::log( $message, 'debug', $context );
        }
    }

    public static function log_ajax_error( array $error_data ): void {
        self::error( 'JS Error: ' . ( $error_data['message'] ?? 'Unknown' ), $error_data );
    }
}
