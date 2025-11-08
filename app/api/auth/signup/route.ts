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
	const existing = await prisma.player.findUnique({ where: { username } })
	if (existing) {
		return NextResponse.json(
			{ error: "Username already exists" },
			{ status: 409 },
		)
	}
	const hashed = await bcrypt.hash(password, 10)
	const player = await prisma.player.create({
		data: { username, password: hashed },
	})
	const response = NextResponse.json({
		success: true,
		player: { id: player.id, username: player.username },
	})
	setSessionIdFromCookie(response, player.id)
	return response
}
