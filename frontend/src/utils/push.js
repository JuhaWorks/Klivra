import { api } from '../store/useAuthStore';

const VAPID_PUBLIC_KEY = 'BNLioYvODXoir-kzobTklUzkseyY1ZntfUdq26UEHkCEdkbTjIdc3sig_yCzp9vw4YKIgO7hPvzi_mmKfgs81iI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PUSH] Service Worker registered:', registration.scope);
      return registration;
    } catch (err) {
      console.error('[PUSH] Service Worker registration failed:', err);
    }
  }
  return null;
};

export const subscribeToNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Send subscription to backend
    await api.post('/settings/push/subscribe', {
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent
    });

    console.log('[PUSH] Successfully subscribed to push notifications');
    return true;
  } catch (err) {
    console.error('[PUSH] Failed to subscribe:', err);
    return false;
  }
};

export const unsubscribeFromNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/settings/push/unsubscribe', {
          endpoint: subscription.endpoint
        });
      }
      return true;
    } catch (err) {
      console.error('[PUSH] Failed to unsubscribe:', err);
      return false;
    }
  };
