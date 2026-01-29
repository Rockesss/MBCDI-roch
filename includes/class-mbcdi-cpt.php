<?php
/**
 * MBCDI Custom Post Types V4.4
 * Gestion des Destinations, Zones de Livraison, Commerces et Pictogrammes
 * Avec éditeur d'itinéraires hybrides (OSRM + Manuel)
 * 
 * @package MBCDI
 * @version 5.4.2
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class MBCDI_CPT {

    public static function register(): void {
        self::register_chantier_cpt();
        self::register_delivery_zone_cpt(); // NOUVEAU
        self::register_commerce_cpt();
        self::register_picto_cpt();
        self::register_meta();
        self::hooks();
    }

    private static function register_chantier_cpt(): void {
        register_post_type( 'mbcdi_chantier', [
            'labels' => [
    'name'              => 'Itinéraires',
    'singular_name'     => 'Itinéraire',
    'menu_name'         => 'Itinéraires',
    'add_new'           => 'Ajouter',
    'add_new_item'      => 'Ajouter un itinéraire',
    'edit_item'         => 'Modifier l’itinéraire',
    'new_item'          => 'Nouvel itinéraire',
    'view_item'         => 'Voir l’itinéraire',
    'search_items'      => 'Rechercher des itinéraires',
    'not_found'         => 'Aucun itinéraire trouvé',
],
            'public'          => false,
            'show_ui'         => true,
            'show_in_menu'    => true,
            'menu_position'   => 25,
            'menu_icon'       => 'dashicons-location-alt',
            'supports'        => [ 'title', 'editor' ],
            'capability_type' => 'post',
        ] );
    }

    /**
     * NOUVEAU V4.4: CPT pour les zones de livraison
     */
    private static function register_delivery_zone_cpt(): void {
        register_post_type( 'mbcdi_delivery_zone', [
            'labels' => [
                'name'               => __( 'Zones de livraison', 'mbcdi' ),
                'singular_name'      => __( 'Zone de livraison', 'mbcdi' ),
                'add_new'            => __( 'Ajouter', 'mbcdi' ),
                'add_new_item'       => __( 'Ajouter une zone', 'mbcdi' ),
                'edit_item'          => __( 'Modifier la zone', 'mbcdi' ),
                'menu_name'          => __( 'Zones de livraison', 'mbcdi' ),
            ],
            'public'          => false,
            'show_ui'         => true,
            'show_in_menu'    => 'edit.php?post_type=mbcdi_chantier',
            'supports'        => [ 'title', 'editor' ],
            'capability_type' => 'post',
        ] );
    }

    private static function register_commerce_cpt(): void {
        register_post_type( 'mbcdi_commerce', [
            'labels' => [
                'name'          => __( 'Commerces', 'mbcdi' ),
                'singular_name' => __( 'Commerce', 'mbcdi' ),
                'add_new'       => __( 'Ajouter', 'mbcdi' ),
                'menu_name'     => __( 'Commerces', 'mbcdi' ),
            ],
            'public'          => false,
            'show_ui'         => true,
            'show_in_menu'    => 'edit.php?post_type=mbcdi_chantier',
            'supports'        => [ 'title' ],
            'capability_type' => 'post',
        ] );
    }

    private static function register_picto_cpt(): void {
        register_post_type( 'mbcdi_picto', [
            'labels' => [
                'name'          => __( 'Pictogrammes', 'mbcdi' ),
                'singular_name' => __( 'Pictogramme', 'mbcdi' ),
                'menu_name'     => __( 'Pictogrammes', 'mbcdi' ),
            ],
            'public'          => false,
            'show_ui'         => true,
            'show_in_menu'    => true,
            'menu_position'   => 26,
            'menu_icon'       => 'dashicons-art',
            'supports'        => [ 'title', 'thumbnail', 'editor' ],
            'capability_type' => 'post',
        ] );
    }

    private static function register_meta(): void {
        $chantier_metas = [
            '_mbcdi_short_description', '_mbcdi_address', '_mbcdi_lat', '_mbcdi_lng',
            '_mbcdi_status', '_mbcdi_last_update', '_mbcdi_itineraries_v4', '_mbcdi_markers',
            '_mbcdi_start_points', '_mbcdi_ui_logo_id', '_mbcdi_zone', '_mbcdi_zone_color', '_mbcdi_zone_opacity',
        ];
        foreach ( $chantier_metas as $key ) {
            register_post_meta( 'mbcdi_chantier', $key, [ 'single' => true, 'type' => 'string' ] );
        }

        // NOUVEAU V4.4: Metas pour zones de livraison
        $delivery_zone_metas = [
            '_mbcdi_address', '_mbcdi_lat', '_mbcdi_lng', '_mbcdi_status',
            '_mbcdi_short_description', '_mbcdi_icon_id', '_mbcdi_zone_color',
            '_mbcdi_delivery_zone_geometry', '_mbcdi_delivery_zone_icon_url',
        ];
        foreach ( $delivery_zone_metas as $key ) {
            register_post_meta( 'mbcdi_delivery_zone', $key, [ 'single' => true, 'type' => 'string' ] );
        }

        // MODIFIÉ V4.4: Ajout de _mbcdi_delivery_zone_id
        $commerce_metas = [
            '_mbcdi_logo_id', '_mbcdi_address', '_mbcdi_lat', '_mbcdi_lng', '_mbcdi_phone',
            '_mbcdi_website', '_mbcdi_short_description', '_mbcdi_hours', '_mbcdi_status', 
            '_mbcdi_chantiers', '_mbcdi_delivery_zone_id', '_mbcdi_walking_distance',
        ];
        foreach ( $commerce_metas as $key ) {
            register_post_meta( 'mbcdi_commerce', $key, [ 'single' => true, 'type' => 'string' ] );
        }

        register_post_meta( 'mbcdi_picto', '_mbcdi_picto_shape', [ 'single' => true, 'type' => 'string' ] );
    }

    private static function hooks(): void {
        add_action( 'add_meta_boxes', [ __CLASS__, 'add_meta_boxes' ] );
        add_action( 'save_post_mbcdi_chantier', [ __CLASS__, 'save_chantier_meta' ], 10, 2 );
        add_action( 'save_post_mbcdi_delivery_zone', [ __CLASS__, 'save_delivery_zone_meta' ], 10, 2 );
        add_action( 'save_post_mbcdi_commerce', [ __CLASS__, 'save_commerce_meta' ], 10, 2 );
        add_action( 'save_post_mbcdi_picto', [ __CLASS__, 'save_picto_meta' ], 10, 2 );
        add_action( 'admin_enqueue_scripts', [ __CLASS__, 'enqueue_admin_scripts' ] );
    }

    public static function add_meta_boxes(): void {
        // Destination (Chantier)
        add_meta_box( 'mbcdi_workflow_guide', __( '📋 Guide de configuration', 'mbcdi' ), [ __CLASS__, 'render_workflow_guide_box' ], 'mbcdi_chantier', 'side', 'high' );
        add_meta_box( 'mbcdi_chantier_info', __( 'Informations du chantier', 'mbcdi' ), [ __CLASS__, 'render_chantier_info_box' ], 'mbcdi_chantier', 'normal', 'high' );
        // BO Itinéraires : métabox gérée par MBCDI_CPT_Itineraries (v5.1.0 CLEAN)
        add_meta_box( 'mbcdi_start_points', __( 'Points de départ fixes (QR codes)', 'mbcdi' ), [ __CLASS__, 'render_start_points_box' ], 'mbcdi_chantier', 'normal', 'default' );
        add_meta_box( 'mbcdi_zone', __( 'Zone du chantier (affichage)', 'mbcdi' ), [ __CLASS__, 'render_zone_box' ], 'mbcdi_chantier', 'normal', 'default' );
        add_meta_box( 'mbcdi_markers', __( 'Pictogrammes sur carte', 'mbcdi' ), [ __CLASS__, 'render_markers_box' ], 'mbcdi_chantier', 'normal', 'default' );
        
        // Zone de livraison
        add_meta_box( 'mbcdi_delivery_zone_guide', __( '📋 À quoi sert cette zone ?', 'mbcdi' ), [ __CLASS__, 'render_delivery_zone_guide_box' ], 'mbcdi_delivery_zone', 'side', 'high' );
        add_meta_box( 'mbcdi_delivery_zone_info', __( 'Informations de la zone', 'mbcdi' ), [ __CLASS__, 'render_delivery_zone_info_box' ], 'mbcdi_delivery_zone', 'normal', 'high' );
        add_meta_box( 'mbcdi_delivery_zone_commerces', __( 'Commerces desservis', 'mbcdi' ), [ __CLASS__, 'render_delivery_zone_commerces_box' ], 'mbcdi_delivery_zone', 'normal', 'default' );
        
        // Commerce
        add_meta_box( 'mbcdi_commerce_guide', __( '📋 Configuration du commerce', 'mbcdi' ), [ __CLASS__, 'render_commerce_guide_box' ], 'mbcdi_commerce', 'side', 'high' );
        add_meta_box( 'mbcdi_commerce_info', __( 'Informations', 'mbcdi' ), [ __CLASS__, 'render_commerce_info_box' ], 'mbcdi_commerce', 'normal', 'high' );
        add_meta_box( 'mbcdi_commerce_destinations', __( 'Destinations associées', 'mbcdi' ), [ __CLASS__, 'render_commerce_destinations_box' ], 'mbcdi_commerce', 'side', 'default' );
        
        // Pictogramme
        add_meta_box( 'mbcdi_picto_info', __( 'Configuration', 'mbcdi' ), [ __CLASS__, 'render_picto_info_box' ], 'mbcdi_picto', 'normal', 'high' );
    }

    /**
     * Guide workflow dans la sidebar des destinations
     */
    public static function render_workflow_guide_box( $post ): void {
        $has_zones = get_posts([
            'post_type' => 'mbcdi_delivery_zone',
            'posts_per_page' => 1,
            'post_status' => 'publish',
            'fields' => 'ids'
        ]);
        
        $has_commerces = get_posts([
            'post_type' => 'mbcdi_commerce',
            'posts_per_page' => 1,
            'post_status' => 'publish',
            'fields' => 'ids'
        ]);
        
        $itineraries = json_decode(get_post_meta($post->ID, '_mbcdi_itineraries_v4', true) ?: '[]', true);
        ?>
        <div class="mbcdi-workflow-checklist">
            <h4 style="margin:0 0 10px 0;">✅ Checklist de configuration</h4>
            
            <div class="mbcdi-checklist-item <?php echo !empty($has_zones) ? 'done' : 'todo'; ?>" style="padding:8px;margin-bottom:8px;border-left:3px solid <?php echo !empty($has_zones) ? '#28a745' : '#ffc107'; ?>;background:#f8f9fa;">
                <strong>1. Zones de livraison</strong><br/>
                <?php if (empty($has_zones)): ?>
                    <span style="color:#dc3545;">❌ Aucune zone créée</span><br/>
                    <a href="<?php echo admin_url('post-new.php?post_type=mbcdi_delivery_zone'); ?>" class="button button-small" style="margin-top:5px;">➕ Créer une zone</a>
                <?php else: ?>
                    <span style="color:#28a745;">✓ Zones créées</span><br/>
                    <a href="<?php echo admin_url('edit.php?post_type=mbcdi_delivery_zone'); ?>" class="button button-small" style="margin-top:5px;">Voir les zones</a>
                <?php endif; ?>
            </div>
            
            <div class="mbcdi-checklist-item <?php echo !empty($has_commerces) ? 'done' : 'todo'; ?>" style="padding:8px;margin-bottom:8px;border-left:3px solid <?php echo !empty($has_commerces) ? '#28a745' : '#ffc107'; ?>;background:#f8f9fa;">
                <strong>2. Commerces</strong><br/>
                <?php if (empty($has_commerces)): ?>
                    <span style="color:#dc3545;">❌ Aucun commerce</span><br/>
                    <a href="<?php echo admin_url('post-new.php?post_type=mbcdi_commerce'); ?>" class="button button-small" style="margin-top:5px;">➕ Ajouter un commerce</a>
                <?php else: ?>
                    <span style="color:#28a745;">✓ Commerces créés</span><br/>
                    <a href="<?php echo admin_url('edit.php?post_type=mbcdi_commerce'); ?>" class="button button-small" style="margin-top:5px;">Voir les commerces</a>
                <?php endif; ?>
            </div>
            
            <div class="mbcdi-checklist-item <?php echo !empty($itineraries) ? 'done' : 'todo'; ?>" style="padding:8px;margin-bottom:8px;border-left:3px solid <?php echo !empty($itineraries) ? '#28a745' : '#ffc107'; ?>;background:#f8f9fa;">
                <strong>3. Itinéraires</strong><br/>
                <?php if (empty($itineraries)): ?>
                    <span style="color:#dc3545;">❌ Aucun itinéraire</span><br/>
                    <small>Voir section ci-dessous ↓</small>
                <?php else: ?>
                    <span style="color:#28a745;">✓ <?php echo count($itineraries); ?> itinéraire(s)</span>
                <?php endif; ?>
            </div>
        </div>
        
        <div style="margin-top:15px;padding:10px;background:#fff3cd;border-radius:4px;">
            <strong>💡 Ordre recommandé :</strong>
            <ol style="margin:5px 0 0 20px;padding:0;font-size:12px;">
                <li>Créer les <strong>zones de livraison accessibles</strong> (points de dépôt) pour contourner les rues barrées</li>
                <li>Créer les commerces et les <strong>associer à leur zone</strong> en indiquant la distance à pied</li>
                <li>Dans cette page, <strong>créer des itinéraires V4</strong> dont le dernier point arrive à la zone de livraison</li>
            </ol>
        </div>
        <?php
    }

    /**
     * Guide pour les zones de livraison
     */
    public static function render_delivery_zone_guide_box( $post ): void {
        ?>
        <div style="background:#e7f5ff;padding:12px;border-radius:4px;margin-bottom:10px;">
            <h4 style="margin:0 0 8px 0;">🚧 Rue barrée ? Le rôle de la zone</h4>
            <p style="margin:0;font-size:13px;line-height:1.5;">
                Lorsqu'une rue est barrée par des travaux, le livreur ne peut pas accéder directement au commerce. Il se rend jusqu'à une <strong>zone ou aire de livraison</strong> accessible en véhicule. Dans cette zone, il dépose ses colis puis termine la livraison <em>à pied</em> jusqu'au commerce. Une même zone dessert un ou plusieurs commerces à proximité.
            </p>
        </div>
        
        <div style="background:#d4edda;padding:12px;border-radius:4px;margin-bottom:10px;">
            <strong>✅ Exemple réel :</strong>
            <p style="margin:5px 0 0 0;font-size:13px;">
                "Place du Marché" (zone accessible) dessert :<br/>
                • Boulangerie (50 m à pied)<br/>
                • Pharmacie (80 m à pied)<br/>
                • Fleuriste (120 m à pied)
            </p>
        </div>
        
        <?php if ($post->ID): ?>
        <div style="background:#fff3cd;padding:12px;border-radius:4px;">
            <strong>📋 Prochaines étapes :</strong>
            <ol style="margin:5px 0 0 20px;padding:0;font-size:12px;">
                <li>Associer des commerces</li>
                <li>Créer des itinéraires</li>
            </ol>
        </div>
        <?php endif; ?>
        <?php
    }

    /**
     * Guide pour les commerces
     */
    public static function render_commerce_guide_box( $post ): void {
        $zone_id = get_post_meta($post->ID, '_mbcdi_delivery_zone_id', true);
        $walking_dist = get_post_meta($post->ID, '_mbcdi_walking_distance', true);
        
        ?>
        <div style="background:#e7f5ff;padding:12px;border-radius:4px;margin-bottom:10px;">
            <h4 style="margin:0 0 8px 0;">🏪 Configuration du commerce</h4>
            <p style="margin:0;font-size:13px;">
                Associez ce commerce à une <strong>zone de livraison</strong> accessible. Le livreur déposera les colis dans cette zone puis parcourra la distance restante <em>à pied</em> jusqu'au commerce. Vous pouvez renseigner la distance à pied (en mètres) pour informer vos clients.
            </p>
        </div>
        
        <?php if ($zone_id): ?>
            <div style="background:#d4edda;padding:12px;border-radius:4px;margin-bottom:10px;">
                <strong>✓ Zone configurée</strong>
                <?php if ($walking_dist): ?>
                    <p style="margin:5px 0 0 0;">🚶 <?php echo esc_html($walking_dist); ?>m à pied</p>
                <?php else: ?>
                    <p style="margin:5px 0 0 0;color:#dc3545;">⚠️ Distance non renseignée</p>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div style="background:#fff3cd;padding:12px;border-radius:4px;margin-bottom:10px;">
                <strong>⚠️ Zone manquante</strong>
                <p style="margin:5px 0 0 0;font-size:12px;">
                    Sélectionnez une zone de livraison ci-dessous.
                </p>
            </div>
        <?php endif; ?>
        
        <div style="background:#f8f9fa;padding:12px;border-radius:4px;">
            <strong>💡 Exemple :</strong>
            <p style="margin:5px 0 0 0;font-size:12px;">
                Zone : <em>Place du Marché</em><br/>
                Distance : <em>50 mètres</em>
            </p>
        </div>
        <?php
    }

    /**
     * NOUVEAU V4.4: Metabox pour les zones de livraison
     */
    public static function render_delivery_zone_info_box( $post ): void {
        wp_nonce_field( 'mbcdi_save_delivery_zone', 'mbcdi_delivery_zone_nonce' );
        
        $address = get_post_meta( $post->ID, '_mbcdi_address', true );
        $lat = get_post_meta( $post->ID, '_mbcdi_lat', true );
        $lng = get_post_meta( $post->ID, '_mbcdi_lng', true );
        $status = get_post_meta( $post->ID, '_mbcdi_status', true ) ?: 'active';
        $short_desc = get_post_meta( $post->ID, '_mbcdi_short_description', true );
        $ui_logo_id = get_post_meta( $post->ID, '_mbcdi_ui_logo_id', true );
        $ui_logo_url = $ui_logo_id ? wp_get_attachment_url( $ui_logo_id ) : '';
        $zone_color = get_post_meta( $post->ID, '_mbcdi_zone_color', true ) ?: '#4CAF50';
        $icon_url = get_post_meta( $post->ID, '_mbcdi_delivery_zone_icon_url', true );
        $geom_json = get_post_meta( $post->ID, '_mbcdi_delivery_zone_geometry', true );
        ?>
        <div class="mbcdi-admin-guide" style="background:#e7f5ff;padding:15px;margin-bottom:20px;border-left:4px solid #0073aa;border-radius:4px;">
            <h4 style="margin:0 0 10px 0;">🚧 Rue barrée ? Qu'est-ce qu'une zone de livraison ?</h4>
            <p style="margin:0 0 10px 0;">
                Lorsqu'une rue est barrée par des travaux, le livreur doit se rendre jusqu'à une zone de livraison accessible en véhicule. C'est à cet endroit qu'il dépose ses colis avant de finir sa tournée <em>à pied</em>. Une zone peut desservir un ou plusieurs commerces situés à courte distance.
            </p>
            <p style="margin:0;"><strong>Exemple :</strong> « Place du Marché » (zone accessible) dessert plusieurs commerces : boulangerie, pharmacie, fleuriste</p>
        </div>
        
        <table class="form-table">
            <tr>
                <th><label for="mbcdi_address"><?php esc_html_e( 'Adresse complète', 'mbcdi' ); ?> *</label></th>
                <td>
                    <input type="text" id="mbcdi_address" name="mbcdi_address" value="<?php echo esc_attr( $address ); ?>" class="large-text" placeholder="ex: Place du Marché, 75001 Paris" required />
                    <p class="description">L'adresse exacte où les livreurs déposeront les colis</p>
                </td>
            </tr>
            <tr>
                <th><label><?php esc_html_e( 'Logo (front)', 'mbcdi' ); ?></label></th>
                <td>
                    <div style="margin-bottom:10px;">
                        <?php if ( $ui_logo_url ): ?>
                            <img src="<?php echo esc_url( $ui_logo_url ); ?>" style="max-width:220px;display:block;margin-bottom:10px;background:#fff;padding:8px;border:1px solid #ddd;border-radius:4px;" id="mbcdi-ui-logo-preview" />
                        <?php else: ?>
                            <img src="" style="max-width:220px;display:none;margin-bottom:10px;background:#fff;padding:8px;border:1px solid #ddd;border-radius:4px;" id="mbcdi-ui-logo-preview" />
                        <?php endif; ?>
                    </div>
                    <input type="hidden" id="mbcdi_ui_logo_id" name="mbcdi_ui_logo_id" value="<?php echo esc_attr( $ui_logo_id ); ?>" />
                    <button type="button" class="button" id="mbcdi_upload_ui_logo"><?php esc_html_e( 'Choisir une image', 'mbcdi' ); ?></button>
                    <button type="button" class="button" id="mbcdi_remove_ui_logo" <?php echo ! $ui_logo_id ? 'style="display:none;"' : ''; ?>><?php esc_html_e( 'Retirer', 'mbcdi' ); ?></button>
                    <p class="description"><?php esc_html_e( 'Affiché au-dessus de “Où allez-vous ?” sur le front. Si vide, rien n’est affiché.', 'mbcdi' ); ?></p>
                </td>
            </tr>

            <tr>
                <th><label><?php esc_html_e( 'Coordonnées GPS', 'mbcdi' ); ?> *</label></th>
                <td>
                    <div style="display:flex;gap:10px;align-items:flex-start;">
                        <div style="flex:1;">
                            <label for="mbcdi_lat" style="display:block;margin-bottom:5px;">Latitude</label>
                            <input type="text" id="mbcdi_lat" name="mbcdi_lat" value="<?php echo esc_attr( $lat ); ?>" placeholder="48.8566" class="regular-text" required />
                        </div>
                        <div style="flex:1;">
                            <label for="mbcdi_lng" style="display:block;margin-bottom:5px;">Longitude</label>
                            <input type="text" id="mbcdi_lng" name="mbcdi_lng" value="<?php echo esc_attr( $lng ); ?>" placeholder="2.3522" class="regular-text" required />
                        </div>
                        <div>
                            <label style="display:block;margin-bottom:5px;">&nbsp;</label>
                            <button type="button" class="button" id="mbcdi-zone-pick-location">
                                🗺️ Placer sur carte
                            </button>
                        </div>
                    </div>
                    <div id="mbcdi-zone-location-map-container" style="display:none;margin-top:15px;">
                        <div id="mbcdi-zone-location-map" style="height:400px;border:1px solid #ddd;border-radius:4px;"></div>
                        <p class="description" style="margin-top:10px;">Cliquez sur la carte ou déplacez le marqueur pour définir la position exacte</p>
                    </div>
                </td>
            </tr>
            <tr>
                <th><label for="mbcdi_short_description"><?php esc_html_e( 'Description', 'mbcdi' ); ?></label></th>
                <td>
                    <textarea id="mbcdi_short_description" name="mbcdi_short_description" rows="3" class="large-text" placeholder="ex: Zone de livraison située sur la place, accessible en voiture"><?php echo esc_textarea( $short_desc ); ?></textarea>
                </td>
            </tr>
            <tr>
                <th><label for="mbcdi_zone_color"><?php esc_html_e( 'Couleur sur carte', 'mbcdi' ); ?></label></th>
                <td>
                    <input type="color" id="mbcdi_zone_color" name="mbcdi_zone_color" value="<?php echo esc_attr( $zone_color ); ?>" />
                    <p class="description">Couleur d'affichage du marqueur de cette zone sur la carte</p>
                </td>
            </tr>

            <tr>
                <th><label><?php esc_html_e( 'Pictogramme (point)', 'mbcdi' ); ?></label></th>
                <td>
                    <div style="display:flex;gap:12px;align-items:center;">
                        <div style="width:44px;height:44px;border:1px solid #ddd;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                            <?php if ( $icon_url ): ?>
                                <img src="<?php echo esc_url( $icon_url ); ?>" style="max-width:100%;max-height:100%;object-fit:contain;" id="mbcdi-zone-icon-preview" />
                            <?php else: ?>
                                <span style="font-size:11px;color:#777;" id="mbcdi-zone-icon-placeholder">Aucun</span>
                                <img src="" style="max-width:100%;max-height:100%;object-fit:contain;display:none;" id="mbcdi-zone-icon-preview" />
                            <?php endif; ?>
                        </div>
                        <input type="hidden" id="mbcdi_delivery_zone_icon_url" name="mbcdi_delivery_zone_icon_url" value="<?php echo esc_attr( $icon_url ); ?>" />
                        <button type="button" class="button" id="mbcdi_upload_zone_icon">Choisir une image</button>
                        <button type="button" class="button" id="mbcdi_remove_zone_icon" <?php echo empty( $icon_url ) ? 'style=\"display:none;\"' : ''; ?>>Retirer</button>
                        <p class="description" style="margin:0;">SVG ou PNG recommandé.</p>
                    </div>
                </td>
            </tr>

            <tr>
                <th><label for="mbcdi_status"><?php esc_html_e( 'Statut', 'mbcdi' ); ?></label></th>
                <td>
                    <select id="mbcdi_status" name="mbcdi_status">
                        <option value="active" <?php selected( $status, 'active' ); ?>><?php esc_html_e( 'Active', 'mbcdi' ); ?></option>
                        <option value="inactive" <?php selected( $status, 'inactive' ); ?>><?php esc_html_e( 'Inactive', 'mbcdi' ); ?></option>
                    </select>
                </td>
            </tr>
        </table>

        <div id="mbcdi-delivery-geometry-container" style="margin-top:20px;">
            <h4 style="margin:0 0 10px 0;">🗺️ Zone de livraison (surface)</h4>
            <p class="description">Dessinez la surface accessible (polygone). Cette zone est affichée sur la carte front.</p>
            <div id="mbcdi-delivery-geometry-map" style="height:380px;border:1px solid #ddd;border-radius:4px;"></div>
            <p style="margin-top:10px;">
                <button type="button" class="button" id="mbcdi-draw-delivery-geometry">🖊️ Dessiner la zone</button>
                <button type="button" class="button" id="mbcdi-clear-delivery-geometry">🗑️ Effacer</button>
            </p>
            <input type="hidden" id="mbcdi_delivery_zone_geometry_data" name="mbcdi_delivery_zone_geometry" value="<?php echo esc_attr( $geom_json ); ?>" />
        </div>
        <script>window.MBCDI_DELIVERY_ZONE_GEOMETRY = <?php echo $geom_json ? $geom_json : 'null'; ?>;</script>

        <?php if ( $post->ID && $lat && $lng ): ?>
        <div class="mbcdi-next-steps" style="background:#f0f6fc;padding:15px;margin-top:20px;border-left:4px solid #0073aa;border-radius:4px;">
            <h4 style="margin:0 0 10px 0;">✅ Prochaines étapes</h4>
            <ol style="margin:0;padding-left:20px;">
                <li><strong>Associer des commerces</strong> : Éditez vos commerces et sélectionnez cette zone dans le dropdown "Zone de livraison"</li>
                <li><strong>Créer des itinéraires</strong> : Dans Destinations, créez des itinéraires dont le dernier point arrive ici (<?php echo esc_html( $lat . ', ' . $lng ); ?>)</li>
            </ol>
        </div>
        <?php endif; ?>
        <?php
    }

    /**
     * NOUVEAU V4.4: Metabox pour afficher les commerces desservis par une zone
     */
    public static function render_delivery_zone_commerces_box( $post ): void {
        $commerces = get_posts( [
            'post_type' => 'mbcdi_commerce',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'meta_query' => [
                [
                    'key' => '_mbcdi_delivery_zone_id',
                    'value' => $post->ID,
                    'compare' => '=',
                ],
            ],
        ] );
        
        ?>
        <div class="mbcdi-zone-commerces-wrapper">
            <?php if ( empty( $commerces ) ): ?>
                <div style="background:#fff3cd;padding:15px;border-left:3px solid #ffc107;margin-bottom:15px;">
                    <p style="margin:0;"><strong>⚠️ Aucun commerce associé</strong></p>
                    <p style="margin:10px 0 0 0;">Pour associer des commerces à cette zone :</p>
                    <ol style="margin:10px 0 0 20px;padding:0;">
                        <li>Allez dans <strong>Commerces</strong></li>
                        <li>Éditez un commerce</li>
                        <li>Sélectionnez cette zone dans "Zone de livraison"</li>
                        <li>Renseignez la distance à pied</li>
                    </ol>
                </div>
                <a href="<?php echo esc_url( admin_url( 'edit.php?post_type=mbcdi_commerce' ) ); ?>" class="button button-primary">
                    ➕ Aller aux commerces
                </a>
            <?php else: ?>
                <div style="background:#d4edda;padding:12px;border-left:3px solid #28a745;margin-bottom:15px;">
                    <strong>✅ <?php echo count( $commerces ); ?> commerce(s) desservi(s) par cette zone</strong>
                </div>
                <table class="widefat" style="margin-top:15px;">
                    <thead>
                        <tr>
                            <th>Commerce</th>
                            <th>Distance à pied</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ( $commerces as $commerce ): 
                            $walking_dist = get_post_meta( $commerce->ID, '_mbcdi_walking_distance', true );
                            $edit_link = get_edit_post_link( $commerce->ID );
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html( $commerce->post_title ); ?></strong></td>
                            <td>
                                <?php if ( $walking_dist ): ?>
                                    <span style="color:#28a745;">🚶 <?php echo esc_html( $walking_dist ); ?> m</span>
                                <?php else: ?>
                                    <span style="color:#dc3545;">⚠️ Non renseignée</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <a href="<?php echo esc_url( $edit_link ); ?>" class="button button-small">
                                    ✏️ Modifier
                                </a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p style="margin-top:15px;">
                    <a href="<?php echo esc_url( admin_url( 'edit.php?post_type=mbcdi_commerce' ) ); ?>" class="button">
                        Voir tous les commerces
                    </a>
                </p>
            <?php endif; ?>
        </div>
        <?php
    }
               

    public static function render_chantier_info_box( $post ): void {
        wp_nonce_field( 'mbcdi_save_chantier', 'mbcdi_chantier_nonce' );
        
        $address = get_post_meta( $post->ID, '_mbcdi_address', true );
        $lat = get_post_meta( $post->ID, '_mbcdi_lat', true );
        $lng = get_post_meta( $post->ID, '_mbcdi_lng', true );
        $status = get_post_meta( $post->ID, '_mbcdi_status', true ) ?: 'active';
        $short_desc = get_post_meta( $post->ID, '_mbcdi_short_description', true );
        $ui_logo_id = get_post_meta( $post->ID, '_mbcdi_ui_logo_id', true );
        $ui_logo_url = $ui_logo_id ? wp_get_attachment_url( $ui_logo_id ) : '';
        ?>
        <table class="form-table">
            <tr>
                <th><label for="mbcdi_address"><?php esc_html_e( 'Adresse', 'mbcdi' ); ?></label></th>
                <td><input type="text" id="mbcdi_address" name="mbcdi_address" value="<?php echo esc_attr( $address ); ?>" class="large-text" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_lat"><?php esc_html_e( 'Latitude', 'mbcdi' ); ?></label></th>
                <td><input type="text" id="mbcdi_lat" name="mbcdi_lat" value="<?php echo esc_attr( $lat ); ?>" placeholder="48.8566" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_lng"><?php esc_html_e( 'Longitude', 'mbcdi' ); ?></label></th>
                <td><input type="text" id="mbcdi_lng" name="mbcdi_lng" value="<?php echo esc_attr( $lng ); ?>" placeholder="2.3522" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_short_description"><?php esc_html_e( 'Description courte', 'mbcdi' ); ?></label></th>
                <td><textarea id="mbcdi_short_description" name="mbcdi_short_description" rows="3" class="large-text"><?php echo esc_textarea( $short_desc ); ?></textarea></td>
            </tr>
            <tr>
                <th><label for="mbcdi_status"><?php esc_html_e( 'Statut', 'mbcdi' ); ?></label></th>
                <td>
                    <select id="mbcdi_status" name="mbcdi_status">
                        <option value="active" <?php selected( $status, 'active' ); ?>><?php esc_html_e( 'Actif', 'mbcdi' ); ?></option>
                        <option value="inactive" <?php selected( $status, 'inactive' ); ?>><?php esc_html_e( 'Inactif', 'mbcdi' ); ?></option>
                    </select>
                </td>
            </tr>
        </table>
        <?php
    }

    public static function render_commerce_info_box( $post ): void {
        wp_nonce_field( 'mbcdi_save_commerce', 'mbcdi_commerce_nonce' );
        
        $logo_id = get_post_meta( $post->ID, '_mbcdi_logo_id', true );
        $address = get_post_meta( $post->ID, '_mbcdi_address', true );
        $lat = get_post_meta( $post->ID, '_mbcdi_lat', true );
        $lng = get_post_meta( $post->ID, '_mbcdi_lng', true );
        $phone = get_post_meta( $post->ID, '_mbcdi_phone', true );
        $website = get_post_meta( $post->ID, '_mbcdi_website', true );
        $short_desc = get_post_meta( $post->ID, '_mbcdi_short_description', true );
        $ui_logo_id = get_post_meta( $post->ID, '_mbcdi_ui_logo_id', true );
        $ui_logo_url = $ui_logo_id ? wp_get_attachment_url( $ui_logo_id ) : '';
        $hours = get_post_meta( $post->ID, '_mbcdi_hours', true );
        $status = get_post_meta( $post->ID, '_mbcdi_status', true ) ?: 'active';
        $delivery_zone_id = get_post_meta( $post->ID, '_mbcdi_delivery_zone_id', true );
        $walking_distance = get_post_meta( $post->ID, '_mbcdi_walking_distance', true );
        
        $logo_url = $logo_id ? wp_get_attachment_url( $logo_id ) : '';
        
        // Récupérer toutes les zones de livraison
        $delivery_zones = get_posts( [
            'post_type' => 'mbcdi_delivery_zone',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => 'title',
            'order' => 'ASC',
        ] );
        ?>
        <table class="form-table">
            <tr>
                <th><label><?php esc_html_e( 'Logo', 'mbcdi' ); ?></label></th>
                <td>
                    <div style="margin-bottom:10px;">
                        <?php if ( $logo_url ): ?>
                            <img src="<?php echo esc_url( $logo_url ); ?>" style="max-width:150px;display:block;margin-bottom:10px;" id="mbcdi-logo-preview" />
                        <?php else: ?>
                            <img src="" style="max-width:150px;display:none;margin-bottom:10px;" id="mbcdi-logo-preview" />
                        <?php endif; ?>
                    </div>
                    <input type="hidden" id="mbcdi_logo_id" name="mbcdi_logo_id" value="<?php echo esc_attr( $logo_id ); ?>" />
                    <button type="button" class="button" id="mbcdi_upload_logo"><?php esc_html_e( 'Choisir une image', 'mbcdi' ); ?></button>
                    <button type="button" class="button" id="mbcdi_remove_logo" <?php echo ! $logo_id ? 'style="display:none;"' : ''; ?>><?php esc_html_e( 'Retirer', 'mbcdi' ); ?></button>
                </td>
            </tr>
            <tr>
                <th><label for="mbcdi_address"><?php esc_html_e( 'Adresse', 'mbcdi' ); ?></label></th>
                <td><input type="text" id="mbcdi_address" name="mbcdi_address" value="<?php echo esc_attr( $address ); ?>" class="large-text" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_lat"><?php esc_html_e( 'Latitude', 'mbcdi' ); ?></label></th>
                <td><input type="text" id="mbcdi_lat" name="mbcdi_lat" value="<?php echo esc_attr( $lat ); ?>" placeholder="48.8566" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_lng"><?php esc_html_e( 'Longitude', 'mbcdi' ); ?></label></th>
                <td><input type="text" id="mbcdi_lng" name="mbcdi_lng" value="<?php echo esc_attr( $lng ); ?>" placeholder="2.3522" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_delivery_zone_id"><?php esc_html_e( 'Zone de livraison', 'mbcdi' ); ?> ⭐</label></th>
                <td>
                    <select id="mbcdi_delivery_zone_id" name="mbcdi_delivery_zone_id" class="regular-text">
                        <option value=""><?php esc_html_e( '-- Aucune zone --', 'mbcdi' ); ?></option>
                        <?php foreach ( $delivery_zones as $zone ): ?>
                            <option value="<?php echo esc_attr( $zone->ID ); ?>" <?php selected( $delivery_zone_id, $zone->ID ); ?>>
                                <?php echo esc_html( $zone->post_title ); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description">
                        📍 Les itinéraires mèneront à cette zone, pas directement au commerce.
                        <?php if ( empty( $delivery_zones ) ): ?>
                            <br/><strong>Aucune zone de livraison créée.</strong> <a href="<?php echo esc_url( admin_url( 'post-new.php?post_type=mbcdi_delivery_zone' ) ); ?>">Créer une zone</a>
                        <?php endif; ?>
                    </p>
                </td>
            </tr>
            <tr>
                <th><label for="mbcdi_walking_distance"><?php esc_html_e( 'Distance à pied (mètres)', 'mbcdi' ); ?></label></th>
                <td>
                    <input type="number" id="mbcdi_walking_distance" name="mbcdi_walking_distance" value="<?php echo esc_attr( $walking_distance ); ?>" min="0" max="1000" step="10" placeholder="50" />
                    <p class="description">Distance approximative entre la zone de livraison et ce commerce (en mètres).</p>
                </td>
            </tr>
            <tr>
                <th><label for="mbcdi_phone"><?php esc_html_e( 'Téléphone', 'mbcdi' ); ?></label></th>
                <td><input type="tel" id="mbcdi_phone" name="mbcdi_phone" value="<?php echo esc_attr( $phone ); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_website"><?php esc_html_e( 'Site web', 'mbcdi' ); ?></label></th>
                <td><input type="url" id="mbcdi_website" name="mbcdi_website" value="<?php echo esc_attr( $website ); ?>" class="large-text" placeholder="https://" /></td>
            </tr>
            <tr>
                <th><label for="mbcdi_short_description"><?php esc_html_e( 'Description', 'mbcdi' ); ?></label></th>
                <td><textarea id="mbcdi_short_description" name="mbcdi_short_description" rows="3" class="large-text"><?php echo esc_textarea( $short_desc ); ?></textarea></td>
            </tr>
            <tr>
                <th><label for="mbcdi_hours"><?php esc_html_e( 'Horaires', 'mbcdi' ); ?></label></th>
                <td><textarea id="mbcdi_hours" name="mbcdi_hours" rows="2" class="large-text"><?php echo esc_textarea( $hours ); ?></textarea></td>
            </tr>
            <tr>
                <th><label for="mbcdi_status"><?php esc_html_e( 'Statut', 'mbcdi' ); ?></label></th>
                <td>
                    <select id="mbcdi_status" name="mbcdi_status">
                        <option value="active" <?php selected( $status, 'active' ); ?>><?php esc_html_e( 'Actif', 'mbcdi' ); ?></option>
                        <option value="inactive" <?php selected( $status, 'inactive' ); ?>><?php esc_html_e( 'Inactif', 'mbcdi' ); ?></option>
                    </select>
                </td>
            </tr>
        </table>
        <?php
    }

    public static function render_commerce_destinations_box( $post ): void {
        $chantiers_json = get_post_meta( $post->ID, '_mbcdi_chantiers', true );
        $selected_chantiers = $chantiers_json ? maybe_unserialize( $chantiers_json ) : [];
        if ( ! is_array( $selected_chantiers ) ) {
            $selected_chantiers = [];
        }
        
        $chantiers = get_posts( [
            'post_type' => 'mbcdi_chantier',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => 'title',
            'order' => 'ASC',
        ] );
        
        if ( empty( $chantiers ) ) {
            echo '<p style="color:#999;">Aucune destination disponible.</p>';
            return;
        }
        
        echo '<div style="max-height:300px;overflow-y:auto;padding:10px;border:1px solid #ddd;background:#fafafa;">';
        foreach ( $chantiers as $chantier ) {
            $checked = in_array( $chantier->ID, $selected_chantiers, true ) ? 'checked' : '';
            echo '<label style="display:block;margin-bottom:8px;">';
            echo '<input type="checkbox" name="mbcdi_chantiers[]" value="' . esc_attr( $chantier->ID ) . '" ' . $checked . ' /> ';
            echo '<strong>' . esc_html( $chantier->post_title ) . '</strong>';
            echo '</label>';
        }
        echo '</div>';
        echo '<p class="description" style="margin-top:10px;">Sélectionnez les destinations (chantiers) où ce commerce doit apparaître.</p>';
    }

    public static function render_picto_info_box( $post ): void {
        wp_nonce_field( 'mbcdi_save_picto', 'mbcdi_picto_nonce' );
        
        $shape = get_post_meta( $post->ID, '_mbcdi_picto_shape', true ) ?: 'circle';
        ?>
        <table class="form-table">
            <tr>
                <th><label for="mbcdi_picto_shape"><?php esc_html_e( 'Forme', 'mbcdi' ); ?></label></th>
                <td>
                    <select id="mbcdi_picto_shape" name="mbcdi_picto_shape">
                        <option value="circle" <?php selected( $shape, 'circle' ); ?>><?php esc_html_e( 'Cercle', 'mbcdi' ); ?></option>
                        <option value="square" <?php selected( $shape, 'square' ); ?>><?php esc_html_e( 'Carré', 'mbcdi' ); ?></option>
                        <option value="custom" <?php selected( $shape, 'custom' ); ?>><?php esc_html_e( 'Personnalisé', 'mbcdi' ); ?></option>
                    </select>
                    <p class="description"><?php esc_html_e( 'Utilisez l\'image à la une comme icône du pictogramme.', 'mbcdi' ); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }


    public static function render_start_points_box( $post ): void {
        wp_nonce_field( 'mbcdi_save_start_points', 'mbcdi_start_points_nonce' );
        
        $start_points_json = get_post_meta( $post->ID, '_mbcdi_start_points', true );
        ?>
        <div id="mbcdi-start-points-container">
            <p class="description">
                Définissez des points de départ fixes que les utilisateurs peuvent sélectionner (ex: "Entrée Nord", "Parking Sud").
                Les QR codes physiques seront placés à ces endroits.
            </p>
            
            <div id="mbcdi-start-points-map" style="height:400px;border:1px solid #ddd;border-radius:4px;margin:15px 0;"></div>
            <p class="description" style="margin-bottom:15px;">
                💡 Cliquez sur la carte pour ajouter un point, ou utilisez le bouton ci-dessous
            </p>
            
            <div id="mbcdi-start-points-list"></div>
            
            <p style="margin-top:15px;">
                <button type="button" class="button" id="mbcdi-add-start-point">➕ Ajouter un point de départ</button>
            </p>
            <input type="hidden" id="mbcdi_start_points_data" name="mbcdi_start_points" value="<?php echo esc_attr( $start_points_json ); ?>" />
        </div>
        <script>
            window.MBCDI_START_POINTS = <?php echo $start_points_json ? $start_points_json : '[]'; ?>;
        </script>
        <?php
    }

    public static function render_zone_box( $post ): void {
        wp_nonce_field( 'mbcdi_save_zone', 'mbcdi_zone_nonce' );
        
        $zone_json = get_post_meta( $post->ID, '_mbcdi_zone', true );
        $zone_color = get_post_meta( $post->ID, '_mbcdi_zone_color', true ) ?: '#FF6B6B';
        $zone_opacity = get_post_meta( $post->ID, '_mbcdi_zone_opacity', true ) ?: 0.3;
        ?>
        <div id="mbcdi-zone-container">
            <p class="description">
                Dessinez la zone de chantier sur la carte (polygon). Cette zone sera affichée en rouge sur la carte publique.
            </p>
            <table class="form-table">
                <tr>
                    <th><label>Couleur</label></th>
                    <td><input type="color" id="mbcdi_zone_color" name="mbcdi_zone_color" value="<?php echo esc_attr( $zone_color ); ?>" /></td>
                </tr>
                <tr>
                    <th><label>Opacité</label></th>
                    <td><input type="range" id="mbcdi_zone_opacity" name="mbcdi_zone_opacity" value="<?php echo esc_attr( $zone_opacity ); ?>" min="0" max="1" step="0.1" /> <span id="mbcdi-zone-opacity-value"><?php echo esc_html( $zone_opacity ); ?></span></td>
                </tr>
            </table>
            <div id="mbcdi-zone-map" style="height:400px;border:1px solid #ddd;margin-top:15px;"></div>
            <p style="margin-top:10px;">
                <button type="button" class="button" id="mbcdi-draw-zone">🖊️ Dessiner la zone</button>
                <button type="button" class="button" id="mbcdi-clear-zone">🗑️ Effacer</button>
            </p>
            <input type="hidden" id="mbcdi_zone_data" name="mbcdi_zone" value="<?php echo esc_attr( $zone_json ); ?>" />
        </div>
        <script>
            window.MBCDI_ZONE = <?php echo $zone_json ? $zone_json : 'null'; ?>;
        </script>
        <?php
    }

    public static function render_markers_box( $post ): void {
        wp_nonce_field( 'mbcdi_save_markers', 'mbcdi_markers_nonce' );
        
        $markers_json = get_post_meta( $post->ID, '_mbcdi_markers', true );
        
        $pictos = get_posts( [
            'post_type' => 'mbcdi_picto',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ] );
        ?>
        <div id="mbcdi-markers-container">
            <p class="description">
                Placez des pictogrammes sur la carte pour signaler des points d'intérêt.
            </p>
            <div id="mbcdi-markers-map" style="height:400px;border:1px solid #ddd;margin-top:15px;"></div>
            <div style="margin-top:15px;">
                <label><strong>Pictogramme :</strong></label>
                <select id="mbcdi-marker-picto-select">
                    <option value="">-- Sélectionner --</option>
                    <?php foreach ( $pictos as $picto ): 
                        $thumb = get_the_post_thumbnail_url( $picto->ID, 'thumbnail' );
                    ?>
                        <option value="<?php echo esc_attr( $picto->ID ); ?>" data-thumb="<?php echo esc_url( $thumb ); ?>">
                            <?php echo esc_html( $picto->post_title ); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <button type="button" class="button" id="mbcdi-add-marker">➕ Ajouter sur la carte</button>
            </div>
            <input type="hidden" id="mbcdi_markers_data" name="mbcdi_markers" value="<?php echo esc_attr( $markers_json ); ?>" />
        </div>
        <script>
            window.MBCDI_MARKERS = <?php echo $markers_json ? $markers_json : '[]'; ?>;
            window.MBCDI_PICTOS = <?php echo json_encode( array_map( function( $p ) {
                return [
                    'id' => $p->ID,
                    'title' => $p->post_title,
                    'thumb' => get_the_post_thumbnail_url( $p->ID, 'thumbnail' ),
                ];
            }, $pictos ) ); ?>;
        </script>
        <?php
    }

    public static function save_chantier_meta( int $post_id, $post ): void {
        if ( ! isset( $_POST['mbcdi_chantier_nonce'] ) || ! wp_verify_nonce( $_POST['mbcdi_chantier_nonce'], 'mbcdi_save_chantier' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }
        
        if ( isset( $_POST['mbcdi_address'] ) ) update_post_meta( $post_id, '_mbcdi_address', sanitize_text_field( $_POST['mbcdi_address'] ) );
        if ( isset( $_POST['mbcdi_short_description'] ) ) update_post_meta( $post_id, '_mbcdi_short_description', sanitize_textarea_field( $_POST['mbcdi_short_description'] ) );
        
        if ( isset( $_POST['mbcdi_lat'] ) ) update_post_meta( $post_id, '_mbcdi_lat', floatval( str_replace( ',', '.', $_POST['mbcdi_lat'] ) ) );
        if ( isset( $_POST['mbcdi_lng'] ) ) update_post_meta( $post_id, '_mbcdi_lng', floatval( str_replace( ',', '.', $_POST['mbcdi_lng'] ) ) );
        if ( isset( $_POST['mbcdi_status'] ) ) update_post_meta( $post_id, '_mbcdi_status', $_POST['mbcdi_status'] === 'inactive' ? 'inactive' : 'active' );
        if ( isset( $_POST['mbcdi_ui_logo_id'] ) ) update_post_meta( $post_id, '_mbcdi_ui_logo_id', intval( $_POST['mbcdi_ui_logo_id'] ) );
        
        // Note: Itinéraires V4 obsolète (métabox supprimée en v5.2.0)
        
        // Itinéraires V5.1.0 (NOUVEAU)
        if ( isset( $_POST['mbcdi_itineraries_v5'] ) ) {
            $raw = wp_unslash( $_POST['mbcdi_itineraries_v5'] );
            $decoded = json_decode( $raw, true );
            
            // Vérifier que c'est bien du JSON et qu'il contient les nouveaux champs v5.1.0
            if ( $decoded !== null && is_array( $decoded ) ) {
                $has_v510_fields = false;
                
                foreach ( $decoded as $itin ) {
                    if ( isset( $itin['start_point_id'] ) || isset( $itin['delivery_zone_id'] ) ) {
                        $has_v510_fields = true;
                        break;
                    }
                }
                
                if ( $has_v510_fields ) {
                    update_post_meta( $post_id, '_mbcdi_itineraries_v5', $raw );
                    error_log( "MBCDI v5.1.0: Itinéraires sauvegardés en v5 pour post $post_id" );
                }
            }
        }
        
        // Pictogrammes/Marqueurs
        if ( isset( $_POST['mbcdi_markers'] ) ) {
            $raw = wp_unslash( $_POST['mbcdi_markers'] );
            if ( json_decode( $raw ) !== null || $raw === '[]' ) {
                update_post_meta( $post_id, '_mbcdi_markers', $raw );
            }
        }
        
        // Points de départ fixes
       // Points de départ fixes
if ( isset( $_POST['mbcdi_start_points'] ) ) {
    $raw = wp_unslash( $_POST['mbcdi_start_points'] );
    $decoded = json_decode( $raw, true );

    // Si JSON valide (ou liste vide), on normalise et on ajoute un id si manquant
    if ( is_array( $decoded ) || $raw === '[]' ) {

        if ( is_array( $decoded ) ) {
            $used_ids = [];

            foreach ( $decoded as $i => $pt ) {
                $name = isset($pt['name']) ? (string) $pt['name'] : '';
                $lat  = isset($pt['lat']) ? floatval($pt['lat']) : 0.0;
                $lng  = isset($pt['lng']) ? floatval($pt['lng']) : 0.0;

                $id = isset($pt['id']) ? intval($pt['id']) : 0;

                // Générer un id stable si manquant (basé sur name+lat+lng)
                if ( $id <= 0 ) {
                    $seed = sprintf('%.6f|%.6f|%s|%d', $lat, $lng, $name, $i);
                    $id = absint( crc32( $seed ) );

                    // Éviter collision dans la même liste
                    while ( $id === 0 || isset($used_ids[$id]) ) {
                        $seed .= '|x';
                        $id = absint( crc32( $seed ) );
                    }
                }

                $used_ids[$id] = true;
                $decoded[$i]['id'] = $id;
            }
        }

        update_post_meta(
            $post_id,
            '_mbcdi_start_points',
            wp_json_encode( $decoded, JSON_UNESCAPED_UNICODE )
        );
    }
}

        
        // Zone
        if ( isset( $_POST['mbcdi_zone'] ) ) {
            $raw = wp_unslash( $_POST['mbcdi_zone'] );

            // Le champ peut contenir soit:
            // - un tableau de points: [{lat,lng}, ...]
            // - un objet zone complet: {points:[...], color, opacity}
            $decoded = json_decode( $raw, true );

            if ( $raw === 'null' ) {
                update_post_meta( $post_id, '_mbcdi_zone', 'null' );
            } elseif ( is_array( $decoded ) ) {
                // Si wrapper {points: [...]}
                if ( isset( $decoded['points'] ) && is_array( $decoded['points'] ) ) {
                    update_post_meta( $post_id, '_mbcdi_zone', wp_json_encode( $decoded['points'] ) );

                    // Optionnel: synchroniser la couleur / opacité si présentes dans le wrapper
                    if ( isset( $decoded['color'] ) ) {
                        update_post_meta( $post_id, '_mbcdi_zone_color', sanitize_hex_color( $decoded['color'] ) );
                    }
                    if ( isset( $decoded['opacity'] ) ) {
                        update_post_meta( $post_id, '_mbcdi_zone_opacity', floatval( $decoded['opacity'] ) );
                    }
                } else {
                    // Tableau de points direct
                    update_post_meta( $post_id, '_mbcdi_zone', wp_json_encode( $decoded ) );
                }
            }
        }
        if ( isset( $_POST['mbcdi_zone_color'] ) ) update_post_meta( $post_id, '_mbcdi_zone_color', sanitize_hex_color( $_POST['mbcdi_zone_color'] ) );
        if ( isset( $_POST['mbcdi_delivery_zone_icon_url'] ) ) update_post_meta( $post_id, '_mbcdi_delivery_zone_icon_url', esc_url_raw( $_POST['mbcdi_delivery_zone_icon_url'] ) );
        if ( isset( $_POST['mbcdi_delivery_zone_geometry'] ) ) {
            $raw = wp_unslash( $_POST['mbcdi_delivery_zone_geometry'] );
            // Attend une liste de points [{lat,lng},...] ou vide
            if ( $raw === '' ) {
                delete_post_meta( $post_id, '_mbcdi_delivery_zone_geometry' );
            } elseif ( json_decode( $raw, true ) !== null ) {
                update_post_meta( $post_id, '_mbcdi_delivery_zone_geometry', $raw );
            }
        }
        if ( isset( $_POST['mbcdi_zone_opacity'] ) ) update_post_meta( $post_id, '_mbcdi_zone_opacity', floatval( $_POST['mbcdi_zone_opacity'] ) );
        
        update_post_meta( $post_id, '_mbcdi_last_update', current_time( 'mysql' ) );
        
        // Metas protégées
        foreach ( [ '_mbcdi_short_description', '_mbcdi_address', '_mbcdi_lat', '_mbcdi_lng', '_mbcdi_status', '_mbcdi_ui_logo_id', '_mbcdi_itineraries_v4', '_mbcdi_markers' ] as $key ) {
            if ( ! get_post_meta( $post_id, $key, true ) ) {
                delete_post_meta( $post_id, $key );
            }
        }
    }

    /**
     * NOUVEAU V4.4: Sauvegarde des zones de livraison
     */
    public static function save_delivery_zone_meta( int $post_id, $post ): void {
        if ( ! isset( $_POST['mbcdi_delivery_zone_nonce'] ) || ! wp_verify_nonce( $_POST['mbcdi_delivery_zone_nonce'], 'mbcdi_save_delivery_zone' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }
        
        if ( isset( $_POST['mbcdi_address'] ) ) update_post_meta( $post_id, '_mbcdi_address', sanitize_text_field( $_POST['mbcdi_address'] ) );
        if ( isset( $_POST['mbcdi_short_description'] ) ) update_post_meta( $post_id, '_mbcdi_short_description', sanitize_textarea_field( $_POST['mbcdi_short_description'] ) );
        if ( isset( $_POST['mbcdi_lat'] ) ) update_post_meta( $post_id, '_mbcdi_lat', floatval( str_replace( ',', '.', $_POST['mbcdi_lat'] ) ) );
        if ( isset( $_POST['mbcdi_lng'] ) ) update_post_meta( $post_id, '_mbcdi_lng', floatval( str_replace( ',', '.', $_POST['mbcdi_lng'] ) ) );
        if ( isset( $_POST['mbcdi_status'] ) ) update_post_meta( $post_id, '_mbcdi_status', $_POST['mbcdi_status'] === 'inactive' ? 'inactive' : 'active' );
        if ( isset( $_POST['mbcdi_zone_color'] ) ) update_post_meta( $post_id, '_mbcdi_zone_color', sanitize_hex_color( $_POST['mbcdi_zone_color'] ) );
        if ( isset( $_POST['mbcdi_delivery_zone_icon_url'] ) ) {
            update_post_meta( $post_id, '_mbcdi_delivery_zone_icon_url', esc_url_raw( $_POST['mbcdi_delivery_zone_icon_url'] ) );
        }
        if ( isset( $_POST['mbcdi_delivery_zone_geometry'] ) ) {
            $raw = wp_unslash( $_POST['mbcdi_delivery_zone_geometry'] );
            if ( $raw === '' ) {
                delete_post_meta( $post_id, '_mbcdi_delivery_zone_geometry' );
            } else if ( json_decode( $raw, true ) !== null ) {
                update_post_meta( $post_id, '_mbcdi_delivery_zone_geometry', $raw );
            }
        }

    }

    public static function save_commerce_meta( int $post_id, $post ): void {
        if ( ! isset( $_POST['mbcdi_commerce_nonce'] ) || ! wp_verify_nonce( $_POST['mbcdi_commerce_nonce'], 'mbcdi_save_commerce' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }
        
        if ( isset( $_POST['mbcdi_logo_id'] ) ) update_post_meta( $post_id, '_mbcdi_logo_id', intval( $_POST['mbcdi_logo_id'] ) );
        if ( isset( $_POST['mbcdi_address'] ) ) update_post_meta( $post_id, '_mbcdi_address', sanitize_text_field( $_POST['mbcdi_address'] ) );
        if ( isset( $_POST['mbcdi_lat'] ) ) update_post_meta( $post_id, '_mbcdi_lat', floatval( str_replace( ',', '.', $_POST['mbcdi_lat'] ) ) );
        if ( isset( $_POST['mbcdi_lng'] ) ) update_post_meta( $post_id, '_mbcdi_lng', floatval( str_replace( ',', '.', $_POST['mbcdi_lng'] ) ) );
        if ( isset( $_POST['mbcdi_phone'] ) ) update_post_meta( $post_id, '_mbcdi_phone', sanitize_text_field( $_POST['mbcdi_phone'] ) );
        if ( isset( $_POST['mbcdi_website'] ) ) update_post_meta( $post_id, '_mbcdi_website', esc_url_raw( $_POST['mbcdi_website'] ) );
        if ( isset( $_POST['mbcdi_short_description'] ) ) update_post_meta( $post_id, '_mbcdi_short_description', sanitize_textarea_field( $_POST['mbcdi_short_description'] ) );
        if ( isset( $_POST['mbcdi_hours'] ) ) update_post_meta( $post_id, '_mbcdi_hours', sanitize_textarea_field( $_POST['mbcdi_hours'] ) );
        if ( isset( $_POST['mbcdi_status'] ) ) update_post_meta( $post_id, '_mbcdi_status', $_POST['mbcdi_status'] === 'inactive' ? 'inactive' : 'active' );
        
        // NOUVEAU V4.4: Zone de livraison et distance à pied
        if ( isset( $_POST['mbcdi_delivery_zone_id'] ) ) {
            $zone_id = intval( $_POST['mbcdi_delivery_zone_id'] );
            update_post_meta( $post_id, '_mbcdi_delivery_zone_id', $zone_id > 0 ? $zone_id : '' );
        }
        if ( isset( $_POST['mbcdi_walking_distance'] ) ) {
            update_post_meta( $post_id, '_mbcdi_walking_distance', intval( $_POST['mbcdi_walking_distance'] ) );
        }
        
        // Chantiers associés
        if ( isset( $_POST['mbcdi_chantiers'] ) && is_array( $_POST['mbcdi_chantiers'] ) ) {
            $chantiers = array_map( 'intval', $_POST['mbcdi_chantiers'] );
            update_post_meta( $post_id, '_mbcdi_chantiers', serialize( $chantiers ) );
        } else {
            delete_post_meta( $post_id, '_mbcdi_chantiers' );
        }
    }

    public static function save_picto_meta( int $post_id, $post ): void {
        if ( ! isset( $_POST['mbcdi_picto_nonce'] ) || ! wp_verify_nonce( $_POST['mbcdi_picto_nonce'], 'mbcdi_save_picto' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }
        
        if ( isset( $_POST['mbcdi_picto_shape'] ) ) {
            update_post_meta( $post_id, '_mbcdi_picto_shape', sanitize_text_field( $_POST['mbcdi_picto_shape'] ) );
        }
    }

    public static function enqueue_admin_scripts( $hook ): void {
        $screen = get_current_screen();
        if ( ! $screen || ! in_array( $screen->post_type, [ 'mbcdi_chantier', 'mbcdi_commerce', 'mbcdi_delivery_zone' ], true ) ) {
            return;
        }
        
        // Utiliser __FILE__ pour garantir le bon chemin, même si le dossier plugin est renommé
        // Utiliser l'URL du plugin définie dans le fichier principal pour éviter
        // les problèmes d'URL lorsque cette classe est dans un sous‑répertoire.
        // MBCDI_PLUGIN_URL est défini dans mbcdi-itineraires.php.
        $plugin_url = defined( 'MBCDI_PLUGIN_URL' ) ? MBCDI_PLUGIN_URL : plugins_url( '', dirname( __FILE__ ) );
        
        wp_enqueue_media();
        wp_enqueue_style( 'leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4' );
        wp_enqueue_script( 'leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true );
        
        // Vérifier que les fichiers existent avant de les enqueue
        $admin_css = $plugin_url . '/assets/css/admin.css';
        if ( file_exists( dirname( __FILE__ ) . '/../assets/css/admin.css' ) ) {
            // Utiliser la constante MBCDI_VERSION pour gérer le cache correctement
            wp_enqueue_style( 'mbcdi-admin', $admin_css, [], MBCDI_VERSION );
        }

        // Scripts admin (enqueue seulement s'ils existent)
        $admin_scripts = [
            // BO Itinéraires (v5.1.0 CLEAN)
            'mbcdi-admin-itineraries'      => '/assets/js/admin-itineraries.js',
            'mbcdi-admin-start-points'     => '/assets/js/admin-start-points.js',
            'mbcdi-admin-chantier-ui'     => '/assets/js/admin-chantier-ui.js',
            'mbcdi-admin-zone'             => '/assets/js/admin-zone.js',
            'mbcdi-admin-markers'          => '/assets/js/admin-markers.js',
            'mbcdi-admin-commerce'         => '/assets/js/admin-commerce.js',
            'mbcdi-admin-delivery-zone'    => '/assets/js/admin-delivery-zone.js',
            'mbcdi-admin-delivery-zone-geometry' => '/assets/js/admin-delivery-zone-geometry.js',
        ];

        // Suivre l'enqueue pour localiser seulement si nécessaire
        $itineraries_bo_enqueued = false;
        foreach ( $admin_scripts as $handle => $path ) {
            $file_path = dirname( __FILE__ ) . '/..' . $path;
            if ( file_exists( $file_path ) ) {
                $deps = ( $handle === 'mbcdi-admin-commerce' ) ? [ 'jquery' ] : [ 'jquery', 'leaflet' ];
                wp_enqueue_script( $handle, $plugin_url . $path, $deps, MBCDI_VERSION, true );
                if ( $handle === 'mbcdi-admin-itineraries' ) {
                    $itineraries_bo_enqueued = true;
                }
            }
        }

        // CSS spécifique BO Itinéraires
        if ( file_exists( dirname( __FILE__ ) . '/../assets/css/admin-itineraries.css' ) ) {
            wp_enqueue_style( 'mbcdi-admin-itineraries', $plugin_url . '/assets/css/admin-itineraries.css', [], MBCDI_VERSION );
        }

        // Localiser uniquement si le BO Itinéraires est chargé
        if ( $itineraries_bo_enqueued ) {
            $settings = get_option( 'mbcdi_settings', [] );
            $default_profile = isset( $settings['routing_default_profile'] ) ? (string) $settings['routing_default_profile'] : 'car';
            $default_profile = in_array( $default_profile, [ 'car', 'bike', 'foot' ], true ) ? $default_profile : 'car';

            wp_localize_script( 'mbcdi-admin-itineraries', 'MBCDI_ADMIN', [
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'nonce'   => wp_create_nonce( 'mbcdi_ajax' ),
                'defaultProfile' => $default_profile,
                'labels' => [
                    'confirmDelete' => __( 'Supprimer cet itinéraire ?', 'mbcdi' ),
                    'clickToAdd' => __( 'Cliquez sur la carte pour ajouter un waypoint', 'mbcdi' ),
                    'closeWithoutSave' => __( 'Fermer sans sauvegarder le tracé ?', 'mbcdi' ),
                ],
            ] );
        }
    }
}
