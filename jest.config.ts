import type { Config } from "jest";

/**
 * Jest configuration.
 *
 * The assignment asks for Jest specifically. We use `ts-jest` so the same
 * TypeScript source under `src/lib` can be imported directly by the tests
 * without a build step.
 *
 * Tests are pure (no DOM, no network) — they verify the *correctness of the
 * output* of the normalize + formatter layer, which is exactly what the brief
 * asks for.
 */
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__", "<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Tests run on Node, not in the browser/next runtime.
          target: "ES2019",
          module: "commonjs",
          esModuleInterop: true,
          moduleResolution: "node",
          skipLibCheck: true,
          strict: true,
          jsx: "react-jsx",
        },
      },
    ],
  },
  // Exclude node_modules and Next build artefacts from transformation.
  transformIgnorePatterns: ["/node_modules/", "\\.next/"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "!src/lib/**/*.d.ts",
  ],
};

export default config;
