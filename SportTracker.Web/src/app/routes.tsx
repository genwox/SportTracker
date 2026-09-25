import { IonIcon, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { calendarOutline, barChartOutline, timeOutline } from 'ionicons/icons'
import { Redirect, Route } from 'react-router-dom'
import { TodayPage } from '../features/today/pages'
import { ProgramsPage, NewProgramPage, ProgramDetailPage, ProgramSessionDetailPage, NewProgramSessionPage, NewWorkoutSessionPage, ExerciseHistoryPage } from '../features/programs/pages'
import { HistoryPage, ProgressPage, ExerciseProgressPage, WorkoutSessionDetailPage, CardioSessionsPage, CardioSessionDetailPage, NewCardioSessionPage } from '../features/history/pages'
import { ProfilePage, ProfilePreferencesPage, HelpPage, LoginPage, RegisterPage } from '../features/profile/pages'
import { LiveWorkoutPage, ExerciseLivePage } from '../features/live/pages'
import { AuthGate } from '../api/AuthGate'

// Paths stay here with their Route declarations so feature lots need not edit the router.
// eslint-disable-next-line react-refresh/only-export-components
export const paths = {
  today: '/tabs/today',
  programs: '/tabs/programs',
  programNew: '/tabs/programs/new',
  programDetail: '/tabs/programs/:programId',
  programSessionNew: '/tabs/programs/:programId/sessions/new',
  programSessionDetail: '/tabs/programs/:programId/sessions/:sessionId',
  workoutNew: '/tabs/programs/workouts/new',
  exerciseHistory: '/tabs/programs/:programId/sessions/:sessionId/exercises/:exerciseId/history',
  history: '/tabs/history',
  progress: '/tabs/history/progress',
  exerciseProgress: '/tabs/history/exercises/:exerciseId',
  workoutDetail: '/tabs/history/workouts/:sessionId',
  cardioSessions: '/tabs/history/cardio',
  cardioNew: '/tabs/history/cardio/new',
  cardioDetail: '/tabs/history/cardio/:sessionId',
  profile: '/tabs/profile',
  preferences: '/tabs/profile/preferences',
  help: '/tabs/profile/help',
  login: '/login',
  register: '/register',
  live: '/live',
  liveDraft: '/live/:draftId',
  liveExercise: '/live/:draftId/exercises/:exerciseId',
  programLiveExercise: '/live/programs/:programId/sessions/:sessionId/exercises/:exerciseId',
} as const

function Tabs() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path={paths.today} component={TodayPage} />
        <Route exact path={paths.programs} component={ProgramsPage} />
        <Route exact path={paths.programNew} component={NewProgramPage} />
        <Route exact path={paths.programDetail} component={ProgramDetailPage} />
        <Route exact path={paths.programSessionNew} component={NewProgramSessionPage} />
        <Route exact path={paths.programSessionDetail} component={ProgramSessionDetailPage} />
        <Route exact path={paths.workoutNew} component={NewWorkoutSessionPage} />
        <Route exact path={paths.exerciseHistory} component={ExerciseHistoryPage} />
        <Route exact path={paths.history} component={HistoryPage} />
        <Route exact path={paths.progress} component={ProgressPage} />
        <Route exact path={paths.exerciseProgress} component={ExerciseProgressPage} />
        <Route exact path={paths.workoutDetail} component={WorkoutSessionDetailPage} />
        <Route exact path={paths.cardioSessions} component={CardioSessionsPage} />
        <Route exact path={paths.cardioNew} component={NewCardioSessionPage} />
        <Route exact path={paths.cardioDetail} component={CardioSessionDetailPage} />
        <Route exact path={paths.profile} component={ProfilePage} />
        <Route exact path={paths.preferences} component={ProfilePreferencesPage} />
        <Route exact path={paths.help} component={HelpPage} />
        <Redirect exact from="/tabs" to={paths.today} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="today" href={paths.today} aria-label="Today"><IonIcon icon={calendarOutline} /><span>Today</span></IonTabButton>
        <IonTabButton tab="programs" href={paths.programs} aria-label="Programmes"><IonIcon icon={timeOutline} /><span>Programmes</span></IonTabButton>
        <IonTabButton tab="history" href={paths.history} aria-label="Historique/Progrès"><IonIcon icon={barChartOutline} /><span>Historique/Progrès</span></IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}

export function AppRoutes() {
  return (
    <IonReactRouter>
      <AuthGate><IonRouterOutlet ref={(outlet) => { if (outlet) (outlet as HTMLIonRouterOutletElement & { swipeGesture: boolean }).swipeGesture = false }}>
        <Route exact path={paths.login} component={LoginPage} />
        <Route exact path={paths.register} component={RegisterPage} />
        <Route exact path={paths.liveExercise} component={ExerciseLivePage} />
        <Route exact path={paths.programLiveExercise} component={ExerciseLivePage} />
        <Route exact path={paths.liveDraft} component={LiveWorkoutPage} />
        <Route exact path={paths.live} component={LiveWorkoutPage} />
        <Route path="/tabs" component={Tabs} />
        <Redirect exact from="/" to={paths.today} />
      </IonRouterOutlet></AuthGate>
    </IonReactRouter>
  )
}
