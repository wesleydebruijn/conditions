/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '**/__tests__/**/*.(spec|test).[tj]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  }
};

