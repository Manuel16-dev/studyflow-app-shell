import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../lib/AuthContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignupPage() {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Enter your email address.'
    else if (!emailPattern.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Create a password.'
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (!confirmPassword) next.confirmPassword = 'Re-enter your password.'
    else if (confirmPassword !== password) next.confirmPassword = "Passwords don't match."
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    const { data, error } = await signUp(email, password)
    setSubmitting(false)
    if (error) {
      setErrors({ form: error.message })
      return
    }
    if (!data.session) {
      // Email confirmation is required before Supabase issues a session —
      // navigating to /onboarding here would just bounce off RequireAuth
      // back to /login, which is exactly the "signup doesn't work" bug.
      setAwaitingConfirmation(true)
      return
    }
    // The handle_new_user trigger creates the profile + settings row server-side.
    navigate('/onboarding')
  }

  if (awaitingConfirmation) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <p className="text-sm text-neutral-600">
          Click the link in that email to verify your account, then come back and sign in.
        </p>
        <Button variant="secondary" className="w-full mt-4" onClick={() => navigate('/login')}>
          Back to sign in
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create account" subtitle="Start building your memory, one card at a time.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errors.form && (
          <p className="text-sm text-danger bg-danger-light border border-danger/20 rounded-md px-3 py-2">
            {errors.form}
          </p>
        )}
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <TextField
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        <Button type="submit" variant="primary" className="w-full mt-1" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Continue'}
        </Button>

        <div className="flex items-center gap-3 text-xs text-neutral-400 my-1">
          <div className="flex-1 h-px bg-neutral-200" />
          or
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={async () => {
            const { error } = await signInWithGoogle()
            if (error) setErrors({ form: error.message })
          }}
        >
          Continue with Google
        </Button>
      </form>

      <p className="text-sm text-neutral-500 text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
