// Dialogues modaux V4 (role="dialog" aria-modal="true") — comportement clavier commun :
// - Tab / Maj+Tab restent dans le dialogue au premier plan (piège de focus) ;
// - à l'ouverture, focus sur [autofocus], sinon sur le dialogue s'il est focalisable,
//   sinon sur son premier élément interactif, si le composant ne l'a pas déjà placé ;
// - à la fermeture, focus rendu à l'élément qui l'avait avant l'ouverture ;
// - Échap ferme les dialogues marqués data-escape-close (clic sur .sheet-close).
// Les composants Blazor gardent leur propre gestion (Échap, focus initial) : ce script
// ne fait que compléter, sans interop.
(() => {
    const MODAL = '[role="dialog"][aria-modal="true"]';
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const openers = new WeakMap();
    let open = new Set();
    // Dernier élément focalisé hors dialogue : le composant peut focaliser le dialogue
    // avant que l'observateur ne voie son insertion.
    let lastOutside = null;

    const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const zIndex = el => parseInt(getComputedStyle(el).zIndex, 10) || 0;

    function topDialog() {
        const dialogs = [...document.querySelectorAll(MODAL)].filter(visible);
        // Au premier plan : z-index le plus élevé, puis ordre du document.
        return dialogs.reduce((top, d) => (top === null || zIndex(d) >= zIndex(top) ? d : top), null);
    }

    const focusables = dialog => [...dialog.querySelectorAll(FOCUSABLE)].filter(visible);

    function placeInitialFocus(dialog) {
        if (!dialog.isConnected || dialog !== topDialog() || dialog.contains(document.activeElement)) return;
        const target = dialog.querySelector('[autofocus]')
            ?? (dialog.hasAttribute('tabindex') ? dialog : focusables(dialog)[0]);
        target?.focus();
    }

    function sync() {
        const current = new Set(document.querySelectorAll(MODAL));
        for (const d of current) {
            if (open.has(d)) continue;
            if (lastOutside?.isConnected && !d.contains(lastOutside)) openers.set(d, lastOutside);
            // Laisse d'abord le composant placer son focus (OnAfterRenderAsync).
            setTimeout(() => placeInitialFocus(d), 60);
        }
        for (const d of open) {
            if (current.has(d)) continue;
            const opener = openers.get(d);
            const focusLost = !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected;
            if (!focusLost) continue;
            const remaining = topDialog();
            if (remaining) placeInitialFocus(remaining);
            else if (opener?.isConnected) opener.focus();
        }
        open = current;
    }

    new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('keydown', e => {
        const dialog = topDialog();
        if (!dialog) return;

        if (e.key === 'Escape' && dialog.hasAttribute('data-escape-close')) {
            dialog.querySelector('.sheet-close')?.click();
            e.preventDefault();
            return;
        }
        if (e.key !== 'Tab') return;

        const items = focusables(dialog);
        if (items.length === 0) { e.preventDefault(); dialog.focus(); return; }
        const first = items[0], last = items[items.length - 1];
        const active = document.activeElement;
        if (!dialog.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
        else if (e.shiftKey && (active === first || active === dialog)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }, true);

    // Un clic ou un focus programmatique hors du dialogue au premier plan y ramène le focus.
    document.addEventListener('focusin', e => {
        const dialog = topDialog();
        if (!dialog) { lastOutside = e.target; return; }
        if (!dialog.contains(e.target)) (focusables(dialog)[0] ?? dialog).focus();
    });
})();
