import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getSessionIdFromCookie } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
	try {
		const sessionId = getSessionIdFromCookie({
			headers: request.headers as Headers,
		})

		if (!sessionId) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
		}

		const player = await prisma.player.findUnique({
			where: { id: sessionId },
			select: {
				id: true,
				username: true,
				gameRoomId: true,
				gameRoom: {
					select: {
						id: true,
						name: true,
						status: true,
					},
				},
			},
		})

		if (!player) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 })
		}

		return NextResponse.json(player)
	} catch (error) {
		console.error("Auth check error:", error)
		return NextResponse.json({ error: "Auth check failed" }, { status: 500 })
	}
}
