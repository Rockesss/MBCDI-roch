# Fonctionnalité de Rotation de Carte - Plugin MBCDI

## Vue d'ensemble

Cette fonctionnalité ajoute la **rotation de carte Leaflet** au plugin MBCDI, avec deux comportements principaux :

1. **Rotation libre par l'utilisateur** (manuelle)
2. **Rotation automatique lors de l'affichage d'un itinéraire** (pour orienter le trajet vers le haut)

## Dépendances

- **Leaflet.Rotate** v0.2 (chargé via unpkg CDN)
- URL: `https://unpkg.com/@raruto/leaflet-rotate@0.2/dist/leaflet-rotate.js`

## Architecture

### Fichiers ajoutés/modifiés

#### Nouveaux fichiers
- `assets/js/modules/rotation.js` - Module ES6 de gestion de la rotation
- `assets/css/frontend-rotation.css` - Styles pour le contrôle de rotation

#### Fichiers modifiés
- `includes/class-mbcdi-frontend.php` - Enregistrement des assets leaflet-rotate
- `assets/js/modules/map.js` - Support de la rotation lors de l'initialisation
- `assets/js/modules/routing.js` - Fonction `createRoutePolylineWithRotation()`
- `assets/js/frontend-main.js` - Intégration du module rotation et création du contrôle UI
- `assets/js/frontend.js` - Rotation automatique et réinitialisation dans le code legacy

## Fonctionnalités implémentées

### 1. Rotation manuelle

L'utilisateur peut faire pivoter la carte de plusieurs façons :

- **Clic-droit + glisser** (desktop)
- **Deux doigts + rotation** (mobile/tablette)
- **Shift + glisser** (desktop alternatif)
- **Bouton de contrôle** - Réinitialise l'orientation vers le Nord

### 2. Rotation automatique

Quand un itinéraire est affiché :
- Le cap est calculé à partir des **deux premiers points** de l'itinéraire véhicule
- La carte pivote automatiquement pour orienter le trajet **vers le haut**
- Animation douce de 1,2 seconde
- L'angle de rotation est affiché dans le contrôle UI

### 3. Réinitialisation automatique

Lors de la réinitialisation de l'itinéraire (bouton "Arrêter") :
- La carte revient automatiquement à **0° (Nord)**
- Animation douce de 0,8 seconde
- Tous les marqueurs et commerces redeviennent visibles

## API JavaScript

### Module rotation.js

```javascript
// Importer le module (ES6)
import {
    rotateMap,
    resetRotation,
    calculateBearing,
    createRotationControl,
    rotateToRoute
} from './modules/rotation.js';

// Faire pivoter la carte vers un angle
rotateMap(map, 45, { animate: true, duration: 1000 });

// Réinitialiser vers le Nord
resetRotation(map, { animate: true, duration: 800 });

// Calculer le cap entre deux points
const bearing = calculateBearing(
    { lat: 48.8566, lng: 2.3522 },  // Paris
    { lat: 51.5074, lng: -0.1278 }  // Londres
); // Retourne ~330°

// Créer un contrôle de rotation
createRotationControl(map, {
    position: 'topright',
    onRotate: (bearing) => console.log('Rotation:', bearing)
});

// Faire pivoter vers un itinéraire
rotateToRoute(map, routeCoords, {
    animate: true,
    duration: 1200
});
```

### Utilisation via MBCDI_Modular (pour code legacy)

```javascript
// Depuis frontend.js ou autre code non-ES6
if (window.MBCDI_Modular && window.MBCDI_Modular.modules.rotation) {
    const rotation = window.MBCDI_Modular.modules.rotation;

    // Faire pivoter
    rotation.rotateMap(map, 90);

    // Réinitialiser
    rotation.resetRotation(map);
}
```

## Contrôle UI

Le contrôle de rotation apparaît en **haut à droite** de la carte :

- **Icône flèche Nord** - Bouton pour réinitialiser l'orientation
- **Affichage de l'angle** - Visible seulement si la carte est pivotée (ex: "45°")
- **Style responsive** - Adapté mobile et desktop
- **Support dark mode** - S'adapte automatiquement au thème

### Position mobile
Sur mobile (< 768px), le contrôle est positionné plus bas pour ne pas chevaucher d'autres éléments.

## Configuration

### Désactiver la rotation

Pour désactiver la rotation lors de l'initialisation de la carte :

```javascript
// Dans modules/map.js
const map = initMap(container, center, zoom, {
    enableRotation: false
});
```

### Désactiver la rotation automatique

```javascript
// Dans frontend.js - après la création de la polyline
// Commenter ou supprimer ce bloc :
if (typeof state.map.setBearing === 'function' && ...) {
    // ...rotation automatique...
}
```

## Événements

### Événement de rotation

```javascript
map.on('rotate', function() {
    const bearing = map.getBearing();
    console.log('Carte pivotée à:', bearing, '°');
});
```

### Événement de réinitialisation

L'événement global `mbcdi:resetRoute` déclenche automatiquement la réinitialisation de la rotation :

```javascript
window.addEventListener('mbcdi:resetRoute', function() {
    // La rotation est automatiquement réinitialisée
});
```

## Compatibilité

- ✅ Leaflet 1.9.4
- ✅ Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS, Android)
- ✅ Responsive design
- ✅ Dark mode

## Notes techniques

### Calcul du cap (bearing)

Le cap est calculé en utilisant la formule de navigation "forward azimuth" :

```
bearing = atan2(sin(Δλ) × cos(φ2), cos(φ1) × sin(φ2) - sin(φ1) × cos(φ2) × cos(Δλ))
```

Où :
- φ1, φ2 = latitudes en radians
- Δλ = différence de longitude en radians

Le résultat est normalisé entre 0° et 360° (0° = Nord, 90° = Est, 180° = Sud, 270° = Ouest).

### Performance

- L'animation de rotation utilise `CSS transform` (performant, GPU-accelerated)
- Pas d'impact sur le clustering des marqueurs
- Les tiles Leaflet se rechargent automatiquement pendant la rotation

## Limitations connues

1. **Rotation sur petites distances** : Si l'itinéraire est très court (< 10m), le cap peut être imprécis
2. **Tiles OSM** : Certaines étiquettes de carte peuvent apparaître pivotées (comportement normal de Leaflet.Rotate)
3. **Popups** : Les popups Leaflet ne pivotent pas avec la carte (par design)

## Support et debug

Pour activer les logs de debug :

```javascript
// Dans la console navigateur
localStorage.setItem('mbcdi_debug', 'true');
```

Les logs de rotation apparaîtront avec le préfixe `[MBCDI Rotation]` et `[MBCDI v5.5.0]`.

## Version

- **Version implémentation** : 5.5.0
- **Date** : 2026-01-30
- **Auteur** : Claude Code

---

**Remarque** : Cette fonctionnalité est totalement optionnelle et réversible. La carte fonctionne normalement même si leaflet-rotate n'est pas chargé.
