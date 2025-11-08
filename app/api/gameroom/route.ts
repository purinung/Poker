import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
	try {
		const gameRooms = await prisma.gameRoom.findMany({
			select: {
				id: true,
				name: true,
				playerMax: true,
				createdAt: true,
				_count: {
					select: {
						players: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		})

		// Transform the response to include playerCount as a top-level property
		const gameRoomsWithPlayerCount = gameRooms.map((room) => ({
			id: room.id,
			name: room.name,
			playerMax: room.playerMax,
			createdAt: room.createdAt,
			playerCount: room._count.players,
		}))

		return NextResponse.json(gameRoomsWithPlayerCount)
	} catch (error) {
		console.error("Failed to fetch game rooms:", error)
		return NextResponse.json(
			{ error: "Failed to fetch game rooms" },
			{ status: 500 },
		)
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { name, playerMax = 4 } = body
		if (!name || typeof name !== "string") {
			return NextResponse.json({ error: "Room name required" }, { status: 400 })
		}
		const maxPlayers = Math.max(2, Math.min(9, Number(playerMax)))
		if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 9) {
			return NextResponse.json(
				{ error: "Max players must be between 2 and 9" },
				{ status: 400 },
			)
		}
		const newRoom = await prisma.gameRoom.create({
			data: {
				name,
				playerMax: maxPlayers,
			},
		})
		return NextResponse.json({
			id: newRoom.id,
			name: newRoom.name,
			playerMax: newRoom.playerMax,
		})
	} catch (error) {
		console.error("Failed to create game room:", error)
		return NextResponse.json(
			{ error: "Failed to create game room" },
			{ status: 500 },
		)
	}
}
