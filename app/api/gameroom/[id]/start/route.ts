import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { createGame, getGameState } from "@/lib/gameActions"
import { GameStatusEnum } from "@/common/enum"
import { RouteContext } from "@/common/interface"
import {
	GAME_MESSAGES,
	SUCCESS_MESSAGES,
	VALIDATION_ERRORS,
} from "@/common/label"

export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const { id: roomId } = await context.params

		const room = await prisma.gameRoom.findUnique({
			where: { id: roomId },
			include: { players: true },
		})

		if (!room) {
			return new Response(
				JSON.stringify({ error: GAME_MESSAGES.ROOM_NOT_FOUND }),
				{
					status: 404,
				},
			)
		}

		const playerCount = room.players.length
		if (playerCount !== room.playerMax) {
			return new Response(
				JSON.stringify({
					success: false,
					message: `Cannot start game. Need all ${room.playerMax} players to start. Currently ${playerCount}/${room.playerMax} players joined.`,
				}),
				{ status: 400 },
			)
		}

		// Update room status to PLAYING
		await prisma.gameRoom.update({
			where: { id: roomId },
			data: { status: GameStatusEnum.PLAYING },
		})

		// Initialize in-memory game if not present
		const gs = await getGameState(roomId)
		if (!gs) {
			const names = room.players
				.slice()
				.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0))
				.map((p) => p.username)
			await createGame(roomId, names)
		}

		return new Response(
			JSON.stringify({ success: true, message: SUCCESS_MESSAGES.GAME_STARTED }),
			{ status: 200 },
		)
	} catch (e) {
		console.error("Failed to start game:", e)
		return new Response(
			JSON.stringify({ error: VALIDATION_ERRORS.FAILED_TO_START_GAME }),
			{
				status: 500,
			},
		)
	}
}
