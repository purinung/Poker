import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { RouteContext } from "@/common/interface"
import { GAME_MESSAGES, VALIDATION_ERRORS } from "@/common/label"

export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const { id } = await context.params
		const room = await prisma.gameRoom.findUnique({
			where: { id },
			include: {
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
		return new Response(JSON.stringify(room))
	} catch (error) {
		console.error("Failed to fetch game room:", error)
		return new Response(
			JSON.stringify({ error: VALIDATION_ERRORS.FAILED_TO_FETCH_GAME_ROOM }),
			{ status: 500 },
		)
	}
}
