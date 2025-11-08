import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { RouteContext } from "@/common/interface"
import { SUCCESS_MESSAGES, VALIDATION_ERRORS } from "@/common/label"
import {
	resetPlayerToInitialState,
	resetPlayersToInitialState,
} from "@/lib/playerUtils"

export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const { id: roomId } = await context.params
		const { playerId } = await request.json()

		// First, check if the room still exists
		const existingRoom = await prisma.gameRoom.findUnique({
			where: { id: roomId },
			include: {
				players: {
					select: { id: true, username: true, password: true },
				},
			},
		})

		// If room doesn't exist, it was already cleaned up by another player
		if (!existingRoom) {
			// Still reset this player's state if they exist
			try {
				await resetPlayerToInitialState(playerId)
			} catch (playerUpdateError) {
				// Player might not exist or already updated, that's okay
				console.log(
					"Player already updated or doesn't exist:",
					playerUpdateError,
				)
			}

			return new Response(
				JSON.stringify({
					success: true,
					message: SUCCESS_MESSAGES.TOURNAMENT_ALREADY_CLEANED,
				}),
			)
		}

		// Verify the player is in the room
		const player = existingRoom.players.find((p) => p.id === playerId)
		if (!player) {
			return new Response(
				JSON.stringify({ error: VALIDATION_ERRORS.PLAYER_NOT_FOUND_IN_ROOM }),
				{ status: 404 },
			)
		}

		// Start a transaction to cleanup everything
		try {
			await prisma.$transaction(async (tx) => {
				// Double-check room still exists within transaction
				const roomCheck = await tx.gameRoom.findUnique({
					where: { id: roomId },
				})

				if (!roomCheck) {
					// Room was deleted by another concurrent request
					throw new Error("ROOM_ALREADY_DELETED")
				}

				// Get all players in the room (use existing data to avoid race conditions)
				const roomPlayers = existingRoom.players

				// Reset all players to their initial state (like when they created their account)
				const playerIds = roomPlayers.map((p) => p.id)
				await resetPlayersToInitialState(playerIds)

				// Delete the game room
				await tx.gameRoom.delete({
					where: { id: roomId },
				})
			})

			return new Response(
				JSON.stringify({
					success: true,
					message: SUCCESS_MESSAGES.TOURNAMENT_CLEANUP_SUCCESS,
				}),
			)
		} catch (transactionError: unknown) {
			// Handle the case where room was deleted by another concurrent request
			if (
				transactionError instanceof Error &&
				transactionError.message === "ROOM_ALREADY_DELETED"
			) {
				// Still try to reset this player's state
				try {
					await resetPlayerToInitialState(playerId)
				} catch {
					// Player might already be reset, that's okay
				}

				return new Response(
					JSON.stringify({
						success: true,
						message: SUCCESS_MESSAGES.TOURNAMENT_ALREADY_CLEANED,
					}),
				)
			}

			// Re-throw other transaction errors
			throw transactionError
		}
	} catch (error) {
		console.error("Failed to cleanup tournament:", error)
		return new Response(
			JSON.stringify({
				error: VALIDATION_ERRORS.FAILED_TO_CLEANUP_TOURNAMENT,
				details:
					error instanceof Error
						? error.message
						: VALIDATION_ERRORS.UNKNOWN_ERROR,
			}),
			{ status: 500 },
		)
	}
}
