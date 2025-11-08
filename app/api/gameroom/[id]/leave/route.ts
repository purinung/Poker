import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getGameState, handleAction, removePlayer } from "@/lib/gameActions"
import { LeaveRoomOptions, RouteContext } from "@/common/interface"
import { PlayerActionEnum, GameStatusEnum } from "@/common/enum"

// Use shared server actions (singleton under the hood)

export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const { id: roomId } = await context.params
		const { playerId, options } = (await request.json()) as {
			playerId: string
			options: LeaveRoomOptions
		}

		// Get player from database
		const player = await prisma.player.findFirst({
			where: {
				id: playerId,
				gameRoomId: roomId,
			},
		})

		if (!player) {
			return new Response(
				JSON.stringify({ error: "Player not found in room" }),
				{ status: 404 },
			)
		}

		// Update player connection status
		await prisma.player.update({
			where: { id: playerId },
			data: {
				isConnected: false,
				lastSeen: new Date(),
			},
		})

		if (options.autoFold) {
			// Auto fold the player's hand via game state manager
			await handleAction(roomId, playerId, {
				playerId,
				type: PlayerActionEnum.Fold,
			})
		}

		if (options.removeFromRoom) {
			// Remove player from room
			await prisma.player.update({
				where: { id: playerId },
				data: { gameRoomId: null },
			})
		}

		// Get current game state
		const gameState = await getGameState(roomId)

		// If all remaining players are disconnected, end the game
		if (gameState) {
			const connectedPlayers = await prisma.player.count({
				where: {
					gameRoomId: roomId,
					isConnected: true,
				},
			})

			if (connectedPlayers === 0) {
				await prisma.gameRoom.update({
					where: { id: roomId },
					data: { status: GameStatusEnum.FINISHED },
				})
			}
		}

		// Remove from in-memory room if needed
		if (options.removeFromRoom) {
			await removePlayer(roomId, playerId)
		}

		return new Response(JSON.stringify({ success: true }))
	} catch (error) {
		console.error("Failed to process leave room:", error)
		return new Response(
			JSON.stringify({ error: "Failed to process leave room" }),
			{ status: 500 },
		)
	}
}
