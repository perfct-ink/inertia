import { Button, Input, FormError } from '@/components/ui'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function SignupScreen() {
  usePageTitle('Sign up')
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<string[]>([])

  const signup = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/api/v1/auth/signup', { user: data }, { silent: true }),
    onSuccess: (res) => {
      const token = res.headers['authorization']?.replace('Bearer ', '')
      setAuth(token, res.data.user)
      navigate('/space')
    },
    onError: (err: { response?: { data?: { errors?: string[] } } }) => setErrors(err.response?.data?.errors ?? ['Something went wrong']),
  })

  return (
    <AuthLayout title="Create your account">
      {errors.map((e) => <FormError key={e} message={e} />)}
      <form
        className="auth-form"
        onSubmit={(e) => { e.preventDefault(); signup.mutate(form) }}
      >
        <Input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          type="email"
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
