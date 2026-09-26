import { useQueries, useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import { num, type Program } from './programData'

/* TanStack Query keys and loaders of the Carnets, shared with Aujourd’hui. */

export const programsKey = ['programs'] as const
export const programKey = (programId: string | number) => ['programs', String(programId)] as const
export const loadProgram = (programId: string | number) => apiRequest<Program>(`api/programs/${programId}`)

export function usePrograms() { return useQuery({ queryKey: programsKey, queryFn: () => apiRequest<Program[]>('api/programs') }) }
export function useProgram(programId: string) { return useQuery({ queryKey: programKey(programId), queryFn: () => loadProgram(programId) }) }

/** GET api/programs has no sessions: each programme is read in full (the same cache feeds its detail page). */
export function useProgramDetails(list?: Program[]) {
  const details = useQueries({ queries: (list ?? []).map(program => ({ queryKey: programKey(num(program.id)), queryFn: () => loadProgram(num(program.id)) })) })
  return (list ?? []).map((program, index) => details[index]?.data ?? program)
}

/** Every programme of the list has been read (or failed): Aujourd’hui can tell « no session planned » apart from « still loading ». */
export function useProgramsSettled() {
  const list = usePrograms()
  const details = useQueries({ queries: (list.data ?? []).map(program => ({ queryKey: programKey(num(program.id)), queryFn: () => loadProgram(num(program.id)) })) })
  return list.isError || (Boolean(list.data) && details.every(detail => !detail.isPending))
}

