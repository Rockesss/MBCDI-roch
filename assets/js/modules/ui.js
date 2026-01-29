/**
 * MBCDI UI Module
 * Gestion de l'interface utilisateur : bottomsheet, topbar, erreurs, modales
 * @version 5.5.0
 */

/**
 * Affiche le bottomsheet
 * @param {HTMLElement} bottomSheet - Élément du bottomsheet
 */
export function showBottomSheet(bottomSheet) {
    if (!bottomSheet) return;
    bottomSheet.classList.add('mbcdi-visible');
}

/**
 * Cache le bottomsheet
 * @param {HTMLElement} bottomSheet - Élément du bottomsheet
 */
export function hideBottomSheet(bottomSheet) {
    if (!bottomSheet) return;
    bottomSheet.classList.remove('mbcdi-visible');
    bottomSheet.classList.remove('mbcdi-expanded');
}

/**
 * Toggle l'expansion du bottomsheet
 * @param {HTMLElement} bottomSheet - Élément du bottomsheet
 * @returns {boolean} Nouvel état d'expansion
 */
export function toggleBottomSheetExpansion(bottomSheet) {
    if (!bottomSheet) return false;
    bottomSheet.classList.toggle('mbcdi-expanded');
    return bottomSheet.classList.contains('mbcdi-expanded');
}

/**
 * Affiche une erreur sur un champ de formulaire
 * @param {HTMLElement} fieldElement - Élément du champ (select/input)
 * @param {string} message - Message d'erreur
 */
export function showFieldError(fieldElement, message) {
    if (!fieldElement) return;
    
    // Ajouter la classe d'erreur
    fieldElement.classList.add('mbcdi-field-error');
    
    // Créer ou mettre à jour le message d'erreur
    let errorEl = fieldElement.parentElement?.querySelector('.mbcdi-error-message');
    
    if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'mbcdi-error-message';
        fieldElement.parentElement?.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Scroll vers l'erreur si nécessaire
    fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Efface l'erreur d'un champ de formulaire
 * @param {HTMLElement} fieldElement - Élément du champ
 */
export function clearFieldError(fieldElement) {
    if (!fieldElement) return;
    
    fieldElement.classList.remove('mbcdi-field-error');
    
    const errorEl = fieldElement.parentElement?.querySelector('.mbcdi-error-message');
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }
}

/**
 * Efface toutes les erreurs dans un conteneur
 * @param {HTMLElement} container - Conteneur (ex: formulaire)
 */
export function clearAllErrors(container) {
    if (!container) return;
    
    container.querySelectorAll('.mbcdi-field-error').forEach(el => {
        el.classList.remove('mbcdi-field-error');
    });
    
    container.querySelectorAll('.mbcdi-error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
}

/**
 * Affiche un indicateur de chargement
 * @param {HTMLElement} element - Élément sur lequel afficher le loader
 */
export function showLoading(element) {
    if (!element) return;
    element.classList.add('mbcdi-loading');
}

/**
 * Cache l'indicateur de chargement
 * @param {HTMLElement} element - Élément du loader
 */
export function hideLoading(element) {
    if (!element) return;
    element.classList.remove('mbcdi-loading');
}

/**
 * Active/désactive l'état expanded de l'application
 * @param {HTMLElement} app - Conteneur principal de l'app
 * @param {boolean} expanded - État souhaité
 */
export function setAppExpanded(app, expanded) {
    if (!app) return;
    
    if (expanded) {
        app.classList.add('expanded');
    } else {
        app.classList.remove('expanded');
    }
}

/**
 * Affiche une modale
 * @param {HTMLElement} modal - Élément de la modale
 */
export function showModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('mbcdi-modal-visible');
    
    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden';
}

/**
 * Cache une modale
 * @param {HTMLElement} modal - Élément de la modale
 */
export function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('mbcdi-modal-visible');
    
    // Restaurer le scroll du body
    document.body.style.overflow = '';
}

/**
 * Crée un toast de notification
 * @param {string} message - Message à afficher
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Durée en ms (défaut: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Supprimer les toasts existants
    document.querySelectorAll('.mbcdi-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `mbcdi-toast mbcdi-toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.classList.add('mbcdi-toast-visible');
    });
    
    // Suppression automatique
    setTimeout(() => {
        toast.classList.remove('mbcdi-toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Bascule entre la vue liste et la vue détail
 * @param {HTMLElement} listView - Vue liste
 * @param {HTMLElement} detailView - Vue détail
 * @param {string} mode - 'list' ou 'detail'
 */
export function switchView(listView, detailView, mode) {
    if (!listView || !detailView) return;
    
    if (mode === 'detail') {
        listView.style.display = 'none';
        detailView.style.display = 'block';
    } else {
        listView.style.display = 'block';
        detailView.style.display = 'none';
    }
}

/**
 * Met à jour le texte d'un élément
 * @param {HTMLElement} element - Élément cible
 * @param {string} text - Nouveau texte
 */
export function updateText(element, text) {
    if (!element) return;
    element.textContent = text;
}

/**
 * Met à jour le HTML d'un élément
 * @param {HTMLElement} element - Élément cible
 * @param {string} html - Nouveau HTML
 */
export function updateHTML(element, html) {
    if (!element) return;
    element.innerHTML = html;
}

/**
 * Scroll vers un élément
 * @param {HTMLElement} element - Élément cible
 * @param {Object} options - Options de scroll
 */
export function scrollToElement(element, options = {}) {
    if (!element) return;
    
    const defaultOptions = {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
}
