import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IonContent, IonModal } from '@ionic/react'
import { apiRequest } from '../../api/client'
import { V5Button, V5State } from '../../ui'
import dumbbellIcon from './assets/010-Dumbell.svg'
import type { Exercise } from './liveApi'

const groups = ['Pecs', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Fessiers', 'Abdos', 'Corps entier']

export function CatalogSheet({ open, onClose, onSelect, exclude = [] }: { open: boolean; onClose: () => void; onSelect: (exercise: Exercise) => void; exclude?: number[] }) {
  const queryClient = useQueryClient()
  const { data = [], isPending, error, refetch } = useQuery({ queryKey: ['live', 'catalog'], queryFn: () => apiRequest<Exercise[]>('api/exercises'), staleTime: 60_000 })
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<number | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [newGroups, setNewGroups] = useState<number[]>([0])
  const [newEquipment, setNewEquipment] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [instructions, setInstructions] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const equipmentOptions = useMemo(() => [...new Set(data.map(item => item.equipment).filter((item): item is string => Boolean(item)))].sort(), [data])
  const matches = data.filter(item => !exclude.includes(item.id) && item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
    (muscle === null || item.muscleGroups?.includes(muscle)) && (equipment === null || item.equipment === equipment))

  async function createExercise() {
    if (!name.trim() || !newGroups.length) { setFormError('Indique un nom et au moins un groupe musculaire.'); return }
    setSaving(true); setFormError('')
    try {
      const created = await apiRequest<Exercise>('api/exercises', { method: 'POST', body: { name: name.trim(), type: 0, muscleGroups: newGroups, equipment: newEquipment || null, gifUrl: gifUrl || null, instructionsFr: instructions || null } })
      queryClient.setQueryData<Exercise[]>(['live', 'catalog'], previous => [...(previous ?? []), created])
      setCreating(false); onSelect(created)
    } catch { setFormError('Vérifie ta connexion, puis réessaie.') }
    finally { setSaving(false) }
  }

  return <IonModal isOpen={open} onDidDismiss={onClose} initialBreakpoint={0.9} breakpoints={[0, 0.5, 0.9]} className="live-sheet">
    <IonContent><div className="live-sheet__inner">
      <header className="live-sheet__head"><div><h2>Bibliothèque</h2><p>{data.length} exercices</p></div><button type="button" onClick={onClose} aria-label="Fermer la bibliothèque">×</button></header>
      {creating ? <div className="live-form">
        <h3>Créer un exercice personnalisé</h3>
        <label>Nom<input value={name} onChange={event => setName(event.target.value)} maxLength={160} /></label>
        <fieldset><legend>Groupes musculaires</legend><div className="live-chips">{groups.map((group, index) => <button type="button" key={group} className={newGroups.includes(index) ? 'active' : ''} aria-pressed={newGroups.includes(index)} onClick={() => setNewGroups(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index])}>{group}</button>)}</div></fieldset>
        <label>Équipement<input value={newEquipment} onChange={event => setNewEquipment(event.target.value)} list="live-equipment" /></label>
        <label>URL du GIF (facultatif)<input type="url" value={gifUrl} onChange={event => setGifUrl(event.target.value)} /></label>
        <label>Instructions (facultatif)<textarea rows={3} value={instructions} onChange={event => setInstructions(event.target.value)} /></label>
        {formError && <p role="alert">{formError}</p>}
        <V5Button onClick={createExercise} disabled={saving}>{saving ? 'Création…' : 'Créer et choisir'}</V5Button>
        <button type="button" className="live-link" onClick={() => setCreating(false)}>Retour à la bibliothèque</button>
      </div> : <>
        <input className="live-input" aria-label="Rechercher un exercice" type="search" placeholder="Rechercher un exercice" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="live-filter"><strong>Groupe musculaire</strong><div className="live-chips"><button aria-pressed={muscle === null} className={muscle === null ? 'active' : ''} onClick={() => setMuscle(null)}>Tous</button>{groups.map((group, index) => <button key={group} aria-pressed={muscle === index} className={muscle === index ? 'active' : ''} onClick={() => setMuscle(index)}>{group}</button>)}</div></div>
        <div className="live-filter"><strong>Équipement</strong><div className="live-chips"><button aria-pressed={equipment === null} className={equipment === null ? 'active' : ''} onClick={() => setEquipment(null)}>Tous</button>{equipmentOptions.map(item => <button key={item} aria-pressed={equipment === item} className={equipment === item ? 'active' : ''} onClick={() => setEquipment(item)}>{item}</button>)}</div></div>
        <p>{matches.length} exercice{matches.length > 1 ? 's' : ''} trouvé{matches.length > 1 ? 's' : ''}</p>
        {isPending && !data.length ? <p role="status">Chargement des exercices…</p> : error && !data.length ? <V5State title="Catalogue indisponible" error onRetry={() => void refetch()} /> : <div className="live-catalog-results">{matches.slice(0, 100).map(item => <button key={item.id} type="button" onClick={() => onSelect(item)}><span className="live-catalog-icon"><img src={dumbbellIcon} alt="" /></span><span><strong>{item.name}</strong><small>{item.muscleGroups?.map(group => groups[group]).join(' · ')}{item.equipment ? ` · ${item.equipment}` : ''}</small></span><span>＋</span></button>)}{matches.length > 100 && <p>Affichage des 100 premiers résultats. Affine ta recherche.</p>}</div>}
        <button type="button" className="live-create" onClick={() => setCreating(true)}>＋ Créer un exercice personnalisé</button>
      </>}
      <datalist id="live-equipment">{equipmentOptions.map(item => <option key={item} value={item} />)}</datalist>
    </div></IonContent>
  </IonModal>
}
