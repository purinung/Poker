import { PokerGame } from "./PokerGame"
import {
	GameState,
	Action,
	InternalGameRoom,
	Player,
	DbPlayerLite,
} from "@/common/interface"
import { cardToString } from "@/lib/Deck"
import { RoundEnum, PlayerRoleEnum } from "@/common/enum"
import prisma from "@/lib/prisma"

export class GameStateManager {
	private games: Map<string, InternalGameRoom> = new Map()

	createGame(roomId: string, playerNames: string[]) {
		const game = new PokerGame(playerNames)
		const gameRoom: InternalGameRoom = {
			id: roomId,
			game,
			players: new Map(),
			lastUpdate: Date.now(),
		}

		this.games.set(roomId, gameRoom)
		game.startNewHand()
		// Synchronous persistence to prevent race conditions
		this.persistState(roomId, game.getGameState())
		return game
	}

	joinGame(roomId: string, playerId: string, playerName: string) {
		const gameRoom = this.games.get(roomId)
		if (!gameRoom) return null

		// Add player to the room
		gameRoom.players.set(playerId, {
			id: playerId,
			name: playerName,
			chips: 1000,
			hand: [],
			currentBet: 0,
			totalBet: 0,
			isFolded: false,
			isAllIn: false,
			hasActed: false,
			role: PlayerRoleEnum.NO_ROLE,
		})

		return gameRoom
	}

	handleAction(roomId: string, playerId: string, action: Action) {
		const gameRoom = this.games.get(roomId)
		if (!gameRoom) return null

		const result = gameRoom.game.processAction(action)
		if (result.success) {
			gameRoom.lastUpdate = Date.now()

			// NOTE: Tournament winner should only be checked AFTER showdown and pot distribution
			// Removed premature tournament winner check here to prevent declaring winner
			// when players go all-in but the hand is still in progress
			const game = gameRoom.game

			// Synchronous persist after every action to prevent race conditions
			this.persistState(roomId, gameRoom.game.getGameState())

			// Server-side auto-advance game flow
			try {
				// If only one player remains, SHOWDOWN handled in processAction via handleAutomaticWin
				// Otherwise, check if betting round is complete and advance
				if (game.isBettingRoundComplete()) {
					const beforeRound = game.getGameState().round
					// Advance betting round
					game.advanceToNextRound()
					const afterRound = game.getGameState().round

					// Deal community cards when entering post-FLOP rounds
					if (
						beforeRound === RoundEnum.PREFLOP &&
						afterRound === RoundEnum.FLOP
					) {
						game.dealCommunityCards(3)
						this.persistState(roomId, game.getGameState())
					} else if (
						beforeRound === RoundEnum.FLOP &&
						afterRound === RoundEnum.TURN
					) {
						game.dealCommunityCards(1)
						this.persistState(roomId, game.getGameState())
					} else if (
						beforeRound === RoundEnum.TURN &&
						afterRound === RoundEnum.RIVER
					) {
						game.dealCommunityCards(1)
						this.persistState(roomId, game.getGameState())
					}

					// If we reached CARD_REVEAL, start the card reveal phase, then advance to SHOWDOWN
					if (afterRound === RoundEnum.CARD_REVEAL) {
						try {
							// Set message for card reveal phase
							const gameState = game.getGameState()
							gameState.message = "Revealing all cards..."
							this.persistState(roomId, gameState)

							// After 5 seconds, advance to SHOWDOWN with winner display
							setTimeout(() => {
								try {
									game.advanceToShowdownWithWinners()
									this.persistState(roomId, game.getGameState())

									// Check for tournament winner after pot distribution
									if (game.hasTournamentWinner()) {
										const winner = game.getTournamentWinner()
										const tournamentStatus = game.getTournamentStatus()
										const finalGameState = game.getGameState()

										console.log(
											`🏆 TOURNAMENT WINNER DECLARED (after SHOWDOWN): ${winner?.name}`,
										)
										console.log("Final Tournament Status:", tournamentStatus)

										finalGameState.tournamentWinner = winner
										finalGameState.gameEnded = true
										finalGameState.message = `🏆 ${winner?.name} wins the tournament! 🏆`
										this.persistState(roomId, finalGameState)
										return
									}

									// Schedule next hand after showing winners for 2 seconds
									setTimeout(() => {
										try {
											// Check for tournament winner before starting new hand
											if (!game.hasTournamentWinner()) {
												game.startNewHand()
												gameRoom.lastUpdate = Date.now()
												this.persistState(roomId, game.getGameState())
											}
										} catch {}
									}, 2000)
								} catch {}
							}, 5000) // 5 second delay for card reveal
						} catch {}
					}

					// If we reached SHOWDOWN directly (from automatic win), distribute pot immediately
					if (afterRound === RoundEnum.SHOWDOWN) {
						try {
							// Only distribute pot if there's actually pot to distribute
							if (game.getGameState().pot > 0) {
								game.distributePot()
							}
							this.persistState(roomId, game.getGameState())

							// Check for tournament winner after pot distribution
							if (game.hasTournamentWinner()) {
								const winner = game.getTournamentWinner()
								const tournamentStatus = game.getTournamentStatus()
								const gameState = game.getGameState()

								console.log(
									`🏆 TOURNAMENT WINNER DECLARED (after SHOWDOWN): ${winner?.name}`,
								)
								console.log("Final Tournament Status:", tournamentStatus)

								gameState.tournamentWinner = winner
								gameState.gameEnded = true
								gameState.message = `🏆 ${winner?.name} wins the tournament! 🏆`
								this.persistState(roomId, gameState)
								return result
							}

							// Schedule next hand after a short delay so clients can render winners
							setTimeout(() => {
								try {
									// Check for tournament winner before starting new hand
									if (!game.hasTournamentWinner()) {
										game.startNewHand()
										gameRoom.lastUpdate = Date.now()
										this.persistState(roomId, game.getGameState())
									}
								} catch {}
							}, 2000)
						} catch {}
					}
				} else {
					// Betting round not complete: move turn to the next eligible player
					const nextIdx = game.getNextActivePlayerIndex()
					game.getGameState().currentPlayerIndex = nextIdx
					gameRoom.lastUpdate = Date.now()
					this.persistState(roomId, game.getGameState())
				}
			} catch {
				// Swallow to avoid breaking the action response
			}
		}
		return result
	}

	getGameState(roomId: string): GameState | null {
		const gameRoom = this.games.get(roomId)
		if (!gameRoom) return null

		return gameRoom.game.getGameState()
	}

	removePlayer(roomId: string, playerId: string) {
		const gameRoom = this.games.get(roomId)
		if (!gameRoom) return

		gameRoom.players.delete(playerId)
		if (gameRoom.players.size === 0) {
			this.games.delete(roomId)
		}
	}

	// ===== Persistence Helpers =====
	async persistState(roomId: string, state: GameState) {
		try {
			// Build quick index by username to match PokerGame players
			const dbPlayers = await prisma.player.findMany({
				where: { gameRoomId: roomId },
				select: { id: true, username: true },
			})

			const byUsername = new Map<string, DbPlayerLite>()
			dbPlayers.forEach((p) => byUsername.set(p.username, p))

			// Prepare batch updates - collect all updates first
			const playerUpdates = []
			for (const p of state.players as Player[]) {
				const dbp = byUsername.get(p.name)
				if (!dbp) continue

				const role = p.role || ""

				// Clear cards for viewers and ensure fresh cards for new hands
				const shouldClearCards =
					p.role === PlayerRoleEnum.VIEWER ||
					(p.hand.length === 0 && state.round === RoundEnum.PREFLOP)

				playerUpdates.push(
					prisma.player.update({
						where: { id: dbp.id },
						data: {
							chips: p.chips,
							currentBet: p.currentBet,
							totalBet: p.totalBet,
							isFolded: p.isFolded,
							isAllIn: p.isAllIn,
							hasActed: p.hasActed,
							role,
							// Properly handle card state - clear for viewers and empty hands
							firstCard: shouldClearCards
								? null
								: p.hand?.[0]
									? cardToString(p.hand[0])
									: null,
							secondCard: shouldClearCards
								? null
								: p.hand?.[1]
									? cardToString(p.hand[1])
									: null,
						},
					}),
				)
			} // Prepare game room update
			const [c1, c2, c3, c4, c5] = state.communityCards
			const gameRoomUpdate = prisma.gameRoom.update({
				where: { id: roomId },
				data: {
					round: state.round,
					pot: state.pot,
					firstCard: c1 ? cardToString(c1) : null,
					secondCard: c2 ? cardToString(c2) : null,
					thirdCard: c3 ? cardToString(c3) : null,
					fourthCard: c4 ? cardToString(c4) : null,
					fifthCard: c5 ? cardToString(c5) : null,
					bigBlind: state.bigBlind,
					smallBlind: state.smallBlind,
				},
			})

			// Execute all updates in a single transaction for better performance and consistency
			await prisma.$transaction([gameRoomUpdate, ...playerUpdates])
		} catch (e) {
			// Do not crash game loop on DB errors; just log once
			console.error("[GameStateManager] Failed to persist state:", e)
		}
	}
}
