import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Enter your email address.'
    else if (!emailPattern.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Create a password.'
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.'
    return next
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    // TODO: wire to Supabase auth (signUp) once backend auth is built.
    // Stubbed for now — proceeds straight to onboarding.
    navigate('/onboarding')
  }

  return (
    <AuthLayout title="Create account" subtitle="Start building your memory, one card at a time.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
          onClick={() => {
            // TODO: wire to Supabase OAuth (Google) once backend auth is built.
            navigate('/onboarding')
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
