import { beforeAll, afterAll, beforeEach } from 'vitest'

beforeAll(() => {
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  // cleanup resources
})

beforeEach(() => {
  // reset global state
})
