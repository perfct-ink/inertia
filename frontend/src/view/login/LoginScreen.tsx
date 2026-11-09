import { Button, Input, FormError } from '@/components/ui'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLogin } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function LoginScreen() {
  usePageTitle('Log in')
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const login = useLogin({
    onSuccess: ({ token, user }) => {
      setAuth(token, user)
      navigate('/space')
    },
    onError: () => setError('Invalid email or password'),
  })

  return (
    <AuthLayout title="Sign in to Inertia">
      <FormError message={error} />
      <form
        className="auth-form"
        onSubmit={(e) => { e.preventDefault(); login.mutate(form) }}
      >
        <Input
          type={process.env.NODE_ENV === 'development' ? 'text' : 'email'}
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <Button
          type="submit"
          disabled={login.isPending}
          variant="primary"
          className="auth-submit"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="auth-switch">
        No account? <Link to="/signup" className="auth-link">Sign up</Link>
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <Button variant="secondary"
          type="button"
          disabled={login.isPending}
          onClick={() => login.mutate({ email: 'test@example.com', password: 'password123' })}
          className="auth-dev_button"
        >
          Continue as test user (dev only)
        </Button>
      )}
    </AuthLayout>
  )
}
