import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { setSessionIdFromCookie } from "@/lib/auth"
import bcrypt from "bcrypt"

export async function POST(req: Request) {
	const { username, password } = await req.json()
	if (!username || !password) {
		return NextResponse.json(
			{ error: "Missing username or password" },
			{ status: 400 },
		)
	}
	const player = await prisma.player.findUnique({ where: { username } })
	if (!player) {
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
	}
	const valid = await bcrypt.compare(password, player.password)
	if (!valid) {
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
	}
	const response = NextResponse.json({
		success: true,
		player: { id: player.id, username: player.username },
	})
	setSessionIdFromCookie(response, player.id)
	return response
}
