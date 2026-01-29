/**
 * MBCDI I18N Module
 * Gestion de l'internationalisation (FR, EN, DE, ES, IT)
 * @version 5.5.0
 */

/**
 * Dictionnaires de traduction pour les instructions de navigation OSRM
 */
export const STEP_I18N = {
    fr: {
        types: {
            'depart': 'Partez',
            'arrive': 'Arrivée',
            'turn': 'Tournez',
            'continue': 'Continuez',
            'merge': 'Rejoignez',
            'on ramp': 'Prenez la bretelle',
            'off ramp': 'Sortez par la bretelle',
            'fork': 'À la fourche',
            'end of road': 'En fin de route',
            'new name': 'Continuez sur',
            'roundabout': 'Au rond-point',
            'rotary': 'Au rond-point',
            'roundabout turn': 'Au rond-point',
            'exit roundabout': 'Sortez du rond-point',
            'notification': ''
        },
        modifiers: {
            'left': 'à gauche',
            'right': 'à droite',
            'slight left': 'légèrement à gauche',
            'slight right': 'légèrement à droite',
            'sharp left': 'fortement à gauche',
            'sharp right': 'fortement à droite',
            'straight': 'tout droit',
            'uturn': 'faites demi-tour'
        },
        on: 'sur',
        at: 'à',
        strings: {
            finalWalk: "Finir à pied jusqu'au commerce",
            followRoute: "Suivez l'itinéraire indiqué"
        }
    },
    en: {
        types: {
            'depart': 'Depart',
            'arrive': 'Arrive',
            'turn': 'Turn',
            'continue': 'Continue',
            'merge': 'Merge',
            'on ramp': 'Take the ramp',
            'off ramp': 'Take the exit ramp',
            'fork': 'At the fork',
            'end of road': 'At the end of the road',
            'new name': 'Continue on',
            'roundabout': 'At the roundabout',
            'rotary': 'At the roundabout',
            'roundabout turn': 'At the roundabout',
            'exit roundabout': 'Exit the roundabout',
            'notification': ''
        },
        modifiers: {
            'left': 'left',
            'right': 'right',
            'slight left': 'slight left',
            'slight right': 'slight right',
            'sharp left': 'sharp left',
            'sharp right': 'sharp right',
            'straight': 'straight',
            'uturn': 'make a U-turn'
        },
        on: 'on',
        at: 'at',
        strings: {
            finalWalk: 'Walk to the store',
            followRoute: 'Follow the suggested route'
        }
    },
    de: {
        types: {
            'depart': 'Starten',
            'arrive': 'Ankunft',
            'turn': 'Abbiegen',
            'continue': 'Weiter',
            'merge': 'Einfädeln',
            'on ramp': 'Auffahrt nehmen',
            'off ramp': 'Ausfahrt nehmen',
            'fork': 'An der Gabelung',
            'end of road': 'Am Ende der Straße',
            'new name': 'Weiter auf',
            'roundabout': 'Im Kreisverkehr',
            'rotary': 'Im Kreisverkehr',
            'roundabout turn': 'Im Kreisverkehr',
            'exit roundabout': 'Kreisverkehr verlassen',
            'notification': ''
        },
        modifiers: {
            'left': 'links',
            'right': 'rechts',
            'slight left': 'leicht links',
            'slight right': 'leicht rechts',
            'sharp left': 'scharf links',
            'sharp right': 'scharf rechts',
            'straight': 'geradeaus',
            'uturn': 'wenden'
        },
        on: 'auf',
        at: 'bei',
        strings: {
            finalWalk: 'Zu Fuß bis zum Geschäft',
            followRoute: 'Folgen Sie der vorgeschlagenen Route'
        }
    },
    es: {
        types: {
            'depart': 'Salga',
            'arrive': 'Llegada',
            'turn': 'Gire',
            'continue': 'Continúe',
            'merge': 'Incorpórese',
            'on ramp': 'Tome la rampa',
            'off ramp': 'Salga por la rampa',
            'fork': 'En la bifurcación',
            'end of road': 'Al final de la vía',
            'new name': 'Continúe por',
            'roundabout': 'En la rotonda',
            'rotary': 'En la rotonda',
            'roundabout turn': 'En la rotonda',
            'exit roundabout': 'Salga de la rotonda',
            'notification': ''
        },
        modifiers: {
            'left': 'a la izquierda',
            'right': 'a la derecha',
            'slight left': 'ligeramente a la izquierda',
            'slight right': 'ligeramente a la derecha',
            'sharp left': 'cerrado a la izquierda',
            'sharp right': 'cerrado a la derecha',
            'straight': 'recto',
            'uturn': 'dé la vuelta'
        },
        on: 'por',
        at: 'en',
        strings: {
            finalWalk: 'Termine a pie hasta el comercio',
            followRoute: 'Siga la ruta sugerida'
        }
    },
    it: {
        types: {
            'depart': 'Parti',
            'arrive': 'Arrivo',
            'turn': 'Gira',
            'continue': 'Continua',
            'merge': 'Immettiti',
            'on ramp': 'Prendi la rampa',
            'off ramp': 'Esci dalla rampa',
            'fork': 'Al bivio',
            'end of road': 'Alla fine della strada',
            'new name': 'Continua su',
            'roundabout': 'Alla rotatoria',
            'rotary': 'Alla rotatoria',
            'roundabout turn': 'Alla rotatoria',
            'exit roundabout': 'Esci dalla rotatoria',
            'notification': ''
        },
        modifiers: {
            'left': 'a sinistra',
            'right': 'a destra',
            'slight left': 'leggermente a sinistra',
            'slight right': 'leggermente a destra',
            'sharp left': 'a sinistra stretto',
            'sharp right': 'a destra stretto',
            'straight': 'dritto',
            'uturn': 'fai inversione'
        },
        on: 'su',
        at: 'a',
        strings: {
            finalWalk: 'Prosegui a piedi fino al negozio',
            followRoute: 'Segui il percorso suggerito'
        }
    }
};

/**
 * Formate une étape OSRM en texte localisé
 * @param {Object} step - Étape OSRM
 * @param {string} lang - Code langue (fr, en, de, es, it)
 * @returns {string} Instruction localisée
 */
export function getStepText(step, lang = 'fr') {
    // Pour FR, on garde le texte serveur
    if (lang === 'fr') {
        return (step && (step.instruction || step.name)) ? (step.instruction || step.name) : 'Continuer';
    }

    const dict = STEP_I18N[lang] || STEP_I18N.en;
    const type = (step && step.type) ? String(step.type) : 'continue';
    const modifier = (step && step.modifier) ? String(step.modifier) : '';
    const name = (step && step.name) ? String(step.name) : '';

    const base = (dict.types && dict.types[type] !== undefined) ? dict.types[type] : (STEP_I18N.en.types[type] || 'Continue');
    const mod = (modifier && dict.modifiers && dict.modifiers[modifier]) ? dict.modifiers[modifier] : '';

    let out = base;
    if (mod) out += ' ' + mod;

    if (name) {
        if (type === 'arrive') {
            out += ' ' + (dict.at || 'at') + ' ' + name;
        } else if (type !== 'depart') {
            out += ' ' + (dict.on || 'on') + ' ' + name;
        } else {
            out += ' ' + (dict.on || 'on') + ' ' + name;
        }
    }

    return out;
}

/**
 * Traduit une clé
 * @param {string} key - Clé à traduire
 * @param {string} lang - Code langue
 * @returns {string} Traduction
 */
export function translate(key, lang = 'fr') {
    const dict = STEP_I18N[lang] || STEP_I18N.en;
    return (dict.strings && dict.strings[key]) || key;
}
