//lib/PlayerActions.ts
import { Player, GameState, Action, ActionValidation } from "@/common/interface"
import { PlayerActionEnum, PlayerRoleEnum } from "@/common/enum"
import { GAME_MESSAGES } from "@/common/label"

/**
 * Handles all player action validation and processing for Texas Hold'em
 * Separated from GameEngine for better organization
 */
export class PlayerActions {
	/**
	 * Validates if a player action is legal in the current game state
	 */
	public static validatePlayerAction(
		gameState: GameState,
		action: Action,
	): ActionValidation {
		const player = gameState.players.find((p) => p.id === action.playerId)

		if (!player) {
			return {
				isValid: false,
				reason: GAME_MESSAGES.PLAYER_NOT_FOUND,
				allowedActions: [],
			}
		}

		if (player.role === PlayerRoleEnum.VIEWER) {
			return {
				isValid: false,
				reason: "Viewers cannot perform game actions",
				allowedActions: [],
			}
		}

		if (player.isFolded) {
			return {
				isValid: false,
				reason: "Player has already folded",
				allowedActions: [],
			}
		}

		if (player.isAllIn) {
			// All-in players can still fold or check to continue the game flow
			const allowedActions: PlayerActionEnum[] = [
				PlayerActionEnum.Fold,
				PlayerActionEnum.Check,
			]

			switch (action.type) {
				case PlayerActionEnum.Fold:
					return {
						isValid: true,
						allowedActions,
						callAmount: 0,
						minRaise: 0,
					}
				case PlayerActionEnum.Check:
					return {
						isValid: true,
						allowedActions,
						callAmount: 0,
						minRaise: 0,
					}
				default:
					return {
						isValid: false,
						reason: "All-in players can only fold or check",
						allowedActions,
					}
			}
		}

		if (player.chips === 0) {
			return {
				isValid: false,
				reason: "Player has no chips",
				allowedActions: [],
			}
		}

		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		const callAmount = Math.max(0, highestBet - player.currentBet)
		const minRaise = PlayerActions.getMinimumRaise(gameState)

		const allowedActions = PlayerActions.getAllowedActions(gameState, player)

		switch (action.type) {
			case PlayerActionEnum.Fold:
				return PlayerActions.validateFold(allowedActions, callAmount, minRaise)

			case PlayerActionEnum.Check:
				return PlayerActions.validateCheck(callAmount, allowedActions, minRaise)

			case PlayerActionEnum.Call:
				return PlayerActions.validateCall(callAmount, allowedActions, minRaise)

			case PlayerActionEnum.Raise:
				return PlayerActions.validateRaise(
					action,
					player,
					allowedActions,
					callAmount,
					minRaise,
				)

			case PlayerActionEnum.AllIn:
				return PlayerActions.validateAllIn(allowedActions, callAmount, minRaise)

			default:
				return {
					isValid: false,
					reason: GAME_MESSAGES.UNKNOWN_ACTION_TYPE,
					allowedActions,
					callAmount,
					minRaise,
				}
		}
	}

	/**
	 * Processes a validated player action and updates game state
	 */
	public static processValidatedAction(
		gameState: GameState,
		action: Action,
	): void {
		const player = gameState.players.find((p) => p.id === action.playerId)
		if (!player) return

		switch (action.type) {
			case PlayerActionEnum.Fold:
				PlayerActions.processFold(gameState, player)
				break

			case PlayerActionEnum.Check:
				PlayerActions.processCheck(gameState, player)
				break

			case PlayerActionEnum.Call:
				PlayerActions.processCall(gameState, player)
				break

			case PlayerActionEnum.Raise:
				PlayerActions.processRaise(gameState, player, action)
				break

			case PlayerActionEnum.AllIn:
				PlayerActions.processAllIn(gameState, player)
				break
		}
	}

	// ===== ACTION VALIDATORS =====

	/**
	 * Validates a fold action
	 */
	private static validateFold(
		allowedActions: PlayerActionEnum[],
		callAmount: number,
		minRaise: number,
	): ActionValidation {
		return {
			isValid: allowedActions.includes(PlayerActionEnum.Fold),
			allowedActions,
			callAmount,
			minRaise,
		}
	}

	/**
	 * Validates a check action
	 */
	private static validateCheck(
		callAmount: number,
		allowedActions: PlayerActionEnum[],
		minRaise: number,
	): ActionValidation {
		if (callAmount > 0) {
			return {
				isValid: false,
				reason: "Cannot check when there's a bet to call",
				allowedActions,
				callAmount,
				minRaise,
			}
		}
		return {
			isValid: allowedActions.includes(PlayerActionEnum.Check),
			allowedActions,
			callAmount,
			minRaise,
		}
	}

	/**
	 * Validates a call action
	 */
	private static validateCall(
		callAmount: number,
		allowedActions: PlayerActionEnum[],
		minRaise: number,
	): ActionValidation {
		if (callAmount === 0) {
			return {
				isValid: false,
				reason: "No bet to call",
				allowedActions,
				callAmount,
				minRaise,
			}
		}
		return {
			isValid: allowedActions.includes(PlayerActionEnum.Call),
			allowedActions,
			callAmount,
			minRaise,
		}
	}

	/**
	 * Validates a raise action
	 */
	private static validateRaise(
		action: Action,
		player: Player,
		allowedActions: PlayerActionEnum[],
		callAmount: number,
		minRaise: number,
	): ActionValidation {
		if (!allowedActions.includes(PlayerActionEnum.Raise)) {
			return {
				isValid: false,
				reason: GAME_MESSAGES.RAISING_NOT_ALLOWED,
				allowedActions,
				callAmount,
				minRaise,
			}
		}

		if (!action.amount || action.amount < minRaise) {
			return {
				isValid: false,
				reason: `Raise must be at least ${minRaise}`,
				allowedActions,
				callAmount,
				minRaise,
			}
		}

		if (action.amount > player.chips + player.currentBet) {
			return {
				isValid: false,
				reason: "Raise amount exceeds available chips",
				allowedActions,
				callAmount,
				minRaise,
			}
		}

		return {
			isValid: true,
			allowedActions,
			callAmount,
			minRaise,
		}
	}

	/**
	 * Validates an all-in action
	 */
	private static validateAllIn(
		allowedActions: PlayerActionEnum[],
		callAmount: number,
		minRaise: number,
	): ActionValidation {
		return {
			isValid: allowedActions.includes(PlayerActionEnum.AllIn),
			allowedActions,
			callAmount,
			minRaise,
		}
	}

	// ===== ACTION PROCESSORS =====

	/**
	 * Processes a fold action
	 */
	private static processFold(gameState: GameState, player: Player): void {
		player.isFolded = true
		player.hasActed = true
		gameState.message = `${player.name} folds`
	}

	/**
	 * Processes a check action
	 */
	private static processCheck(gameState: GameState, player: Player): void {
		player.hasActed = true
		gameState.message = `${player.name} checks`
	}

	/**
	 * Processes a call action
	 */
	private static processCall(gameState: GameState, player: Player): void {
		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		const callAmount = Math.max(0, highestBet - player.currentBet)
		const actualCall = Math.min(callAmount, player.chips)

		player.chips -= actualCall
		player.currentBet += actualCall
		player.totalBet += actualCall
		gameState.pot += actualCall
		player.hasActed = true

		if (player.chips === 0) {
			player.isAllIn = true
			gameState.message = `${player.name} calls and is all-in`
		} else {
			gameState.message = `${player.name} calls ${actualCall}`
		}
	}

	/**
	 * Processes a raise action
	 */
	private static processRaise(
		gameState: GameState,
		player: Player,
		action: Action,
	): void {
		if (!action.amount) return

		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		const raiseTotal = Math.min(action.amount, player.chips + player.currentBet)
		const actualRaise = raiseTotal - player.currentBet

		player.chips -= actualRaise
		player.currentBet = raiseTotal
		player.totalBet += actualRaise
		gameState.pot += actualRaise
		player.hasActed = true

		// Update game state for the raise
		gameState.lastRaise = raiseTotal - highestBet
		gameState.minBet = raiseTotal

		// Reset hasActed for all other players who haven't folded
		gameState.players.forEach((p) => {
			if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
				p.hasActed = false
			}
		})

		if (player.chips === 0) {
			player.isAllIn = true
			gameState.message = `${player.name} raises to ${raiseTotal} and is all-in`
		} else {
			gameState.message = `${player.name} raises to ${raiseTotal}`
		}
	}

	/**
	 * Processes an all-in action
	 */
	private static processAllIn(gameState: GameState, player: Player): void {
		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		const allInAmount = player.chips

		player.chips = 0
		player.currentBet += allInAmount
		player.totalBet += allInAmount
		gameState.pot += allInAmount
		player.isAllIn = true
		player.hasActed = true

		// If this is a raise (more than call amount)
		if (player.currentBet > highestBet) {
			gameState.lastRaise = player.currentBet - highestBet
			gameState.minBet = player.currentBet

			// Reset hasActed for all other players who haven't folded
			gameState.players.forEach((p) => {
				if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
					p.hasActed = false
				}
			})
		}

		gameState.message = `${player.name} goes all-in with ${allInAmount}`
	}

	// ===== HELPER METHODS =====

	/**
	 * Gets the highest current bet in the round
	 */
	public static getHighestCurrentBet(gameState: GameState): number {
		return Math.max(
			...gameState.players.map((p) => (p.isFolded ? 0 : p.currentBet)),
			0,
		)
	}

	/**
	 * Calculates the minimum raise amount
	 */
	public static getMinimumRaise(gameState: GameState): number {
		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		return highestBet + gameState.lastRaise
	}

	/**
	 * Gets allowed actions for a specific player
	 */
	public static getAllowedActions(
		gameState: GameState,
		player: Player,
	): PlayerActionEnum[] {
		// Viewers cannot perform any actions
		if (player.role === PlayerRoleEnum.VIEWER) {
			return []
		}

		const actions: PlayerActionEnum[] = [PlayerActionEnum.Fold]

		// All-in players can only fold or check
		if (player.isAllIn) {
			actions.push(PlayerActionEnum.Check)
			return actions
		}

		if (player.chips === 0) {
			return actions
		}

		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		const callAmount = Math.max(0, highestBet - player.currentBet)

		if (callAmount === 0) {
			// No bet to call, can check
			actions.push(PlayerActionEnum.Check)
		} else {
			// There's a bet to call
			// Player can always attempt to call (even if they don't have enough chips, it becomes all-in)
			actions.push(PlayerActionEnum.Call)
		}

		// Can always go all-in if has chips
		actions.push(PlayerActionEnum.AllIn)

		// Can raise if has enough chips for minimum raise
		const minRaise = PlayerActions.getMinimumRaise(gameState)
		if (player.chips + player.currentBet >= minRaise) {
			actions.push(PlayerActionEnum.Raise)
		}

		return actions
	}

	/**
	 * Checks if a player can perform a specific action
	 */
	public static canPlayerPerformAction(
		gameState: GameState,
		playerId: string,
		actionType: PlayerActionEnum,
	): boolean {
		const player = gameState.players.find((p) => p.id === playerId)
		if (!player) return false

		const allowedActions = PlayerActions.getAllowedActions(gameState, player)
		return allowedActions.includes(actionType)
	}

	/**
	 * Gets action requirements for a player (call amount, min raise, etc.)
	 */
	public static getActionRequirements(
		gameState: GameState,
		playerId: string,
	): {
		callAmount: number
		minRaise: number
		maxRaise: number
		allowedActions: PlayerActionEnum[]
	} {
		const player = gameState.players.find((p) => p.id === playerId)
		if (!player) {
			return {
				callAmount: 0,
				minRaise: 0,
				maxRaise: 0,
				allowedActions: [],
			}
		}

		const highestBet = PlayerActions.getHighestCurrentBet(gameState)
		const callAmount = Math.max(0, highestBet - player.currentBet)
		const minRaise = PlayerActions.getMinimumRaise(gameState)
		const maxRaise = player.chips + player.currentBet
		const allowedActions = PlayerActions.getAllowedActions(gameState, player)

		return {
			callAmount,
			minRaise,
			maxRaise,
			allowedActions,
		}
	}
}
