//lib/GameEngine.ts
import {
	Player,
	GameState,
	Action,
	ActionValidation,
	Pot,
	PotResult,
	PotDistribution,
	Card,
	EvaluatedHand,
	SHOWDOWNResult,
} from "@/common/interface"
import { PlayerActions } from "./PlayerActions"
import {
	RoundEnum,
	RankEnum,
	PlayerActionEnum,
	HandRankEnum,
	PlayerRoleEnum,
} from "@/common/enum"
import { GAME_MESSAGES } from "@/common/label"

/**
 * Core game engine for Texas Hold'em poker
 * Handles betting rounds, pot management, and game flow
 */
export class GameEngine {
	// Static property to accumulate persistent logs
	private static gameLog: string[] = []
	private static readonly MAX_LOG_ENTRIES = 100

	/**
	 * Adds a message to the persistent game log
	 */
	public static addToGameLog(message: string): void {
		const timestamp = new Date().toLocaleTimeString()
		const logEntry = `[${timestamp}] ${message}`
		GameEngine.gameLog.push(logEntry)
		console.log(logEntry)

		// Keep only last MAX_LOG_ENTRIES to prevent memory issues
		if (GameEngine.gameLog.length > GameEngine.MAX_LOG_ENTRIES) {
			GameEngine.gameLog = GameEngine.gameLog.slice(-GameEngine.MAX_LOG_ENTRIES)
		}
	}

	/**
	 * Gets the full game log
	 */
	public static getGameLog(): string[] {
		return [...GameEngine.gameLog]
	}

	/**
	 * Clears the game log (only call when starting a completely new game)
	 */
	public static clearGameLog(): void {
		GameEngine.gameLog = []
	}
	/**
	 * Validates if a player action is legal in the current game state
	 */
	public static validatePlayerAction(
		gameState: GameState,
		action: Action,
	): ActionValidation {
		return PlayerActions.validatePlayerAction(gameState, action)
	}

	/**
	 * Processes a validated player action and updates game state
	 */
	public static processValidatedAction(
		gameState: GameState,
		action: Action,
	): void {
		PlayerActions.processValidatedAction(gameState, action)
	}

	/**
	 * Checks if the current betting round is complete
	 */
	public static isBettingRoundComplete(gameState: GameState): boolean {
		const activePlayers = GameEngine.getActivePlayers(gameState)
		const playersInUIAction = GameEngine.getPlayersInUIAction(gameState)
		const playersWhoCanBet = activePlayers.filter((p) => !p.isAllIn)

		// If only one or no players can make betting actions (excluding all-in players)
		if (playersWhoCanBet.length <= 1) {
			// Check if all non-all-in players have acted
			const nonAllInPlayers = playersInUIAction.filter((p) => !p.isAllIn)
			const allNonAllInHaveActed = nonAllInPlayers.every((p) => p.hasActed)
			return allNonAllInHaveActed
		}

		// All players must have acted (including all-in players who can still fold/check)
		const allHaveActed = playersInUIAction.every((p) => p.hasActed)
		if (!allHaveActed) {
			return false
		}

		// All bets must be equal (or player is all-in)
		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		const allBetsEqual = activePlayers.every(
			(p) => p.currentBet === highestBet || p.isAllIn,
		)

		return allBetsEqual
	}

	/**
	 * Advances to the next round of the game
	 */
	public static advanceToNextRound(gameState: GameState): void {
		// Check if betting round is complete with detailed debugging
		const activePlayers = GameEngine.getActivePlayers(gameState)
		const playersInUIAction = GameEngine.getPlayersInUIAction(gameState)
		const playersWhoCanBet = activePlayers.filter((p) => !p.isAllIn)
		const allHaveActed = playersInUIAction.every((p) => p.hasActed)
		const isBettingComplete = GameEngine.isBettingRoundComplete(gameState)

		GameEngine.addToGameLog(`=== ROUND ADVANCE CHECK (${gameState.round}) ===`)
		GameEngine.addToGameLog(
			`BettingComplete=${isBettingComplete}, AllHaveActed=${allHaveActed}, ActivePlayers=${activePlayers.length}, PlayersWhoCanBet=${playersWhoCanBet.length}, PlayersInUIAction=${playersInUIAction.length}`,
		)

		if (!isBettingComplete) {
			const unactedPlayers = playersInUIAction
				.filter((p) => !p.hasActed)
				.map((p) => `${p.name}(allIn:${p.isAllIn})`)
				.join(", ")
			GameEngine.addToGameLog(`Players who haven't acted: ${unactedPlayers}`)
			throw new Error(GAME_MESSAGES.BETTING_NOT_COMPLETE)
		}

		// Collect bets to pot
		GameEngine.collectBets(gameState)

		// Reset betting round
		GameEngine.resetBettingRound(gameState)

		const activePlayersForNextRound = GameEngine.getActivePlayers(gameState)

		if (activePlayersForNextRound.length <= 1) {
			gameState.round = RoundEnum.SHOWDOWN
			gameState.message = GAME_MESSAGES.HAND_COMPLETE_ONE_PLAYER
			GameEngine.addToGameLog(
				`=== HAND COMPLETE - ONLY ONE PLAYER REMAINING ===`,
			)
			return
		}

		// Advance to next round
		switch (gameState.round) {
			case RoundEnum.PREFLOP:
				gameState.round = RoundEnum.FLOP
				gameState.message = GAME_MESSAGES.MOVING_TO_FLOP
				GameEngine.addToGameLog(`=== ADVANCING TO FLOP ===`)
				// Set first player for post-FLOP action
				GameEngine.setPostFLOPFirstPlayer(gameState)
				break
			case RoundEnum.FLOP:
				gameState.round = RoundEnum.TURN
				gameState.message = GAME_MESSAGES.MOVING_TO_TURN
				GameEngine.addToGameLog(`=== ADVANCING TO TURN ===`)
				// Set first player for post-FLOP action
				GameEngine.setPostFLOPFirstPlayer(gameState)
				break
			case RoundEnum.TURN:
				gameState.round = RoundEnum.RIVER
				gameState.message = GAME_MESSAGES.MOVING_TO_RIVER
				GameEngine.addToGameLog(`=== ADVANCING TO RIVER ===`)
				// Set first player for post-FLOP action
				GameEngine.setPostFLOPFirstPlayer(gameState)
				break
			case RoundEnum.RIVER:
				gameState.round = RoundEnum.CARD_REVEAL
				gameState.message = "Revealing all cards..."
				GameEngine.addToGameLog(`=== ADVANCING TO CARD_REVEAL ===`)
				break
			default:
				throw new Error(`Cannot advance from round: ${gameState.round}`)
		}
	}

	/**
	 * Resets betting round state for all players
	 */
	public static resetBettingRound(gameState: GameState): void {
		gameState.players.forEach((player) => {
			// Reset hasActed for all players at the start of each betting round
			// This allows all-in players from previous rounds to make fold/check decisions
			// But players who went all-in in the current round don't need to act again
			player.hasActed = false
		})

		gameState.minBet = gameState.bigBlind
		gameState.lastRaise = gameState.bigBlind
	}

	/**
	 * Collects all current bets into the pot
	 */
	public static collectBets(gameState: GameState): void {
		// Current bets are already added to pot during action processing
		// This just resets the current bets
		gameState.players.forEach((player) => {
			player.currentBet = 0
		})
	}

	/**
	 * Gets all players who haven't folded and have chips or are all-in (excludes viewers)
	 */
	public static getActivePlayers(gameState: GameState): Player[] {
		return gameState.players.filter(
			(p) =>
				!p.isFolded &&
				(p.chips > 0 || p.isAllIn) &&
				p.role !== PlayerRoleEnum.VIEWER,
		)
	}

	/**
	 * Gets players who can still make actions (not folded, not all-in, have chips, not viewers)
	 */
	public static getPlayersInAction(gameState: GameState): Player[] {
		return gameState.players.filter(
			(p) =>
				!p.isFolded &&
				!p.isAllIn &&
				p.chips > 0 &&
				p.role !== PlayerRoleEnum.VIEWER,
		)
	}

	/**
	 * Gets players who can still take UI actions (fold/check)
	 * Includes all-in players who haven't acted yet (excludes viewers)
	 */
	public static getPlayersInUIAction(gameState: GameState): Player[] {
		return gameState.players.filter(
			(p) => !p.isFolded && p.role !== PlayerRoleEnum.VIEWER,
		)
	}

	/**
	 * Gets the highest current bet in the round
	 */
	public static getHighestCurrentBet(gameState: GameState): number {
		return PlayerActions.getHighestCurrentBet(gameState)
	}

	/**
	 * Calculates the minimum raise amount
	 */
	public static getMinimumRaise(gameState: GameState): number {
		return PlayerActions.getMinimumRaise(gameState)
	}

	/**
	 * Gets allowed actions for a specific player
	 */
	public static getAllowedActions(
		gameState: GameState,
		player: Player,
	): PlayerActionEnum[] {
		return PlayerActions.getAllowedActions(gameState, player)
	}

	/**
	 * Creates all pots (main pot and side pots) based on player contributions
	 */
	public static createAllPots(gameState: GameState): Pot[] {
		const pots: Pot[] = []
		const activePlayers = gameState.players.filter((p) => p.totalBet > 0)

		if (activePlayers.length === 0 || gameState.pot === 0) {
			return pots
		}

		// Sort players by total bet amount
		const sortedByBet = [...activePlayers].sort(
			(a, b) => a.totalBet - b.totalBet,
		)

		let currentLevel = 0
		let potIndex = 0
		let remainingPot = gameState.pot // Use actual pot amount instead of recalculating

		for (let i = 0; i < sortedByBet.length; i++) {
			const player = sortedByBet[i]
			const betLevel = player.totalBet

			if (betLevel > currentLevel && remainingPot > 0) {
				const calculatedAmount =
					(betLevel - currentLevel) * (sortedByBet.length - i)
				// Don't exceed the remaining actual pot
				const potAmount = Math.min(calculatedAmount, remainingPot)
				const eligiblePlayers = sortedByBet.slice(i).filter((p) => !p.isFolded)

				if (potAmount > 0 && eligiblePlayers.length > 0) {
					pots.push({
						id: `pot-${potIndex++}`,
						amount: potAmount,
						eligiblePlayers,
						isMainPot: i === 0,
						maxContribution: betLevel,
					})

					remainingPot -= potAmount // Subtract from remaining pot
				}

				currentLevel = betLevel
			}
		}

		// If there's still remaining pot (shouldn't happen but safety check)
		if (remainingPot > 0 && pots.length > 0) {
			// Add remaining to the main pot
			pots[0].amount += remainingPot
		}

		return pots
	}

	/**
	 * Distributes all pots to winners based on hand strength
	 */
	public static distributeAllPots(
		gameState: GameState,
		pots: Pot[],
	): PotResult {
		const distributions: PotDistribution[] = []
		let totalDistributed = 0

		for (const pot of pots) {
			const result = GameEngine.distributeSinglePot(gameState, pot)
			distributions.push(...result.distributions)
			totalDistributed += result.totalDistributed
		}

		// Clear the main pot after distribution to prevent re-distribution
		gameState.pot = 0

		return {
			distributions,
			totalDistributed,
			message: `Distributed ${totalDistributed} chips across ${pots.length} pot(s)`,
		}
	}

	/**
	 * Distributes a single pot to its winners
	 */
	public static distributeSinglePot(gameState: GameState, pot: Pot): PotResult {
		const eligiblePlayers = pot.eligiblePlayers.filter((p) => !p.isFolded)

		if (eligiblePlayers.length === 0) {
			return {
				distributions: [],
				totalDistributed: 0,
				message: "No eligible players for pot",
			}
		}

		if (eligiblePlayers.length === 1) {
			// Only one player, they get the whole pot
			const winner = eligiblePlayers[0]
			winner.chips += pot.amount

			return {
				distributions: [
					{
						player: winner,
						amount: pot.amount,
						potId: pot.id,
					},
				],
				totalDistributed: pot.amount,
				message: `${winner.name} wins ${pot.amount} (uncontested)`,
			}
		}

		// Multiple players - determine winner by hand strength
		const winners = GameEngine.SHOWDOWN(
			eligiblePlayers,
			gameState.communityCards,
		)
		const winnerShare = Math.floor(pot.amount / winners.length)
		const remainder = pot.amount % winners.length

		const distributions: PotDistribution[] = winners.map((result, index) => {
			const amount = winnerShare + (index < remainder ? 1 : 0)
			result.player.chips += amount

			return {
				player: result.player,
				amount,
				potId: pot.id,
				rank: result.evaluation.rank,
			}
		})

		return {
			distributions,
			totalDistributed: pot.amount,
			message: `Pot split between ${winners.length} player(s)`,
		}
	}

	/**
	 * Advances to the next active player (skips viewers)
	 */
	public static advanceToNextPlayer(gameState: GameState): void {
		const originalIndex = gameState.currentPlayerIndex
		let attempts = 0
		const maxAttempts = gameState.players.length

		do {
			gameState.currentPlayerIndex =
				(gameState.currentPlayerIndex + 1) % gameState.players.length
			attempts++

			if (attempts >= maxAttempts) {
				// Fallback to original index if no valid player found
				gameState.currentPlayerIndex = originalIndex
				break
			}
		} while (
			gameState.players[gameState.currentPlayerIndex].isFolded ||
			gameState.players[gameState.currentPlayerIndex].role ===
				PlayerRoleEnum.VIEWER
		)
	}

	/**
	 * Gets the next active player index (skips viewers)
	 */
	public static getNextActivePlayerIndex(gameState: GameState): number {
		let currentIndex = gameState.currentPlayerIndex
		const playerCount = gameState.players.length
		let attempts = 0

		do {
			currentIndex = (currentIndex + 1) % playerCount
			attempts++

			if (attempts >= playerCount) {
				// Fallback to current if no valid player found
				return gameState.currentPlayerIndex
			}
		} while (
			gameState.players[currentIndex].isFolded ||
			gameState.players[currentIndex].role === PlayerRoleEnum.VIEWER ||
			(gameState.players[currentIndex].chips === 0 &&
				!gameState.players[currentIndex].isAllIn)
		)

		return currentIndex
	}

	/**
	 * Sets the first player to act pre-FLOP (left of big blind)
	 */
	public static setPREFLOPFirstPlayer(gameState: GameState): void {
		const bigBlindIndex = gameState.players.findIndex(
			(p) => p.role === PlayerRoleEnum.BIG_BLIND,
		)
		if (bigBlindIndex !== -1) {
			gameState.currentPlayerIndex =
				(bigBlindIndex + 1) % gameState.players.length
		}
	}

	/**
	 * Sets the first player to act post-FLOP (by seat order, ignoring dealer/sb/bb, skips viewers)
	 */
	public static setPostFLOPFirstPlayer(gameState: GameState): void {
		GameEngine.addToGameLog(
			`=== SETTING FIRST PLAYER FOR ${gameState.round} (SEAT ORDER) ===`,
		)
		// Start from currentPlayerIndex + 1, wrap around, find first non-folded, non-viewer player
		let currentIndex =
			(gameState.currentPlayerIndex + 1) % gameState.players.length
		let attempts = 0
		while (attempts < gameState.players.length) {
			const player = gameState.players[currentIndex]
			if (!player.isFolded && player.role !== PlayerRoleEnum.VIEWER) {
				gameState.currentPlayerIndex = currentIndex
				GameEngine.addToGameLog(
					`✓ Setting currentPlayer to ${player.name} (index ${currentIndex})`,
				)
				GameEngine.addToGameLog(
					`=== FIRST PLAYER SET COMPLETE (SEAT ORDER) ===`,
				)
				return
			}
			currentIndex = (currentIndex + 1) % gameState.players.length
			attempts++
		}
		// Fallback: no non-folded player found, keep current
		GameEngine.addToGameLog(
			`No non-folded, non-viewer player found, keeping currentPlayerIndex (${gameState.currentPlayerIndex})`,
		)
	}

	/**
	 * Rotates the dealer button and updates positions (only among non-viewer players)
	 */
	public static rotateDealerButton(gameState: GameState): void {
		const activePlayers = gameState.players.filter(
			(p) => p.role !== PlayerRoleEnum.VIEWER,
		)
		const activeCount = activePlayers.length

		if (activeCount < 2) return // Not enough players to assign positions

		// Find current dealer index among active players
		let dealerIndex = activePlayers.findIndex(
			(p) => p.role === PlayerRoleEnum.DEALER,
		)
		if (dealerIndex === -1) dealerIndex = 0

		// Move dealer button to next active player
		dealerIndex = (dealerIndex + 1) % activeCount

		// Clear all position flags (but preserve VIEWER status)
		gameState.players.forEach((player) => {
			if (player.role !== PlayerRoleEnum.VIEWER) {
				player.role = PlayerRoleEnum.NO_ROLE
			}
		})

		// Set new positions among active players
		activePlayers[dealerIndex].role = PlayerRoleEnum.DEALER

		if (activeCount === 2) {
			// Heads-up: dealer posts small blind; assign big blind to the other player
			activePlayers[(dealerIndex + 1) % activeCount].role =
				PlayerRoleEnum.BIG_BLIND
		} else {
			// 3+ players: normal positions
			activePlayers[(dealerIndex + 1) % activeCount].role =
				PlayerRoleEnum.SMALL_BLIND
			activePlayers[(dealerIndex + 2) % activeCount].role =
				PlayerRoleEnum.BIG_BLIND
		}
	}

	// ===== HAND EVALUATION FUNCTIONS =====

	/**
	 * Evaluates the best possible hand from the given cards
	 */
	public static evaluateBestHand(cards: Card[]): EvaluatedHand {
		if (cards.length < 5) {
			throw new Error(GAME_MESSAGES.NEED_AT_LEAST_FIVE_CARDS)
		}
		if (cards.length > 7) {
			throw new Error(`Too many cards (${cards.length}); maximum is 7.`)
		}
		// Detect duplicates by logical identity (rank + suit)
		const seen = new Set<string>()
		for (const c of cards) {
			const key = `${c.rank}-${c.suit}`
			if (seen.has(key)) {
				throw new Error(GAME_MESSAGES.DUPLICATE_CARD)
			}
			seen.add(key)
		}

		let best: EvaluatedHand | null = null
		for (const combo of GameEngine.getCombinations(cards, 5)) {
			const e = GameEngine.evaluateFive(combo)
			if (!best || GameEngine.compareHands(e, best) > 0) best = e
		}
		return best!
	}

	/**
	 * Evaluates a 5-card hand
	 */
	public static evaluateFive(cards: Card[]): EvaluatedHand {
		const suits = cards.map((c) => c.suit)
		const isFLUSH = suits.every((s) => s === suits[0])

		const rankValues = cards
			.map((c) => GameEngine.rankToValue(c.rank))
			.sort((a, b) => b - a)
		const { isSTRAIGHT, HIGHCARD: STRAIGHTHigh } =
			GameEngine.checkSTRAIGHT(rankValues)

		const counts = new Map<number, number>()
		for (const v of rankValues) counts.set(v, (counts.get(v) || 0) + 1)
		const grouped = Array.from(counts.entries()).sort(
			(a, b) => b[1] - a[1] || b[0] - a[0],
		)

		let rank: HandRankEnum
		const tiebreaker: number[] = []

		if (isSTRAIGHT && isFLUSH) {
			rank =
				STRAIGHTHigh === 14
					? HandRankEnum.ROYALFLUSH
					: HandRankEnum.STRAIGHTFLUSH
			tiebreaker.push(STRAIGHTHigh)
		} else if (grouped[0][1] === 4) {
			rank = HandRankEnum.FOUROFKIND
			tiebreaker.push(grouped[0][0], grouped[1][0])
		} else if (grouped[0][1] === 3 && grouped[1][1] === 2) {
			rank = HandRankEnum.FULLHOUSE
			tiebreaker.push(grouped[0][0], grouped[1][0])
		} else if (isFLUSH) {
			rank = HandRankEnum.FLUSH
			tiebreaker.push(...rankValues)
		} else if (isSTRAIGHT) {
			rank = HandRankEnum.STRAIGHT
			tiebreaker.push(STRAIGHTHigh)
		} else if (grouped[0][1] === 3) {
			rank = HandRankEnum.THREEOFAKIND
			const kickers = rankValues.filter((v) => v !== grouped[0][0]).slice(0, 2)
			tiebreaker.push(grouped[0][0], ...kickers)
		} else if (grouped[0][1] === 2 && grouped[1][1] === 2) {
			const [highPair, lowPair] = [grouped[0][0], grouped[1][0]].sort(
				(a, b) => b - a,
			)
			const kicker = rankValues.find((v) => v !== highPair && v !== lowPair)!
			rank = HandRankEnum.TWOPAIR
			tiebreaker.push(highPair, lowPair, kicker)
		} else if (grouped[0][1] === 2) {
			rank = HandRankEnum.ONEPAIR
			const kickers = rankValues.filter((v) => v !== grouped[0][0]).slice(0, 3)
			tiebreaker.push(grouped[0][0], ...kickers)
		} else {
			rank = HandRankEnum.HIGHCARD
			tiebreaker.push(...rankValues)
		}

		return { rank, tiebreaker }
	}

	/**
	 * Compares two evaluated hands
	 */
	public static compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
		const hierarchy: HandRankEnum[] = [
			HandRankEnum.HIGHCARD,
			HandRankEnum.ONEPAIR,
			HandRankEnum.TWOPAIR,
			HandRankEnum.THREEOFAKIND,
			HandRankEnum.STRAIGHT,
			HandRankEnum.FLUSH,
			HandRankEnum.FULLHOUSE,
			HandRankEnum.FOUROFKIND,
			HandRankEnum.STRAIGHTFLUSH,
			HandRankEnum.ROYALFLUSH,
		]
		const diff = hierarchy.indexOf(a.rank) - hierarchy.indexOf(b.rank)
		if (diff !== 0) return diff
		for (let i = 0; i < a.tiebreaker.length; i++) {
			if (a.tiebreaker[i] !== b.tiebreaker[i])
				return a.tiebreaker[i] - b.tiebreaker[i]
		}
		return 0
	}

	/**
	 * Determines the winner(s) of a poker SHOWDOWN
	 */
	public static SHOWDOWN(
		players: Player[],
		communityCards: Card[],
	): SHOWDOWNResult[] {
		if (communityCards.length < 3 || communityCards.length > 5) {
			throw new Error(GAME_MESSAGES.COMMUNITY_CARDS_INVALID_COUNT)
		}

		const contenders = players.filter((p) => !p.isFolded)
		if (contenders.length === 0) {
			throw new Error(GAME_MESSAGES.NO_SHOWDOWN_PLAYERS)
		}

		const results: SHOWDOWNResult[] = contenders.map((p) => {
			if (p.hand.length !== 2) {
				throw new Error(`Player ${p.id} does not have exactly 2 hole cards.`)
			}
			const allCards = [...p.hand, ...communityCards]
			const evaluation = GameEngine.evaluateBestHand(allCards)
			return { player: p, evaluation }
		})

		let bestEval = results[0].evaluation
		for (const r of results.slice(1)) {
			if (GameEngine.compareHands(r.evaluation, bestEval) > 0) {
				bestEval = r.evaluation
			}
		}

		return results.filter(
			(r) => GameEngine.compareHands(r.evaluation, bestEval) === 0,
		)
	}

	// ===== PRIVATE HELPER FUNCTIONS =====

	/**
	 * Converts a rank to its numeric value
	 */
	private static rankToValue(r: RankEnum): number {
		switch (r) {
			case RankEnum.R2:
				return 2
			case RankEnum.R3:
				return 3
			case RankEnum.R4:
				return 4
			case RankEnum.R5:
				return 5
			case RankEnum.R6:
				return 6
			case RankEnum.R7:
				return 7
			case RankEnum.R8:
				return 8
			case RankEnum.R9:
				return 9
			case RankEnum.R10:
				return 10
			case RankEnum.J:
				return 11
			case RankEnum.Q:
				return 12
			case RankEnum.K:
				return 13
			case RankEnum.A:
				return 14
		}
	}

	/**
	 * Checks if ranks form a STRAIGHT
	 */
	private static checkSTRAIGHT(ranks: number[]): {
		isSTRAIGHT: boolean
		HIGHCARD: number
	} {
		const u = Array.from(new Set(ranks)).sort((a, b) => b - a)
		for (let i = 0; i + 4 < u.length; i++) {
			if (u[i] - u[i + 4] === 4) return { isSTRAIGHT: true, HIGHCARD: u[i] }
		}
		if ([14, 5, 4, 3, 2].every((x) => u.includes(x)))
			return { isSTRAIGHT: true, HIGHCARD: 5 }
		return { isSTRAIGHT: false, HIGHCARD: 0 }
	}

	/**
	 * Gets all combinations of k elements from an array
	 */
	private static getCombinations<T>(arr: T[], k: number): T[][] {
		if (k === 0) return [[]]
		if (arr.length < k) return []
		const [first, ...rest] = arr
		return [
			...GameEngine.getCombinations(rest, k),
			...GameEngine.getCombinations(rest, k - 1).map((c) => [first, ...c]),
		]
	}
}
