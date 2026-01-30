/**
 * MBCDI Frontend Patch
 * Connecte les nouvelles cartes avec le système de sélection existant
 * @package MBCDI
 * @version 5.5.1
 */

(function() {
    'use strict';

    console.log('[MBCDI Patch] Initialisation...');

	// Intercepter MBCDI.init pour exposer la sélection de commerce.
	// L'ordre d'enqueue peut charger ce fichier avant frontend.js : on attend donc
	// que window.MBCDI soit disponible au lieu de logguer une erreur.
	function hookWhenReady() {
		if (!window.MBCDI || !window.MBCDI.init) {
			return false;
		}
		if (window.MBCDI.__patchSelectCommerceApplied) {
			return true;
		}
		window.MBCDI.__patchSelectCommerceApplied = true;

		var originalInit = window.MBCDI.init;

		window.MBCDI.init = function(instanceId, varName) {
            console.log('[MBCDI Patch] Interception init pour instance:', instanceId);
            
            // Appeler l'init original
            var result = originalInit.apply(this, arguments);
            
            // Attendre un peu que tout soit initialisé
            setTimeout(function() {
                var app = document.querySelector('.mbcdi-app[data-mbcdi-instance="' + instanceId + '"]');
                if (!app) {
                    console.error('[MBCDI Patch] App non trouvée');
                    return;
                }
                
                // Récupérer les éléments du formulaire
                var selectDest = app.querySelector('.mbcdi-input-dest, .mbcdi-input-dest-main');
                var selectStart = app.querySelector('.mbcdi-input-start');
                
                if (!selectDest) {
                    console.error('[MBCDI Patch] Input destination non trouvé');
                    return;
                }
                
                console.log('[MBCDI Patch] Champs trouvés, création API');
                
                // Récupérer les données
                var data = window[varName];
                if (!data || !data.destinations || !data.destinations[0]) {
                    console.error('[MBCDI Patch] Données manquantes');
                    return;
                }
                
                var commerces = data.destinations[0].commerces || [];
                
                /**
                 * API publique pour sélectionner un commerce
                 * Cette fonction remplit UNIQUEMENT le champ destination
                 * Elle NE calcule PAS l'itinéraire
                 */
                window.MBCDISelectCommerce = function(commerceId) {
                    console.log('[MBCDI Patch] Sélection commerce:', commerceId);
                    
                    // Trouver le commerce dans les données
                    var commerce = commerces.find(function(c) { 
                        return c.id === parseInt(commerceId, 10); 
                    });
                    
                    if (!commerce) {
                        console.error('[MBCDI Patch] Commerce non trouvé:', commerceId);
                        return false;
                    }
                    
                    console.log('[MBCDI Patch] Commerce trouvé:', commerce.name);
                    
                    // Remplir le champ destination
                    selectDest.value = commerce.name || '';
                    selectDest.setAttribute('data-commerce-id', commerceId);
                    selectDest.setAttribute('data-lat', commerce.lat || '');
                    selectDest.setAttribute('data-lng', commerce.lng || '');
                    
                    // Déclencher l'événement input pour que l'autocomplete se mette à jour
                    var event = new Event('input', { bubbles: true });
                    selectDest.dispatchEvent(event);
                    
                    console.log('[MBCDI Patch] Champ destination rempli avec:', commerce.name);
                    
                    // Si l'autocomplete est ouvert, le fermer
                    var autocompleteResults = app.querySelector('.mbcdi-autocomplete-results');
                    if (autocompleteResults) {
                        autocompleteResults.style.display = 'none';
                        autocompleteResults.innerHTML = '';
                    }
                    
                    // Vérifier si le point de départ est défini
                    var hasStartPoint = selectStart && selectStart.value && selectStart.value !== '';
                    
                    if (hasStartPoint) {
                        console.log('[MBCDI Patch] Point de départ déjà défini:', selectStart.value);
                        console.log('[MBCDI Patch] Les 2 champs sont remplis → l\'itinéraire BO sera affiché');
                    } else {
                        console.log('[MBCDI Patch] Point de départ non défini');
                        console.log('[MBCDI Patch] L\'utilisateur doit choisir son point de départ');
                        
                        // Optionnel : Focus sur le select du point de départ
                        if (selectStart) {
                            selectStart.focus();
                        }
                    }
                    
                    return true;
                };
                
                // Écouter l'événement des nouvelles cartes
                window.addEventListener('mbcdi:goToCommerce', function(e) {
                    console.log('[MBCDI Patch] Événement goToCommerce reçu:', e.detail.commerceId);
                    window.MBCDISelectCommerce(e.detail.commerceId);
                });
                
                console.log('[MBCDI Patch] API publique exposée: window.MBCDISelectCommerce');
                
            }, 100);
            
            return result;
		};
		return true;
	}

	// Tentatives pendant ~2s max
	var attempts = 0;
	var timer = setInterval(function() {
		attempts++;
		if (hookWhenReady() || attempts > 40) {
			clearInterval(timer);
		}
	}, 50);

})();
