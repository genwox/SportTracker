import { useIonActionSheet, useIonToast, type ActionSheetButton } from '@ionic/react'
import { alertCircleOutline, checkmarkCircleOutline, trashOutline } from 'ionicons/icons'

/* ── Action sheet ────────────────────────────────────────────────────────── */

type ConfirmOptions = { title: string; message?: string; confirmText: string; destructive?: boolean; icon?: string }

/** iOS action sheet. `confirm` resolves true when the (red, destructive) action is chosen, false on Annuler or dismiss. */
export function useV6ActionSheet() {
  const [present] = useIonActionSheet()
  const open = (options: { title?: string; message?: string; buttons: ActionSheetButton[] }) => present({
    header: options.title, subHeader: options.message, cssClass: 'v6-action-sheet',
    buttons: [...options.buttons, { text: 'Annuler', role: 'cancel' }],
  })
  const confirm = ({ title, message, confirmText, destructive = true, icon = destructive ? trashOutline : undefined }: ConfirmOptions) =>
    new Promise<boolean>(resolve => {
      void present({
        header: title, subHeader: message, cssClass: 'v6-action-sheet',
        buttons: [{ text: confirmText, role: destructive ? 'destructive' : 'selected', icon }, { text: 'Annuler', role: 'cancel' }],
        onDidDismiss: event => resolve(event.detail.role === 'destructive' || event.detail.role === 'selected'),
      })
    })
  return { open, confirm }
}

/* ── Toast ───────────────────────────────────────────────────────────────── */

/** Discreet toast over the top of the screen (never pushes content). Errors stay until dismissed, with « Réessayer ». */
export function useV6Toast() {
  const [present] = useIonToast()
  const success = (title: string, message?: string) => present({
    header: message ? title : undefined, message: message ?? title, icon: checkmarkCircleOutline,
    position: 'top', duration: 2500, swipeGesture: 'vertical', cssClass: 'v6-toast',
  })
  const error = (title: string, message?: string, onRetry?: () => void) => present({
    header: message ? title : undefined, message: message ?? title, icon: alertCircleOutline,
    position: 'top', duration: onRetry ? 0 : 4000, swipeGesture: 'vertical', cssClass: 'v6-toast v6-toast--error',
    buttons: onRetry ? [{ text: 'Réessayer', handler: onRetry }] : [{ text: 'OK', role: 'cancel' }],
  })
  return { success, error }
}

