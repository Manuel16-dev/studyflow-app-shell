import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { getSettings, updateSettingsSection, applyTextSizeClass, applyThemeClass } from './settingsStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = signed out
  const [loading, setLoading] = useState(true)
  // 'light' | 'dark' | 'system' — lifted here (rather than kept local to
  // Settings.jsx) so it's a single source of truth that both the Settings
  // page and the floating theme switcher read from and write to. Starts
  // from whatever bootstrapThemeFromCache() already applied pre-render in
  // main.jsx, so this doesn't cause a second flash on mount.
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('studyflow-theme-cache') ?? 'system'
  )

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
      applyTextSizeClass(s?.appearance?.textSize)
      const savedTheme = s?.appearance?.theme ?? 'light'
      applyThemeClass(savedTheme)
      setThemeState(savedTheme)
    })
  }, [session?.user?.id])

  // Shared setter — persists to Supabase, applies the class, and updates
  // context state so every consumer (Settings page, floating switcher)
  // re-renders with the new value. Callers don't need to also call
  // applyThemeClass themselves.
  async function setTheme(value) {
    setThemeState(value)
    applyThemeClass(value)
    await updateSettingsSection('appearance', { theme: value })
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    theme,
    setTheme,
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
