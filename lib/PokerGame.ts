import {
	Player,
	GameState,
	Action,
	ActionValidation,
	Pot,
	Card,
	initializePlayers,
} from "@/common/interface"
import { Deck } from "./Deck"
import {
	RoundEnum,
	PlayerActionEnum,
	PositionEnum,
	PlayerRoleEnum,
} from "@/common/enum"
import { GAME_CONFIG } from "@/common/constant"
import { GAME_MESSAGES, VALIDATION_ERRORS } from "@/common/label"
import { GameEngine } from "./GameEngine"

/**
 * Main Poker Game class that orchestrates Texas Hold'em gameplay
 * Uses GameEngine for core logic and manages high-level game flow
 */
export class PokerGame {
	private gameState: GameState
	private handNumber: number = 0

	constructor(playerNames: string[]) {
		if (
			playerNames.length < GAME_CONFIG.MIN_PLAYERS ||
			playerNames.length > GAME_CONFIG.MAX_PLAYERS
		) {
			throw new Error(VALIDATION_ERRORS.INVALID_PLAYER_COUNT)
		}

		const players = initializePlayers(playerNames)
		this.gameState = this.initializeGame(players)
	}

	// ===== GAME INITIALIZATION =====

	/**
	 * Initializes a new game state
	 */
	private initializeGame(players: Player[]): GameState {
		const initialBigBlind = 20
		const initialSmallBlind = 10
		const initialChips = 1000

		// Initialize players with proper starting values
		const initializedPlayers = players.map((player, idx) => ({
			...player,
			chips: initialChips,
			currentBet: 0,
			totalBet: 0,
			isFolded: false,
			isAllIn: false,
			hasActed: false,
			hand: [],
			// Single role aligned with PlayerRoleEnum
			role:
				players.length === 2
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
		}))

		const newDeck = new Deck()
		newDeck.reset()
		newDeck.shuffle()

		return {
			players: initializedPlayers,
			deck: newDeck.getRemainingCards(),
			pot: 0,
			communityCards: [],
			currentPlayerIndex: 0,
			round: RoundEnum.PREFLOP,
			bigBlind: initialBigBlind,
			smallBlind: initialSmallBlind,
			minBet: initialBigBlind,
			lastRaise: initialBigBlind,
			message: GAME_MESSAGES.GAME_INITIALIZED_READY,
			winners: [], // Initialize empty winners array
		}
	}

	// ===== HAND MANAGEMENT =====

	/**
	 * Start a new hand
	 */
	public startNewHand(): GameState {
		// Check if tournament is over before starting new hand
		if (this.hasTournamentWinner()) {
			const winner = this.getTournamentWinner()
			const tournamentStatus = this.getTournamentStatus()

			console.log(
				`🏆 TOURNAMENT WINNER DECLARED (before new hand): ${winner?.name}`,
			)
			console.log("Final Tournament Status:", tournamentStatus)

			this.gameState.tournamentWinner = winner
			this.gameState.gameEnded = true
			this.gameState.message = `🏆 ${winner?.name} wins the tournament! 🏆`
			return this.gameState
		}

		this.handNumber++

		const deck = new Deck()
		deck.reset()
		deck.shuffle()

		// Clear winners from previous hand but keep tournament state
		this.gameState.winners = []

		// Setup new hand
		this.setupNewHand(deck)

		// Place blinds
		this.placeBlinds()

		// Deal hole cards
		this.dealHoleCards(deck)

		// Set round to PREFLOP and set first player
		this.gameState.round = RoundEnum.PREFLOP
		GameEngine.setPREFLOPFirstPlayer(this.gameState)

		return this.gameState
	}

	/**
	 * Sets up a new hand, including shuffling the deck and clearing player hands/pots
	 */
	private setupNewHand(deck: Deck): void {
		// Clear previous hand data
		this.gameState.pot = 0
		this.gameState.communityCards = []
		this.gameState.minBet = this.gameState.bigBlind
		this.gameState.lastRaise = this.gameState.bigBlind
		this.gameState.deck = deck.getRemainingCards()

		// Handle players with 0 chips - convert them to viewers
		this.handlePlayerElimination()

		// Reset player states for active players only
		this.gameState.players.forEach((player) => {
			player.hand = []
			player.currentBet = 0
			player.totalBet = 0
			player.isFolded = false
			player.hasActed = false
			player.isAllIn = false
			// Don't reset viewer status - keep viewers as viewers
		})

		// Rotate positions (only among non-viewer players)
		GameEngine.rotateDealerButton(this.gameState)

		this.gameState.message = GAME_MESSAGES.NEW_HAND_STARTED
	}

	/**
	 * Handles players who have run out of chips by converting them to viewers
	 */
	private handlePlayerElimination(): void {
		let eliminatedCount = 0

		this.gameState.players.forEach((player) => {
			if (player.chips === 0 && player.role !== PlayerRoleEnum.VIEWER) {
				player.role = PlayerRoleEnum.VIEWER
				player.isFolded = true // Viewers are automatically folded
				eliminatedCount++
				console.log(`${player.name} eliminated - became a viewer (0 chips)`)
			}
		})

		// Update message and log tournament status
		if (eliminatedCount > 0) {
			const tournamentStatus = this.getTournamentStatus()
			this.gameState.message =
				eliminatedCount === 1
					? `${eliminatedCount} player eliminated`
					: `${eliminatedCount} players eliminated`

			console.log("Tournament Status:", tournamentStatus)

			// Check if we can declare a winner
			if (tournamentStatus.canDeclareWinner) {
				const winner = this.getTournamentWinner()
				console.log(
					`🏆 Tournament Winner Detected: ${winner?.name} (${winner?.chips} chips)`,
				)
			}
		}
	}

	/**
	 * Places the small and big blinds
	 */
	private placeBlinds(): void {
		// Heads-up: dealer posts small blind; 3+ players: dedicated SMALL_BLIND role
		const isHeadsUp = this.gameState.players.length === 2
		const smallBlindPlayer = this.gameState.players.find(
			(p) =>
				p.role === PlayerRoleEnum.SMALL_BLIND ||
				(isHeadsUp && p.role === PlayerRoleEnum.DEALER),
		)
		const bigBlindPlayer = this.gameState.players.find(
			(p) => p.role === PlayerRoleEnum.BIG_BLIND,
		)

		if (smallBlindPlayer) {
			const sbAmount = Math.min(
				smallBlindPlayer.chips,
				this.gameState.smallBlind,
			)
			smallBlindPlayer.currentBet = sbAmount
			smallBlindPlayer.totalBet = sbAmount
			smallBlindPlayer.chips -= sbAmount
			this.gameState.pot += sbAmount

			if (smallBlindPlayer.chips === 0) {
				smallBlindPlayer.isAllIn = true
			}
		}

		if (bigBlindPlayer) {
			const bbAmount = Math.min(bigBlindPlayer.chips, this.gameState.bigBlind)
			bigBlindPlayer.currentBet = bbAmount
			bigBlindPlayer.totalBet = bbAmount
			bigBlindPlayer.chips -= bbAmount
			this.gameState.pot += bbAmount

			if (bigBlindPlayer.chips === 0) {
				bigBlindPlayer.isAllIn = true
			}
		}

		this.gameState.message = GAME_MESSAGES.BLINDS_POSTED
	}

	/**
	 * Deals hole cards to each player (excludes viewers)
	 */
	private dealHoleCards(deck: Deck): void {
		const activePlayers = this.gameState.players.filter(
			(p) =>
				(p.chips > 0 || p.totalBet > 0) && p.role !== PlayerRoleEnum.VIEWER,
		)
		deck.dealToPlayers(activePlayers)
		this.gameState.deck = deck.getRemainingCards()
		this.gameState.message = GAME_MESSAGES.HOLE_CARDS_DEALT
	}

	// ===== COMMUNITY CARDS =====

	/**
	 * Deal community cards (FLOP, TURN, or RIVER)
	 */
	public dealCommunityCards(count: number): GameState {
		// Use the existing deck from game state
		const deck = new Deck()
		deck.setCards(this.gameState.deck) // Restore deck state

		if (count === 3 && this.gameState.communityCards.length === 0) {
			// Deal FLOP
			const FLOPCards = deck.dealFLOP()
			this.gameState.communityCards.push(...FLOPCards)
			this.gameState.message = GAME_MESSAGES.FLOP_DEALT
		} else if (count === 1) {
			// Deal TURN or RIVER
			if (this.gameState.communityCards.length === 3) {
				const TURNCards = deck.dealTURN()
				this.gameState.communityCards.push(...TURNCards)
				this.gameState.message = GAME_MESSAGES.TURN_DEALT
			} else if (this.gameState.communityCards.length === 4) {
				const RIVERCards = deck.dealRIVER()
				this.gameState.communityCards.push(...RIVERCards)
				this.gameState.message = GAME_MESSAGES.RIVER_DEALT
			}
		}

		this.gameState.deck = deck.getRemainingCards()
		// Note: resetBettingRound and setPostFLOPFirstPlayer are called by GameEngine.advanceToNextRound()
		// Don't call them here to avoid conflicts

		return this.gameState
	}

	// ===== ACTION VALIDATION & PROCESSING =====

	/**
	 * Validates if a player action is legal in the current game state
	 */
	public validatePlayerAction(action: Action): ActionValidation {
		// Check if hand is already over due to automatic win
		if (this.shouldHandEndEarly()) {
			return {
				isValid: false,
				reason: "Hand is already complete - only one player remains",
				allowedActions: [],
			}
		}

		return GameEngine.validatePlayerAction(this.gameState, action)
	}

	/**
	 * Process a player action (for interactive play)
	 */
	public processAction(action: Action): {
		success: boolean
		message: string
		gameState: GameState
	} {
		// Check for automatic win BEFORE processing any action
		const autoWin = this.handleAutomaticWin()
		if (autoWin) {
			return {
				success: true,
				message: autoWin.message,
				gameState: this.gameState,
			}
		}

		// Validate the action
		const validation = this.validatePlayerAction(action)

		if (!validation.isValid) {
			return {
				success: false,
				message: validation.reason || GAME_MESSAGES.INVALID_ACTION,
				gameState: this.gameState,
			}
		}

		// Process the action
		GameEngine.processValidatedAction(this.gameState, action)

		// Check for automatic win again after processing fold actions
		if (action.type === PlayerActionEnum.Fold) {
			const autoWinAfterFold = this.handleAutomaticWin()
			if (autoWinAfterFold) {
				return {
					success: true,
					message: autoWinAfterFold.message,
					gameState: this.gameState,
				}
			}
		}

		return {
			success: true,
			message: this.gameState.message,
			gameState: this.gameState,
		}
	}

	// ===== BETTING ROUND MANAGEMENT =====

	/**
	 * Checks if the current betting round is complete
	 */
	public isBettingRoundComplete(): boolean {
		// First check if only one player remains (automatic win scenario)
		if (this.shouldHandEndEarly()) {
			return true
		}

		return GameEngine.isBettingRoundComplete(this.gameState)
	}

	/**
	 * Checks if only one player remains active (hand should end)
	 */
	public shouldHandEndEarly(): boolean {
		const activePlayers = this.getActivePlayers()
		return activePlayers.length <= 1
	}

	/**
	 * Handles automatic win when only one player remains
	 */
	public handleAutomaticWin(): { winner: Player; message: string } | null {
		const activePlayers = this.getActivePlayers()

		if (activePlayers.length === 1) {
			const winner = activePlayers[0]

			// For automatic wins (all others folded), go directly to SHOWDOWN
			// Skip CARD_REVEAL phase since there's only one player
			this.gameState.round = RoundEnum.SHOWDOWN
			this.gameState.message = `${winner.name} wins by default (all others folded)!`

			// Set this player as the winner for UI display
			this.gameState.winners = [winner]

			return {
				winner,
				message: this.gameState.message,
			}
		} else if (activePlayers.length === 0) {
			// This shouldn't happen, but handle it gracefully
			this.gameState.round = RoundEnum.SHOWDOWN
			this.gameState.message = "Hand ended with no active players"
			return null
		}

		return null
	}

	/**
	 * Advances to the next round of the game
	 */
	public advanceToNextRound(): GameState {
		// Check for automatic win before advancing
		const autoWin = this.handleAutomaticWin()
		if (autoWin) {
			return this.gameState
		}

		GameEngine.advanceToNextRound(this.gameState)
		return this.gameState
	}

	// ===== PLAYER MANAGEMENT =====

	/**
	 * Gets all players who haven't folded and have chips or are all-in (excludes viewers)
	 */
	public getActivePlayers(): Player[] {
		return GameEngine.getActivePlayers(this.gameState).filter(
			(p) => !PokerGame.isViewer(p),
		)
	}

	/**
	 * Gets players who can still make actions (not folded, not all-in, have chips)
	 */
	public getPlayersInAction(): Player[] {
		return GameEngine.getPlayersInAction(this.gameState)
	}

	/**
	 * Gets players who can still take UI actions (fold/check)
	 */
	public getPlayersInUIAction(): Player[] {
		return GameEngine.getPlayersInUIAction(this.gameState)
	}

	/**
	 * Advances to the next active player
	 */
	public advanceToNextPlayer(): void {
		GameEngine.advanceToNextPlayer(this.gameState)
	}

	/**
	 * Gets the next active player index
	 */
	public getNextActivePlayerIndex(): number {
		return GameEngine.getNextActivePlayerIndex(this.gameState)
	}

	// ===== POT MANAGEMENT =====

	/**
	 * Creates all pots (main pot and side pots) based on player contributions
	 */
	public createAllPots(): Pot[] {
		return GameEngine.createAllPots(this.gameState)
	}

	/**
	 * Determines the winner(s) of the hand
	 */
	public determineWinner(): Player[] {
		const activePlayers = this.getActivePlayers()
		if (activePlayers.length <= 1) {
			return activePlayers
		}

		// If community cards aren't fully dealt (automatic win scenario),
		// just return the active players as winners
		if (this.gameState.communityCards.length < 3) {
			return activePlayers
		}

		const winners = GameEngine.SHOWDOWN(
			activePlayers,
			this.gameState.communityCards,
		)
		return winners.map((result) => result.player)
	}

	/**
	 * Distributes the pot to the winner(s)
	 */
	public distributePot(): void {
		if (this.gameState.pot === 0) {
			return
		}

		const pots = this.createAllPots()
		if (pots.length === 0) {
			const fallbackWinners = this.getActivePlayers()
			if (fallbackWinners.length === 0) {
				this.gameState.pot = 0
				return
			}

			// Split pot evenly among remaining active players as a safety net
			const baseShare = Math.floor(this.gameState.pot / fallbackWinners.length)
			let remainder = this.gameState.pot % fallbackWinners.length
			fallbackWinners.forEach((player) => {
				const share = baseShare + (remainder > 0 ? 1 : 0)
				if (share > 0) {
					player.chips += share
					if (remainder > 0) remainder--
				}
			})

			if (this.gameState.round === RoundEnum.SHOWDOWN) {
				this.gameState.winners = fallbackWinners
			}

			this.gameState.message =
				fallbackWinners.length === 1
					? `${fallbackWinners[0].name} collects the pot`
					: `${fallbackWinners.map((w) => w.name).join(", ")} split the pot`
			this.gameState.pot = 0
			return
		}

		const potResult = GameEngine.distributeAllPots(this.gameState, pots)
		if (potResult.distributions.length > 0) {
			const uniqueWinners = Array.from(
				new Map(
					potResult.distributions.map((d) => [d.player.id, d.player]),
				).values(),
			)

			if (this.gameState.round === RoundEnum.SHOWDOWN) {
				this.gameState.winners = uniqueWinners
			}
		}

		if (potResult.message) {
			this.gameState.message = potResult.message
		}
	}

	/**
	 * Advances to SHOWDOWN phase with winners and distributes pot
	 * This is called after the CARD_REVEAL phase
	 */
	public advanceToShowdownWithWinners(): void {
		this.gameState.round = RoundEnum.SHOWDOWN

		// Only distribute pot if there's actually pot to distribute
		if (this.gameState.pot > 0) {
			this.distributePot()
		}

		this.gameState.message =
			this.gameState.winners && this.gameState.winners.length > 0
				? `${this.gameState.winners.map((w) => w.name).join(", ")} wins the hand!`
				: GAME_MESSAGES.HAND_COMPLETE
	}

	// ===== GAME STATE ACCESSORS =====

	/**
	 * Get current game status
	 */
	public getGameStatus(): {
		handNumber: number
		round: string
		pot: number
		activePlayers: number
		currentPlayer?: Player
	} {
		const activePlayers = this.getActivePlayers()
		const currentPlayer =
			this.gameState.players[this.gameState.currentPlayerIndex]

		return {
			handNumber: this.handNumber,
			round: this.gameState.round,
			pot: this.gameState.pot,
			activePlayers: activePlayers.length,
			currentPlayer: currentPlayer?.isFolded ? undefined : currentPlayer,
		}
	}

	/**
	 * Get player information
	 */
	public getPlayers(): Player[] {
		return [...this.gameState.players]
	}

	/**
	 * Get community cards
	 */
	public getCommunityCards(): Card[] {
		return [...this.gameState.communityCards]
	}

	/**
	 * Get current game state
	 */
	public getGameState(): GameState {
		return this.gameState
	}

	/**
	 * Check if game is over (only one player with chips left)
	 */
	public isGameOver(): boolean {
		const playersWithChips = this.gameState.players.filter((p) => p.chips > 0)
		return playersWithChips.length <= 1
	}

	/**
	 * Get game winner
	 */
	public getGameWinner(): Player | null {
		if (!this.isGameOver()) return null
		return this.gameState.players.find((p) => p.chips > 0) || null
	}

	/**
	 * Check if only one player has chips left (tournament winner condition)
	 * Tournament winner condition: exactly one non-viewer with chips, all others are viewers (eliminated)
	 */
	public hasTournamentWinner(): boolean {
		// Get all non-viewer players (original tournament participants)
		const nonViewerPlayers = this.gameState.players.filter(
			(p) => p.role !== PlayerRoleEnum.VIEWER,
		)

		// Get non-viewer players with chips
		const playersWithChips = nonViewerPlayers.filter((p) => p.chips > 0)

		// Tournament winner condition: exactly one non-viewer with chips left
		// AND there must be at least 2 total players in the game originally
		return playersWithChips.length === 1 && this.gameState.players.length >= 2
	}

	/**
	 * Get tournament winner (last player with chips)
	 */
	public getTournamentWinner(): Player | null {
		if (!this.hasTournamentWinner()) return null

		// Find the last non-viewer player with chips
		const winner = this.gameState.players.find(
			(p) => p.chips > 0 && p.role !== PlayerRoleEnum.VIEWER,
		)

		return winner || null
	}

	/**
	 * Check if a player is a viewer
	 */
	public static isViewer(player: Player): boolean {
		return player.role === PlayerRoleEnum.VIEWER
	}

	/**
	 * Get tournament status information for debugging
	 */
	public getTournamentStatus(): {
		totalPlayers: number
		viewerCount: number
		activePlayersCount: number
		playersWithChips: number
		canDeclareWinner: boolean
	} {
		const totalPlayers = this.gameState.players.length
		const viewers = this.gameState.players.filter(
			(p) => p.role === PlayerRoleEnum.VIEWER,
		)
		const nonViewers = this.gameState.players.filter(
			(p) => p.role !== PlayerRoleEnum.VIEWER,
		)
		const playersWithChips = nonViewers.filter((p) => p.chips > 0)

		return {
			totalPlayers,
			viewerCount: viewers.length,
			activePlayersCount: nonViewers.length,
			playersWithChips: playersWithChips.length,
			canDeclareWinner: this.hasTournamentWinner(),
		}
	}

	/**
	 * Get all viewer players
	 */
	public getViewerPlayers(): Player[] {
		return this.gameState.players.filter((p) => PokerGame.isViewer(p))
	}

	// ===== UTILITY METHODS =====

	/**
	 * Print current player chip counts
	 */
	public printPlayerChips(): void {
		console.log("Player Chip Counts:")
		this.gameState.players.forEach((player) => {
			const pos =
				player.role === PlayerRoleEnum.DEALER
					? " (D)"
					: player.role === PlayerRoleEnum.SMALL_BLIND
						? " (SB)"
						: player.role === PlayerRoleEnum.BIG_BLIND
							? " (BB)"
							: ""
			console.log(`  ${player.name}: ${player.chips} chips${pos}`)
		})
	}

	/**
	 * Print detailed game state (for debugging)
	 */
	public printGameState(): void {
		console.log(`\n=== Hand ${this.handNumber} - ${this.gameState.round} ===`)
		console.log(`Pot: ${this.gameState.pot}`)
		console.log(
			`Community Cards: ${this.gameState.communityCards
				.map((c) => `${c.rank}${c.suit}`)
				.join(", ")}`,
		)
		console.log(
			`Current Player: ${
				this.gameState.players[this.gameState.currentPlayerIndex]?.name
			}`,
		)
		console.log("Players:")
		this.gameState.players.forEach((player, idx) => {
			const position: PositionEnum[] = []
			if (player.role === PlayerRoleEnum.DEALER)
				position.push(PositionEnum.Dealer)
			if (player.role === PlayerRoleEnum.SMALL_BLIND)
				position.push(PositionEnum.SmallBlind)
			if (player.role === PlayerRoleEnum.BIG_BLIND)
				position.push(PositionEnum.BigBlind)

			console.log(
				`  ${idx === this.gameState.currentPlayerIndex ? ">" : " "} ${
					player.name
				}: ${player.chips} chips, bet: ${player.currentBet}, total: ${
					player.totalBet
				} ${position.length ? `(${position.join(",")})` : ""} ${
					player.isFolded ? "[FOLDED]" : ""
				} ${player.isAllIn ? "[ALL-IN]" : ""} ${
					player.hasActed ? "[ACTED]" : ""
				}`,
			)
		})
	}
}

/**
 * Quick demo function
 */
export function runPokerDemo(): void {
	console.log("🃏 Texas Hold'em Poker Engine Demo")

	const playerNames = ["Alice", "Bob", "Charlie", "Diana"]
	const game = new PokerGame(playerNames)

	console.log("Initial setup:")
	game.printPlayerChips()

	// Run a few hands
	for (let i = 0; i < 3; i++) {
		console.log(`\n--- Starting Hand ${i + 1} ---`)
		game.startNewHand()
		game.printGameState()

		// Auto-play a simple betting round (everyone checks)
		const players = game.getPlayersInAction()
		for (const player of players) {
			const validation = game.validatePlayerAction({
				playerId: player.id,
				type: PlayerActionEnum.Check,
			})

			if (validation.isValid) {
				game.processAction({
					playerId: player.id,
					type: PlayerActionEnum.Check,
				})
			}
		}

		if (game.isBettingRoundComplete()) {
			game.advanceToNextRound()
		}
	}

	console.log("\nDemo completed!")
}
