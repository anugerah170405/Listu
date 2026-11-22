import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../services/firebase'
import { setAuthTokenGetter } from '../services/api'

export type Profile = { displayName: string | null; photoURL: string | null }

const PROFILE_KEY = 'listu:profile'

function readCachedProfile(): Profile | null {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
  } catch {
    return null
  }
}

interface AuthContextType {
  user: User | null
  /** Live user profile, or the last known one while Firebase restores the session (avoids UI flicker on reload). */
  profile: Profile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [cachedProfile, setCachedProfile] = useState<Profile | null>(readCachedProfile)

  const getIdToken = async (): Promise<string | null> => {
    if (!auth || !auth.currentUser) return null
    try {
      return await auth.currentUser.getIdToken()
    } catch {
      return null
    }
  }

  useEffect(() => {
    setAuthTokenGetter(getIdToken)
    if (!auth) {
      setLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        const next = { displayName: currentUser.displayName, photoURL: currentUser.photoURL }
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
        setCachedProfile(next)
      } else {
        localStorage.removeItem(PROFILE_KEY)
        setCachedProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase API Key belum diisi di frontend/.env')
    }
    await signInWithPopup(auth, googleProvider)
  }

  const signOut = async () => {
    if (!auth) return
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile: user ?? cachedProfile, loading, signInWithGoogle, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
