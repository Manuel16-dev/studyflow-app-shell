import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { getSettings } from './settingsStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = signed out
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  // Apply the "Reduce motion" setting app-wide as soon as we have a
  // session — not just while the Settings page happens to be mounted.
  // document.documentElement is a real DOM node, not React-managed, so the
  // class persists across route changes on its own.
  useEffect(() => {
    if (!session?.user) return
    getSettings().then((s) => {
      document.documentElement.classList.toggle('reduce-motion', !!s?.appearance?.reducedMotion)
    })
  }, [session?.user?.id])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp: (email, password, displayName) =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      }),
    signOut: () => supabase.auth.signOut(),
    updatePassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
