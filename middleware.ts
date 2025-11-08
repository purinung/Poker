import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionIdFromCookie } from "@/lib/auth"
import { VALIDATION_ERRORS } from "@/common/label"

export const config = {
	matcher: [
		"/api/gameroom/:path*",
		"/gameroom/:path*",
		"/lobby",
		"/lobby/:path*",
	],
}

export async function middleware(request: NextRequest) {
	// Skip authentication for public paths
	if (request.nextUrl.pathname === "/") {
		return NextResponse.next()
	}

	const sessionId = getSessionIdFromCookie({
		headers: request.headers as Headers,
	})

	if (!sessionId) {
		if (request.nextUrl.pathname.startsWith("/api/")) {
			return NextResponse.json(
				{ error: VALIDATION_ERRORS.AUTHENTICATION_REQUIRED },
				{ status: 401 },
			)
		} else {
			return NextResponse.redirect(new URL("/", request.url))
		}
	}

	// Proceed normally; API routes should read cookie via headers when needed
	return NextResponse.next()
}
