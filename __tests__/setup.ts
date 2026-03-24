// Test setup file
// Runs before each test file

import 'jest-extended';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
// Uncomment to see logs during debugging
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterAll(() => {
  jest.restoreAllMocks();
});
