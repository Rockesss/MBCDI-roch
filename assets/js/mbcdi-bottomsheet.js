/**
 * MBCDI Bottom Sheet Component
 * Version: 1.0.0
 * Auteur: Claude AI
 * Description: Bottom sheet autonome avec drag vertical, 3 états, 2 vues
 *
 * API publique: window.MBCDI_BottomSheet
 *
 * États:
 * - CLOSED: Caché (translateY: 100%)
 * - PEEK: Semi-ouvert (35vh)
 * - OPEN: Plein écran (92vh)
 *
 * Vues:
 * - LIST_VIEW: Liste des commerces
 * - DETAIL_VIEW: Détail d'un commerce
 *
 * Événements CustomEvent:
 * - mbcdi:sheet:statechange (detail: {state, previousState})
 * - mbcdi:sheet:viewchange (detail: {view, previousView})
 * - mbcdi:commerce:select (detail: {id, commerce})
 * - mbcdi:commerce:call (detail: {id, phone})
 * - mbcdi:commerce:website (detail: {id, url})
 * - mbcdi:commerce:route (detail: {id, commerce})
 * - mbcdi:sheet:close
 * - mbcdi:sheet:open
 *
 * Usage:
 * MBCDI_BottomSheet.init({
 *   containerSelector: '#mbcdi-bottomsheet',
 *   initialState: 'closed',
 *   enableSearch: true,
 *   onSelect: (commerce) => {},
 *   onRoute: (commerce) => {},
 *   onClose: () => {}
 * });
 */

(function (window, document) {
  'use strict';

  /* ========================================
     CONSTANTES
     ======================================== */

  const STATES = {
    CLOSED: 'closed',
    PEEK: 'peek',
    OPEN: 'open'
  };

  const VIEWS = {
    LIST: 'list',
    DETAIL: 'detail'
  };

  // Seuils de snap (en % de la hauteur du viewport)
  const SNAP_THRESHOLDS = {
    CLOSE: 0.15,    // < 15% => CLOSED
    PEEK: 0.60      // > 60% => OPEN, sinon PEEK
  };

  // Seuil de vitesse pour snap automatique (px/ms)
  const VELOCITY_THRESHOLD = 0.3;

  // Durée minimum pour calculer la vitesse (ms)
  const MIN_VELOCITY_DURATION = 100;

  /* ========================================
     ÉTAT INTERNE
     ======================================== */

  let state = {
    container: null,
    handleArea: null,
    header: null,
    content: null,
    listView: null,
    detailView: null,

    currentState: STATES.CLOSED,
    currentView: VIEWS.LIST,
    previousState: null,

    items: [],
    selectedItem: null,
    filteredItems: [],

    config: {
      containerSelector: '#mbcdi-bottomsheet',
      initialState: STATES.CLOSED,
      enableSearch: true,
      searchPlaceholder: 'Rechercher un commerce...',
      emptyMessage: 'Aucun commerce à afficher',
      listTitle: 'Commerces à proximité',
      detailTitle: 'Détail du commerce',
      onSelect: null,
      onRoute: null,
      onClose: null
    },

    // Drag state
    isDragging: false,
    startY: 0,
    startHeight: 0,
    currentY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,

    // Scroll lock
    scrollPosition: 0,
    isBodyLocked: false
  };

  /* ========================================
     UTILITAIRES
     ======================================== */

  /**
   * Dispatch un événement personnalisé
   */
  function dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });

    if (state.container) {
      state.container.dispatchEvent(event);
    }

    window.dispatchEvent(event);
  }

  /**
   * Escape HTML pour prévenir XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Formate la distance
   */
  function formatDistance(meters) {
    if (!meters) return '';
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  /**
   * Calcule la hauteur actuelle en pixels
   */
  function getHeightInPixels(heightPercent) {
    const vh = window.innerHeight;
    return (vh * heightPercent) / 100;
  }

  /**
   * Convertit une hauteur en pixels en pourcentage du viewport
   */
  function getHeightPercent(heightPx) {
    const vh = window.innerHeight;
    return (heightPx / vh) * 100;
  }

  /**
   * Obtient la hauteur cible pour un état donné
   */
  function getTargetHeight(stateName) {
    const vh = window.innerHeight;
    switch (stateName) {
      case STATES.CLOSED:
        return 0;
      case STATES.PEEK:
        return vh * 0.35; // 35vh
      case STATES.OPEN:
        return vh * 0.92; // 92vh
      default:
        return vh * 0.35;
    }
  }

  /**
   * Détermine l'état cible basé sur la hauteur actuelle et la vélocité
   */
  function determineTargetState(currentHeightPx, velocity) {
    const vh = window.innerHeight;
    const heightPercent = currentHeightPx / vh;

    // Si vitesse significative, snap dans la direction du mouvement
    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      if (velocity < 0) {
        // Mouvement vers le haut (vélocité négative) => ouvrir
        return state.currentState === STATES.PEEK ? STATES.OPEN : STATES.PEEK;
      } else {
        // Mouvement vers le bas (vélocité positive) => fermer
        return state.currentState === STATES.OPEN ? STATES.PEEK : STATES.CLOSED;
      }
    }

    // Sinon, utiliser les seuils de hauteur
    if (heightPercent < SNAP_THRESHOLDS.CLOSE) {
      return STATES.CLOSED;
    } else if (heightPercent > SNAP_THRESHOLDS.PEEK) {
      return STATES.OPEN;
    } else {
      return STATES.PEEK;
    }
  }

  /* ========================================
     BODY SCROLL LOCK
     ======================================== */

  /**
   * Verrouille le scroll du body
   */
  function lockBodyScroll() {
    if (state.isBodyLocked) return;

    state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${state.scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.classList.add('mbcdi-bottomsheet-open');

    state.isBodyLocked = true;
  }

  /**
   * Déverrouille le scroll du body
   */
  function unlockBodyScroll() {
    if (!state.isBodyLocked) return;

    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.classList.remove('mbcdi-bottomsheet-open');

    window.scrollTo(0, state.scrollPosition);

    state.isBodyLocked = false;
  }

  /* ========================================
     GESTION DES ÉTATS
     ======================================== */

  /**
   * Change l'état du bottom sheet
   */
  function setState(newState, skipTransition = false) {
    if (!state.container) return;
    if (state.currentState === newState) return;

    const previousState = state.currentState;
    state.previousState = previousState;
    state.currentState = newState;

    // Supprime la classe de dragging
    state.container.classList.remove('is-dragging');

    // Applique l'état
    state.container.setAttribute('data-state', newState);

    // Gestion du body scroll lock
    if (newState === STATES.OPEN) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    // Focus management
    if (newState === STATES.OPEN && state.header) {
      // Focus sur le header quand on ouvre en plein écran
      const closeBtn = state.header.querySelector('.mbcdi-bottomsheet__btn-close');
      if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 100);
      }
    }

    // Dispatch event
    dispatchEvent('mbcdi:sheet:statechange', {
      state: newState,
      previousState
    });

    if (newState === STATES.OPEN) {
      dispatchEvent('mbcdi:sheet:open', { state: newState });
    } else if (newState === STATES.CLOSED) {
      dispatchEvent('mbcdi:sheet:close', { state: newState });
    }
  }

  /**
   * Change la vue interne
   */
  function setView(newView) {
    if (!state.container) return;
    if (state.currentView === newView) return;

    const previousView = state.currentView;
    state.currentView = newView;

    state.container.setAttribute('data-view', newView);

    dispatchEvent('mbcdi:sheet:viewchange', {
      view: newView,
      previousView
    });
  }

  /* ========================================
     DRAG HANDLERS (POINTER EVENTS)
     ======================================== */

  /**
   * Début du drag
   */
  function onDragStart(e) {
    // Ignore si clic sur bouton ou lien
    if (e.target.closest('button, a, input')) {
      return;
    }

    // Empêche le comportement par défaut
    e.preventDefault();

    // Vérifie si le contenu est scrollable et pas en haut
    if (state.content && state.content.scrollTop > 0) {
      // Si on est en train de scroller le contenu, ne pas démarrer le drag
      // sauf si on tire vers le bas depuis une position scrollée
      return;
    }

    state.isDragging = true;
    state.startY = e.clientY || e.touches?.[0]?.clientY || 0;
    state.lastY = state.startY;
    state.lastTime = Date.now();
    state.velocity = 0;

    // Capture le pointeur
    if (e.pointerId !== undefined) {
      e.target.setPointerCapture(e.pointerId);
    }

    // Hauteur de départ
    const computedStyle = window.getComputedStyle(state.container);
    state.startHeight = parseFloat(computedStyle.height);

    // Ajoute classe de dragging
    state.container.classList.add('is-dragging');

    // Empêche le scroll du contenu pendant le drag
    state.content.style.overflow = 'hidden';
  }

  /**
   * Pendant le drag
   */
  function onDragMove(e) {
    if (!state.isDragging) return;

    e.preventDefault();

    state.currentY = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaY = state.startY - state.currentY;

    // Nouvelle hauteur
    let newHeight = state.startHeight + deltaY;

    // Limite la hauteur
    const minHeight = 0;
    const maxHeight = window.innerHeight * 0.95;
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // Applique la transformation immédiatement
    state.container.style.height = `${newHeight}px`;

    // Calcule la vélocité
    const now = Date.now();
    const timeDelta = now - state.lastTime;

    if (timeDelta > MIN_VELOCITY_DURATION) {
      const positionDelta = state.currentY - state.lastY;
      state.velocity = positionDelta / timeDelta;

      state.lastY = state.currentY;
      state.lastTime = now;
    }
  }

  /**
   * Fin du drag
   */
  function onDragEnd(e) {
    if (!state.isDragging) return;

    state.isDragging = false;

    // Release pointer capture
    if (e.pointerId !== undefined && e.target.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId);
    }

    // Réactive le scroll
    state.content.style.overflow = '';

    // Hauteur actuelle
    const computedStyle = window.getComputedStyle(state.container);
    const currentHeight = parseFloat(computedStyle.height);

    // Détermine l'état cible
    const targetState = determineTargetState(currentHeight, state.velocity);

    // Snap vers l'état cible
    setState(targetState);
  }

  /* ========================================
     GESTION DES TOUCHES CLAVIER
     ======================================== */

  /**
   * Gère les touches clavier
   */
  function onKeyDown(e) {
    // Escape => fermer
    if (e.key === 'Escape' && state.currentState !== STATES.CLOSED) {
      e.preventDefault();
      API.close();
      return;
    }

    // Tab trap quand OPEN (optionnel)
    if (e.key === 'Tab' && state.currentState === STATES.OPEN) {
      const focusableElements = state.container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab sur premier élément => aller au dernier
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab sur dernier élément => aller au premier
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  /* ========================================
     RENDU DES VUES
     ======================================== */

  /**
   * Met à jour le titre du header
   */
  function updateTitle(title) {
    if (!state.header) return;

    const titleEl = state.header.querySelector('.mbcdi-bottomsheet__header-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Rend la vue liste
   */
  function renderList() {
    if (!state.listView) return;

    const items = state.filteredItems.length > 0 ? state.filteredItems : state.items;

    if (items.length === 0) {
      state.listView.innerHTML = `
        <div class="mbcdi-bottomsheet__empty">
          ${escapeHtml(state.config.emptyMessage)}
        </div>
      `;
      return;
    }

    let html = '';

    // Champ de recherche (optionnel)
    if (state.config.enableSearch) {
      html += `
        <div class="mbcdi-bottomsheet__search">
          <input
            type="search"
            class="mbcdi-bottomsheet__search-input"
            placeholder="${escapeHtml(state.config.searchPlaceholder)}"
            aria-label="Rechercher"
          />
        </div>
      `;
    }

    // Liste des cards
    items.forEach((item) => {
      const distance = item.distance ? `<p class="mbcdi-bottomsheet__card-distance">${formatDistance(item.distance)}</p>` : '';

      html += `
        <div class="mbcdi-bottomsheet__card" data-id="${escapeHtml(item.id)}" role="button" tabindex="0" aria-label="Voir détails de ${escapeHtml(item.nom)}">
          <h3 class="mbcdi-bottomsheet__card-name">${escapeHtml(item.nom)}</h3>
          <p class="mbcdi-bottomsheet__card-address">${escapeHtml(item.adresse || '')}</p>
          ${distance}
        </div>
      `;
    });

    state.listView.innerHTML = html;

    // Attache les événements
    attachListEvents();
  }

  /**
   * Attache les événements de la liste
   */
  function attachListEvents() {
    // Recherche
    if (state.config.enableSearch) {
      const searchInput = state.listView.querySelector('.mbcdi-bottomsheet__search-input');
      if (searchInput) {
        searchInput.addEventListener('input', onSearchInput);
      }
    }

    // Cards
    const cards = state.listView.querySelectorAll('.mbcdi-bottomsheet__card');
    cards.forEach((card) => {
      card.addEventListener('click', onCardClick);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick.call(card, e);
        }
      });
    });
  }

  /**
   * Handler de recherche
   */
  function onSearchInput(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
      state.filteredItems = [];
    } else {
      state.filteredItems = state.items.filter((item) => {
        const nom = (item.nom || '').toLowerCase();
        const adresse = (item.adresse || '').toLowerCase();
        return nom.includes(query) || adresse.includes(query);
      });
    }

    renderList();
  }

  /**
   * Handler de clic sur une card
   */
  function onCardClick(e) {
    const id = this.getAttribute('data-id');
    const commerce = state.items.find((item) => String(item.id) === String(id));

    if (!commerce) return;

    API.showDetail(id);

    // Callback
    if (typeof state.config.onSelect === 'function') {
      state.config.onSelect(commerce);
    }

    dispatchEvent('mbcdi:commerce:select', { id, commerce });
  }

  /**
   * Rend la vue détail
   */
  function renderDetail(commerce) {
    if (!state.detailView || !commerce) return;

    // Boutons d'action
    let actions = '';

    if (commerce.tel) {
      actions += `
        <button class="mbcdi-bottomsheet__action-btn" data-action="call" data-phone="${escapeHtml(commerce.tel)}">
          📞 Appeler
        </button>
      `;
    }

    if (commerce.site) {
      actions += `
        <button class="mbcdi-bottomsheet__action-btn mbcdi-bottomsheet__action-btn--secondary" data-action="website" data-url="${escapeHtml(commerce.site)}">
          🌐 Site web
        </button>
      `;
    }

    actions += `
      <button class="mbcdi-bottomsheet__action-btn" data-action="route">
        🧭 Itinéraire
      </button>
    `;

    // Description
    let description = '';
    if (commerce.description) {
      description = `
        <div class="mbcdi-bottomsheet__detail-section">
          <h4 class="mbcdi-bottomsheet__detail-section-title">Description</h4>
          <p class="mbcdi-bottomsheet__detail-section-content">${escapeHtml(commerce.description)}</p>
        </div>
      `;
    }

    // Horaires
    let horaires = '';
    if (commerce.horaires) {
      const horairesParsed = typeof commerce.horaires === 'string' ? JSON.parse(commerce.horaires) : commerce.horaires;
      if (Array.isArray(horairesParsed) && horairesParsed.length > 0) {
        const horairesList = horairesParsed.map((h) => `
          <div class="mbcdi-bottomsheet__hours-item">
            <span class="mbcdi-bottomsheet__hours-day">${escapeHtml(h.jour || h.day)}</span>
            <span class="mbcdi-bottomsheet__hours-time">${escapeHtml(h.heures || h.hours)}</span>
          </div>
        `).join('');

        horaires = `
          <div class="mbcdi-bottomsheet__detail-section">
            <h4 class="mbcdi-bottomsheet__detail-section-title">Horaires</h4>
            <div class="mbcdi-bottomsheet__hours">
              ${horairesList}
            </div>
          </div>
        `;
      }
    }

    const html = `
      <div class="mbcdi-bottomsheet__detail-header">
        <h2 class="mbcdi-bottomsheet__detail-name">${escapeHtml(commerce.nom)}</h2>
        <p class="mbcdi-bottomsheet__detail-address">${escapeHtml(commerce.adresse || '')}</p>
      </div>

      <div class="mbcdi-bottomsheet__detail-actions">
        ${actions}
      </div>

      ${description}
      ${horaires}
    `;

    state.detailView.innerHTML = html;

    // Attache les événements
    attachDetailEvents(commerce);
  }

  /**
   * Attache les événements de la vue détail
   */
  function attachDetailEvents(commerce) {
    const actionBtns = state.detailView.querySelectorAll('[data-action]');

    actionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');

        switch (action) {
          case 'call':
            const phone = btn.getAttribute('data-phone');
            dispatchEvent('mbcdi:commerce:call', { id: commerce.id, phone });
            window.location.href = `tel:${phone}`;
            break;

          case 'website':
            const url = btn.getAttribute('data-url');
            dispatchEvent('mbcdi:commerce:website', { id: commerce.id, url });
            window.open(url, '_blank', 'noopener,noreferrer');
            break;

          case 'route':
            if (typeof state.config.onRoute === 'function') {
              state.config.onRoute(commerce);
            }
            dispatchEvent('mbcdi:commerce:route', { id: commerce.id, commerce });
            break;
        }
      });
    });
  }

  /* ========================================
     INITIALISATION
     ======================================== */

  /**
   * Initialise le bottom sheet
   */
  function init(config = {}) {
    // Merge config
    state.config = { ...state.config, ...config };

    // Trouve le container
    state.container = document.querySelector(state.config.containerSelector);

    if (!state.container) {
      console.error(`MBCDI BottomSheet: Container "${state.config.containerSelector}" not found`);
      return false;
    }

    // Trouve les éléments internes
    state.handleArea = state.container.querySelector('.mbcdi-bottomsheet__handle-area');
    state.header = state.container.querySelector('.mbcdi-bottomsheet__header');
    state.content = state.container.querySelector('.mbcdi-bottomsheet__content');
    state.listView = state.container.querySelector('.mbcdi-bottomsheet__list');
    state.detailView = state.container.querySelector('.mbcdi-bottomsheet__detail');

    if (!state.handleArea || !state.header || !state.content || !state.listView || !state.detailView) {
      console.error('MBCDI BottomSheet: Missing required DOM elements');
      return false;
    }

    // Attache les événements de drag sur handle et header
    state.handleArea.addEventListener('pointerdown', onDragStart);
    state.header.addEventListener('pointerdown', onDragStart);

    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('pointercancel', onDragEnd);

    // Touch fallback
    state.handleArea.addEventListener('touchstart', onDragStart, { passive: false });
    state.header.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);

    // Boutons du header
    const backBtn = state.header.querySelector('.mbcdi-bottomsheet__btn-back');
    const closeBtn = state.header.querySelector('.mbcdi-bottomsheet__btn-close');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        API.showList();
        // Revenir à l'état précédent ou PEEK par défaut
        if (state.previousState && state.previousState !== STATES.CLOSED) {
          setState(state.previousState);
        } else {
          setState(STATES.PEEK);
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        API.close();
      });
    }

    // Clavier
    document.addEventListener('keydown', onKeyDown);

    // État initial
    setState(state.config.initialState, true);
    setView(VIEWS.LIST);
    updateTitle(state.config.listTitle);

    // Accessibilité
    state.container.setAttribute('role', 'dialog');
    state.container.setAttribute('aria-modal', 'false');
    state.container.setAttribute('aria-label', state.config.listTitle);

    return true;
  }

  /**
   * Détruit le bottom sheet
   */
  function destroy() {
    if (!state.container) return;

    // Supprime les événements
    state.handleArea?.removeEventListener('pointerdown', onDragStart);
    state.header?.removeEventListener('pointerdown', onDragStart);

    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('pointercancel', onDragEnd);

    document.removeEventListener('keydown', onKeyDown);

    // Unlock body
    unlockBodyScroll();

    // Reset state
    state.container = null;
    state.items = [];
  }

  /* ========================================
     API PUBLIQUE
     ======================================== */

  const API = {
    /**
     * Initialise le bottom sheet
     */
    init,

    /**
     * Détruit le bottom sheet
     */
    destroy,

    /**
     * Définit les items (commerces)
     */
    setItems(items) {
      state.items = items || [];
      state.filteredItems = [];
      state.selectedItem = null;
      renderList();
    },

    /**
     * Ouvre en mode PEEK
     */
    openPeek() {
      setState(STATES.PEEK);
    },

    /**
     * Ouvre en mode FULL
     */
    openFull() {
      setState(STATES.OPEN);
    },

    /**
     * Ferme le bottom sheet
     */
    close() {
      setState(STATES.CLOSED);
      state.selectedItem = null;

      // Callback
      if (typeof state.config.onClose === 'function') {
        state.config.onClose();
      }
    },

    /**
     * Affiche la vue liste
     */
    showList() {
      setView(VIEWS.LIST);
      updateTitle(state.config.listTitle);
      state.selectedItem = null;
      renderList();
    },

    /**
     * Affiche le détail d'un commerce
     */
    showDetail(id) {
      const commerce = state.items.find((item) => String(item.id) === String(id));

      if (!commerce) {
        console.warn(`Commerce with id "${id}" not found`);
        return;
      }

      state.selectedItem = commerce;
      setView(VIEWS.DETAIL);
      updateTitle(state.config.detailTitle);
      renderDetail(commerce);

      // Ouvre en plein écran
      setState(STATES.OPEN);

      // Scroll to top
      if (state.content) {
        state.content.scrollTop = 0;
      }
    },

    /**
     * Change le titre du header
     */
    setTitle(title) {
      updateTitle(title);
    },

    /**
     * Retourne l'état actuel
     */
    getState() {
      return state.currentState;
    },

    /**
     * Retourne la vue actuelle
     */
    getView() {
      return state.currentView;
    },

    /**
     * Retourne le commerce sélectionné
     */
    getSelectedItem() {
      return state.selectedItem;
    },

    /**
     * Retourne tous les items
     */
    getItems() {
      return state.items;
    }
  };

  /* ========================================
     EXPORT
     ======================================== */

  // Expose l'API globale
  window.MBCDI_BottomSheet = API;

  // Support ES6 module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }

})(window, document);
