require('@testing-library/jest-dom')

// jsdom has no TextEncoder/TextDecoder; react-router 7 needs them when a test
// renders a real router (MemoryRouter) instead of mocking react-router-dom.
const { TextEncoder, TextDecoder } = require('util')
if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder
if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder
