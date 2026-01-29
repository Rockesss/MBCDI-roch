/**
 * MBCDI v5.4.2 - Autocomplétion Améliorée
 * 
 * Fonctionnalités :
 * - Recherche dès 1 caractère (au lieu de 2)
 * - Recherche dans NOM + ADRESSE des commerces
 * - Highlight du texte recherché dans les résultats
 * - Navigation clavier (↑↓ Enter Esc)
 * - Bouton clear pour vider le champ
 * - Tri intelligent (correspondance nom > adresse > alphabétique)
 * 
 * @package MBCDI
 * @version 5.5.0
 */
(function() {
    'use strict';

    window.MBCDIAutocomplete = {
        
        /**
         * Initialiser l'autocomplétion sur un input
         * 
         * @param {HTMLElement} input - Champ input de recherche
         * @param {Array} commerces - Liste des commerces {id, name, address, lat, lng}
         * @param {Function} onSelectCallback - Fonction appelée lors de la sélection
         */
        init: function(input, commerces, onSelectCallback) {
            if (!input || !commerces) {
                console.error('[MBCDI Autocomplete] Input ou commerces manquants');
                return;
            }

			// Évite les doubles initialisations (frontend.js + frontend-integration.js, ou re-render)
			if (input.dataset && input.dataset.mbcdiAutocompleteInit === '1') {
				return;
			}
			if (input.dataset) {
				input.dataset.mbcdiAutocompleteInit = '1';
			}

            var wrapper = input.closest('.mbcdi-search-input-wrapper') || input.parentElement;
            var resultsContainer = wrapper.querySelector('.mbcdi-autocomplete-results') || 
                                 wrapper.nextElementSibling;
            var clearBtn = wrapper.querySelector('.mbcdi-search-clear');
            
            if (!resultsContainer) {
                console.error('[MBCDI Autocomplete] Conteneur résultats non trouvé');
                return;
            }
            
            var currentIndex = -1;
            var filteredResults = [];

            console.log('[MBCDI Autocomplete] Initialisé avec', commerces.length, 'commerces');

            // ============================================================
            // EVENT : SAISIE DE TEXTE
            // ============================================================
            input.addEventListener('input', function(e) {
                var query = e.target.value.trim();
                
                // Afficher/masquer bouton clear
                if (clearBtn) {
                    clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
                }
                
                // Recherche dès 1 caractère (changement v5.0)
                if (query.length < 1) {
                    hideResults();
                    return;
                }
                
                filteredResults = searchCommerces(query, commerces);
                renderResults(filteredResults, query);
                
                console.log('[MBCDI Autocomplete] Recherche "' + query + '" :', filteredResults.length, 'résultats');
            });

            // ============================================================
            // EVENT : FOCUS - Réafficher résultats si recherche déjà faite
            // ============================================================
            input.addEventListener('focus', function() {
                var query = input.value.trim();
                if (query.length >= 1) {
                    filteredResults = searchCommerces(query, commerces);
                    renderResults(filteredResults, query);
                }
            });

            // ============================================================
            // EVENT : BLUR - Masquer résultats après délai (pour permettre clic)
            // ============================================================
            input.addEventListener('blur', function() {
                setTimeout(function() {
                    hideResults();
                }, 200);
            });

            // ============================================================
            // EVENT : NAVIGATION CLAVIER
            // ============================================================
            input.addEventListener('keydown', function(e) {
                var items = resultsContainer.querySelectorAll('.mbcdi-autocomplete-item');
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentIndex = Math.min(currentIndex + 1, items.length - 1);
                    highlightItem(items, currentIndex);
                }
                else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentIndex = Math.max(currentIndex - 1, -1);
                    highlightItem(items, currentIndex);
                }
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentIndex >= 0 && items[currentIndex]) {
                        items[currentIndex].click();
                    }
                }
                else if (e.key === 'Escape') {
                    hideResults();
                    input.blur();
                }
            });

            // ============================================================
            // EVENT : BOUTON CLEAR
            // ============================================================
            if (clearBtn) {
                clearBtn.addEventListener('click', function() {
                    input.value = '';
                    input.setAttribute('data-commerce-id', '');
                    input.setAttribute('data-lat', '');
                    input.setAttribute('data-lng', '');
                    clearBtn.style.display = 'none';
                    hideResults();
                    input.focus();
                    
                    console.log('[MBCDI Autocomplete] Champ vidé');
                });
            }

            // ============================================================
            // FONCTION : RECHERCHE DANS COMMERCES
            // ============================================================
            function searchCommerces(query, list) {
                var lowerQuery = query.toLowerCase();
                
                var results = list.filter(function(commerce) {
                    var name = (commerce.name || '').toLowerCase();
                    var address = (commerce.address || '').toLowerCase();
                    
                    // Recherche dans nom ET adresse (nouveauté v5.0)
                    return name.includes(lowerQuery) || address.includes(lowerQuery);
                });

                // Tri intelligent
                results.sort(function(a, b) {
                    var aName = (a.name || '').toLowerCase();
                    var bName = (b.name || '').toLowerCase();
                    
                    // Priorité 1 : Correspondance au début du nom
                    var aNameStart = aName.startsWith(lowerQuery);
                    var bNameStart = bName.startsWith(lowerQuery);
                    
                    if (aNameStart && !bNameStart) return -1;
                    if (!aNameStart && bNameStart) return 1;
                    
                    // Priorité 2 : Correspondance dans le nom vs adresse
                    var aNameMatch = aName.includes(lowerQuery);
                    var bNameMatch = bName.includes(lowerQuery);
                    
                    if (aNameMatch && !bNameMatch) return -1;
                    if (!aNameMatch && bNameMatch) return 1;
                    
                    // Priorité 3 : Ordre alphabétique
                    return aName.localeCompare(bName);
                });

                return results;
            }

            // ============================================================
            // FONCTION : AFFICHER RÉSULTATS
            // ============================================================
            function renderResults(results, query) {
                currentIndex = -1;
                
                if (results.length === 0) {
                    resultsContainer.innerHTML = '<div class="mbcdi-autocomplete-empty">Aucun commerce trouvé</div>';
                    resultsContainer.classList.add('mbcdi-has-results');
                    return;
                }

                var html = results.map(function(commerce) {
                    return `
                        <div class="mbcdi-autocomplete-item" 
                             data-id="${commerce.id}"
                             data-lat="${commerce.lat}"
                             data-lng="${commerce.lng}"
                             data-name="${escapeHtml(commerce.name || '')}"
                             role="option">
                            <span class="mbcdi-autocomplete-item-name">
                                ${highlightText(commerce.name || '', query)}
                            </span>
                            <span class="mbcdi-autocomplete-item-address">
                                ${highlightText(commerce.address || '', query)}
                            </span>
                        </div>
                    `;
                }).join('');

                resultsContainer.innerHTML = html;
                resultsContainer.classList.add('mbcdi-has-results');
                resultsContainer.setAttribute('role', 'listbox');

                // Attacher events de clic sur chaque résultat
                resultsContainer.querySelectorAll('.mbcdi-autocomplete-item').forEach(function(item) {
                    item.addEventListener('click', function() {
                        var commerce = {
                            id: item.dataset.id,
                            name: item.dataset.name,
                            lat: parseFloat(item.dataset.lat),
                            lng: parseFloat(item.dataset.lng)
                        };
                        
                        input.value = commerce.name;
                        input.setAttribute('data-commerce-id', commerce.id);
                        input.setAttribute('data-lat', commerce.lat);
                        input.setAttribute('data-lng', commerce.lng);
                        
                        hideResults();
                        
                        console.log('[MBCDI Autocomplete] Commerce sélectionné:', commerce.name);
                        
                        if (onSelectCallback) {
                            onSelectCallback(commerce);
                        }
                    });
                });
            }

            // ============================================================
            // FONCTION : HIGHLIGHT TEXTE RECHERCHÉ
            // ============================================================
            function highlightText(text, query) {
                if (!text || !query) return text || '';
                
                var regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');
                return text.replace(regex, '<span class="mbcdi-autocomplete-highlight">$1</span>');
            }

            // ============================================================
            // FONCTION : ÉCHAPPER REGEX
            // ============================================================
            function escapeRegex(str) {
                return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

            // ============================================================
            // FONCTION : ÉCHAPPER HTML
            // ============================================================
            function escapeHtml(str) {
                var div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }

            // ============================================================
            // FONCTION : HIGHLIGHT ITEM (navigation clavier)
            // ============================================================
            function highlightItem(items, index) {
                items.forEach(function(item, i) {
                    if (i === index) {
                        item.classList.add('mbcdi-highlighted');
                        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    } else {
                        item.classList.remove('mbcdi-highlighted');
                    }
                });
            }

            // ============================================================
            // FONCTION : MASQUER RÉSULTATS
            // ============================================================
            function hideResults() {
                resultsContainer.classList.remove('mbcdi-has-results');
                resultsContainer.removeAttribute('role');
                currentIndex = -1;
            }
        }
    };

})();
