import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/react'
import { personCircleOutline } from 'ionicons/icons'

export function PlaceholderPage({ title, profileLink = false }: { title: string; profileLink?: boolean }) {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          {profileLink && <IonButton slot="end" routerLink="/tabs/profile" aria-label="Profil"><IonIcon icon={personCircleOutline} /></IonButton>}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="st-placeholder"><h1>{title}</h1></main>
      </IonContent>
    </IonPage>
  )
}
