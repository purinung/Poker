import {
	Player,
	Card as PlayingCard,
	ActionValidation,
} from "@/common/interface"
import { GameEngine } from "./GameEngine"
import { RoundEnum, PlayerActionEnum } from "@/common/enum"
import { PokerGame } from "./PokerGame"
import { GAME_UTILS_CONFIG as GAME_CONFIG } from "@/common/constant"
import { UI_LABELS } from "@/common/label"

// ===== CONSTANTS AND CONFIGURATION =====

export const POKER_RULES = {
	BETTING_ROUNDS: [
		RoundEnum.PREFLOP,
		RoundEnum.FLOP,
		RoundEnum.TURN,
		RoundEnum.RIVER,
	] as const,

	COMMUNITY_CARDS: {
		FLOP: 3,
		TURN: 1,
		RIVER: 1,
	},
}

// Compact round flow configuration keyed by enum to minimize branching code
type RoundFlow = {
	next?: RoundEnum
	dealCount: number
	advanceMsg?: string
	dealtMsg?: string
}

const ROUND_FLOW: Record<RoundEnum, RoundFlow> = {
	[RoundEnum.PreRoundBetting]: {
		next: RoundEnum.PREFLOP,
		dealCount: 0,
		advanceMsg: GAME_CONFIG.MESSAGES.ADVANCING_TO_FLOP,
	},
	[RoundEnum.PREFLOP]: {
		next: RoundEnum.FLOP,
		dealCount: 0,
		advanceMsg: GAME_CONFIG.MESSAGES.ADVANCING_TO_FLOP,
	},
	[RoundEnum.FLOP]: {
		next: RoundEnum.TURN,
		dealCount: 3,
		advanceMsg: GAME_CONFIG.MESSAGES.ADVANCING_TO_TURN,
		dealtMsg: GAME_CONFIG.MESSAGES.FLOP_DEALT,
	},
	[RoundEnum.TURN]: {
		next: RoundEnum.RIVER,
		dealCount: 1,
		advanceMsg: GAME_CONFIG.MESSAGES.ADVANCING_TO_RIVER,
		dealtMsg: GAME_CONFIG.MESSAGES.TURN_DEALT,
	},
	[RoundEnum.RIVER]: {
		next: RoundEnum.CARD_REVEAL,
		dealCount: 1,
		dealtMsg: GAME_CONFIG.MESSAGES.RIVER_DEALT,
	},
	[RoundEnum.CARD_REVEAL]: {
		next: RoundEnum.SHOWDOWN,
		dealCount: 0,
	},
	[RoundEnum.SHOWDOWN]: { dealCount: 0 },
}

export const UI_STYLES = {
	PLAYER_CARD: {
		CURRENT: "",
		FOLDED: "opacity-50",
	},
}

// ===== GAME LOGIC UTILITIES =====

/**
 * Utility functions for poker game management and UI logic
 */
export class GameUtils {
	// Guard to prevent multiple simultaneous calls
	private static isAdvancing = false

	// Small helper to bump a force refresh state setter
	private static bump(setForceRefresh: (fn: (prev: number) => number) => void) {
		setForceRefresh((prev) => prev + 1)
	}

	/**
	 * Evaluates a player's best hand using their hole cards and community cards
	 */
	static evaluatePlayerHand(player: Player, communityCards: PlayingCard[]) {
		if (player.hand.length === 2 && communityCards.length >= 3) {
			try {
				const allCards = [...player.hand, ...communityCards]
				const evaluation = GameEngine.evaluateBestHand(allCards)
				return evaluation
			} catch (err) {
				console.error("Error evaluating hand:", err)
				return null
			}
		}
		return null
	}

	/**
	 * Checks if the game should advance to the next round and handles all-in scenarios
	 */
	static checkAndAdvanceGame(
		pokerGame: PokerGame,
		addLog: (message: string) => void,
		setForceRefresh: (fn: (prev: number) => number) => void,
		finishHand: () => void,
	): void {
		if (!pokerGame) return

		// Prevent multiple simultaneous calls
		if (GameUtils.isAdvancing) {
			console.log("[DEBUG] checkAndAdvanceGame already running, skipping...")
			return
		}

		GameUtils.isAdvancing = true

		try {
			// Debug logging
			const gameState = pokerGame.getGameState()
			const activePlayers = pokerGame.getActivePlayers()
			const playersInAction = pokerGame.getPlayersInAction()
			const isBettingComplete = pokerGame.isBettingRoundComplete()

			// Check which players haven't acted
			const playersWhoHaventActed = gameState.players.filter(
				(p) => !p.isFolded && !p.hasActed,
			)

			addLog(
				`DEBUG: Round=${gameState.round}, BettingComplete=${isBettingComplete}, Active=${activePlayers.length}, InAction=${playersInAction.length}, UnactedPlayers=${playersWhoHaventActed.map((p) => p.name).join(",") || "none"}`,
			)

			// If all active players are all-in (no one can act), auto-advance all rounds and reveal all community cards
			const allAllIn =
				activePlayers.length > 0 &&
				activePlayers.every((p) => p.isAllIn) &&
				playersInAction.length === 0

			// Helper to advance one round and deal, optionally continue automatically until RIVER
			const advanceAndDeal = (autoContinue: boolean) => {
				const current = pokerGame.getGameState().round as RoundEnum
				const flow = ROUND_FLOW[current]
				if (!flow) return

				// If we're at RIVER or SHOWDOWN, finish the hand
				if (current === RoundEnum.RIVER || current === RoundEnum.SHOWDOWN) {
					finishHand()
					return
				}

				GameUtils.advanceRoundAndMaybeDeal(
					pokerGame,
					addLog,
					setForceRefresh,
					() => advanceAndDeal(true),
					autoContinue,
				)
			}

			if (allAllIn) {
				addLog(
					"All players are all-in. Auto-revealing remaining community cards...",
				)
				advanceAndDeal(true)
				return
			}

			// If betting round is complete, automatically advance
			if (isBettingComplete) {
				// Check if only one player left (everyone else folded)
				if (activePlayers.length <= 1) {
					finishHand()
					return
				}

				// Advance to next round
				setTimeout(() => {
					advanceAndDeal(false)
				}, GAME_CONFIG.ROUND_ADVANCE_DELAY)
			} else {
				// If betting is not complete, just wait for players to act
				// No auto-advance even if all players are all-in - let them make fold/check decisions
			}
		} finally {
			// Reset the guard flag
			GameUtils.isAdvancing = false
		}
	}

	// Centralized round-advance + delayed deal logic
	private static advanceRoundAndMaybeDeal(
		pokerGame: PokerGame,
		addLog: (message: string) => void,
		setForceRefresh: (fn: (prev: number) => number) => void,
		continueCb: () => void,
		shouldContinue: boolean,
	) {
		const current = pokerGame.getGameState().round as RoundEnum
		const flow = ROUND_FLOW[current]
		if (!flow) return

		if (flow.advanceMsg) addLog(flow.advanceMsg)
		pokerGame.advanceToNextRound()
		GameUtils.bump(setForceRefresh)

		setTimeout(() => {
			const nextFlow = ROUND_FLOW[pokerGame.getGameState().round as RoundEnum]
			if (nextFlow?.dealCount) {
				pokerGame.dealCommunityCards(nextFlow.dealCount)
				if (nextFlow.dealtMsg) addLog(nextFlow.dealtMsg)
				GameUtils.bump(setForceRefresh)
			}
			if (shouldContinue) continueCb()
		}, GAME_CONFIG.CARD_DEAL_DELAY)
	}

	/**
	 * Processes a player action and handles game flow
	 */
	static processPlayerAction(
		pokerGame: PokerGame,
		playerId: string,
		action: string,
		amount: number | undefined,
		addLog: (message: string) => void,
		setForceRefresh: (fn: (prev: number) => number) => void,
		checkAndAdvanceGame: () => void,
	): void {
		if (!pokerGame) return

		try {
			const result = pokerGame.processAction({
				playerId,
				type: action as PlayerActionEnum,
				amount,
			})

			if (result.success) {
				const player = pokerGame.getPlayers().find((p) => p.id === playerId)
				addLog(`${player?.name} ${action}${amount ? ` $${amount}` : ""}`)
				GameUtils.bump(setForceRefresh)

				// Auto-advance to next player if there are still players who need to act
				const playersWhoCanAct = pokerGame
					.getPlayers()
					.filter((p) => !p.isFolded && !p.hasActed)
				if (playersWhoCanAct.length > 0) {
					pokerGame.advanceToNextPlayer()
					GameUtils.bump(setForceRefresh)
				}

				// Check if betting round is complete and auto-advance
				setTimeout(() => {
					checkAndAdvanceGame()
				}, GAME_CONFIG.ACTION_PROCESSING_DELAY)
			} else {
				addLog(GAME_CONFIG.MESSAGES.INVALID_ACTION(result.message))
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			addLog(GAME_CONFIG.MESSAGES.ACTION_ERROR(errorMessage))
		}
	}

	/**
	 * Finishes the current hand and starts a new one
	 */
	static finishHand(
		pokerGame: PokerGame,
		addLog: (message: string) => void,
		setForceRefresh: (fn: (prev: number) => number) => void,
		setWinners: (winners: Player[]) => void,
		setCurrentHand: (fn: (prev: number) => number) => void,
		startNewHand: () => void,
	): void {
		if (!pokerGame) return

		try {
			const gameWinners = pokerGame.determineWinner()
			setWinners(gameWinners)
			pokerGame.distributePot()
			addLog(GAME_CONFIG.MESSAGES.WINNERS(gameWinners.map((w) => w.name)))
			GameUtils.bump(setForceRefresh)

			// Show winners for 3 seconds, then start next hand
			setTimeout(() => {
				setWinners([]) // Clear winners before starting new hand
				setCurrentHand((prev) => prev + 1)
				startNewHand()
			}, GAME_CONFIG.HAND_FINISH_DELAY)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			addLog(GAME_CONFIG.MESSAGES.ERROR_FINISHING_HAND(errorMessage))
		}
	} /**
	 * Starts a new hand
	 */
	static startNewHand(
		pokerGame: PokerGame,
		currentHand: number,
		addLog: (message: string) => void,
		setWinners: (winners: Player[]) => void,
		setForceRefresh: (fn: (prev: number) => number) => void,
	): void {
		if (!pokerGame) return

		try {
			pokerGame.startNewHand()
			addLog(GAME_CONFIG.MESSAGES.HAND_STARTED(currentHand))
			setWinners([])
			GameUtils.bump(setForceRefresh)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			addLog(GAME_CONFIG.MESSAGES.ERROR_STARTING_HAND(errorMessage))
		}
	}

	/**
	 * Creates a log message with hand number
	 */
	static createLogMessage(currentHand: number, message: string): string {
		return `[Hand ${currentHand}] ${message}`
	}

	/**
	 * Handles raise amount input changes
	 */
	static handleRaiseAmountChange(
		playerId: string,
		amount: string,
		setRaiseAmount: (
			fn: (prev: { [key: string]: number }) => { [key: string]: number },
		) => void,
	): void {
		const numAmount = parseInt(amount) || 0
		setRaiseAmount((prev) => ({ ...prev, [playerId]: numAmount }))
	}
}

// ===== UI UTILITIES =====

/**
 * UI-related utility functions for the poker game
 */
export class UIUtils {
	// Centralized checks/helpers
	private static canShowForCurrent(
		player: Player | undefined,
		currentPlayer: Player | undefined,
	): boolean {
		return (
			!!player &&
			UIUtils.isCurrentPlayer(player, currentPlayer) &&
			!player.isFolded
		)
	}

	private static isCallAllowed(validation: ActionValidation): boolean {
		return validation?.allowedActions.includes(PlayerActionEnum.Call) ?? false
	}

	/**
	 * Determines if a player is the current active player
	 */
	static isCurrentPlayer(
		player: Player | undefined,
		currentPlayer: Player | undefined,
	): boolean {
		if (!player || !currentPlayer) return false
		return player.id === currentPlayer.id
	}

	/**
	 * Determines if action buttons should be shown for a player
	 */
	static shouldShowActionButtons(
		player: Player | undefined,
		currentPlayer: Player | undefined,
	): boolean {
		return UIUtils.canShowForCurrent(player, currentPlayer)
	}

	/**
	 * Gets the CSS classes for a player card
	 */
	static getPlayerCardClasses(
		player: Player | undefined,
		currentPlayer: Player | undefined,
	): string {
		if (!player) return ""
		const currentPlayerClass = UIUtils.isCurrentPlayer(player, currentPlayer)
			? UI_STYLES.PLAYER_CARD.CURRENT
			: ""
		const foldedClass = player.isFolded ? UI_STYLES.PLAYER_CARD.FOLDED : ""
		return `${currentPlayerClass} ${foldedClass}`.trim()
	}

	/**
	 * Determines if the "Your TURN" badge should be shown
	 */
	static shouldShowYourTURNBadge(
		player: Player | undefined,
		currentPlayer: Player | undefined,
	): boolean {
		return UIUtils.canShowForCurrent(player, currentPlayer)
	}

	/**
	 * Gets the validation info for a player's possible actions
	 */
	static getPlayerValidation(pokerGame: PokerGame | null, playerId: string) {
		return pokerGame?.validatePlayerAction({
			playerId,
			type: PlayerActionEnum.Check,
		})
	}

	/**
	 * Determines if the call button should be shown (only if player can afford full call)
	 */
	static shouldShowCallButton(
		validation: ActionValidation,
		player: Player,
	): boolean {
		const callAmount = validation.callAmount || 0
		return (
			UIUtils.isCallAllowed(validation) &&
			callAmount > 0 &&
			callAmount < player.chips // Player can afford full call and has chips left after call
		)
	}

	/**
	 * Determines if the all-in button should be shown (when player can't match full bet)
	 */
	static shouldShowAllInButton(
		validation: ActionValidation,
		player: Player,
	): boolean {
		const callAmount = validation.callAmount || 0
		return (
			UIUtils.isCallAllowed(validation) &&
			callAmount > 0 &&
			callAmount >= player.chips // Player doesn't have enough to make full call (or exact all-in)
		)
	}

	/**
	 * Determines if the all-in button should show the chip amount
	 */
	static shouldShowAllInChipAmount(
		validation: ActionValidation,
		player: Player,
	): boolean {
		const callAmount = validation.callAmount || 0
		return UIUtils.isCallAllowed(validation) && callAmount >= player.chips
	}

	/**
	 * Formats the all-in button text
	 */
	static formatAllInButtonText(
		validation: ActionValidation,
		player: Player,
	): string {
		return UIUtils.shouldShowAllInChipAmount(validation, player)
			? `${UI_LABELS.BADGES.ALL_IN} (${player.chips})`
			: UI_LABELS.BADGES.ALL_IN
	}

	/**
	 * Determines if the raise input should be disabled
	 */
	static isRaiseDisabled(
		raiseAmount: number | undefined,
		minRaise: number | undefined,
	): boolean {
		return !raiseAmount || raiseAmount < (minRaise || 0)
	}

	/**
	 * Formats game status information
	 */
	static formatGameStatus(
		round: string | undefined,
		pot: number | undefined,
		activePlayers: number | undefined,
	): string {
		return `Round: ${round} | Pot: $${pot} | Active Players: ${activePlayers}`
	}

	/**
	 * Formats player status information
	 */
	static formatPlayerStatus(player: Player): string {
		return `Chips: $${player.chips} | Bet: $${player.currentBet} | Total: $${player.totalBet}`
	}

	/**
	 * Formats validation information
	 */
	static formatValidationInfo(validation: ActionValidation): string {
		return `Min raise: $${validation.minRaise || 0} | Call: $${validation.callAmount || 0}`
	}

	/**
	 * Determines if the game log should auto-scroll
	 */
	static shouldAutoScrollLog(logLength: number): boolean {
		return logLength > GAME_CONFIG.MAX_LOG_DISPLAY
	}

	/**
	 * Gets the last N log entries for display
	 */
	static getDisplayLogs(
		logs: string[],
		displayCount: number = GAME_CONFIG.MAX_LOG_DISPLAY,
	): string[] {
		return logs.slice(-displayCount)
	}
}
