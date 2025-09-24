module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/../backend'],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,ts}',
    '<rootDir>/**/?(*.)+{test,spec}.{js,ts}',
    '<rootDir>/**/test_*.{js,ts}',
    '<rootDir>/../backend/src/**/__tests__/**/*.{js,ts}',
    '<rootDir>/../backend/src/**/?(*.)+{test,spec}.{js,ts}',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/../backend/tsconfig.json'
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverageFrom: [
    'backend/src/**/*.{ts,js}',
    '!backend/src/**/*.d.ts',
    '!backend/src/**/__tests__/**',
    '!backend/src/**/*.test.{ts,js}',
    '!backend/src/**/*.spec.{ts,js}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  verbose: true,
};