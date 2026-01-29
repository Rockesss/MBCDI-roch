<?php
/**
 * MBCDI CPT - Métabox Itinéraires
 * Gestion des itinéraires par zones de livraison
 * 
 * @package MBCDI
 * @version 5.4.2
 */

if (!defined('ABSPATH')) exit;

class MBCDI_CPT_Itineraries {
    
    public function __construct() {
        add_action('add_meta_boxes', array($this, 'add_itineraries_metabox'));
        add_action('save_post_mbcdi_chantier', array($this, 'save_itineraries'));
    }
    
    /**
     * Ajouter la métabox Itinéraires
     */
    public function add_itineraries_metabox() {
        add_meta_box(
            'mbcdi_itineraries_metabox',
            'Itinéraires',
            array($this, 'render_itineraries_metabox'),
            'mbcdi_chantier',
            'normal',
            'high'
        );
    }
    
    /**
     * Rendre la métabox
     */
    public function render_itineraries_metabox($post) {
        wp_nonce_field('mbcdi_save_itineraries', 'mbcdi_itineraries_nonce');
        
        // Récupérer les données
        $itineraries = $this->get_itineraries($post->ID);
        $start_points = $this->get_start_points($post->ID);
        $delivery_zones = $this->get_delivery_zones();
        
        ?>
        <div id="mbcdi-itineraries-container">
            
            <!-- Encadré d'aide -->
            <div class="mbcdi-help-box">
                <h4>Gestion des Itinéraires par Zones</h4>
                <p>Un itinéraire relie un <strong>Point de Départ</strong> à une <strong>Zone de Livraison</strong>. Tous les commerces associés à cette zone utiliseront automatiquement cet itinéraire.</p>
                <p>Vous tracez les itinéraires sur la carte. OSRM vous aide à dessiner proprement et vérifie la faisabilité.</p>
            </div>
            
            <!-- Liste des itinéraires -->
            <div id="mbcdi-itineraries-list">
                <h4>Itinéraires configurés (<?php echo count($itineraries); ?>)</h4>
                
                <?php if (empty($itineraries)): ?>
                    <p class="mbcdi-empty-message">Aucun itinéraire configuré. Cliquez sur "Créer" pour commencer.</p>
                <?php else: ?>
                    <?php foreach ($itineraries as $index => $itin): ?>
                        <?php $this->render_itinerary_card($itin, $index, $start_points, $delivery_zones); ?>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
            <!-- Bouton créer -->
            <p>
                <button type="button" class="button button-primary button-large" id="mbcdi-create-itinerary">
                    + Créer un nouvel itinéraire
                </button>
            </p>
            
            <!-- Champs cachés pour données -->
            <input type="hidden" id="mbcdi_itineraries_data" name="mbcdi_itineraries" value="<?php echo esc_attr( wp_json_encode( $itineraries, JSON_UNESCAPED_UNICODE ) ); ?>" />
            <input type="hidden" id="mbcdi_start_points_js" value="<?php echo esc_attr( wp_json_encode( $start_points, JSON_UNESCAPED_UNICODE ) ); ?>" />
            <input type="hidden" id="mbcdi_delivery_zones_js" value="<?php echo esc_attr( wp_json_encode( $delivery_zones, JSON_UNESCAPED_UNICODE ) ); ?>" />
            
        </div>
        
        <!-- Modal Informations -->
        <div id="mbcdi-modal-info" class="mbcdi-modal" style="display:none;">
            <div class="mbcdi-modal-overlay"></div>
            <div class="mbcdi-modal-content">
                <div class="mbcdi-modal-header">
                    <h2 id="mbcdi-modal-title">Nouvel Itinéraire</h2>
                    <button type="button" class="mbcdi-modal-close">&times;</button>
                </div>
                <div class="mbcdi-modal-body">
                    <table class="form-table">
                        <tr>
                            <th><label for="itin-name">Nom</label></th>
                            <td>
                                <input type="text" id="itin-name" class="regular-text" placeholder="Ex: Accès Sud → Parking Église" />
                            </td>
                        </tr>
                        <tr>
                            <th><label for="itin-start-point">Point de Départ</label></th>
                            <td>
                                <select id="itin-start-point" class="regular-text">
                                    <option value="">-- Sélectionner --</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="itin-zone">Zone de Livraison</label></th>
                            <td>
                                <select id="itin-zone" class="regular-text">
                                    <option value="">-- Sélectionner --</option>
                                </select>
                                <p class="description">Tous les commerces de cette zone utiliseront cet itinéraire</p>
                            </td>
                        </tr>
                        <tr>
                            <th><label>Mode de Transport</label></th>
                            <td>
                                <label><input type="radio" name="itin-mode" value="car" checked /> Voiture</label>
                                <label><input type="radio" name="itin-mode" value="bike" /> Vélo</label>
                                <label><input type="radio" name="itin-mode" value="foot" /> Piéton</label>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="itin-status">Statut</label></th>
                            <td>
                                <select id="itin-status" class="regular-text">
                                    <option value="active">Actif</option>
                                    <option value="inactive">Inactif</option>
                                </select>
                                <p class="description">Désactiver un itinéraire le masque côté utilisateur (aucun fallback automatique).</p>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="mbcdi-modal-footer">
                    <button type="button" class="button" id="mbcdi-modal-cancel">Annuler</button>
                    <button type="button" class="button button-primary" id="mbcdi-modal-next">Suivant : Tracer →</button>
                </div>
            </div>
        </div>
        
        <!-- Modal Tracé -->
        <div id="mbcdi-modal-trace" class="mbcdi-modal" style="display:none;">
            <div class="mbcdi-modal-overlay"></div>
            <div class="mbcdi-modal-content mbcdi-modal-large">
                <div class="mbcdi-modal-header">
                    <h2 id="mbcdi-trace-title">Tracer l'itinéraire</h2>
                    <button type="button" class="mbcdi-modal-close">&times;</button>
                </div>
                <div class="mbcdi-modal-body">
                    <div class="mbcdi-trace-container">
                        <!-- Panneau gauche -->
                        <div class="mbcdi-trace-panel">
                            <div class="mbcdi-panel-section">
                                <h4>Départ</h4>
                                <p id="trace-start-name">-</p>
                                <p id="trace-start-coords" class="mbcdi-coords">-</p>
                            </div>
                            
                            <div class="mbcdi-panel-section">
                                <h4>Arrivée</h4>
                                <p id="trace-end-name">-</p>
                                <p id="trace-end-coords" class="mbcdi-coords">-</p>
                            </div>
                            
                            <div class="mbcdi-panel-section">
                                <h4>Waypoints</h4>
                                <div id="trace-waypoints-list"></div>
                                <button type="button" class="button button-small" id="trace-add-waypoint">+ Ajouter Point</button>
                            </div>
                            
                            <div class="mbcdi-panel-section">
                                <h4>Actions</h4>
                                <button type="button" class="button button-secondary" id="trace-osrm">Tracer avec OSRM</button>
                                <p class="description">Calcule le tracé entre les points</p>
                            </div>
                            
                            <div class="mbcdi-panel-section">
                                <h4>Résultat</h4>
                                <p>Distance : <span id="trace-distance">-</span></p>
                                <p>Durée : <span id="trace-duration">-</span></p>
                                <p>Statut : <span id="trace-status">-</span></p>
                            </div>
                        </div>
                        
                        <!-- Carte -->
                        <div class="mbcdi-trace-map-container">
                            <div id="mbcdi-trace-map"></div>
                            <p class="mbcdi-map-help">Cliquez sur la carte pour ajouter des waypoints</p>
                        </div>
                    </div>
                </div>
                <div class="mbcdi-modal-footer">
                    <button type="button" class="button" id="mbcdi-trace-back">← Retour</button>
                    <button type="button" class="button button-primary" id="mbcdi-trace-save">Sauvegarder et Fermer</button>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Rendre une carte d'itinéraire
     */
    private function render_itinerary_card($itin, $index, $start_points, $delivery_zones) {
        $start_point = $this->find_by_id($start_points, $itin['start_point_id']);
        $zone = $this->find_by_id($delivery_zones, $itin['delivery_zone_id']);
        
        $has_route = !empty($itin['geometry']);
        $status = isset($itin['status']) ? $itin['status'] : 'active';
        $status_class = ($status === 'inactive') ? 'inactive' : 'active';
        $status_text = ($status === 'inactive') ? 'Inactif' : 'Actif';
        
        $waypoints_count = isset($itin['waypoints']) ? count($itin['waypoints']) : 0;
        $distance = isset($itin['distance']) ? $this->format_distance($itin['distance']) : '-';
        $duration = isset($itin['duration']) ? $this->format_duration($itin['duration']) : '-';
        
        ?>
        <div class="mbcdi-itinerary-card" data-index="<?php echo $index; ?>">
            <div class="mbcdi-card-header">
                <h4><?php echo esc_html($itin['name']); ?></h4>
                <span class="mbcdi-status mbcdi-status-<?php echo $status_class; ?>"><?php echo $status_text; ?></span>
            </div>
            <div class="mbcdi-card-body">
                <p><strong>Point de départ :</strong> <?php echo esc_html($start_point['name'] ?? 'Inconnu'); ?> (ID: <?php echo $itin['start_point_id']; ?>)</p>
                <p><strong>Zone de livraison :</strong> <?php echo esc_html($zone['name'] ?? 'Inconnue'); ?> (ID: <?php echo $itin['delivery_zone_id']; ?>)</p>
                <p><strong>Mode :</strong> <?php echo $this->get_mode_label($itin['mode']); ?></p>
                <p><strong>Statut :</strong> <?php echo esc_html($status_text); ?></p>
                <p><strong>Tracé :</strong> 
                    <?php if ($has_route): ?>
                        <?php echo $waypoints_count; ?> waypoints • <?php echo $distance; ?> • <?php echo $duration; ?>
                    <?php else: ?>
                        Non configuré
                    <?php endif; ?>
                </p>
            </div>
            <div class="mbcdi-card-footer">
                <button type="button" class="button button-small mbcdi-edit-itin" data-index="<?php echo $index; ?>">Modifier</button>
                <button type="button" class="button button-small mbcdi-trace-itin" data-index="<?php echo $index; ?>">Tracer</button>
                <button type="button" class="button button-small button-link-delete mbcdi-delete-itin" data-index="<?php echo $index; ?>">Supprimer</button>
            </div>
        </div>
        <?php
    }
    
    /**
     * Récupérer les itinéraires
     */
    private function get_itineraries($post_id) {
        // V5.1.0: stockage principal
        $data = get_post_meta($post_id, '_mbcdi_itineraries_v5', true);
        if ( ! $data ) {
            // Compat: anciennes versions
            $data = get_post_meta($post_id, '_mbcdi_itineraries_v4', true);
        }
        $decoded = $data ? json_decode($data, true) : array();
        if ( ! is_array( $decoded ) ) {
            return array();
        }
        return $this->normalize_itineraries( $decoded );
    }

    /**
     * Normaliser les données itinéraires :
     * - assure un champ status (active par défaut)
     * - répare les chaînes mal encodées du type "Accu00e8s" (perte du backslash)
     */
    private function normalize_itineraries( array $itins ): array {
        $fix_string = function( $s ) {
            if ( ! is_string( $s ) ) return $s;
            // Réparer les séquences u00XX sans backslash (ex: Accu00e8s)
            $s = preg_replace_callback('/u00([0-9a-fA-F]{2})/', function($m) {
                $code = hexdec($m[1]);
                // U+00XX
                return mb_convert_encoding(pack('C', $code), 'UTF-8', 'ISO-8859-1');
            }, $s);
            return $s;
        };

        $walk = function( $value ) use ( &$walk, $fix_string ) {
            if ( is_array( $value ) ) {
                foreach ( $value as $k => $v ) {
                    $value[$k] = $walk( $v );
                }
                return $value;
            }
            return $fix_string( $value );
        };

        $out = [];
        foreach ( $itins as $itin ) {
            if ( ! is_array( $itin ) ) continue;
            $itin = $walk( $itin );
            if ( empty( $itin['status'] ) ) {
                $itin['status'] = 'active';
            }
            $out[] = $itin;
        }
        return $out;
    }
    
    /**
     * Récupérer les points de départ
     */
    private function get_start_points($post_id) {
        $data = get_post_meta($post_id, '_mbcdi_start_points', true);
        $points = $data ? json_decode($data, true) : array();
        
        // Ajouter des ID si manquants
        return array_map(function($point, $index) {
            if (!isset($point['id'])) {
                $point['id'] = intval($point['lat'] * 100000 + $point['lng'] * 100000);
            }
            return $point;
        }, $points, array_keys($points));
    }
    
    /**
     * Récupérer les zones de livraison
     */
    private function get_delivery_zones() {
        $zones = get_posts(array(
            'post_type' => 'mbcdi_delivery_zone',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));
        
        return array_map(function($zone) {
            return array(
                'id' => $zone->ID,
                'name' => $zone->post_title,
                'lat' => floatval(get_post_meta($zone->ID, '_mbcdi_lat', true)),
                'lng' => floatval(get_post_meta($zone->ID, '_mbcdi_lng', true))
            );
        }, $zones);
    }
    
    /**
     * Trouver un élément par ID
     */
    private function find_by_id($array, $id) {
        foreach ($array as $item) {
            if (isset($item['id']) && $item['id'] == $id) {
                return $item;
            }
        }
        return null;
    }
    
    /**
     * Label du mode
     */
    private function get_mode_label($mode) {
        $labels = array(
            'car' => 'Voiture',
            'bike' => 'Vélo',
            'foot' => 'Piéton'
        );
        return $labels[$mode] ?? $mode;
    }
    
    /**
     * Formater distance
     */
    private function format_distance($meters) {
        if ($meters < 1000) {
            return round($meters) . 'm';
        }
        return round($meters / 1000, 1) . 'km';
    }
    
    /**
     * Formater durée
     */
    private function format_duration($seconds) {
        if ($seconds < 60) {
            return $seconds . 's';
        }
        return round($seconds / 60) . 'min';
    }
    
    /**
     * Sauvegarder les itinéraires
     */
    public function save_itineraries($post_id) {
        // Vérifications
        if (!isset($_POST['mbcdi_itineraries_nonce'])) return;
        if (!wp_verify_nonce($_POST['mbcdi_itineraries_nonce'], 'mbcdi_save_itineraries')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;
        
        // Sauvegarder
        if (isset($_POST['mbcdi_itineraries'])) {
            $raw = wp_unslash($_POST['mbcdi_itineraries']);
            $decoded = json_decode( $raw, true );
            if ( is_array( $decoded ) ) {
                $decoded = $this->normalize_itineraries( $decoded );
                // Stockage V5.1.0 : ré-encode en UTF-8 non échappé pour éviter les soucis d'accents
                $data = wp_json_encode( $decoded, JSON_UNESCAPED_UNICODE );
                update_post_meta($post_id, '_mbcdi_itineraries_v5', $data);
            }
        }
    }
    

}

new MBCDI_CPT_Itineraries();
