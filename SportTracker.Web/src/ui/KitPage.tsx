import { useState } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { addOutline, layersOutline, refreshOutline, scaleOutline, speedometerOutline, syncOutline } from 'ionicons/icons'
import {
  V6Button, V6Chip, V6ChipRow, V6Header, V6InputItem, V6Item, V6List, V6Segment, V6Sheet, V6Skeleton, V6SlidingRow,
  V6StickyAction, V6Toggle,
} from './v6'
import { useV6ActionSheet, useV6Toast } from './v6Feedback'
import './kit.css'

const periods = [{ value: 'week', label: 'Semaine' }, { value: 'month', label: 'Mois' }, { value: 'year', label: 'Année' }] as const
const kinds = [{ value: 'all', label: 'Tout' }, { value: 'strength', label: 'Muscu' }, { value: 'cardio', label: 'Cardio' }] as const
const muscles = ['Tous', 'Pecs', 'Dos', 'Jambes', 'Épaules', 'Bras']
const sessions = [
  { id: 1, name: 'Haut du corps', meta: '16 sept · 5 exercices · 18 séries', badge: 'PR' },
  { id: 2, name: 'Jambes', meta: '14 sept · 4 exercices · 16 séries', badge: '16' },
  { id: 3, name: 'Full body', meta: '11 sept · 6 exercices · 20 séries', badge: '20' },
]

/** Living showcase of the V6 kit (lot 1), reachable from Profil › Aide & support while V6 is being built. */
export function KitPage() {
  const [period, setPeriod] = useState<(typeof periods)[number]['value']>('week')
  const [kind, setKind] = useState<(typeof kinds)[number]['value']>('all')
  const [muscle, setMuscle] = useState('Tous')
  const [rpe, setRpe] = useState(true)
  const [sync, setSync] = useState(true)
  const [email, setEmail] = useState('toi@exemple')
  const [password, setPassword] = useState('')
  const [sheet, setSheet] = useState<number | null>(null)
  const [rows, setRows] = useState(sessions)
  const [saving, setSaving] = useState(false)
  const actions = useV6ActionSheet()
  const toast = useV6Toast()

  const remove = async (row: (typeof sessions)[number]) => {
    const confirmed = await actions.confirm({ title: `Supprimer « ${row.name} » ?`, message: 'Ses exercices et ses séries seront supprimés. Action définitive.', confirmText: 'Supprimer la séance' })
    if (confirmed) { setRows(current => current.filter(item => item.id !== row.id)); void toast.success('Séance supprimée', 'Aperçu : rien n’est effacé pour de vrai') }
  }
  const save = () => { setSaving(true); window.setTimeout(() => { setSaving(false); void toast.success('Séance enregistrée', 'Synchronisée à l’instant') }, 1200) }
  const emailError = email && !/^\S+@\S+\.\S+$/.test(email) ? 'Adresse e-mail invalide' : null

  return <IonPage>
    <IonContent fullscreen>
      <main className="kit-page">
        <V6Header title="Kit V6" subtitle="Composants natifs · lot 1" backHref="/tabs/profile/help" backLabel="Aide"
          action={<V6Button variant="icon" icon={addOutline} aria-label="Ajouter" onClick={() => { void toast.success('Bouton icône') }} />} />

        <section className="kit-section" aria-label="Contrôles segmentés">
          <h2>Contrôle segmenté</h2>
          <V6Segment label="Période" value={period} options={periods} onChange={setPeriod} />
          <V6Segment label="Type de séance" value={kind} options={kinds} onChange={setKind} />
        </section>

        <section className="kit-section" aria-label="Puces de filtre">
          <h2>Puces de filtre</h2>
          <V6ChipRow label="Groupe musculaire">{muscles.map(item => <V6Chip key={item} selected={muscle === item} onClick={() => setMuscle(item)}>{item}</V6Chip>)}</V6ChipRow>
        </section>

        <V6List header="Préférences de séance" note="Dernière synchronisation · 12:12">
          <V6Item icon={scaleOutline} title="Unité de poids" detail="Kilogrammes (kg)" value="kg" onClick={() => { void toast.success('Ligne touchée') }} />
          <V6Item icon={layersOutline} title="Type de série par défaut" detail="Normal" value="Normal" onClick={() => { void toast.success('Ligne touchée') }} />
          <V6Item icon={speedometerOutline} title="Afficher le RPE" detail="Activé sur chaque série" end={<V6Toggle label="Afficher le RPE" checked={rpe} onChange={value => { setRpe(value); void toast.success(value ? 'RPE affiché' : 'RPE masqué') }} />} />
          <V6Item icon={syncOutline} title="Synchronisation" detail="Automatique dès le retour en ligne" end={<V6Toggle label="Synchronisation" checked={sync} onChange={value => { setSync(value); void toast.success(value ? 'Synchronisation activée' : 'Synchronisation en pause') }} />} />
        </V6List>

        <V6List header="Formulaire">
          <V6InputItem label="E-mail" type="email" inputmode="email" autocomplete="email" value={email} onChange={setEmail} error={emailError} placeholder="toi@exemple.fr" />
          <V6InputItem label="Mot de passe" type="password" autocomplete="current-password" value={password} onChange={setPassword} placeholder="Requis" helper="8 caractères minimum" />
        </V6List>

        <section className="kit-section" aria-label="Lignes glissables">
          <h2>Glisser pour gérer une séance</h2>
          <p className="kit-hint">Pose le doigt sur une séance et glisse vers la gauche : «&nbsp;Supprimer&nbsp;» apparaît (glisse jusqu’au bout pour supprimer directement, une feuille demande confirmation). Vers la droite : «&nbsp;Dupliquer&nbsp;» et «&nbsp;Terminer&nbsp;».</p>
          {rows.map(row => <V6SlidingRow key={row.id} onDelete={() => { void remove(row) }}
            onDuplicate={() => { void toast.success('Séance dupliquée') }} onFinish={() => { void toast.success('Séance terminée') }}>
            <div className="kit-row"><span className="kit-row__text"><strong>{row.name}</strong><small>{row.meta}</small></span><b>{row.badge}</b></div>
          </V6SlidingRow>)}
          {rows.length < sessions.length && <V6Button variant="text" onClick={() => setRows(sessions)}>Remettre les séances</V6Button>}
        </section>

        <section className="kit-section" aria-label="Boutons">
          <h2>Boutons</h2>
          <V6Button onClick={save} loading={saving}>{saving ? 'Enregistrement…' : 'Démarrer la séance'}</V6Button>
          <V6Button variant="secondary">Séance à vide</V6Button>
          <V6Button disabled>Désactivé</V6Button>
          <div className="kit-inline"><V6Button variant="icon" icon={refreshOutline} aria-label="Rafraîchir" /><V6Button variant="text">Terminer</V6Button></div>
        </section>

        <section className="kit-section" aria-label="Feuilles, actions et toasts">
          <h2>Feuilles, actions, toasts</h2>
          <p className="kit-hint">Une feuille monte du bas : glisse-la vers le haut ou le bas pour changer de cran, ou touche la petite barre grise en haut pour passer au cran suivant. Un toast est le bandeau sombre qui apparaît quelques secondes en haut de l’écran : touche «&nbsp;Bandeau succès&nbsp;» ou «&nbsp;Bandeau erreur&nbsp;» (il s’affiche aussi quand tu changes un interrupteur ou que tu glisses une séance).</p>
          <div className="kit-grid">
            <V6Button variant="secondary" onClick={() => setSheet(0.25)}>Feuille 25 %</V6Button>
            <V6Button variant="secondary" onClick={() => setSheet(0.5)}>Feuille 50 %</V6Button>
            <V6Button variant="secondary" onClick={() => setSheet(1)}>Feuille 100 %</V6Button>
            <V6Button variant="secondary" onClick={() => { void actions.confirm({ title: 'Se déconnecter ?', message: 'Tes brouillons restent sur cet appareil.', confirmText: 'Se déconnecter', destructive: true }) }}>Feuille d’actions</V6Button>
            <V6Button variant="secondary" onClick={() => { void toast.success('Séance enregistrée', 'Synchronisée à 12:12') }}>Bandeau succès</V6Button>
            <V6Button variant="secondary" onClick={() => { void toast.error('Enregistrement impossible', 'Brouillon gardé sur l’appareil', () => { void toast.success('Nouvel essai lancé') }) }}>Bandeau erreur</V6Button>
          </div>
        </section>

        <section className="kit-section" aria-label="Chargement">
          <h2>Squelettes</h2>
          <V6Skeleton />
        </section>
      </main>
    </IonContent>
    <V6StickyAction><V6Button variant="secondary" onClick={() => { void toast.success('Gardé en local') }}>Garder en local</V6Button><V6Button onClick={save} loading={saving}>Réessayer</V6Button></V6StickyAction>
    <V6Sheet isOpen={sheet != null} onDismiss={() => setSheet(null)} title="Minuteur de repos"
      breakpoints={[0, 0.25, 0.5, 1]} initialBreakpoint={sheet ?? 0.5}>
      <p className="kit-sheet-text">Glisse la feuille vers le haut ou le bas pour passer d’un cran à l’autre (25, 50, 100 %), ou touche la barre grise du haut. Tout en bas : elle se ferme.</p>
      <V6Segment label="Durée" value={period} options={periods} onChange={setPeriod} />
      <V6Button onClick={() => setSheet(null)}>Passer le repos</V6Button>
    </V6Sheet>
  </IonPage>
}
