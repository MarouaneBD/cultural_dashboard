import type { Config } from 'jest'

const config: Config = {
  projects: [
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.test.tsx'],
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/prisma/'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
    {
      displayName: 'db',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/prisma/seed.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
}

export default config
