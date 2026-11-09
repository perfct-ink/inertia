import api from '@/lib/api'
import { authApi, signupErrors } from './auth'

jest.mock('@/lib/api', () => ({ __esModule: true, default: { post: jest.fn(), delete: jest.fn() } }))

const post = api.post as jest.Mock
const del = api.delete as jest.Mock
const session = { data: { user: { id: 7, name: 'Ada', email: 'ada@example.com' } }, headers: { authorization: 'Bearer abc.def' } }

beforeEach(() => {
  post.mockReset().mockResolvedValue(session)
  del.mockReset().mockResolvedValue({})
})

describe('AuthApi', () => {
  test('login posts the credentials under user, silently, and returns the token and user', async () => {
    await expect(authApi.login({ email: 'ada@example.com', password: 'secret' })).resolves.toEqual({
      token: 'abc.def',
      user: { id: 7, name: 'Ada', email: 'ada@example.com' },
    })
    expect(post).toHaveBeenCalledWith('/api/v1/auth/login', { user: { email: 'ada@example.com', password: 'secret' } }, { silent: true })
  })

  test('signup posts the name too', async () => {
    const result = await authApi.signup({ name: 'Ada', email: 'ada@example.com', password: 'secret' })
    expect(result.token).toBe('abc.def')
    expect(post).toHaveBeenCalledWith('/api/v1/auth/signup', { user: { name: 'Ada', email: 'ada@example.com', password: 'secret' } }, { silent: true })
  })

  test('an answer without an Authorization header gives an empty token', async () => {
    post.mockResolvedValue({ data: session.data, headers: {} })
    await expect(authApi.login({ email: 'a@b.c', password: 'x' })).resolves.toMatchObject({ token: '' })
  })

  test('logout deletes the session', async () => {
    await authApi.logout()
    expect(del).toHaveBeenCalledWith('/api/v1/auth/logout')
  })
})

describe('signupErrors', () => {
  test('returns the messages the server sent', () => {
    expect(signupErrors({ response: { data: { errors: ['Email has already been taken'] } } })).toEqual(['Email has already been taken'])
  })

  test('falls back to a generic message for anything else', () => {
    expect(signupErrors(new Error('boom'))).toEqual(['Something went wrong'])
    expect(signupErrors({ response: { data: { errors: [] } } })).toEqual(['Something went wrong'])
    expect(signupErrors(undefined)).toEqual(['Something went wrong'])
  })
})
