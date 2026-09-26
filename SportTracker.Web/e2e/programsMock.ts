import type { BrowserContext, Route } from '@playwright/test'

/* In-memory API for the Carnets and Aujourd’hui screens (V6 lot 3): programmes, linked workouts, catalogue. */

const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }

const exercise = (id: number, name: string, muscleGroups: number[], equipment: string) => ({ id, name, type: 0, muscleGroups, equipment, gifUrl: null, instructionsFr: null })
export const catalog = [
  exercise(1, 'Développé couché', [0], 'Barre'), exercise(2, 'Tirage vertical', [1], 'Poulie'), exercise(3, 'Développé militaire', [2], 'Barre'),
  exercise(4, 'Élévations latérales', [2], 'Haltères'), exercise(5, 'Squat', [5], 'Barre'), exercise(6, 'Curl biceps', [3], 'Haltères'),
]
const planned = (id: number, exerciseId: number, order: number, targetSets: number, min: number, max: number, rest: number) =>
  ({ id, exerciseId, exercise: catalog.find(item => item.id === exerciseId), order, targetSets, targetRepsMin: min, targetRepsMax: max, restSeconds: rest, workoutProgramSessionId: 0 })

/** Monday of the current week, 07:00 local, as the API serialises dates. */
function thisMonday() {
  const day = new Date()
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return `${day.toLocaleDateString('sv-SE')}T07:00:00`
}

export type MockApi = { puts: Record<string, unknown>[]; posts: Record<string, unknown>[]; deletes: string[]; programs: Record<string, unknown>[] }

export function programsFixture() {
  const push = { id: 12, name: 'Push', order: 0, workoutProgramId: 3, exercises: [planned(101, 1, 0, 4, 8, 10, 0), planned(102, 2, 1, 4, 10, 12, 90), planned(103, 3, 2, 3, 8, 10, 90), planned(104, 4, 3, 3, 12, 15, 60)] }
  const pull = { id: 10, name: 'Pull', order: 1, workoutProgramId: 3, exercises: [planned(105, 2, 0, 4, 10, 12, 90), planned(106, 6, 1, 3, 10, 12, 60)] }
  const legs = { id: 11, name: 'Legs', order: 2, workoutProgramId: 3, exercises: [planned(107, 5, 0, 4, 8, 10, 120)] }
  return [
    { id: 3, name: 'Push Pull Legs', objective: 'Prise de force sur les polyarticulaires, 3 séances par semaine.', colorHex: '#4A90D9', sessions: [push, pull, legs] },
    { id: 4, name: 'Full body débutant', objective: 'Reprendre à mon rythme', colorHex: '#5BBD72', sessions: [{ id: 20, name: 'Full body', order: 0, workoutProgramId: 4, exercises: [planned(201, 5, 0, 3, 10, 12, 90)] }] },
    { id: 5, name: 'Prépa course', objective: null, colorHex: '#E57C3A', sessions: [] },
  ]
}

export function workoutsFixture() {
  return [{
    id: 51, name: 'Push', date: thisMonday(), duration: '00:52:00', workoutProgramSessionId: 12, workoutExercises: [
      { exerciseId: 1, supersetGroupId: 1, exercise: catalog[0], exerciseSets: [{ weight: 20, repetitions: 12, setType: 0 }, { weight: 60, repetitions: 10, setType: 1 }, { weight: 65, repetitions: 8, setType: 1 }] },
      { exerciseId: 2, supersetGroupId: 1, exercise: catalog[1], exerciseSets: [{ weight: 45, repetitions: 12, setType: 1 }, { weight: 50, repetitions: 8, setType: 2 }] },
      { exerciseId: 4, supersetGroupId: null, exercise: catalog[3], exerciseSets: [{ weight: 8, repetitions: 15, setType: 0 }, { weight: 12, repetitions: 12, setType: 3 }] },
    ],
  }]
}

let nextId = 500
/** Like the API after a PUT: new rows get ids, exercises come back with their catalogue entry. */
function hydrate(program: Record<string, unknown>) {
  const sessions = (program.sessions as Record<string, unknown>[]).map(session => ({
    ...session, id: session.id || ++nextId,
    exercises: (session.exercises as Record<string, unknown>[]).map(item => ({ ...item, id: ++nextId, exercise: catalog.find(entry => entry.id === item.exerciseId) })),
  }))
  return { ...program, sessions }
}

/** Routes every API call; PUT / POST / DELETE of programmes update the in-memory data and are recorded. */
export async function mockProgramsApi(context: BrowserContext, { programs = programsFixture(), workouts = workoutsFixture() } = {}): Promise<MockApi> {
  const api: MockApi = { puts: [], posts: [], deletes: [], programs }
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) })
  await context.route('http://localhost:5294/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    const programMatch = /^\/api\/programs\/(\d+)$/.exec(url.pathname)
    if (url.pathname === '/manage/info') return json(route, { email: 'damien@example.com' })
    if (url.pathname === '/api/programs' && method === 'GET') return json(route, api.programs.map(program => ({ ...program, sessions: [] })))
    if (url.pathname === '/api/programs' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>
      api.posts.push(body)
      const created = { ...body, id: 90 + api.posts.length }
      api.programs.push(created)
      return json(route, created)
    }
    if (programMatch && method === 'GET') {
      const program = api.programs.find(item => item.id === Number(programMatch[1]))
      return program ? json(route, program) : json(route, { title: 'Not Found' }, 404)
    }
    if (programMatch && method === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      api.puts.push(body)
      api.programs = api.programs.map(item => item.id === Number(programMatch[1]) ? hydrate(body) : item)
      await route.fulfill({ status: 204, headers }); return
    }
    if (programMatch && method === 'DELETE') {
      api.deletes.push(programMatch[1])
      api.programs = api.programs.filter(item => item.id !== Number(programMatch[1]))
      await route.fulfill({ status: 204, headers }); return
    }
    if (url.pathname === '/api/workoutsessions') return json(route, workouts)
    if (url.pathname === '/api/cardiosessions') return json(route, [])
    if (url.pathname === '/api/exercises' && method === 'POST') return json(route, { ...(request.postDataJSON() as object), id: 77 })
    if (url.pathname === '/api/exercises') return json(route, catalog)
    return json(route, [])
  })
  return api
}
