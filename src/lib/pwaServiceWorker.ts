export const registerServiceWorker = () => {
  console.log('⚠️ Service Worker DÉSACTIVÉ temporairement pour débogage');
  // Service Worker désactivé temporairement
  /*
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker enregistré:', registration.scope);

          // Vérifier les mises à jour toutes les heures
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('Échec de l\'enregistrement du Service Worker:', error);
        });
    });
  }
  */
};

// Synchronisation en arrière-plan
export const requestBackgroundSync = (tag: string) => {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready
      .then((registration: any) => {
        return registration.sync.register(tag);
      })
      .catch((error) => {
        console.error('Background sync non disponible:', error);
      });
  }
};

// Notifications push (si implémentées)
export const requestNotificationPermission = async () => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};
