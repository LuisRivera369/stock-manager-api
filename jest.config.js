/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  maxWorkers: 1,
  clearMocks: true,
  globalSetup: "<rootDir>/tests/setup/globalSetup.ts",
  setupFiles: ["<rootDir>/tests/setup/env.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/src/generated/", "/dist/"],
};
