<?php
/**
 * MBCDI CSV Importer
 * Import massif de commerces depuis fichier CSV
 * 
 * @package MBCDI
 * @version 5.4.2
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class MBCDI_CSV_Importer {

    /**
     * Initialiser les hooks
     */
    public static function init(): void {
        add_action( 'admin_menu', [ __CLASS__, 'add_menu_page' ] );
        add_action( 'admin_post_mbcdi_import_csv', [ __CLASS__, 'handle_csv_import' ] );
        add_action( 'admin_enqueue_scripts', [ __CLASS__, 'enqueue_scripts' ] );
    }

    /**
     * Ajouter la page d'import au menu
     */
    public static function add_menu_page(): void {
        add_submenu_page(
            'edit.php?post_type=mbcdi_chantier',
            'Import CSV Commerces',
            'Import CSV',
            'manage_options',
            'mbcdi-csv-import',
            [ __CLASS__, 'render_import_page' ]
        );
    }

    /**
     * Enqueue scripts et styles
     */
    public static function enqueue_scripts( $hook ): void {
        if ( $hook !== 'mbcdi_chantier_page_mbcdi-csv-import' ) {
            return;
        }

        wp_enqueue_style(
            'mbcdi-csv-import',
            MBCDI_PLUGIN_URL . 'assets/css/admin-csv-import.css',
            [],
            MBCDI_VERSION
        );

        wp_enqueue_script(
            'mbcdi-csv-import',
            MBCDI_PLUGIN_URL . 'assets/js/admin-csv-import.js',
            [ 'jquery' ],
            MBCDI_VERSION,
            true
        );
    }

    /**
     * Afficher la page d'import
     */
    public static function render_import_page(): void {
        ?>
        <div class="wrap mbcdi-csv-import-page">
            <h1>📥 Import CSV de Commerces</h1>
            
            <div class="mbcdi-import-container">
                <!-- Sidebar avec guide -->
                <div class="mbcdi-import-sidebar">
                    <div class="mbcdi-help-card">
                        <h3>📋 Guide d'import</h3>
                        <ol>
                            <li>Téléchargez le modèle CSV</li>
                            <li>Remplissez vos données</li>
                            <li>Uploadez le fichier</li>
                            <li>Vérifiez l'aperçu</li>
                            <li>Validez l'import</li>
                        </ol>
                    </div>

                    <div class="mbcdi-help-card">
                        <h3>✅ Colonnes obligatoires</h3>
                        <ul>
                            <li><strong>nom</strong> - Nom du commerce</li>
                            <li><strong>latitude</strong> - Coordonnée GPS</li>
                            <li><strong>longitude</strong> - Coordonnée GPS</li>
                        </ul>
                    </div>

                    <div class="mbcdi-help-card">
                        <h3>📌 Colonnes optionnelles</h3>
                        <ul>
                            <li><strong>adresse</strong> - Adresse complète</li>
                            <li><strong>telephone</strong> - Numéro de téléphone</li>
                            <li><strong>site_web</strong> - URL du site</li>
                            <li><strong>description</strong> - Description courte</li>
                            <li><strong>type</strong> - Type de commerce</li>
                            <li><strong>horaires</strong> - Horaires d'ouverture</li>
                            <li><strong>logo_url</strong> - URL du logo (sera téléchargé)</li>
                            <li><strong>zone_livraison_id</strong> - ID de la zone</li>
                        </ul>
                    </div>

                    <div class="mbcdi-help-card">
                        <h3>💡 Conseils</h3>
                        <ul>
                            <li>Utilisez des virgules pour séparer les colonnes</li>
                            <li>Mettez les textes entre guillemets si virgules présentes</li>
                            <li>Encodage UTF-8 recommandé</li>
                            <li>Maximum 500 commerces par fichier</li>
                        </ul>
                    </div>
                </div>

                <!-- Zone principale -->
                <div class="mbcdi-import-main">
                    
                    <!-- Étape 1: Téléchargement du template -->
                    <div class="mbcdi-import-step mbcdi-step-active" data-step="1">
                        <div class="mbcdi-step-header">
                            <span class="mbcdi-step-number">1</span>
                            <h2>Téléchargez le modèle CSV</h2>
                        </div>
                        
                        <div class="mbcdi-step-content">
                            <p>Ce fichier contient toutes les colonnes nécessaires avec un exemple pré-rempli.</p>
                            
                            <a href="<?php echo admin_url( 'admin-post.php?action=mbcdi_download_csv_template' ); ?>" 
                               class="button button-primary button-hero">
                                <span class="dashicons dashicons-download"></span>
                                Télécharger le modèle CSV
                            </a>

                            <div class="mbcdi-template-preview">
                                <h4>Aperçu du modèle:</h4>
                                <pre><code>nom,adresse,latitude,longitude,telephone,site_web,description,type,horaires,logo_url,zone_livraison_id
"Boulangerie Martin","12 rue Victor Hugo",48.8566,2.3522,"01 23 45 67 89","https://boulangerie-martin.fr","Pain frais tous les jours","Boulangerie","8h-19h","https://example.com/logo.png",""
"Pharmacie Centrale","45 bd Leclerc",48.8570,2.3525,"01 98 76 54 32","","Pharmacie de garde","Pharmacie","9h-20h","",""</code></pre>
                            </div>

                            <button class="button button-large mbcdi-next-step" data-next="2">
                                Étape suivante →
                            </button>
                        </div>
                    </div>

                    <!-- Étape 2: Upload du fichier -->
                    <div class="mbcdi-import-step" data-step="2">
                        <div class="mbcdi-step-header">
                            <span class="mbcdi-step-number">2</span>
                            <h2>Uploadez votre fichier CSV</h2>
                        </div>
                        
                        <div class="mbcdi-step-content">
                            <form method="post" enctype="multipart/form-data" id="mbcdi-csv-upload-form">
                                <?php wp_nonce_field( 'mbcdi_csv_import', 'mbcdi_csv_nonce' ); ?>
                                <input type="hidden" name="action" value="mbcdi_import_csv">
                                
                                <div class="mbcdi-upload-zone" id="mbcdi-csv-dropzone">
                                    <div class="mbcdi-upload-icon">📁</div>
                                    <h3>Glissez-déposez votre fichier CSV ici</h3>
                                    <p>ou</p>
                                    <label for="mbcdi-csv-file" class="button button-primary button-large">
                                        Choisir un fichier
                                    </label>
                                    <input type="file" 
                                           id="mbcdi-csv-file" 
                                           name="csv_file" 
                                           accept=".csv,text/csv" 
                                           style="display: none;">
                                </div>

                                <div id="mbcdi-file-info" style="display: none;">
                                    <div class="mbcdi-file-selected">
                                        <span class="dashicons dashicons-media-spreadsheet"></span>
                                        <span id="mbcdi-filename"></span>
                                        <span id="mbcdi-filesize"></span>
                                        <button type="button" class="button button-small" id="mbcdi-remove-file">
                                            Supprimer
                                        </button>
                                    </div>
                                </div>

                                <div class="mbcdi-import-options">
                                    <h4>Options d'import</h4>
                                    
                                    <label>
                                        <input type="checkbox" name="update_existing" value="1" checked>
                                        Mettre à jour les commerces existants (si même nom et adresse)
                                    </label>

                                    <label>
                                        <input type="checkbox" name="download_logos" value="1" checked>
                                        Télécharger automatiquement les logos depuis les URLs
                                    </label>

                                    <label>
                                        <input type="checkbox" name="auto_assign_zones" value="1" checked>
                                        Associer automatiquement aux zones de livraison proches (rayon 500m)
                                    </label>

                                    <label>
                                        <input type="checkbox" name="skip_errors" value="1" checked>
                                        Continuer l'import même en cas d'erreurs (passer les lignes problématiques)
                                    </label>
                                </div>

                                <button type="button" class="button button-primary button-large" id="mbcdi-preview-btn" disabled>
                                    Prévisualiser →
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- Étape 3: Prévisualisation -->
                    <div class="mbcdi-import-step" data-step="3">
                        <div class="mbcdi-step-header">
                            <span class="mbcdi-step-number">3</span>
                            <h2>Vérification des données</h2>
                        </div>
                        
                        <div class="mbcdi-step-content">
                            <div id="mbcdi-preview-stats" class="mbcdi-import-stats">
                                <!-- Rempli dynamiquement via JS -->
                            </div>

                            <div id="mbcdi-preview-errors" class="mbcdi-errors-list" style="display: none;">
                                <!-- Erreurs de validation -->
                            </div>

                            <div id="mbcdi-preview-table-container">
                                <table id="mbcdi-preview-table" class="wp-list-table widefat fixed striped">
                                    <thead>
                                        <tr>
                                            <th>Statut</th>
                                            <th>Nom</th>
                                            <th>Adresse</th>
                                            <th>GPS</th>
                                            <th>Téléphone</th>
                                            <th>Type</th>
                                            <th>Zone</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Rempli dynamiquement -->
                                    </tbody>
                                </table>
                            </div>

                            <div class="mbcdi-import-actions">
                                <button type="button" class="button button-large" id="mbcdi-back-to-upload">
                                    ← Retour
                                </button>
                                <button type="submit" 
                                        form="mbcdi-csv-upload-form" 
                                        class="button button-primary button-hero" 
                                        id="mbcdi-confirm-import">
                                    ✓ Confirmer l'import
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Étape 4: Import en cours / Résultat -->
                    <div class="mbcdi-import-step" data-step="4">
                        <div class="mbcdi-step-header">
                            <span class="mbcdi-step-number">4</span>
                            <h2>Import en cours...</h2>
                        </div>
                        
                        <div class="mbcdi-step-content">
                            <div class="mbcdi-progress-container">
                                <div class="mbcdi-progress-bar">
                                    <div class="mbcdi-progress-fill" id="mbcdi-import-progress"></div>
                                </div>
                                <div class="mbcdi-progress-text">
                                    <span id="mbcdi-progress-current">0</span> / 
                                    <span id="mbcdi-progress-total">0</span> commerces importés
                                </div>
                            </div>

                            <div id="mbcdi-import-result" style="display: none;">
                                <!-- Résultat de l'import -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Gérer l'upload et l'import du CSV
     */
    public static function handle_csv_import(): void {
        check_admin_referer( 'mbcdi_csv_import', 'mbcdi_csv_nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( __( 'Permission refusée', 'mbcdi' ) );
        }

        if ( empty( $_FILES['csv_file'] ) ) {
            wp_die( __( 'Aucun fichier uploadé', 'mbcdi' ) );
        }

        $file = $_FILES['csv_file'];
        
        // Vérifications de sécurité
        if ( $file['error'] !== UPLOAD_ERR_OK ) {
            wp_die( __( 'Erreur lors de l\'upload du fichier', 'mbcdi' ) );
        }

        if ( ! in_array( $file['type'], [ 'text/csv', 'text/plain', 'application/csv' ], true ) ) {
            wp_die( __( 'Type de fichier non valide. Seuls les fichiers CSV sont acceptés.', 'mbcdi' ) );
        }

        // Options d'import
        $update_existing = ! empty( $_POST['update_existing'] );
        $download_logos = ! empty( $_POST['download_logos'] );
        $auto_assign_zones = ! empty( $_POST['auto_assign_zones'] );
        $skip_errors = ! empty( $_POST['skip_errors'] );

        // Lire et traiter le CSV
        $result = self::process_csv_file(
            $file['tmp_name'],
            $update_existing,
            $download_logos,
            $auto_assign_zones,
            $skip_errors
        );

        // Rediriger avec résultats
        $redirect_url = add_query_arg( [
            'page' => 'mbcdi-csv-import',
            'imported' => $result['success'],
            'errors' => $result['errors'],
            'updated' => $result['updated'],
        ], admin_url( 'edit.php?post_type=mbcdi_chantier' ) );

        wp_safe_redirect( $redirect_url );
        exit;
    }

    /**
     * Traiter le fichier CSV
     */
    private static function process_csv_file(
        string $filepath,
        bool $update_existing,
        bool $download_logos,
        bool $auto_assign_zones,
        bool $skip_errors
    ): array {
        
        $result = [
            'success' => 0,
            'errors' => 0,
            'updated' => 0,
            'error_details' => [],
        ];

        if ( ! file_exists( $filepath ) ) {
            return $result;
        }

        $handle = fopen( $filepath, 'r' );
        if ( $handle === false ) {
            return $result;
        }

        // Lire l'entête
        $headers = fgetcsv( $handle, 10000, ',' );
        if ( $headers === false ) {
            fclose( $handle );
            return $result;
        }

        // Normaliser les entêtes
        $headers = array_map( 'trim', $headers );
        $headers = array_map( 'strtolower', $headers );

        // Vérifier les colonnes obligatoires
        $required = [ 'nom', 'latitude', 'longitude' ];
        foreach ( $required as $col ) {
            if ( ! in_array( $col, $headers, true ) ) {
                fclose( $handle );
                $result['error_details'][] = sprintf(
                    __( 'Colonne obligatoire manquante: %s', 'mbcdi' ),
                    $col
                );
                return $result;
            }
        }

        $line_number = 1; // Ligne 1 = header

        // Traiter chaque ligne
        while ( ( $row = fgetcsv( $handle, 10000, ',' ) ) !== false ) {
            $line_number++;

            if ( count( $row ) !== count( $headers ) ) {
                if ( ! $skip_errors ) {
                    $result['errors']++;
                    $result['error_details'][] = sprintf(
                        __( 'Ligne %d: nombre de colonnes incorrect', 'mbcdi' ),
                        $line_number
                    );
                }
                continue;
            }

            // Créer un tableau associatif
            $data = array_combine( $headers, $row );

            // Validation des données
            $validation = self::validate_row_data( $data, $line_number );
            if ( ! $validation['valid'] ) {
                if ( ! $skip_errors ) {
                    $result['errors']++;
                    $result['error_details'] = array_merge(
                        $result['error_details'],
                        $validation['errors']
                    );
                    continue;
                }
            }

            // Créer ou mettre à jour le commerce
            $commerce_id = self::create_or_update_commerce( $data, $update_existing );

            if ( $commerce_id ) {
                $is_update = $update_existing && self::commerce_exists( $data['nom'], $data['adresse'] ?? '' );
                
                if ( $is_update ) {
                    $result['updated']++;
                    MBCDI_Logger::info( sprintf(
                        'Commerce mis à jour: "%s" (ID: %d)',
                        $data['nom'],
                        $commerce_id
                    ) );
                } else {
                    $result['success']++;
                    MBCDI_Logger::info( sprintf(
                        'Commerce créé: "%s" (ID: %d, GPS: %s,%s)',
                        $data['nom'],
                        $commerce_id,
                        $data['latitude'],
                        $data['longitude']
                    ) );
                }

                // Télécharger le logo si demandé
                if ( $download_logos && ! empty( $data['logo_url'] ) ) {
                    self::download_and_attach_logo( $commerce_id, $data['logo_url'] );
                }

                // Auto-association aux zones
                if ( $auto_assign_zones ) {
                    self::auto_assign_to_zones(
                        $commerce_id,
                        floatval( $data['latitude'] ),
                        floatval( $data['longitude'] )
                    );
                }
            } else {
                $result['errors']++;
                $error_msg = sprintf(
                    __( 'Ligne %d: échec de création du commerce "%s"', 'mbcdi' ),
                    $line_number,
                    $data['nom']
                );
                $result['error_details'][] = $error_msg;
                
                MBCDI_Logger::error( $error_msg );
            }
        }

        fclose( $handle );

        // Logger l'import
        MBCDI_Logger::info( sprintf(
            'Import CSV terminé: %d succès, %d erreurs, %d mises à jour',
            $result['success'],
            $result['errors'],
            $result['updated']
        ) );

        return $result;
    }

    /**
     * Valider les données d'une ligne
     */
    private static function validate_row_data( array $data, int $line_number ): array {
        $errors = [];

        // Nom obligatoire
        if ( empty( $data['nom'] ) ) {
            $errors[] = sprintf( __( 'Ligne %d: nom manquant', 'mbcdi' ), $line_number );
        }

        // Coordonnées GPS obligatoires et valides
        $lat = floatval( $data['latitude'] ?? 0 );
        $lng = floatval( $data['longitude'] ?? 0 );

        if ( $lat < -90 || $lat > 90 ) {
            $errors[] = sprintf(
                __( 'Ligne %d: latitude invalide (%s)', 'mbcdi' ),
                $line_number,
                $data['latitude'] ?? ''
            );
        }

        if ( $lng < -180 || $lng > 180 ) {
            $errors[] = sprintf(
                __( 'Ligne %d: longitude invalide (%s)', 'mbcdi' ),
                $line_number,
                $data['longitude'] ?? ''
            );
        }

        // Validation URL si logo_url présent
        if ( ! empty( $data['logo_url'] ) && ! filter_var( $data['logo_url'], FILTER_VALIDATE_URL ) ) {
            $errors[] = sprintf(
                __( 'Ligne %d: URL de logo invalide', 'mbcdi' ),
                $line_number
            );
        }

        return [
            'valid' => empty( $errors ),
            'errors' => $errors,
        ];
    }

    /**
     * Vérifier si un commerce existe déjà
     */
    private static function commerce_exists( string $name, string $address ): bool {
        $args = [
            'post_type' => 'mbcdi_commerce',
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'title' => $name,
            'meta_query' => [
                [
                    'key' => '_mbcdi_address',
                    'value' => $address,
                    'compare' => '=',
                ],
            ],
        ];

        $query = new WP_Query( $args );
        return $query->have_posts();
    }

    /**
     * Créer ou mettre à jour un commerce
     */
    private static function create_or_update_commerce( array $data, bool $update_existing ): ?int {
        
        // TOUJOURS chercher si le commerce existe
        $existing_id = null;
        $args = [
            'post_type' => 'mbcdi_commerce',
            'post_status' => ['publish', 'draft', 'pending'],
            'posts_per_page' => 1,
            'title' => $data['nom'],
            'fields' => 'ids',
        ];
        $query = new WP_Query( $args );
        if ( $query->have_posts() ) {
            $existing_id = $query->posts[0];
        }

        // Préparer les données du post
        $post_data = [
            'post_title' => sanitize_text_field( $data['nom'] ),
            'post_type' => 'mbcdi_commerce',
            'post_status' => 'publish',
        ];

        // Logique de création/mise à jour
        if ( $existing_id && $update_existing ) {
            // Commerce existe ET option mise à jour cochée → UPDATE
            $post_data['ID'] = $existing_id;
            $commerce_id = wp_update_post( $post_data );
        } elseif ( ! $existing_id ) {
            // Commerce n'existe pas → CRÉER
            $commerce_id = wp_insert_post( $post_data );
        } else {
            // Commerce existe MAIS option mise à jour non cochée → SKIP
            return null;
        }

        if ( ! $commerce_id || is_wp_error( $commerce_id ) ) {
            return null;
        }

        // Mettre à jour les métadonnées
        $meta_fields = [
            '_mbcdi_address' => sanitize_text_field( $data['adresse'] ?? '' ),
            '_mbcdi_lat' => floatval( $data['latitude'] ),
            '_mbcdi_lng' => floatval( $data['longitude'] ),
            '_mbcdi_phone' => sanitize_text_field( $data['telephone'] ?? '' ),
            '_mbcdi_website' => esc_url_raw( $data['site_web'] ?? '' ),
            '_mbcdi_short_description' => sanitize_textarea_field( $data['description'] ?? '' ),
            '_mbcdi_hours' => sanitize_textarea_field( $data['horaires'] ?? '' ),
            '_mbcdi_status' => 'active',
        ];

        // Zone de livraison si ID fourni
        if ( ! empty( $data['zone_livraison_id'] ) ) {
            $zone_id = intval( $data['zone_livraison_id'] );
            if ( $zone_id > 0 && get_post_type( $zone_id ) === 'mbcdi_delivery_zone' ) {
                $meta_fields['_mbcdi_delivery_zone_id'] = $zone_id;
            }
        }

        // Type de commerce
        if ( ! empty( $data['type'] ) ) {
            $meta_fields['_mbcdi_commerce_type'] = sanitize_text_field( $data['type'] );
        }

        foreach ( $meta_fields as $key => $value ) {
            update_post_meta( $commerce_id, $key, $value );
        }
        
        // Initialiser _mbcdi_chantiers comme tableau vide sérialisé
        if ( ! get_post_meta( $commerce_id, '_mbcdi_chantiers', true ) ) {
            update_post_meta( $commerce_id, '_mbcdi_chantiers', serialize( [] ) );
        }

        return $commerce_id;
    }

    /**
     * Télécharger et attacher un logo depuis une URL
     */
    private static function download_and_attach_logo( int $commerce_id, string $logo_url ): void {
        
        if ( ! filter_var( $logo_url, FILTER_VALIDATE_URL ) ) {
            MBCDI_Logger::warning( sprintf(
                'URL de logo invalide pour commerce #%d: %s',
                $commerce_id,
                $logo_url
            ) );
            return;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $tmp_file = download_url( $logo_url );

        if ( is_wp_error( $tmp_file ) ) {
            MBCDI_Logger::warning( sprintf(
                'Échec téléchargement logo pour commerce #%d: %s',
                $commerce_id,
                $tmp_file->get_error_message()
            ) );
            return;
        }

        $file_array = [
            'name' => basename( parse_url( $logo_url, PHP_URL_PATH ) ),
            'tmp_name' => $tmp_file,
        ];

        $attachment_id = media_handle_sideload( $file_array, $commerce_id );

        if ( is_wp_error( $attachment_id ) ) {
            @unlink( $tmp_file );
            MBCDI_Logger::warning( sprintf(
                'Échec création attachment pour commerce #%d: %s',
                $commerce_id,
                $attachment_id->get_error_message()
            ) );
            return;
        }

        update_post_meta( $commerce_id, '_mbcdi_logo_id', $attachment_id );
        
        MBCDI_Logger::info( sprintf(
            'Logo téléchargé avec succès pour commerce #%d (attachment #%d)',
            $commerce_id,
            $attachment_id
        ) );
    }

    /**
     * Auto-associer aux zones de livraison proches
     */
    private static function auto_assign_to_zones( int $commerce_id, float $lat, float $lng ): void {
        
        // Récupérer toutes les zones de livraison
        $zones = get_posts( [
            'post_type' => 'mbcdi_delivery_zone',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        ] );

        $assigned_zone = null;
        $min_distance = PHP_FLOAT_MAX;

        foreach ( $zones as $zone ) {
            $zone_lat = floatval( get_post_meta( $zone->ID, '_mbcdi_lat', true ) );
            $zone_lng = floatval( get_post_meta( $zone->ID, '_mbcdi_lng', true ) );

            if ( ! $zone_lat || ! $zone_lng ) {
                continue;
            }

            // Calculer la distance (Haversine)
            $distance = self::calculate_distance( $lat, $lng, $zone_lat, $zone_lng );

            // Si dans un rayon de 500m et plus proche
            if ( $distance <= 500 && $distance < $min_distance ) {
                $min_distance = $distance;
                $assigned_zone = $zone->ID;
            }
        }

        if ( $assigned_zone ) {
            update_post_meta( $commerce_id, '_mbcdi_delivery_zone_id', $assigned_zone );
            update_post_meta( $commerce_id, '_mbcdi_walking_distance', round( $min_distance ) );
            
            MBCDI_Logger::info( sprintf(
                'Commerce #%d auto-associé à zone #%d (distance: %dm)',
                $commerce_id,
                $assigned_zone,
                round( $min_distance )
            ) );
        }
    }

    /**
     * Calculer la distance entre deux points GPS (Haversine)
     */
    private static function calculate_distance( float $lat1, float $lng1, float $lat2, float $lng2 ): float {
        $earth_radius = 6371000; // mètres

        $d_lat = deg2rad( $lat2 - $lat1 );
        $d_lng = deg2rad( $lng2 - $lng1 );

        $a = sin( $d_lat / 2 ) * sin( $d_lat / 2 ) +
             cos( deg2rad( $lat1 ) ) * cos( deg2rad( $lat2 ) ) *
             sin( $d_lng / 2 ) * sin( $d_lng / 2 );

        $c = 2 * atan2( sqrt( $a ), sqrt( 1 - $a ) );

        return $earth_radius * $c;
    }
}

// Initialiser l'importateur - Priorité haute pour garantir l'ajout du menu
add_action( 'admin_menu', [ 'MBCDI_CSV_Importer', 'add_menu_page' ], 999 );
add_action( 'admin_post_mbcdi_import_csv', [ 'MBCDI_CSV_Importer', 'handle_csv_import' ] );
add_action( 'admin_enqueue_scripts', [ 'MBCDI_CSV_Importer', 'enqueue_scripts' ] );

// Handler pour télécharger le template CSV
add_action( 'admin_post_mbcdi_download_csv_template', function() {
    header( 'Content-Type: text/csv; charset=utf-8' );
    header( 'Content-Disposition: attachment; filename="mbcdi-template-commerces.csv"' );
    
    $output = fopen( 'php://output', 'w' );
    
    // Entête
    fputcsv( $output, [
        'nom',
        'adresse',
        'latitude',
        'longitude',
        'telephone',
        'site_web',
        'description',
        'type',
        'horaires',
        'logo_url',
        'zone_livraison_id',
    ] );
    
    // Exemples
    fputcsv( $output, [
        'Boulangerie Martin',
        '12 rue Victor Hugo',
        '48.8566',
        '2.3522',
        '01 23 45 67 89',
        'https://boulangerie-martin.fr',
        'Pain frais tous les jours',
        'Boulangerie',
        'Lun-Sam 7h-20h',
        'https://example.com/logo1.png',
        '',
    ] );
    
    fputcsv( $output, [
        'Pharmacie Centrale',
        '45 boulevard Leclerc',
        '48.8570',
        '2.3525',
        '01 98 76 54 32',
        '',
        'Pharmacie de garde 24/7',
        'Pharmacie',
        '24h/24',
        '',
        '',
    ] );
    
    fclose( $output );
    exit;
} );
