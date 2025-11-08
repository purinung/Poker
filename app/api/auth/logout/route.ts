import { NextResponse } from "next/server"
import { setSessionIdFromCookie } from "@/lib/auth"

export async function POST() {
	// Remove session cookie
	const response = NextResponse.json({ success: true })
	setSessionIdFromCookie(response, "", { expires: new Date(0) })
	return response
}
