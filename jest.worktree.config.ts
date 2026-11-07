/**
 * Worktree-local Jest config.
 * Uses <rootDir> token with explicit roots to bypass the .claude/ exclusion
 * that prevents test discovery when this worktree resides inside .claude/worktrees/.
 */
import type { Config } from 'jest'

const config: Config = {
  projects: [
    {
      displayName: 'dom',
      testEnvironment: '<rootDir>/jest.env.ts',
      roots: ['<rootDir>'],
      testMatch: [
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/prisma/',
      ],
      setupFiles: ['<rootDir>/jest.globals.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      transformIgnorePatterns: ['/node_modules/(?!(next|next-auth|@auth)/)'],
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
