import { splitSignupErrors } from './signupError'

test('each message goes under the field it starts with', () => {
  expect(splitSignupErrors(['Email has already been taken', 'Password is too short (minimum is 8 characters)'])).toEqual({
    fields: { email: 'Email has already been taken', password: 'Password is too short (minimum is 8 characters)' },
    other: [],
  })
})

test('several messages for one field are joined', () => {
  expect(splitSignupErrors(['Password is too short', 'Password can\'t be blank']).fields.password).toBe('Password is too short. Password can\'t be blank')
})

test('anything not about a field stays above the form', () => {
  expect(splitSignupErrors(['Something went wrong', 'Name can\'t be blank'])).toEqual({ fields: { name: 'Name can\'t be blank' }, other: ['Something went wrong'] })
})

test('a word that only starts like a field is not that field', () => {
  expect(splitSignupErrors(['Emailing is disabled']).other).toEqual(['Emailing is disabled'])
})
