// jest.config.js
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	// Enable coverage collection
	collectCoverage: true,
	// Specify the directory for coverage reports
	coverageDirectory: "coverage",
	// Specify files to include in coverage reports
	collectCoverageFrom: [
		"**/lib/**/*.ts", // Adjust this path to match your source code structure
		"!**/lib/utils.ts",
		"!**/node_modules/**",
		"!**/types/**", // Exclude types directory if it's not meant for test coverage
	],
	// Specify coverage reporters
	coverageReporters: ["json", "lcov", "text", "clover"],
}
