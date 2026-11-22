import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim()

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'listu-28d7b.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'listu-28d7b',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'listu-28d7b.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

let auth: Auth | null = null

if (apiKey) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
  } catch (err) {
    console.warn('Firebase init error:', err)
  }
}

export const googleProvider = new GoogleAuthProvider()
export { auth }
