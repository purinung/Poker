import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { createGame, getGameState, joinGame } from "@/lib/gameActions"
import { GameStatusEnum } from "@/common/enum"
import { RouteContext } from "@/common/interface"
import { GAME_MESSAGES, VALIDATION_ERRORS } from "@/common/label"

export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const { id: roomId } = await context.params
		const { playerId } = await request.json()
		if (!playerId) {
			return new Response(
				JSON.stringify({ error: VALIDATION_ERRORS.PLAYER_ID_REQUIRED }),
				{
					status: 400,
				},
			)
		}

		// Get player details
		const existingPlayer = await prisma.player.findUnique({
			where: { id: playerId },
		})
		if (!existingPlayer) {
			return new Response(
				JSON.stringify({ error: GAME_MESSAGES.PLAYER_NOT_FOUND }),
				{
					status: 404,
				},
			)
		}

		// Check if player is already in a different room
		if (existingPlayer.gameRoomId && existingPlayer.gameRoomId !== roomId) {
			// Check if the current room is still active (not finished)
			const currentRoom = await prisma.gameRoom.findUnique({
				where: { id: existingPlayer.gameRoomId },
			})
			if (currentRoom && currentRoom.status !== GameStatusEnum.FINISHED) {
				return new Response(
					JSON.stringify({
						error:
							"You are already in another room. Please leave your current room first.",
						currentRoomId: existingPlayer.gameRoomId,
						redirect: `/gameroom/${existingPlayer.gameRoomId}`,
					}),
					{
						status: 403,
					},
				)
			}
		}

		// Check if room exists and has space
		const room = await prisma.gameRoom.findUnique({
			where: { id: roomId },
			include: {
				_count: {
					select: { players: true },
				},
				players: true,
			},
		})

		if (!room) {
			return new Response(
				JSON.stringify({ error: GAME_MESSAGES.ROOM_NOT_FOUND }),
				{
					status: 404,
				},
			)
		}

		if (room._count.players >= room.playerMax) {
			return new Response(
				JSON.stringify({ error: VALIDATION_ERRORS.ROOM_IS_FULL }),
				{
					status: 400,
				},
			)
		}

		// Update existing player with room info and mark connected
		const player = await prisma.player.update({
			where: { id: playerId },
			data: {
				gameRoomId: roomId,
				seatNumber: room._count.players + 1,
				isConnected: true,
				lastSeen: new Date(),
			},
		})

		// Ensure a game exists in memory only if room status is PLAYING
		let gameState = await getGameState(roomId)
		if (!gameState && room.status === GameStatusEnum.PLAYING) {
			const names = [
				...room.players
					.slice()
					.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0))
					.map((p) => p.username),
				existingPlayer.username,
			]
			if (names.length >= 2) {
				await createGame(roomId, names)
				gameState = await getGameState(roomId)
			}
		}

		// Join the game state manager (no-op if not created yet)
		await joinGame(roomId, playerId, existingPlayer.username)

		return new Response(
			JSON.stringify({
				success: true,
				player,
				gameState,
			}),
		)
	} catch (error) {
		console.error("Failed to join room:", error)
		return new Response(
			JSON.stringify({ error: VALIDATION_ERRORS.FAILED_TO_JOIN_ROOM }),
			{
				status: 500,
			},
		)
	}
}
