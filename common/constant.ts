/**
 * Configuration constants for the poker application
 * Centralizes all magic numbers and configurable values
 */

// Game Configuration
export const GAME_CONFIG = {
	// Player limits
	MIN_PLAYERS: 2,
	MAX_PLAYERS: 9,

	// Starting values
	INITIAL_CHIPS: 1000,
	INITIAL_BIG_BLIND: 20,
	INITIAL_SMALL_BLIND: 10,

	// Game limits
	MAX_GAME_LOG_ENTRIES: 100,
	MAX_RECONNECT_ATTEMPTS: 5,

	// Timeouts (in milliseconds)
	HEARTBEAT_TIMEOUT: 20000, // 20 seconds
	RECONNECT_INTERVAL: 1000, // Start with 1 second
	MAX_RECONNECT_INTERVAL: 30000, // Max 30 seconds
	RECONNECT_BACKOFF_MULTIPLIER: 2,
	SHOWDOWN_DELAY: 2000, // Delay before starting new hand after showdown

	// Database
	DB_TRANSACTION_TIMEOUT: 8000,
	DB_MAX_WAIT: 3000,

	// Security
	RATE_LIMIT_CLEANUP_INTERVAL: 60000, // 1 minute
	MAX_INPUT_LENGTH: 1000,
	MAX_NUMERIC_VALUE: 1000000,
	MIN_NUMERIC_VALUE: -1000000,
} as const

// Rate Limiting Presets
export const RATE_LIMITS = {
	// API endpoints
	API_DEFAULT: {
		windowMs: 60000, // 1 minute
		maxRequests: 100,
		cleanupIntervalMs: GAME_CONFIG.RATE_LIMIT_CLEANUP_INTERVAL,
	},

	// Game actions (more permissive)
	GAME_ACTIONS: {
		windowMs: 10000, // 10 seconds
		maxRequests: 50,
		cleanupIntervalMs: GAME_CONFIG.RATE_LIMIT_CLEANUP_INTERVAL,
	},

	// Authentication (more restrictive)
	AUTH: {
		windowMs: 300000, // 5 minutes
		maxRequests: 5,
		cleanupIntervalMs: GAME_CONFIG.RATE_LIMIT_CLEANUP_INTERVAL,
	},
} as const

// Environment-specific overrides
export const getEnvironmentConfig = () => {
	const env = process.env.NODE_ENV || "development"

	switch (env) {
		case "production":
			return {
				...GAME_CONFIG,
				// Production-specific overrides
				HEARTBEAT_TIMEOUT: 30000, // Longer timeout in production
				MAX_RECONNECT_ATTEMPTS: 10,
			}

		case "test":
			return {
				...GAME_CONFIG,
				// Test-specific overrides
				HEARTBEAT_TIMEOUT: 1000, // Faster timeouts for tests
				RECONNECT_INTERVAL: 100,
				SHOWDOWN_DELAY: 100,
			}

		default: // development
			return GAME_CONFIG
	}
}

// Feature flags
export const FEATURES = {
	ENABLE_DETAILED_LOGGING: process.env.NODE_ENV === "development",
	ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === "production",
	ENABLE_AUTO_CLEANUP: true,
	ENABLE_PERSISTENCE_QUEUE: true,
} as const

// Security Headers
export const SECURITY_HEADERS = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"X-XSS-Protection": "1; mode=block",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Content-Security-Policy": "default-src 'self'",
} as const

// Database Configuration
export const DATABASE_CONFIG = {
	URL: process.env.DATABASE_URL || "file:./dev.db",
	TRANSACTION_TIMEOUT: 8000,
	MAX_WAIT: 3000,
	CONNECTION_POOL_SIZE: 10,
	QUERY_TIMEOUT: 5000,
} as const

// Environment Configuration
export const ENVIRONMENT_CONFIG = {
	NODE_ENV:
		(process.env.NODE_ENV as "development" | "production" | "test") ||
		"development",
	PORT: Number(process.env.PORT) || 3000,
	ENABLE_DETAILED_LOGGING: process.env.ENABLE_DETAILED_LOGGING === "true",
	ENABLE_PERFORMANCE_MONITORING:
		process.env.ENABLE_PERFORMANCE_MONITORING === "true",
	ENABLE_ERROR_TRACKING: process.env.ENABLE_ERROR_TRACKING !== "false",
	RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
	RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
	DB_TRANSACTION_TIMEOUT: Number(process.env.DB_TRANSACTION_TIMEOUT) || 8000,
	DB_MAX_WAIT: Number(process.env.DB_MAX_WAIT) || 3000,
} as const

// Game Utils Configuration
export const GAME_UTILS_CONFIG = {
	// Default player names for auto-initialization
	DEFAULT_PLAYER_NAMES: ["Alice", "Bob", "Charlie", "Diana"],

	// Timing constants (in milliseconds)
	HAND_START_DELAY: 1000,
	ACTION_PROCESSING_DELAY: 500,
	ROUND_ADVANCE_DELAY: 1000,
	CARD_DEAL_DELAY: 300,
	ALL_IN_CONTINUE_DELAY: 1500,
	HAND_FINISH_DELAY: 5000,

	// UI Constants
	MAX_LOG_DISPLAY: 10,
	LOG_SCROLL_HEIGHT: "max-h-40",

	// Game flow messages
	MESSAGES: {
		GAME_INITIALIZED: "Game initialized with players.",
		HAND_STARTED: (handNumber: number) => `Hand #${handNumber} started!`,
		ADVANCING_TO_FLOP: "Advancing to FLOP...",
		ADVANCING_TO_TURN: "Advancing to TURN...",
		ADVANCING_TO_RIVER: "Advancing to RIVER...",
		FLOP_DEALT: "FLOP dealt!",
		TURN_DEALT: "TURN dealt!",
		RIVER_DEALT: "RIVER dealt!",
		WINNERS: (winners: string[]) =>
			`Winners: ${winners.join(", ")}! Pot distributed.`,
		ERROR_STARTING_HAND: (error: Error | string) =>
			`Error starting hand: ${error}`,
		ERROR_FINISHING_HAND: (error: Error | string) =>
			`Error finishing hand: ${error}`,
		INVALID_ACTION: (message: string) => `Invalid action: ${message}`,
		ACTION_ERROR: (error: Error | string) => `Error: ${error}`,
	},
} as const

// Poker Rules Configuration
export const POKER_RULES = {
	BETTING_ROUNDS: ["PREFLOP", "FLOP", "TURN", "RIVER"] as const,
	COMMUNITY_CARDS: {
		FLOP: 3,
		TURN: 1,
		RIVER: 1,
	},
} as const

// SSE Connection Configuration
export const SSE_CONFIG = {
	CLEANUP_INTERVAL: 30000, // 30 seconds
	CONNECTION_TIMEOUT: 60000, // 60 seconds
} as const

// Monte Carlo Simulation Configuration
export const MONTE_CARLO_CONFIG = {
	SIMULATION_COUNT: 10000,
} as const

// Validation Constants
export const VALIDATION_CONFIG = {
	USERNAME_MIN_LENGTH: 3,
	USERNAME_MAX_LENGTH: 20,
	PASSWORD_MIN_LENGTH: 6,
	ROOM_NAME_MIN_LENGTH: 1,
	ROOM_NAME_MAX_LENGTH: 50,
	MAX_INPUT_LENGTH: 1000,
	MAX_NUMERIC_VALUE: 1000000,
	MIN_NUMERIC_VALUE: -1000000,
} as const
