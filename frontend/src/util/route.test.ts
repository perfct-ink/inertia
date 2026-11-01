import { detectRouterKind, legacyUrlTarget, redirectLegacyUrl, routerKind } from './route'

describe('routerKind', () => {
  test('web pages use real paths', () => {
    expect(routerKind({ protocol: 'https:' })).toBe('browser')
    expect(routerKind({ protocol: 'http:' })).toBe('browser')
  })

  test('Electron (file://) and the iOS shell (capacitor://) keep the hash router', () => {
    expect(routerKind({ protocol: 'file:' })).toBe('hash')
    expect(routerKind({ protocol: 'capacitor:' })).toBe('hash')
  })

  test('the Capacitor runtime wins even when it serves the bundle over https', () => {
    expect(routerKind({ protocol: 'https:', capacitorNative: true })).toBe('hash')
    expect(routerKind({ protocol: 'https:', capacitorNative: false })).toBe('browser')
  })
})

describe('detectRouterKind', () => {
  test('reads the protocol and the Capacitor runtime from the window', () => {
    expect(detectRouterKind({ location: { protocol: 'https:' } })).toBe('browser')
    expect(detectRouterKind({ location: { protocol: 'file:' } })).toBe('hash')
    expect(detectRouterKind({ location: { protocol: 'https:' }, Capacitor: { isNativePlatform: () => true } })).toBe('hash')
    expect(detectRouterKind({ location: { protocol: 'https:' }, Capacitor: { isNativePlatform: () => false } })).toBe('browser')
    expect(detectRouterKind({ location: { protocol: 'https:' }, Capacitor: {} })).toBe('browser')
  })
})

describe('legacyUrlTarget', () => {
  test('/#/route becomes /route', () => {
    expect(legacyUrlTarget({ pathname: '/', hash: '#/space' })).toBe('/space')
    expect(legacyUrlTarget({ pathname: '/', hash: '#/login' })).toBe('/login')
  })

  test('nested routes and the query inside the hash are kept', () => {
    expect(legacyUrlTarget({ pathname: '/', hash: '#/shared/abc123' })).toBe('/shared/abc123')
    expect(legacyUrlTarget({ pathname: '/', hash: '#/documents/7' })).toBe('/documents/7')
    expect(legacyUrlTarget({ pathname: '/', hash: '#/tasks?view=backlog' })).toBe('/tasks?view=backlog')
  })

  test('/index.html#/route becomes /route', () => {
    expect(legacyUrlTarget({ pathname: '/index.html', hash: '#/signup' })).toBe('/signup')
  })

  test('a bare /index.html becomes /', () => {
    expect(legacyUrlTarget({ pathname: '/index.html', hash: '' })).toBe('/')
  })

  test('a bare #/ drops the hash and stays at /', () => {
    expect(legacyUrlTarget({ pathname: '/', hash: '#/' })).toBe('/')
  })

  test('clean URLs are left alone', () => {
    expect(legacyUrlTarget({ pathname: '/', hash: '' })).toBeNull()
    expect(legacyUrlTarget({ pathname: '/space', hash: '' })).toBeNull()
    expect(legacyUrlTarget({ pathname: '/documents/7', hash: '#section' })).toBeNull()
  })

  test('a hash on a real path is an in-page anchor, not an old route', () => {
    expect(legacyUrlTarget({ pathname: '/documents/7', hash: '#/space' })).toBeNull()
  })

  test('other hashes are not routes', () => {
    expect(legacyUrlTarget({ pathname: '/', hash: '#features' })).toBeNull()
    expect(legacyUrlTarget({ pathname: '/', hash: '#' })).toBeNull()
  })

  test('never leaves the site', () => {
    expect(legacyUrlTarget({ pathname: '/', hash: '#//evil.example' })).toBeNull()
    expect(legacyUrlTarget({ pathname: '/', hash: '#/\\evil.example' })).toBeNull()
    expect(legacyUrlTarget({ pathname: '/', hash: '#/ evil' })).toBeNull()
    expect(legacyUrlTarget({ pathname: '/index.html', hash: '#//evil.example' })).toBe('/')
  })
})

describe('redirectLegacyUrl', () => {
  function fakeWindow(protocol: string, pathname: string, hash: string) {
    const calls: unknown[][] = []
    return {
      calls,
      location: { protocol, pathname, hash },
      history: { replaceState: (...args: unknown[]) => { calls.push(args) } },
    }
  }

  test('rewrites an old link once, replacing the history entry', () => {
    const win = fakeWindow('https:', '/', '#/space')
    expect(redirectLegacyUrl(win)).toBe('/space')
    expect(win.calls).toEqual([[null, '', '/space']])
  })

  test('does nothing for a clean URL', () => {
    const win = fakeWindow('https:', '/space', '')
    expect(redirectLegacyUrl(win)).toBeNull()
    expect(win.calls).toHaveLength(0)
  })

  test('does nothing in the hash-router shells, where the hash is the route', () => {
    const electron = fakeWindow('file:', '/dist/index.html', '#/space')
    expect(redirectLegacyUrl(electron)).toBeNull()
    expect(electron.calls).toHaveLength(0)
    const ios = fakeWindow('capacitor:', '/', '#/space')
    expect(redirectLegacyUrl(ios)).toBeNull()
    expect(ios.calls).toHaveLength(0)
  })
})
