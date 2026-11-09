import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import api from '@/lib/api'

export interface AuthUser {
  id: number
  name: string
  email: string
}

// What a sign-in or sign-up hands back: the signed-in user (in the body) and
// the JWT (the Authorization response header, without its "Bearer " prefix).
export interface AuthSession {
  token: string
  user: AuthUser
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput extends LoginInput {
  name: string
}

// Sign-in, sign-up and sign-out are not a resource, so this does not extend
// ApiResource. The first two are `silent`: a refused sign-in is an expected
// answer, so the form shows the error itself instead of the global notice.
export class AuthApi {
  readonly path = '/api/v1/auth'

  login(input: LoginInput) {
    return this.session('login', input)
  }

  signup(input: SignupInput) {
    return this.session('signup', input)
  }

  // The caller signs out locally whether or not the server answers.
  logout() {
    return api.delete(`${this.path}/logout`)
  }

  private session(action: 'login' | 'signup', input: LoginInput | SignupInput): Promise<AuthSession> {
    return api.post<{ user: AuthUser }>(`${this.path}/${action}`, { user: input }, { silent: true }).then((res) => ({
      token: String(res.headers['authorization'] ?? '').replace('Bearer ', ''),
      user: res.data.user,
    }))
  }
}

export const authApi = new AuthApi()

// The messages a refused sign-up came back with (e.g. "Email has already been taken").
export function signupErrors(error: unknown): string[] {
  const errors = (error as { response?: { data?: { errors?: unknown } } } | null | undefined)?.response?.data?.errors
  return Array.isArray(errors) && errors.length ? errors.map(String) : ['Something went wrong']
}

// The form passes onSuccess (store the session, navigate) and onError (show it).
type AuthOptions<Input> = Omit<UseMutationOptions<AuthSession, Error, Input>, 'mutationFn'>

export const useLogin = (options?: AuthOptions<LoginInput>) => useMutation({ ...options, mutationFn: (input: LoginInput) => authApi.login(input) })
export const useSignup = (options?: AuthOptions<SignupInput>) => useMutation({ ...options, mutationFn: (input: SignupInput) => authApi.signup(input) })
