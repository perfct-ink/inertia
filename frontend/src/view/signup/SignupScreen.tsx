import { Button, Field, FormError, Input } from '@/components/ui'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signupErrors, useSignup } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { useOnboardingStore } from '@/store/onboarding'
import AuthLayout from '@/components/auth/AuthLayout'
import { usePageTitle } from '@/hooks/usePageTitle'
import { splitSignupErrors } from '@/data/signupError'

export default function SignupScreen() {
  usePageTitle('Sign up')
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<string[]>([])

  const signup = useSignup({
    onSuccess: ({ token, user }) => {
      setAuth(token, user)
      useOnboardingStore.getState().start(user.id)
      navigate('/space')
    },
    onError: (err) => setErrors(signupErrors(err)),
  })

  // Refusals about a field show under it; the rest above the form.
  const { fields, other } = splitSignupErrors(errors)

  return (
    <AuthLayout title="Create your account">
      {other.map((e) => <FormError key={e} message={e} />)}
      <form
        className="auth-form"
        onSubmit={(e) => { e.preventDefault(); signup.mutate(form) }}
      >
        <Field label="Name" error={fields.name}>
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Email" error={fields.email}>
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="Password" error={fields.password}>
          <Input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <Button
          type="submit"
          disabled={signup.isPending}
          variant="primary"
          className="auth-submit"
        >
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="auth-switch">
        Have an account? <Link to="/login" className="auth-link">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
