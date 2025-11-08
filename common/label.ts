/**
 * Display labels and text constants for the poker application
 * Centralizes all user-facing text for easy localization and maintenance
 */

import {
	HandRankEnum,
	RoundEnum,
	GameStatusEnum,
	PlayerActionEnum,
	PositionEnum,
	PlayerRoleEnum,
} from "@/common/enum"

// Game Messages
export const GAME_MESSAGES = {
	// Round progression
	MOVING_TO_FLOP: "Moving to FLOP",
	MOVING_TO_TURN: "Moving to TURN",
	MOVING_TO_RIVER: "Moving to RIVER",
	MOVING_TO_SHOWDOWN: "Moving to SHOWDOWN",
	HAND_COMPLETE_ONE_PLAYER: "Hand complete - only one player remaining",
	WAITING_FOR_PLAYERS: "Waiting for more players to join…",
	GAME_INITIALIZED_READY: "Game initialized. Ready to start a new hand.",

	// Hand flow messages
	NEW_HAND_STARTED: "New hand started",
	BLINDS_POSTED: "Blinds posted",
	HOLE_CARDS_DEALT: "Hole cards dealt",
	FLOP_DEALT: "FLOP dealt",
	TURN_DEALT: "TURN dealt",
	RIVER_DEALT: "RIVER dealt",
	HAND_COMPLETE: "Hand complete",

	// Betting
	BETTING_NOT_COMPLETE: "Cannot advance round - betting is not complete",
	INSUFFICIENT_CHIPS: "Insufficient chips",
	INVALID_ACTION: "Invalid action",

	// Game state
	GAME_NOT_FOUND: "Game room not found",
	PLAYER_NOT_FOUND: "Player not found",
	CONNECTION_FAILED: "Connection failed",
	NO_ELIGIBLE_PLAYERS: "No eligible players for pot",
	DUPLICATE_CARD: "Duplicate card detected",
	INVALID_HAND: "Player does not have valid hand",
	NEED_AT_LEAST_FIVE_CARDS: "Need at least 5 cards",
	COMMUNITY_CARDS_INVALID_COUNT: "Community cards must be between 3 and 5",
	NO_SHOWDOWN_PLAYERS: "No players are eligible for SHOWDOWN",
	ROOM_NOT_FULL: "Room must be full to start the game",
	WAITING_FOR_ALL_PLAYERS: "Waiting for all players to join before starting",

	// Errors
	PERSISTENCE_FAILED: "Failed to save game state",
	FAILED_TO_PROCESS_ACTION: "Failed to process action",
	SSE_HTML_ERROR: "SSE returned HTML error page, not JSON",
	SSE_JSON_PARSE_ERROR: "Failed to parse SSE JSON",
	ENVIRONMENT_VALIDATION_FAILED: "Environment validation failed",
	CONFIGURATION_OVERRIDES_NOT_ALLOWED:
		"Configuration overrides not allowed in production",
	CRITICAL_ENV_VALIDATION_FAILED:
		"CRITICAL: Environment validation failed in production!",

	// API Errors
	ROOM_NOT_FOUND: "Room not found",
	GAMEROOM_NOT_FOUND: "Game room not found",
	GAME_INIT_FAILED: "Game init failed",
	FAILED_TO_INITIALIZE_GAME: "Failed to initialize game",
	INVALID_JSON_REQUEST: "Invalid JSON in request body",

	// Action validation messages
	UNKNOWN_ACTION_TYPE: "Unknown action type",
	RAISING_NOT_ALLOWED: "Raising not allowed",
	UNKNOWN_HAND_TYPE: "Unknown hand type",
} as const

// Player Actions Labels
export const ACTION_LABELS = {
	fold: "Fold",
	check: "Check",
	call: "Call",
	raise: "Raise",
	"all-in": "All In",
} as const

// Hand Rank Labels
export const HAND_RANK_LABELS = {
	HIGHCARD: "High Card",
	ONEPAIR: "One Pair",
	TWOPAIR: "Two Pair",
	THREEOFAKIND: "Three of a Kind",
	STRAIGHT: "Straight",
	FLUSH: "Flush",
	FULLHOUSE: "Full House",
	FOUROFKIND: "Four of a Kind",
	STRAIGHTFLUSH: "Straight Flush",
	ROYALFLUSH: "Royal Flush",
} as const

// Game Status Labels
export const GAME_STATUS_LABELS = {
	WAITING: "Waiting",
	PLAYING: "Playing",
	FINISHED: "Finished",
} as const

// Round Labels
export const ROUND_LABELS = {
	PREFLOP: "Pre-Flop",
	FLOP: "Flop",
	TURN: "Turn",
	RIVER: "River",
	CARD_REVEAL: "Card Reveal",
	SHOWDOWN: "Showdown",
	PreRoundBetting: "Pre-Round Betting",
} as const

// Position Labels
export const POSITION_LABELS = {
	D: "Dealer",
	SB: "Small Blind",
	BB: "Big Blind",
} as const

// Role Labels
export const ROLE_LABELS = {
	[PlayerRoleEnum.DEALER]: "Dealer",
	[PlayerRoleEnum.SMALL_BLIND]: "Small Blind",
	[PlayerRoleEnum.BIG_BLIND]: "Big Blind",
	[PlayerRoleEnum.VIEWER]: "Viewer",
	[PlayerRoleEnum.NO_ROLE]: "Player",
} as const

// UI Labels
export const UI_LABELS = {
	// Navigation
	BACK_TO_LOBBY: "Back to Lobby",
	JOIN_GAME: "Join Game",
	LEAVE_GAME: "Leave Game",
	START_GAME: "Start Game",

	// Forms
	USERNAME: "Username",
	PASSWORD: "Password",
	ROOM_NAME: "Room Name",
	CONFIRM_PASSWORD: "Confirm Password",
	SIGN_IN: "Sign In",
	SIGN_UP: "Sign Up",
	SIGN_OUT: "Sign Out",

	// Game UI
	YOUR_CARDS: "Your Cards",
	COMMUNITY_CARDS: "Community Cards",
	POT: "Pot",
	CHIPS: "Chips",
	BET: "Bet",
	CURRENT_BET: "Current Bet",
	TOTAL_CHIPS: "Total Chips",
	BEST_HAND: "Best Hand",

	// Player status
	FOLDED: "Folded",
	PLAYER_ALL_IN: "All In",
	CURRENT_PLAYER: "Current Player",
	WINNER: "Winner",
	CONNECTED: "Connected",
	DISCONNECTED: "Disconnected",

	// Buttons
	CALL: "Call",
	RAISE: "Raise",
	FOLD: "Fold",
	CHECK: "Check",
	ALL_IN: "All In",
	CONFIRM: "Confirm",
	CANCEL: "Cancel",
	OK: "OK",

	// Loading states
	LOADING: "Loading...",
	CONNECTING: "Connecting...",
	RECONNECTING: "Reconnecting...",
	PROCESSING: "Processing...",
	CREATING: "Creating...",
	CREATING_ROOM: "Creating...",

	// Room states
	FULL: "Full",
	JOIN: "Join",
	CREATE_ROOM: "Create Room",
	NEED_ALL_PLAYERS: "Need all players to start",
	WELCOME: "Welcome",
	LOCAL_ROOM: "Local Room",
	OPEN_SEAT: "Open Seat",

	// Player badges and status indicators
	BADGES: {
		DEALER: "D",
		SMALL_BLIND: "SB",
		BIG_BLIND: "BB",
		ALL_IN: "All-In",
		FOLDED: "Folded",
		YOUR_TURN: "Your TURN",
	},
} as const

// Validation Error Messages
export const VALIDATION_ERRORS = {
	PLAYER_ID_REQUIRED: "Player ID is required",
	INVALID_ACTION_TYPE: "Invalid action type",
	ROOM_NAME_REQUIRED: "Room name is required",
	ROOM_NAME_TOO_LONG: "Room name too long",
	ROOM_ID_REQUIRED: "Room ID is required",
	USERNAME_TOO_SHORT: "Username must be at least 3 characters",
	USERNAME_TOO_LONG: "Username too long",
	PASSWORD_TOO_SHORT: "Password must be at least 6 characters",
	INVALID_PLAYER_COUNT: "Game requires 2-10 players",
	ROOM_IS_FULL: "Room is full",
	FAILED_TO_JOIN_ROOM: "Failed to join room",
	ERROR_CREATING_ROOM: "Error creating room",
	FAILED_TO_CREATE_ROOM: "Failed to create room",
	AUTHENTICATION_REQUIRED: "Authentication required",
	PLAYER_NOT_FOUND_IN_ROOM: "Player not found in room",
	PLAYER_NOT_FOUND_IN_THIS_ROOM: "Player not found in this room",
	METHOD_NOT_ALLOWED_POST: "Method not allowed. Use POST to reset database.",
	FAILED_TO_FETCH_GAME_ROOM: "Failed to fetch game room",
	FAILED_TO_START_GAME: "Failed to start game",
	FAILED_TO_CLEANUP_TOURNAMENT: "Failed to cleanup tournament",
	FAILED_TO_RESET_DATABASE: "Failed to reset database",
	PLAYER_EXACTLY_TWO_CARDS: "Player must have exactly 2 hole cards",
	COMMUNITY_CARDS_3_TO_5: "Community cards must be between 3 and 5 cards",
	FAILED_TO_RESET_PLAYER: "Failed to reset player",
	UNKNOWN_ERROR: "Unknown error",
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
	GAME_CREATED: "Game room created successfully",
	PLAYER_JOINED: "Player joined successfully",
	PLAYER_LEFT: "Player left successfully",
	ACTION_PROCESSED: "Action processed successfully",
	GAME_STARTED: "Game started successfully",
	SIGNED_IN: "Signed in successfully",
	SIGNED_OUT: "Signed out successfully",
	ACCOUNT_CREATED: "Account created successfully",
	DATABASE_RESET_SUCCESS: "Database reset successfully",
	TOURNAMENT_CLEANUP_SUCCESS:
		"Tournament completed and room cleaned up successfully",
	TOURNAMENT_ALREADY_CLEANED: "Tournament already cleaned up by another player",
} as const

// Info Messages
export const INFO_MESSAGES = {
	GAME_WILL_START_SOON: "Game will start soon",
	WAITING_FOR_YOUR_TURN: "Waiting for your turn",
	YOUR_TURN: "It's your turn",
	HAND_FINISHED: "Hand finished",
	GAME_OVER: "Game over",
	NEW_HAND_STARTING: "New hand starting",
} as const

// Display Helper Functions
export function getHandRankDisplayName(rank: HandRankEnum): string {
	return HAND_RANK_LABELS[rank] || rank
}

export function getRoundDisplayName(round: RoundEnum): string {
	return ROUND_LABELS[round] || round
}

export function getGameStatusDisplayName(status: GameStatusEnum): string {
	return GAME_STATUS_LABELS[status] || status
}

export function getPlayerActionDisplayName(action: PlayerActionEnum): string {
	return ACTION_LABELS[action] || action
}

export function getPositionDisplayName(position: PositionEnum): string {
	return POSITION_LABELS[position] || position
}

export function getRoleDisplayName(role: PlayerRoleEnum): string {
	return ROLE_LABELS[role] || role
}
