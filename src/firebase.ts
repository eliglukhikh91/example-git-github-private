import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';

// These values are read from Vite env vars (set in .env.local, see .env.example).
// A Firebase web app's config is a public identifier, not a secret — it's safe
// for it to end up in the client bundle. Real access control is enforced by
// Firebase's own servers (who can sign in) and by the app's server verifying
// the sign-in token before doing anything privileged (see server.ts).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

/**
 * Returns the current user's Firebase ID token, to send as an Authorization
 * header on API calls that touch the (paid) Gemini API — see server.ts.
 * Returns null if nobody is signed in or Firebase isn't configured.
 */
export async function getAuthToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}

// --- Push notifications (Firebase Cloud Messaging) ---
// Requires VITE_FIREBASE_MESSAGING_SENDER_ID and VITE_FIREBASE_VAPID_KEY (see
// .env.example) plus the service worker at public/firebase-messaging-sw.js.
let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!app) return null;
  if (messagingInstance) return messagingInstance;
  if (!(await isSupported().catch(() => false))) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export type NotificationPermissionResult = 'granted' | 'denied' | 'unsupported' | 'not-configured';

/**
 * Asks the browser for notification permission and, if granted, registers
 * this device with Firebase Cloud Messaging. Returns the FCM device token
 * (to send to the server) or null if permission wasn't granted / push isn't
 * supported in this browser.
 */
export async function requestNotificationPermission(): Promise<{ status: NotificationPermissionResult; token: string | null }> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!isFirebaseConfigured || !vapidKey) {
    return { status: 'not-configured', token: null };
  }
  const messaging = await getMessagingInstance();
  if (!messaging || typeof Notification === 'undefined') {
    return { status: 'unsupported', token: null };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { status: 'denied', token: null };
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return { status: 'granted', token: token || null };
  } catch (e) {
    console.error('Error getting FCM token', e);
    return { status: 'unsupported', token: null };
  }
}

/**
 * Listens for push messages that arrive while the app is open in the
 * foreground (background messages are handled by the service worker
 * instead). Returns an unsubscribe function.
 */
export async function onForegroundNotification(callback: (title: string, body: string) => void): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload.notification?.title || 'Luma', payload.notification?.body || '');
  });
}

