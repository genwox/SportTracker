import type { BrowserContext, Route } from '@playwright/test'

/* In-memory API for the Historique screens (V6 lot 4): workouts, cardio outings, exercise history. Dates are relative to today. */

const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }

/** Local date `days` ago at 07:00, as the API serialises dates. */
export function daysAgo(days: number) {
  const day = new Date()
  day.setDate(day.getDate() - days)
  return `${day.toLocaleDateString('sv-SE')}T07:00:00`
}

const exercise = (id: number, name: string, muscleGroups: number[]) => ({ id, name, type: 0, muscleGroups, equipment: 'Barre', gifUrl: null, instructionsFr: null })
const bench = exercise(1, 'Développé couché', [0]), pulldown = exercise(2, 'Tirage vertical', [1]), squat = exercise(5, 'Squat', [5]), fly = exercise(4, 'Écartés poulie', [0])
const set = (weight: number, repetitions: number, setType = 1, rpe: number | null = null) => ({ weight, repetitions, setType, rpe })

export function workoutsFixture() {
  return [
    { id: 51, name: 'Haut du corps', date: daysAgo(1), duration: '00:45:00', workoutProgramSessionId: null, workoutExercises: [
      { exerciseId: 1, exercise: bench, supersetGroupId: 1, notes: null, exerciseSets: [set(20, 12, 0, 5), set(60, 10, 1, 8), set(65, 8, 1, 9)] },
      { exerciseId: 2, exercise: pulldown, supersetGroupId: 1, notes: null, exerciseSets: [set(45, 12, 1, 7), set(50, 10, 1, 8), set(50, 6, 2, 9)] },
      { exerciseId: 4, exercise: fly, supersetGroupId: null, notes: 'Coudes plus hauts, meilleure sensation sur le haut des pecs.', exerciseSets: [set(12, 15, 0, 5), set(16, 12, 1, 8), set(16, 9, 3, 10)] },
    ] },
    { id: 50, name: 'Jambes', date: daysAgo(3), duration: '00:50:00', workoutProgramSessionId: null, workoutExercises: [
      { exerciseId: 5, exercise: squat, supersetGroupId: null, notes: null, exerciseSets: [set(40, 10, 0), set(90, 8), set(100, 5, 3)] },
    ] },
    { id: 49, name: 'Full body', date: daysAgo(9), duration: '01:05:00', workoutProgramSessionId: null, workoutExercises: [
      { exerciseId: 1, exercise: bench, supersetGroupId: null, notes: null, exerciseSets: [set(60, 10), set(62.5, 8)] },
      { exerciseId: 5, exercise: squat, supersetGroupId: null, notes: null, exerciseSets: [set(80, 8), set(70, 10, 2)] },
    ] },
  ]
}

export function cardioFixture() {
  return [
    { id: 8, name: 'Sortie longue', type: 0, date: daysAgo(2), duration: '00:42:00', distance: 8.2, elevationGain: 120 },
    { id: 7, name: 'Vélo home-trainer', type: 3, date: daysAgo(4), duration: '00:55:00', distance: 24, elevationGain: 0 },
    { id: 6, name: 'Footing', type: 0, date: daysAgo(12), duration: '00:35:00', distance: 6.5, elevationGain: 40 },
  ]
}

const history = [
  { date: daysAgo(30), totalReps: 28, totalVolume: 1500, sets: [{ order: 1, ...set(55, 10) }, { order: 2, ...set(55, 8) }] },
  { date: daysAgo(9), totalReps: 18, totalVolume: 1100, sets: [{ order: 1, ...set(60, 10) }, { order: 2, ...set(62.5, 8) }] },
  { date: daysAgo(1), totalReps: 30, totalVolume: 1360, sets: [{ order: 1, ...set(20, 12, 0) }, { order: 2, ...set(60, 10) }, { order: 3, ...set(65, 8) }] },
]

export type HistoryApi = { posts: { path: string; body: Record<string, unknown> }[]; puts: { path: string; body: Record<string, unknown> }[]; deletes: string[] }

export async function mockHistoryApi(context: BrowserContext, { workouts = workoutsFixture(), cardio = cardioFixture() } = {}): Promise<HistoryApi> {
  const api: HistoryApi = { posts: [], puts: [], deletes: [] }
  const data = { workouts: workouts as Record<string, unknown>[], cardio: cardio as Record<string, unknown>[] }
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) })
  let nextId = 900
  await context.route('http://localhost:5294/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method(), path = url.pathname
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    if (path === '/manage/info') return json(route, { email: 'damien@example.com' })
    const collection = /^\/api\/(workoutsessions|cardiosessions)(?:\/(\d+))?$/.exec(path)
    if (collection) {
      const list = collection[1] === 'workoutsessions' ? 'workouts' : 'cardio'
      const id = collection[2] ? Number(collection[2]) : null
      if (method === 'GET' && id == null) return json(route, data[list])
      if (method === 'GET') { const item = data[list].find(entry => entry.id === id); return item ? json(route, item) : json(route, { title: 'Not Found' }, 404) }
      if (method === 'POST') {
        const body = request.postDataJSON() as Record<string, unknown>
        api.posts.push({ path, body })
        const created = { ...body, id: ++nextId }
        data[list] = [...data[list], created]
        return json(route, created, 201)
      }
      if (method === 'PUT') {
        const body = request.postDataJSON() as Record<string, unknown>
        api.puts.push({ path, body })
        data[list] = data[list].map(entry => entry.id === id ? { ...entry, ...body } : entry)
        await route.fulfill({ status: 204, headers }); return
      }
      if (method === 'DELETE') {
        api.deletes.push(path)
        data[list] = data[list].filter(entry => entry.id !== id)
        await route.fulfill({ status: 204, headers }); return
      }
    }
    if (/^\/api\/exercises\/\d+\/history$/.test(path)) return json(route, history)
    const exerciseMatch = /^\/api\/exercises\/(\d+)$/.exec(path)
    if (exerciseMatch) return json(route, [bench, pulldown, squat, fly].find(item => item.id === Number(exerciseMatch[1])) ?? bench)
    if (path === '/api/exercises') return json(route, [bench, pulldown, squat, fly])
    if (path === '/api/programs') return json(route, [])
    return json(route, [])
  })
  return api
}
