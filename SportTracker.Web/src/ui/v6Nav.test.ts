import { describe, expect, it } from 'vitest'
import { backLabelFor, v6Tabs } from './v6Nav'

describe('backLabelFor', () => {
  it('names the page a back button returns to, like iOS', () => {
    expect(backLabelFor('/tabs/today')).toBe('Aujourd’hui')
    expect(backLabelFor('/tabs/programs')).toBe('Carnets')
    expect(backLabelFor('/tabs/programs/12')).toBe('Carnet')
    expect(backLabelFor('/tabs/history')).toBe('Historique')
    expect(backLabelFor('/tabs/history/cardio')).toBe('Cardio')
    expect(backLabelFor('/tabs/profile')).toBe('Profil')
    expect(backLabelFor('/tabs/programs/12/sessions/4')).toBe('Séance')
    expect(backLabelFor('/tabs/history/workouts')).toBe('Séances')
    expect(backLabelFor('/tabs/history/workouts/51')).toBe('Séance')
    expect(backLabelFor('/tabs/history/cardio/8')).toBe('Sortie')
    expect(backLabelFor('/tabs/history/progress')).toBe('Progrès')
  })

  it('falls back to « Retour » for any other page', () => {
    expect(backLabelFor('/tabs/history/exercises/7')).toBe('Retour')
    expect(backLabelFor('/tabs/profile/help')).toBe('Retour')
  })
})

describe('v6Tabs', () => {
  it('keeps the three tabs of the V6 navigation, in order', () => {
    expect(v6Tabs.map(tab => tab.label)).toEqual(['Aujourd’hui', 'Programmes', 'Historique'])
    expect(v6Tabs.map(tab => tab.href)).toEqual(['/tabs/today', '/tabs/programs', '/tabs/history'])
  })
})
