import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Enter your email address.'
    else if (!emailPattern.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    return next
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    // TODO: wire to Supabase auth (signInWithPassword) once backend auth is built.
    // Existing users skip onboarding and land straight on the dashboard.
    navigate('/')
  }

  return (
    <AuthLayout title="Log in" subtitle="Welcome back — let's pick up where you left off.">
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
        <div className="flex flex-col gap-1.5">
          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Link to="/forgot-password" className="text-sm text-primary hover:underline self-end">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" className="w-full mt-1" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Continue'}
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
            navigate('/')
          }}
        >
          Continue with Google
        </Button>
      </form>

      <p className="text-sm text-neutral-500 text-center mt-6">
        New to StudyFlow?{' '}
        <Link to="/signup" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
