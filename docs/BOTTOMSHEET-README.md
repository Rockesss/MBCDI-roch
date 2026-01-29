# MBCDI Bottom Sheet Component

**Version:** 1.0.0
**Auteur:** Claude AI
**Licence:** GPL v2 ou ultérieure

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Fonctionnalités](#fonctionnalités)
3. [Installation](#installation)
4. [Utilisation rapide](#utilisation-rapide)
5. [API JavaScript](#api-javascript)
6. [API PHP](#api-php)
7. [Événements personnalisés](#événements-personnalisés)
8. [Personnalisation CSS](#personnalisation-css)
9. [Accessibilité](#accessibilité)
10. [Exemples avancés](#exemples-avancés)
11. [FAQ](#faq)

---

## 🎯 Introduction

Le **MBCDI Bottom Sheet** est un composant autonome mobile-first qui affiche une feuille glissante depuis le bas de l'écran (bottom sheet). Il est conçu pour s'intégrer parfaitement avec WordPress et les cartes Leaflet.

### Cas d'usage principaux

- **Liste de commerces** avec recherche et filtres
- **Détail d'un commerce** avec actions (appel, site web, itinéraire)
- **Intégration carte** : clic sur un marker ouvre le détail
- **Navigation fluide** : drag vertical, snap automatique, animations natives

### Points forts

✅ **Zéro dépendance** : Vanilla JS, pas de jQuery, pas de Bootstrap
✅ **Mobile-first** : Drag natif, safe-area iOS, viewport units (dvh/svh)
✅ **Performant** : Pointer Events, GPU-accelerated, aucun rechargement
✅ **Accessible** : ARIA, focus trap, Escape, navigation clavier
✅ **Modulaire** : API publique complète, événements custom
✅ **Compatible Leaflet** : Z-index géré, body scroll lock intelligent

---

## ✨ Fonctionnalités

### 1. Trois états avec transitions fluides

| État | Hauteur | Usage |
|------|---------|-------|
| **CLOSED** | 0% (caché) | Pas d'interaction |
| **PEEK** | 35vh | Aperçu de la liste |
| **OPEN** | 92vh | Vue complète (liste ou détail) |

- **Transitions** : `280ms cubic-bezier(0.4, 0.0, 0.2, 1)`
- **Snap automatique** : Seuils à 15% et 60% du viewport
- **Inertie** : Détection de vélocité (>0.3px/ms)

### 2. Drag vertical natif

- **Zones de drag** : Poignée (handle) + Header
- **Gestion multi-touch** : Pointer Events + Touch fallback
- **Comportement intelligent** :
  - Drag vers le haut → ouvrir
  - Drag vers le bas → réduire/fermer
  - Scroll interne bloqué pendant le drag
  - Ne pas initier drag si contenu scrollé (sauf pull-down depuis le haut)

### 3. Deux vues internes

#### Vue LIST (Liste des commerces)

- **Champ de recherche** (optionnel, sticky)
- **Cards commerces** : Nom, adresse, distance
- **Tri** : Par distance si fournie
- **Filtrage** : Recherche en temps réel
- **Touch targets** : ≥44px (accessibilité)

#### Vue DETAIL (Détail d'un commerce)

- **Header** : Nom, adresse
- **Boutons d'action** :
  - 📞 Appeler (si téléphone)
  - 🌐 Site web (si URL)
  - 🧭 Itinéraire
- **Sections** : Description, horaires formatés
- **Bouton retour** : Revient à LIST avec état précédent préservé

### 4. Body scroll lock

- **Mode OPEN** : Body verrouillé, scroll interne uniquement
- **Mode PEEK** : Carte interactive
- **Restauration** : Position scroll sauvegardée

### 5. Accessibilité (WCAG 2.1 AA)

- `role="dialog"`, `aria-modal="false"`
- Focus trap en mode OPEN (Tab cycle)
- Escape pour fermer
- Titres sémantiques (h2, h3)
- Boutons avec `aria-label`
- Support clavier complet (Enter, Space sur cards)

---

## 📦 Installation

### 1. Fichiers inclus

Le composant est déjà intégré au plugin MBCDI :

```
assets/
├── css/
│   └── mbcdi-bottomsheet.css     (10KB)
└── js/
    └── mbcdi-bottomsheet.js      (25KB)

includes/
└── class-mbcdi-bottomsheet.php   (8KB)

examples/
└── bottomsheet-usage.php         (Documentation + exemples)
```

### 2. Activation automatique

Le composant est automatiquement chargé avec le plugin MBCDI. L'intégration PHP est déjà faite dans `mbcdi-itineraires.php` :

```php
require_once MBCDI_PLUGIN_DIR . 'includes/class-mbcdi-bottomsheet.php';
```

---

## 🚀 Utilisation rapide

### Méthode 1 : Shortcode (le plus simple)

Dans une page/post WordPress :

```
[mbcdi_bottomsheet]
```

Ou avec options :

```
[mbcdi_bottomsheet
  id="mon-sheet"
  initial_state="peek"
  enable_search="true"
  list_title="Nos commerces"
  detail_title="Informations"]
```

### Méthode 2 : Template PHP

Dans un fichier template (page.php, single.php, etc.) :

```php
<?php echo do_shortcode('[mbcdi_bottomsheet initial_state="peek"]'); ?>

<script>
// Charger les commerces
const commerces = <?php
    echo MBCDI_BottomSheet::commerces_to_json(
        MBCDI_BottomSheet::get_commerces()
    );
?>;

// Injecter dans le bottom sheet
document.addEventListener('DOMContentLoaded', function() {
    window.MBCDI_BottomSheet.setItems(commerces);
});
</script>
```

### Méthode 3 : JavaScript pur

```javascript
// Initialiser
MBCDI_BottomSheet.init({
    containerSelector: '#mbcdi-bottomsheet',
    initialState: 'closed',
    enableSearch: true,
    onSelect: (commerce) => console.log('Sélectionné:', commerce),
    onRoute: (commerce) => console.log('Itinéraire vers:', commerce),
    onClose: () => console.log('Fermé')
});

// Charger les données
const commerces = [
    {
        id: 1,
        nom: 'Boulangerie Dupont',
        adresse: '12 Rue de la Paix, Lyon',
        lat: 45.7578,
        lng: 4.8320,
        tel: '0123456789',
        site: 'https://example.com',
        description: 'Boulangerie artisanale',
        horaires: [
            { jour: 'Lundi', heures: '7h-19h' },
            { jour: 'Mardi', heures: '7h-19h' }
        ],
        distance: 250 // en mètres
    }
];

MBCDI_BottomSheet.setItems(commerces);

// Ouvrir
MBCDI_BottomSheet.openPeek();
```

---

## 🔧 API JavaScript

### Méthodes d'initialisation

#### `init(config)`

Initialise le bottom sheet.

```javascript
MBCDI_BottomSheet.init({
    containerSelector: '#mbcdi-bottomsheet', // Sélecteur CSS
    initialState: 'closed',                  // 'closed' | 'peek' | 'open'
    enableSearch: true,                      // Afficher le champ de recherche
    searchPlaceholder: 'Rechercher...',      // Placeholder du champ
    emptyMessage: 'Aucun commerce',          // Message si liste vide
    listTitle: 'Commerces à proximité',      // Titre de la vue liste
    detailTitle: 'Détail du commerce',       // Titre de la vue détail

    // Callbacks
    onSelect: function(commerce) {},         // Appelé lors de la sélection
    onRoute: function(commerce) {},          // Appelé au clic sur "Itinéraire"
    onClose: function() {}                   // Appelé à la fermeture
});
```

#### `destroy()`

Détruit complètement le bottom sheet (supprime les listeners, unlock body).

```javascript
MBCDI_BottomSheet.destroy();
```

---

### Méthodes de gestion des données

#### `setItems(items)`

Définit la liste des commerces.

```javascript
const commerces = [
    {
        id: 1,                          // Obligatoire (unique)
        nom: 'Nom du commerce',         // Obligatoire
        adresse: 'Adresse complète',    // Recommandé
        lat: 45.7578,                   // Optionnel (pour carte)
        lng: 4.8320,                    // Optionnel (pour carte)
        tel: '0123456789',              // Optionnel (bouton Appeler)
        site: 'https://example.com',    // Optionnel (bouton Site)
        description: 'Description',     // Optionnel (section détail)
        horaires: [                     // Optionnel (section détail)
            { jour: 'Lundi', heures: '7h-19h' }
        ],
        distance: 250                   // Optionnel (en mètres, affichage)
    }
];

MBCDI_BottomSheet.setItems(commerces);
```

#### `getItems()`

Retourne tous les commerces.

```javascript
const items = MBCDI_BottomSheet.getItems();
```

#### `getSelectedItem()`

Retourne le commerce actuellement sélectionné (ou `null`).

```javascript
const selected = MBCDI_BottomSheet.getSelectedItem();
```

---

### Méthodes de gestion des états

#### `openPeek()`

Ouvre le bottom sheet en mode PEEK (35vh).

```javascript
MBCDI_BottomSheet.openPeek();
```

#### `openFull()`

Ouvre le bottom sheet en plein écran (92vh).

```javascript
MBCDI_BottomSheet.openFull();
```

#### `close()`

Ferme complètement le bottom sheet.

```javascript
MBCDI_BottomSheet.close();
```

#### `getState()`

Retourne l'état actuel : `'closed'`, `'peek'` ou `'open'`.

```javascript
const state = MBCDI_BottomSheet.getState();
```

---

### Méthodes de gestion des vues

#### `showList()`

Affiche la vue liste des commerces.

```javascript
MBCDI_BottomSheet.showList();
```

#### `showDetail(id)`

Affiche le détail du commerce avec l'ID donné, et ouvre en plein écran.

```javascript
MBCDI_BottomSheet.showDetail(123);
```

#### `getView()`

Retourne la vue actuelle : `'list'` ou `'detail'`.

```javascript
const view = MBCDI_BottomSheet.getView();
```

---

### Méthodes utilitaires

#### `setTitle(title)`

Change le titre du header.

```javascript
MBCDI_BottomSheet.setTitle('Mon nouveau titre');
```

---

## 🔌 API PHP

### Classe `MBCDI_BottomSheet`

#### Méthodes statiques

##### `get_commerces($args)`

Récupère les commerces depuis la BDD WordPress.

```php
$commerces = MBCDI_BottomSheet::get_commerces([
    'post_status' => 'publish',
    'posts_per_page' => -1,
    'meta_query' => [
        [
            'key' => '_mbcdi_lat',
            'compare' => 'EXISTS'
        ]
    ]
]);
```

**Retourne** : Tableau d'objets commerces formatés.

##### `commerces_to_json($commerces)`

Convertit un tableau de commerces en JSON échappé pour HTML.

```php
$json = MBCDI_BottomSheet::commerces_to_json($commerces);
echo "<script>const data = {$json};</script>";
```

##### `localize_commerces($commerces, $var_name)`

Injecte les commerces via `wp_localize_script`.

```php
MBCDI_BottomSheet::localize_commerces($commerces, 'MesCommerces');

// Dans le JS :
// window.MesCommerces est maintenant disponible
```

##### `enqueue()`

Force l'enqueue des assets (pour usage hors shortcode).

```php
MBCDI_BottomSheet::enqueue();
```

---

### Hooks WordPress

#### Filtres

##### `mbcdi_bottomsheet_config`

Modifie la configuration JS avant l'initialisation.

```php
add_filter('mbcdi_bottomsheet_config', function($config, $atts) {
    if (is_user_logged_in()) {
        $config['listTitle'] = 'Vos commerces favoris';
    }
    return $config;
}, 10, 2);
```

##### `mbcdi_bottomsheet_commerces`

Modifie les commerces avant l'affichage.

```php
add_filter('mbcdi_bottomsheet_commerces', function($commerces, $args) {
    // Ajouter distance depuis position utilisateur
    // Trier par distance
    // Filtrer par zone
    return $commerces;
}, 10, 2);
```

##### `mbcdi_bottomsheet_commerce_data`

Modifie les données d'un commerce individuel.

```php
add_filter('mbcdi_bottomsheet_commerce_data', function($commerce, $post_id) {
    // Ajouter des métadonnées custom
    $commerce['custom_field'] = get_post_meta($post_id, '_custom', true);
    return $commerce;
}, 10, 2);
```

#### Actions

##### `mbcdi_bottomsheet_before`

Avant le rendu du shortcode.

```php
add_action('mbcdi_bottomsheet_before', function($atts) {
    // Enqueue scripts supplémentaires
    wp_enqueue_script('mon-script');
});
```

##### `mbcdi_bottomsheet_after`

Après le rendu du shortcode.

```php
add_action('mbcdi_bottomsheet_after', function($atts) {
    // Injecter du HTML
    echo '<div class="footer">Powered by MBCDI</div>';
});
```

---

## 🎪 Événements personnalisés

Tous les événements sont des `CustomEvent` dispatchés sur `window` et sur le container.

### Liste des événements

| Événement | Détail | Description |
|-----------|--------|-------------|
| `mbcdi:sheet:statechange` | `{state, previousState}` | État changé |
| `mbcdi:sheet:viewchange` | `{view, previousView}` | Vue changée |
| `mbcdi:sheet:open` | `{state}` | Ouvert |
| `mbcdi:sheet:close` | `{state}` | Fermé |
| `mbcdi:commerce:select` | `{id, commerce}` | Commerce sélectionné |
| `mbcdi:commerce:call` | `{id, phone}` | Bouton Appeler cliqué |
| `mbcdi:commerce:website` | `{id, url}` | Bouton Site web cliqué |
| `mbcdi:commerce:route` | `{id, commerce}` | Bouton Itinéraire cliqué |

### Exemples d'écoute

```javascript
// Changement d'état
window.addEventListener('mbcdi:sheet:statechange', function(e) {
    console.log('Nouvel état:', e.detail.state);
    console.log('État précédent:', e.detail.previousState);

    if (e.detail.state === 'open') {
        // Désactiver la carte
        map.dragging.disable();
    } else {
        // Réactiver la carte
        map.dragging.enable();
    }
});

// Sélection de commerce
window.addEventListener('mbcdi:commerce:select', function(e) {
    const commerce = e.detail.commerce;

    // Centrer la carte
    if (commerce.lat && commerce.lng) {
        map.setView([commerce.lat, commerce.lng], 16);
    }
});

// Demande d'itinéraire
window.addEventListener('mbcdi:commerce:route', function(e) {
    const commerce = e.detail.commerce;

    // Intégration avec votre système de routing
    calculateRoute(userPosition, [commerce.lat, commerce.lng]);
});

// Analytics
window.addEventListener('mbcdi:commerce:call', function(e) {
    gtag('event', 'call', { phone: e.detail.phone });
});
```

---

## 🎨 Personnalisation CSS

### Variables CSS

Toutes les couleurs, espacements et timings sont personnalisables via CSS variables :

```css
:root {
    /* Couleurs */
    --mbcdi-bs-bg: #ffffff;
    --mbcdi-bs-border: #e5e5ea;
    --mbcdi-bs-shadow: rgba(0, 0, 0, 0.15);
    --mbcdi-bs-handle: #c7c7cc;
    --mbcdi-bs-text-primary: #000000;
    --mbcdi-bs-text-secondary: #8e8e93;
    --mbcdi-bs-accent: #007aff;
    --mbcdi-bs-hover: #f2f2f7;
    --mbcdi-bs-active: #e5e5ea;

    /* Espacements */
    --mbcdi-bs-radius: 20px;
    --mbcdi-bs-padding: 16px;
    --mbcdi-bs-gap: 12px;

    /* Hauteurs */
    --mbcdi-bs-peek-height: 35vh;
    --mbcdi-bs-open-height: 92vh;

    /* Timings */
    --mbcdi-bs-transition-duration: 280ms;
    --mbcdi-bs-transition-easing: cubic-bezier(0.4, 0.0, 0.2, 1);

    /* Z-index */
    --mbcdi-bs-z-index: 10000;

    /* Safe area iOS */
    --mbcdi-bs-safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

### Exemple de personnalisation

```css
/* Thème orange */
#mon-bottomsheet {
    --mbcdi-bs-accent: #ff6b35;
    --mbcdi-bs-radius: 24px;
    --mbcdi-bs-peek-height: 40vh;
}

/* Thème sombre */
@media (prefers-color-scheme: dark) {
    :root {
        --mbcdi-bs-bg: #1e1e1e;
        --mbcdi-bs-text-primary: #ffffff;
        --mbcdi-bs-accent: #00d4ff;
    }
}
```

### Classes CSS disponibles

- `.mbcdi-bottomsheet` : Container principal
- `.mbcdi-bottomsheet__handle-area` : Zone de la poignée
- `.mbcdi-bottomsheet__handle` : Poignée de drag
- `.mbcdi-bottomsheet__header` : En-tête sticky
- `.mbcdi-bottomsheet__header-title` : Titre
- `.mbcdi-bottomsheet__header-btn` : Boutons header
- `.mbcdi-bottomsheet__btn-back` : Bouton retour
- `.mbcdi-bottomsheet__btn-close` : Bouton fermer
- `.mbcdi-bottomsheet__content` : Zone scrollable
- `.mbcdi-bottomsheet__list` : Vue liste
- `.mbcdi-bottomsheet__search` : Zone de recherche
- `.mbcdi-bottomsheet__search-input` : Input de recherche
- `.mbcdi-bottomsheet__card` : Card commerce
- `.mbcdi-bottomsheet__card-name` : Nom du commerce
- `.mbcdi-bottomsheet__card-address` : Adresse
- `.mbcdi-bottomsheet__card-distance` : Distance
- `.mbcdi-bottomsheet__detail` : Vue détail
- `.mbcdi-bottomsheet__detail-header` : Header du détail
- `.mbcdi-bottomsheet__detail-name` : Nom (détail)
- `.mbcdi-bottomsheet__detail-address` : Adresse (détail)
- `.mbcdi-bottomsheet__detail-actions` : Conteneur boutons
- `.mbcdi-bottomsheet__action-btn` : Bouton d'action
- `.mbcdi-bottomsheet__detail-section` : Section du détail
- `.mbcdi-bottomsheet__hours` : Horaires

---

## ♿ Accessibilité

Le composant respecte les standards **WCAG 2.1 niveau AA**.

### Fonctionnalités

✅ Sémantique HTML (`role="dialog"`, `aria-modal`, `aria-label`)
✅ Navigation clavier complète (Tab, Escape, Enter, Space)
✅ Focus trap en mode OPEN
✅ Touch targets ≥44px
✅ Contrastes respectés (ratio 4.5:1)
✅ Support `prefers-reduced-motion`
✅ Support `prefers-contrast: high`
✅ Screen reader friendly

### Tests recommandés

- **VoiceOver** (iOS/macOS)
- **TalkBack** (Android)
- **NVDA** (Windows)
- **Lighthouse** (score Accessibility ≥90)
- **axe DevTools** (0 violations)

---

## 📚 Exemples avancés

Consultez le fichier `examples/bottomsheet-usage.php` pour 10 exemples complets :

1. ✅ Utilisation du shortcode
2. ✅ Template PHP
3. ✅ Initialisation manuelle
4. ✅ Écoute des événements
5. ✅ Filtres WordPress
6. ✅ Actions WordPress
7. ✅ Intégration AJAX
8. ✅ API JavaScript complète
9. ✅ Personnalisation CSS
10. ✅ Intégration Leaflet complète

---

## ❓ FAQ

### Comment intégrer avec une carte Leaflet ?

Voir l'**Exemple 10** dans `examples/bottomsheet-usage.php`. En résumé :

```javascript
// Synchroniser avec la carte
window.addEventListener('mbcdi:commerce:select', (e) => {
    const c = e.detail.commerce;
    map.setView([c.lat, c.lng], 16);
});

// Désactiver drag carte quand sheet ouvert
window.addEventListener('mbcdi:sheet:statechange', (e) => {
    if (e.detail.state === 'open') {
        map.dragging.disable();
    } else {
        map.dragging.enable();
    }
});
```

### Comment ajouter un champ personnalisé ?

Utilisez le filtre `mbcdi_bottomsheet_commerce_data` :

```php
add_filter('mbcdi_bottomsheet_commerce_data', function($commerce, $post_id) {
    $commerce['mon_champ'] = get_post_meta($post_id, '_mon_champ', true);
    return $commerce;
}, 10, 2);
```

Puis en JS, accédez à `commerce.mon_champ`.

### Comment calculer la distance automatiquement ?

Voir l'**Exemple 5** dans `examples/bottomsheet-usage.php`. Utilisez le filtre `mbcdi_bottomsheet_commerces` avec la formule Haversine.

### Comment supporter le dark mode ?

Le CSS inclut déjà le support via `@media (prefers-color-scheme: dark)`. Vous pouvez personnaliser les couleurs :

```css
@media (prefers-color-scheme: dark) {
    :root {
        --mbcdi-bs-bg: #1e1e1e;
        --mbcdi-bs-text-primary: #ffffff;
    }
}
```

### Comment désactiver le drag ?

Retirez `touch-action: none` du CSS et ne pas attacher les listeners de drag. Ou ajoutez :

```css
.mbcdi-bottomsheet__handle-area,
.mbcdi-bottomsheet__header {
    pointer-events: none;
}
```

### Comment charger les commerces via AJAX ?

Voir l'**Exemple 7** dans `examples/bottomsheet-usage.php`.

---

## 🐛 Dépannage

### Le bottom sheet ne s'affiche pas

1. Vérifiez que le shortcode est bien présent
2. Inspectez la console (F12) pour les erreurs JS
3. Vérifiez que les assets sont bien enqueued (onglet Network)
4. Vérifiez l'état initial : `data-state="closed"` cache le composant

### Le drag ne fonctionne pas

1. Vérifiez que Pointer Events est supporté (tous navigateurs modernes)
2. Vérifiez qu'il n'y a pas de `pointer-events: none` sur le container
3. Testez sur mobile réel (pas uniquement DevTools)

### Le body scroll n'est pas lock

1. Vérifiez que l'état est bien `open` : `MBCDI_BottomSheet.getState()`
2. Inspectez le body : doit avoir la classe `mbcdi-bottomsheet-open`
3. Vérifiez qu'il n'y a pas de conflits CSS

### Les commerces ne s'affichent pas

1. Vérifiez que `setItems()` a bien été appelé
2. Inspectez `MBCDI_BottomSheet.getItems()` dans la console
3. Vérifiez le format des données (doit avoir `id` et `nom`)

---

## 📞 Support

- **Documentation** : `examples/bottomsheet-usage.php`
- **Issues** : GitHub (si applicable)
- **Email** : [Votre email de support]

---

## 📝 Changelog

### Version 1.0.0 (2026-01-29)

- ✨ Première version stable
- ✅ 3 états (CLOSED, PEEK, OPEN)
- ✅ Drag vertical avec inertie
- ✅ 2 vues (LIST, DETAIL)
- ✅ API JavaScript complète
- ✅ API PHP WordPress
- ✅ Événements personnalisés
- ✅ Accessibilité WCAG 2.1 AA
- ✅ Body scroll lock
- ✅ Safe area iOS
- ✅ Support dark mode
- ✅ Documentation complète

---

**Développé avec ❤️ pour le plugin MBCDI**
