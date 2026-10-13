import { Button, Input, FormError } from '@/components/ui'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import AuthLayout from './AuthLayout'

export default function SignupScreen() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<string[]>([])

  const signup = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/api/v1/auth/signup', { user: data }),
    onSuccess: (res) => {
      const token = res.headers['authorization']?.replace('Bearer ', '')
      setAuth(token, res.data.user)
      navigate('/workspace')
    },
    onError: (err: any) => setErrors(err.response?.data?.errors ?? ['Something went wrong']),
  })

  return (
    <AuthLayout title="Create your account">
      {errors.map((e) => <FormError key={e} message={e} />)}
      <form
        className="space-y-4"
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
          className="w-full"
        >
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground text-center">
        Have an account? <Link to="/login" className="underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
