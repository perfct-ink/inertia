import { cleanPath, returnPath, usesHashRouter } from './router'

const place = (url: string) => {
  const { protocol, pathname, search, hash } = new URL(url)
  return { protocol, pathname, search, hash }
}

test('the web uses real paths; file, capacitor and the Mac shell use hashes', () => {
  expect(usesHashRouter(place('https://inertia.it.com/space'), false)).toBe(false)
  expect(usesHashRouter(place('http://localhost:5174/login'), false)).toBe(false)
  expect(usesHashRouter(place('file:///app/dist/index.html'), false)).toBe(true)
  expect(usesHashRouter(place('capacitor://localhost/index.html'), false)).toBe(true)
  expect(usesHashRouter(place('https://inertia.it.com/index.html#/documents'), true)).toBe(true)
})

test('old hash links and /index.html become clean paths', () => {
  expect(cleanPath(place('https://inertia.it.com/#/space'))).toBe('/space')
  expect(cleanPath(place('https://inertia.it.com/index.html#/tasks?view=backlog'))).toBe('/tasks?view=backlog')
  expect(cleanPath(place('https://inertia.it.com/index.html'))).toBe('/')
})

test('clean paths and in-page anchors stay as they are', () => {
  expect(cleanPath(place('https://inertia.it.com/login'))).toBeNull()
  expect(cleanPath(place('https://inertia.it.com/documents/4#intro'))).toBeNull()
})

test('a sign-in goes back to the page the visitor was sent away from', () => {
  expect(returnPath({ from: '/documents/4' })).toBe('/documents/4')
  expect(returnPath({ from: '/tasks?view=backlog#top' })).toBe('/tasks?view=backlog#top')
})

test('without a usable page, a sign-in goes to the app home', () => {
  expect(returnPath(null)).toBe('/space')
  expect(returnPath(undefined)).toBe('/space')
  expect(returnPath({})).toBe('/space')
  expect(returnPath({ from: 42 })).toBe('/space')
  expect(returnPath({ from: '' })).toBe('/space')
  expect(returnPath({ from: '/login' })).toBe('/space')
  expect(returnPath({ from: '/signup?x=1' })).toBe('/space')
  expect(returnPath({ from: '/loginx' })).toBe('/loginx')
  expect(returnPath(null, '/other')).toBe('/other')
})

test('only paths inside the app are returned to', () => {
  expect(returnPath({ from: 'https://evil.example/' })).toBe('/space')
  expect(returnPath({ from: '//evil.example/space' })).toBe('/space')
  expect(returnPath({ from: 'javascript:alert(1)' })).toBe('/space')
})
