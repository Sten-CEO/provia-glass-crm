export const registerServiceWorker = () => {
  console.log('⚠️ Service Worker DÉSACTIVATION active');

  // Désenregistrer tous les Service Workers existants
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        console.log('🗑️ Désenregistrement du Service Worker:', registration.scope);
        registration.unregister().then(() => {
          console.log('✅ Service Worker désenregistré avec succès');
        });
      });

      // Forcer le rechargement des contrôleurs de page
      if (registrations.length > 0) {
        console.log('🔄 Rechargement pour appliquer les changements...');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    });
  }
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
