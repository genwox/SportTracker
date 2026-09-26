import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IonIcon } from '@ionic/react'
import { addOutline, checkmarkOutline, chevronForwardOutline } from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import { ExerciseThumb, V5State, V6Button, V6Chip, V6ChipRow, V6InputItem, V6List, V6Searchbar, V6Sheet, V6Skeleton } from '../../ui'
import type { Exercise } from './liveApi'

const groups = ['Pecs', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Fessiers', 'Abdos', 'Corps entier']
const count = new Intl.NumberFormat('fr-FR')

/**
 * Exercise library (V6 · 27): full-height sheet, iOS search bar, muscle and equipment chips (kept between
 * openings), several exercises picked then added at once. Custom exercises are created from the same sheet.
 */
export function CatalogSheet({ open, onClose, onAdd, exclude = [], actionLabel = 'Ajouter à la séance' }: {
  open: boolean; onClose: () => void; onAdd: (exercises: Exercise[]) => void; exclude?: number[]; actionLabel?: string
}) {
  const queryClient = useQueryClient()
  const { data = [], isPending, error, refetch } = useQuery({ queryKey: ['live', 'catalog'], queryFn: () => apiRequest<Exercise[]>('api/exercises'), staleTime: 60_000 })
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<number | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [picked, setPicked] = useState<Exercise[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [newGroups, setNewGroups] = useState<number[]>([0])
  const [newEquipment, setNewEquipment] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [instructions, setInstructions] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const equipmentOptions = useMemo(() => [...new Set(data.map(item => item.equipment).filter((item): item is string => Boolean(item)))].sort(), [data])
  const matches = data.filter(item => !exclude.includes(item.id) && item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
    (muscle === null || item.muscleGroups?.includes(muscle)) && (equipment === null || item.equipment === equipment))
  const filters = [muscle !== null ? groups[muscle] : null, equipment].filter(Boolean).join(' + ')
  const isPicked = (exercise: Exercise) => picked.some(item => item.id === exercise.id)
  const toggle = (exercise: Exercise) => setPicked(current => isPicked(exercise) ? current.filter(item => item.id !== exercise.id) : [...current, exercise])
  const close = () => { setPicked([]); setCreating(false); setFormError(''); onClose() }
  const add = (exercises: Exercise[]) => { setPicked([]); setCreating(false); onAdd(exercises) }

  async function createExercise() {
    if (!name.trim() || !newGroups.length) { setFormError('Indique un nom et au moins un groupe musculaire.'); return }
    setSaving(true); setFormError('')
    try {
      const created = await apiRequest<Exercise>('api/exercises', { method: 'POST', body: { name: name.trim(), type: 0, muscleGroups: newGroups, equipment: newEquipment || null, gifUrl: gifUrl || null, instructionsFr: instructions || null } })
      queryClient.setQueryData<Exercise[]>(['live', 'catalog'], previous => [...(previous ?? []), created])
      setName(''); setGifUrl(''); setInstructions('')
      add([...picked, created])
    } catch { setFormError('Vérifie ta connexion, puis réessaie.') }
    finally { setSaving(false) }
  }

  return <V6Sheet isOpen={open} onDismiss={close} title={creating ? 'Nouvel exercice' : 'Bibliothèque'} subtitle={`${count.format(data.length)} exercices`}
    breakpoints={[0, 1]} initialBreakpoint={1} className="live-catalog-sheet">
    {creating ? <div className="live-catalog-form">
      <V6List header="Exercice personnalisé">
        <V6InputItem label="Nom" value={name} onChange={setName} maxlength={160} placeholder="Ex. Tirage poitrine" autocapitalize="sentences" />
        <V6InputItem label="Équipement" value={newEquipment} onChange={setNewEquipment} placeholder="Facultatif" />
        <V6InputItem label="GIF" type="url" inputmode="url" value={gifUrl} onChange={setGifUrl} placeholder="URL (facultatif)" />
      </V6List>
      {equipmentOptions.length > 0 && <V6ChipRow label="Équipements connus">{equipmentOptions.map(item => <V6Chip key={item} selected={newEquipment === item} onClick={() => setNewEquipment(item)}>{item}</V6Chip>)}</V6ChipRow>}
      <h3 className="live-catalog__label">Groupes musculaires</h3>
      <V6ChipRow label="Groupes musculaires">{groups.map((group, index) => <V6Chip key={group} selected={newGroups.includes(index)} onClick={() => setNewGroups(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index])}>{group}</V6Chip>)}</V6ChipRow>
      <label className="live-notes live-notes--card"><span>Instructions (facultatif)</span><textarea rows={3} value={instructions} onChange={event => setInstructions(event.target.value)} placeholder="Placement, amplitude, respiration…" /></label>
      {formError && <p className="live-catalog__error" role="alert">⚠︎ {formError}</p>}
      <V6Button onClick={() => void createExercise()} loading={saving}>{saving ? 'Création…' : 'Créer et ajouter'}</V6Button>
      <V6Button variant="text" onClick={() => setCreating(false)}>Retour à la bibliothèque</V6Button>
    </div> : <div className="live-catalog">
      <div className="live-catalog__search"><V6Searchbar value={search} onChange={setSearch} placeholder="Rechercher un exercice" /></div>
      <h3 className="live-catalog__label">Groupe musculaire</h3>
      <V6ChipRow label="Groupe musculaire"><V6Chip selected={muscle === null} onClick={() => setMuscle(null)}>Tous</V6Chip>{groups.map((group, index) => <V6Chip key={group} selected={muscle === index} onClick={() => setMuscle(index)}>{group}</V6Chip>)}</V6ChipRow>
      {equipmentOptions.length > 0 && <>
        <h3 className="live-catalog__label">Équipement</h3>
        <V6ChipRow label="Équipement"><V6Chip selected={equipment === null} onClick={() => setEquipment(null)}>Tous</V6Chip>{equipmentOptions.map(item => <V6Chip key={item} selected={equipment === item} onClick={() => setEquipment(item)}>{item}</V6Chip>)}</V6ChipRow>
      </>}
      <p className="live-catalog__count" role="status">{matches.length} exercice{matches.length > 1 ? 's' : ''}{filters ? ` · ${filters}` : ''}</p>
      {isPending && !data.length ? <V6Skeleton /> : error && !data.length ? <V5State title="Catalogue indisponible" message="Vérifie ta connexion, puis réessaie." error onRetry={() => void refetch()} /> : <ul className="live-catalog__list">
        {matches.slice(0, 100).map(item => {
          const selected = isPicked(item)
          return <li key={item.id}><button type="button" className={`live-catalog__row ${selected ? 'is-picked' : ''}`} aria-pressed={selected} onClick={() => toggle(item)}>
            <ExerciseThumb exercise={item} size={44} />
            <span className="live-catalog__text"><strong>{item.name}</strong><small>{item.muscleGroups?.map(group => groups[group]).join(' · ')}{item.equipment ? ` · ${item.equipment}` : ''}</small></span>
            <span className="live-catalog__toggle" aria-hidden="true"><IonIcon icon={selected ? checkmarkOutline : addOutline} /></span>
          </button></li>
        })}
        <li><button type="button" className="live-catalog__row live-catalog__create" onClick={() => setCreating(true)}>
          <span className="live-catalog__plus" aria-hidden="true"><IonIcon icon={addOutline} /></span>
          <span className="live-catalog__text"><strong>Créer un exercice personnalisé</strong></span>
          <span className="live-catalog__new">Nouveau</span><IonIcon icon={chevronForwardOutline} aria-hidden="true" />
        </button></li>
      </ul>}
      {matches.length > 100 && <p className="live-catalog__count">Affichage des 100 premiers résultats. Affine ta recherche.</p>}
      <div className="live-catalog__footer"><V6Button onClick={() => add(picked)} disabled={!picked.length}>{actionLabel}{picked.length > 1 ? ` (${picked.length})` : ''}</V6Button></div>
    </div>}
  </V6Sheet>
}
