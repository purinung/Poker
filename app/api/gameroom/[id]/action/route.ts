import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { handleAction, createGame, getGameState } from "@/lib/gameActions"
import { GameStatusEnum } from "@/common/enum"
import { RouteContext } from "@/common/interface"
import { InputValidator } from "@/common/validation"
import { GAME_MESSAGES } from "@/common/label"

export async function POST(request: NextRequest, context: RouteContext) {
	const { id: roomId } = await context.params

	// Validate room ID
	const roomIdValidation = InputValidator.validateRoomId(roomId)
	if (!roomIdValidation.isValid) {
		return new Response(JSON.stringify({ error: roomIdValidation.error }), {
			status: 400,
		})
	}

	let requestBody
	try {
		requestBody = await request.json()
	} catch {
		return new Response(
			JSON.stringify({ error: GAME_MESSAGES.INVALID_JSON_REQUEST }),
			{ status: 400 },
		)
	}

	// Validate request body structure
	const bodyValidation = InputValidator.validateRequestBody(requestBody, [
		"playerId",
		"action",
	])
	if (!bodyValidation.isValid) {
		return new Response(JSON.stringify({ error: bodyValidation.error }), {
			status: 400,
		})
	}

	const { playerId, action, amount } = requestBody

	// Validate individual fields
	const playerIdValidation = InputValidator.validatePlayerId(playerId)
	if (!playerIdValidation.isValid) {
		return new Response(JSON.stringify({ error: playerIdValidation.error }), {
			status: 400,
		})
	}

	const actionValidation = InputValidator.validateActionType(action)
	if (!actionValidation.isValid) {
		return new Response(JSON.stringify({ error: actionValidation.error }), {
			status: 400,
		})
	}

	const amountValidation = InputValidator.validateBetAmount(amount)
	if (!amountValidation.isValid) {
		return new Response(JSON.stringify({ error: amountValidation.error }), {
			status: 400,
		})
	}

	// First try normally
	let result = await handleAction(
		roomIdValidation.sanitizedValue,
		playerIdValidation.sanitizedValue,
		{
			playerId: playerIdValidation.sanitizedValue,
			type: actionValidation.sanitizedValue,
			amount: amountValidation.sanitizedValue,
		},
	)

	// If in-memory game missing (server restart/hmr), lazily initialize from DB and retry once
	if (!result) {
		try {
			const room = await prisma.gameRoom.findUnique({
				where: { id: roomIdValidation.sanitizedValue },
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
			// Only spin up a game if room is actually playing and has enough players
			if (room.status === GameStatusEnum.PLAYING && room.players.length >= 2) {
				const names = room.players
					.slice()
					.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0))
					.map((p) => p.username)
				await createGame(roomIdValidation.sanitizedValue, names)
				// Double-check we have a game now
				const gs = await getGameState(roomIdValidation.sanitizedValue)
				if (!gs) {
					return new Response(
						JSON.stringify({ error: GAME_MESSAGES.FAILED_TO_INITIALIZE_GAME }),
						{ status: 500 },
					)
				}
				// Retry the action once after init
				result = await handleAction(
					roomIdValidation.sanitizedValue,
					playerIdValidation.sanitizedValue,
					{
						playerId: playerIdValidation.sanitizedValue,
						type: actionValidation.sanitizedValue,
						amount: amountValidation.sanitizedValue,
					},
				)
			}
		} catch {
			return new Response(
				JSON.stringify({ error: GAME_MESSAGES.GAME_INIT_FAILED }),
				{
					status: 500,
				},
			)
		}
	}

	if (!result) {
		return new Response(
			JSON.stringify({ error: GAME_MESSAGES.GAMEROOM_NOT_FOUND }),
			{
				status: 404,
			},
		)
	}

	return new Response(JSON.stringify(result))
}
