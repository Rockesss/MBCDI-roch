<?php
/**
 * MBCDI Bottom Sheet Component - WordPress Integration
 *
 * @package MBCDI
 * @version 1.0.0
 * @author Claude AI
 *
 * Description:
 * Classe d'intégration WordPress pour le composant bottom sheet autonome.
 * Fournit l'enqueue des assets, le shortcode, et les hooks d'intégration.
 *
 * Usage:
 * 1. Inclure ce fichier dans le plugin principal
 * 2. Initialiser: MBCDI_BottomSheet::init();
 * 3. Utiliser le shortcode: [mbcdi_bottomsheet]
 *
 * Hooks disponibles:
 * - mbcdi_bottomsheet_config : Filtrer la configuration JS
 * - mbcdi_bottomsheet_commerces : Filtrer les données des commerces
 * - mbcdi_bottomsheet_before : Action avant le rendu du HTML
 * - mbcdi_bottomsheet_after : Action après le rendu du HTML
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class MBCDI_BottomSheet {

    /**
     * Version du composant
     */
    const VERSION = '1.0.0';

    /**
     * Instance unique (Singleton)
     */
    private static $instance = null;

    /**
     * Flag pour savoir si le shortcode est présent
     */
    private static $has_shortcode = false;

    /**
     * Initialisation
     */
    public static function init() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructeur
     */
    private function __construct() {
        // Détection du shortcode
        add_action('wp', [$this, 'detect_shortcode']);

        // Enregistrement des assets
        add_action('wp_enqueue_scripts', [$this, 'register_assets']);

        // Enqueue conditionnel
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets'], 20);

        // Shortcode
        add_shortcode('mbcdi_bottomsheet', [$this, 'render_shortcode']);
    }

    /**
     * Détecte la présence du shortcode dans le contenu
     */
    public function detect_shortcode() {
        if (is_admin()) {
            return;
        }

        global $post;

        // Vérifie le contenu de la page/post
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'mbcdi_bottomsheet')) {
            self::$has_shortcode = true;
            return;
        }

        // Vérifie les widgets (si applicable)
        if (is_active_widget(false, false, 'text')) {
            self::$has_shortcode = true;
            return;
        }

        // Hook pour forcer l'enqueue si nécessaire
        self::$has_shortcode = apply_filters('mbcdi_bottomsheet_force_enqueue', false);
    }

    /**
     * Enregistre les assets (toujours enregistrés, mais pas forcément enqueueds)
     */
    public function register_assets() {
        // CSS
        wp_register_style(
            'mbcdi-bottomsheet',
            MBCDI_PLUGIN_URL . 'assets/css/mbcdi-bottomsheet.css',
            [],
            self::VERSION,
            'all'
        );

        // JS
        wp_register_script(
            'mbcdi-bottomsheet',
            MBCDI_PLUGIN_URL . 'assets/js/mbcdi-bottomsheet.js',
            [],
            self::VERSION,
            true
        );
    }

    /**
     * Enqueue les assets si le shortcode est présent
     */
    public function enqueue_assets() {
        if (!self::$has_shortcode && !is_singular()) {
            return;
        }

        wp_enqueue_style('mbcdi-bottomsheet');
        wp_enqueue_script('mbcdi-bottomsheet');
    }

    /**
     * Rendu du shortcode
     *
     * @param array $atts Attributs du shortcode
     * @return string HTML
     */
    public function render_shortcode($atts = []) {
        // Force l'enqueue des assets
        self::$has_shortcode = true;
        $this->enqueue_assets();

        // Parse les attributs
        $atts = shortcode_atts([
            'id' => 'mbcdi-bottomsheet',
            'initial_state' => 'closed',
            'enable_search' => 'true',
            'list_title' => 'Commerces à proximité',
            'detail_title' => 'Détail du commerce',
            'search_placeholder' => 'Rechercher un commerce...',
            'empty_message' => 'Aucun commerce à afficher',
            'auto_init' => 'true'
        ], $atts, 'mbcdi_bottomsheet');

        // Sanitize
        $container_id = sanitize_html_class($atts['id']);
        $initial_state = in_array($atts['initial_state'], ['closed', 'peek', 'open']) ? $atts['initial_state'] : 'closed';
        $enable_search = filter_var($atts['enable_search'], FILTER_VALIDATE_BOOLEAN);
        $auto_init = filter_var($atts['auto_init'], FILTER_VALIDATE_BOOLEAN);

        // Configuration JS
        $config = [
            'containerSelector' => '#' . $container_id,
            'initialState' => $initial_state,
            'enableSearch' => $enable_search,
            'listTitle' => esc_js($atts['list_title']),
            'detailTitle' => esc_js($atts['detail_title']),
            'searchPlaceholder' => esc_js($atts['search_placeholder']),
            'emptyMessage' => esc_js($atts['empty_message'])
        ];

        // Hook pour modifier la config
        $config = apply_filters('mbcdi_bottomsheet_config', $config, $atts);

        // Localise les données
        wp_localize_script('mbcdi-bottomsheet', 'MBCDI_BottomSheet_Config', $config);

        // Hook avant le rendu
        do_action('mbcdi_bottomsheet_before', $atts);

        // Génère le HTML
        ob_start();
        ?>

        <div id="<?php echo esc_attr($container_id); ?>"
             class="mbcdi-bottomsheet"
             data-state="<?php echo esc_attr($initial_state); ?>"
             data-view="list"
             role="dialog"
             aria-modal="false"
             aria-label="<?php echo esc_attr($atts['list_title']); ?>">

            <!-- Handle -->
            <div class="mbcdi-bottomsheet__handle-area">
                <div class="mbcdi-bottomsheet__handle"></div>
            </div>

            <!-- Header -->
            <header class="mbcdi-bottomsheet__header">
                <button type="button"
                        class="mbcdi-bottomsheet__header-btn mbcdi-bottomsheet__btn-back"
                        aria-label="Retour à la liste"
                        title="Retour">
                    ←
                </button>

                <h2 class="mbcdi-bottomsheet__header-title">
                    <?php echo esc_html($atts['list_title']); ?>
                </h2>

                <button type="button"
                        class="mbcdi-bottomsheet__header-btn mbcdi-bottomsheet__btn-close"
                        aria-label="Fermer"
                        title="Fermer">
                    ×
                </button>
            </header>

            <!-- Content -->
            <div class="mbcdi-bottomsheet__content">
                <!-- Vue Liste -->
                <div class="mbcdi-bottomsheet__list">
                    <div class="mbcdi-bottomsheet__empty">
                        <?php echo esc_html($atts['empty_message']); ?>
                    </div>
                </div>

                <!-- Vue Détail -->
                <div class="mbcdi-bottomsheet__detail">
                    <!-- Rendu dynamique par JS -->
                </div>
            </div>
        </div>

        <?php if ($auto_init): ?>
        <script>
        (function() {
            // Auto-init au chargement du DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initBottomSheet);
            } else {
                initBottomSheet();
            }

            function initBottomSheet() {
                if (typeof window.MBCDI_BottomSheet !== 'undefined') {
                    window.MBCDI_BottomSheet.init(window.MBCDI_BottomSheet_Config || {});
                } else {
                    console.warn('MBCDI_BottomSheet not loaded yet');
                }
            }
        })();
        </script>
        <?php endif; ?>

        <?php
        $html = ob_get_clean();

        // Hook après le rendu
        do_action('mbcdi_bottomsheet_after', $atts);

        return $html;
    }

    /**
     * Helper: Récupère les commerces depuis la BDD
     *
     * @param array $args Arguments de la requête
     * @return array Tableau de commerces formatés
     */
    public static function get_commerces($args = []) {
        $defaults = [
            'post_type' => 'mbcdi_commerce',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC'
        ];

        $args = wp_parse_args($args, $defaults);

        $query = new WP_Query($args);
        $commerces = [];

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();

                $commerce = [
                    'id' => $post_id,
                    'nom' => get_the_title(),
                    'adresse' => get_post_meta($post_id, '_mbcdi_address', true),
                    'lat' => floatval(get_post_meta($post_id, '_mbcdi_lat', true)),
                    'lng' => floatval(get_post_meta($post_id, '_mbcdi_lng', true)),
                    'tel' => get_post_meta($post_id, '_mbcdi_phone', true),
                    'site' => get_post_meta($post_id, '_mbcdi_website', true),
                    'description' => get_post_meta($post_id, '_mbcdi_short_description', true),
                    'horaires' => get_post_meta($post_id, '_mbcdi_hours', true)
                ];

                // Filtre par commerce
                $commerce = apply_filters('mbcdi_bottomsheet_commerce_data', $commerce, $post_id);

                $commerces[] = $commerce;
            }

            wp_reset_postdata();
        }

        // Filtre global
        $commerces = apply_filters('mbcdi_bottomsheet_commerces', $commerces, $args);

        return $commerces;
    }

    /**
     * Helper: Génère le JSON des commerces pour injection JS
     *
     * @param array $commerces Tableau de commerces
     * @return string JSON échappé pour HTML
     */
    public static function commerces_to_json($commerces) {
        return wp_json_encode($commerces, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    }

    /**
     * Helper: Injecte les commerces via wp_localize_script
     *
     * @param array $commerces Tableau de commerces
     * @param string $var_name Nom de la variable JS
     */
    public static function localize_commerces($commerces, $var_name = 'MBCDI_Commerces') {
        wp_localize_script('mbcdi-bottomsheet', $var_name, $commerces);
    }

    /**
     * Helper: Enqueue les assets manuellement (pour usage hors shortcode)
     */
    public static function enqueue() {
        self::$has_shortcode = true;

        wp_enqueue_style('mbcdi-bottomsheet');
        wp_enqueue_script('mbcdi-bottomsheet');
    }

}

// Auto-init si la constante MBCDI_PLUGIN_DIR existe
if (defined('MBCDI_PLUGIN_DIR')) {
    add_action('plugins_loaded', ['MBCDI_BottomSheet', 'init'], 5);
}
