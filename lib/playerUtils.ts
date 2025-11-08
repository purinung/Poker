import prisma from "@/lib/prisma"
import { VALIDATION_ERRORS } from "@/common/label"

/**
 * Resets a player to their initial state (like when they created their account)
 */
export async function resetPlayerToInitialState(playerId: string) {
	return await prisma.player.update({
		where: { id: playerId },
		data: {
			gameRoomId: null,
			seatNumber: null,
			chips: 1000, // Reset to initial chips
			currentBet: 0,
			totalBet: 0,
			isConnected: false,
			isFolded: false,
			isAllIn: false,
			hasActed: false,
			role: "",
			firstCard: null,
			secondCard: null,
			lastSeen: new Date(),
		},
	})
}

/**
 * Resets multiple players to their initial state
 */
export async function resetPlayersToInitialState(playerIds: string[]) {
	const promises = playerIds.map(async (playerId) => {
		try {
			return await resetPlayerToInitialState(playerId)
		} catch (error) {
			console.log(
				`${VALIDATION_ERRORS.FAILED_TO_RESET_PLAYER} ${playerId}:`,
				error,
			)
			return null
		}
	})

	return await Promise.all(promises)
}
