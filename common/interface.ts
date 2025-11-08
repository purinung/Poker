import { PokerGame } from "@/lib/PokerGame"
import {
	SuitEnum,
	RankEnum,
	HandRankEnum,
	RoundEnum,
	PlayerActionEnum,
	GameStatusEnum,
	PositionEnum,
	PlayerRoleEnum,
} from "@/common/enum"

// Card Types (structured)
export interface Card {
	rank: RankEnum
	suit: SuitEnum
}

export const ALL_CARDS: Card[] = (
	Object.values(SuitEnum) as SuitEnum[]
).flatMap((suit) =>
	(Object.values(RankEnum) as RankEnum[]).map(
		(rank) => ({ rank, suit }) as Card,
	),
)

//Hand Evaluation Types
export interface EvaluatedHand {
	rank: HandRankEnum
	tiebreaker: number[]
}

//SHOWDOWN Types
export interface SHOWDOWNResult {
	player: Player
	evaluation: EvaluatedHand
}

//GameState
export interface GameState {
	players: Player[]
	deck: Card[]
	pot: number
	communityCards: Card[]
	currentPlayerIndex: number
	round: RoundEnum
	bigBlind: number
	smallBlind: number
	minBet: number
	lastRaise: number
	message: string
	winners?: Player[] // Winners of the current hand (shown during SHOWDOWN)
	tournamentWinner?: Player | null // Winner of the entire tournament (last player with chips)
	gameEnded?: boolean // Flag indicating if the game/tournament has ended
}

// Player (flattened)
export interface Player {
	id: string
	name: string
	hand: Card[]
	chips: number
	currentBet: number
	totalBet: number
	isFolded: boolean
	// Single role to align with Prisma
	role: PlayerRoleEnum
	hasActed: boolean
	isAllIn: boolean
}

export function initializePlayers(names: string[]): Player[] {
	return names.map((name, idx) => ({
		id: `${idx}`,
		name,
		hand: [],
		chips: 1000,
		currentBet: 0,
		totalBet: 0,
		isFolded: false,
		// Heads-up: dealer will also act as small blind (in logic), but role remains DEALER
		// 3+ players: dealer, small blind, big blind
		role:
			names.length === 2
				? idx === 0
					? PlayerRoleEnum.DEALER
					: PlayerRoleEnum.BIG_BLIND
				: idx === 0
					? PlayerRoleEnum.DEALER
					: idx === 1
						? PlayerRoleEnum.SMALL_BLIND
						: idx === 2
							? PlayerRoleEnum.BIG_BLIND
							: PlayerRoleEnum.NO_ROLE,
		hasActed: false,
		isAllIn: false,
	}))
}

export interface Action {
	playerId: string
	type: PlayerActionEnum
	amount?: number
}

//Betting Types
export interface ActionValidation {
	isValid: boolean
	reason?: string
	allowedActions: PlayerActionEnum[]
	minRaise?: number
	callAmount?: number
}

export interface SidePot {
	amount: number
	eligiblePlayers: Player[]
}

export interface Pot {
	id: string
	amount: number
	eligiblePlayers: Player[]
	isMainPot: boolean
	maxContribution: number
}

export interface PotDistribution {
	player: Player
	amount: number
	potId: string
	rank?: string
}

export interface PotResult {
	distributions: PotDistribution[]
	totalDistributed: number
	message: string
}

// Component Props Types
export interface PlayerLayoutProps {
	players: Player[]
	// ID of the currently acting player (TURN owner)
	currentPlayerId: string
	// ID of the local viewer; used to anchor them at the bottom seat
	viewerPlayerId: string
	// Username of the local viewer; fallback to identify the viewer seat when ids aren't mapped yet
	viewerUsername?: string
	// Optional: the viewer's hole cards from the database, used to align UI with server state
	viewerCards?: Card[]
	currentRound: RoundEnum
	winners: Player[]
	processPlayerAction: (
		playerId: string,
		action: PlayerActionEnum,
		amount?: number,
	) => void
	handleRaiseAmountChange: (playerId: string, amount: string) => void
	checkAndAdvanceGame: () => void
	finishHand: () => Promise<void>
	raiseAmount: { [playerId: string]: number }
	pokerGame: PokerGame | null
}

// Merged Game Room / Page State

// Game Hook Types
export interface GameRoomHook {
	game: GameRoom | null
	isConnected: boolean
	error: string | null
}

export interface GameHookState {
	game: GameRoom | null
	isLoading: boolean
	currentRound: RoundEnum
	winners: Player[]
	error: string | null
}

// Game Room Types
export interface GameRoomPlayer extends Player {
	isConnected: boolean
	lastSeen: Date
	seatNumber: number
}

// Lightweight DB/API player shapes used outside the core engine
export interface DbPlayerLite {
	id: string
	username: string
}

export interface RoomPlayerApi {
	id: string
	username: string
	seatNumber?: number
	firstCard?: string | null
	secondCard?: string | null
	role?: string // "DEALER" | "SMALL_BLIND" | "BIG_BLIND" | "VIEWER" | ""
}

export interface GameRoom {
	id: string
	name: string
	round: RoundEnum
	communityCards: Card[]
	pot: number
	currentPlayerIndex: number
	bigBlind: number
	smallBlind: number
	minBet: number
	lastRaise: number
	playerMax: number
	playerCount: number
	players: GameRoomPlayer[]
	gameStarted: boolean
	// merged UI/client state
	winners?: Player[]
	message?: string
	pokerGame?: PokerGame | null
	gameLog?: string[]
	currentHand?: number
	// merged base state bits
	error?: string | null
	status: GameStatusEnum
	lastUpdate: Date
	tournamentWinner?: Player | null
	gameEnded?: boolean
}

export interface LeaveRoomOptions {
	autoFold: boolean // Whether to automatically fold the player's hand
	removeFromRoom: boolean // Whether to remove player from room entirely
	rejoinAllowed: boolean // Whether the player can rejoin this hand
}

// Shared Component Types
export interface PlayerInfo {
	bestHand: string
	positions: PositionEnum[]
	currentBet: number
	totalChips: number
	isActive: boolean
}

// UI Component Types
export interface BaseCardProps {
	processPlayerAction: (
		playerId: string,
		action: PlayerActionEnum,
		amount?: number,
	) => void
	handleRaiseAmountChange: (playerId: string, amount: string) => void
	raiseAmount: { [playerId: string]: number }
	player: Player
	showActions: boolean
	validation?: ActionValidation
	playerInfo: PlayerInfo
}

export interface PlayerCardsProps extends BaseCardProps {
	isCurrentPlayer: boolean
}

export interface OpponentsCardsProps extends BaseCardProps {
	currentRound: RoundEnum
	winners: Player[]
}

export interface CommunityCardsProps {
	cards: Card[]
}

// Internal Game Management Types
export interface InternalGameRoom {
	id: string
	game: PokerGame
	players: Map<string, Player>
	lastUpdate: number
}

// API Route Context Types
// Generic route context matching Next.js (App Router) dynamic route params
export type RouteParams<T extends Record<string, string> = { id: string }> =
	Promise<T>

export interface RouteContext<
	T extends Record<string, string> = { id: string },
> {
	params: RouteParams<T>
}

// Monte Carlo Simulation Types
export interface HandStrengthResult {
	handRank: HandRankEnum
	count: number
	percentage: number
}

export interface PredictionResult {
	winRate: number
	tieRate: number
	loseRate: number
	handStrengths: HandStrengthResult[]
	opponentHandStrengths: HandStrengthResult[]
	totalSimulations: number
}

// SSE Connection Management Types
export interface ConnectionInfo {
	controller: AbortController
	startTime: number
	lastActivity: number
	clientInfo?: string
	roomId: string
}

export interface ConnectionMetrics {
	totalCreated: number
	currentActive: number
	totalClosed: number
	totalErrors: number
	averageConnectionDuration: number
}

export interface HealthStatus {
	status: string
	uptime: number
	connections: {
		active: number
		rooms: number
		errors: number
		averageDuration: number
	}
	memory: NodeJS.MemoryUsage
}

// Validation Types
export interface RateLimitConfig {
	windowMs: number // Time window in milliseconds
	maxRequests: number // Max requests per window
	skipSuccessfulRequests?: boolean
	skipFailedRequests?: boolean
	cleanupIntervalMs?: number // How often to clean up old entries
}

export interface RateLimitResult {
	isLimited: boolean
	resetTime?: number
	remainingRequests?: number
}
