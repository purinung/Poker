export function getSessionIdFromCookie(req: {
	headers: Headers
}): string | null {
	const cookieHeader = req.headers.get("cookie") ?? req.headers.get("Cookie")
	if (!cookieHeader) return null
	const parts = cookieHeader.split(";")
	for (const p of parts) {
		const [k, v] = p.trim().split("=")
		if (k === "session") return v || null
	}
	return null
}

type SessionCookieTarget = {
	cookies: {
		set: (name: string, value: string, options?: SessionCookieOptions) => void
	}
}

export type SessionCookieOptions = {
	httpOnly?: boolean
	secure?: boolean
	sameSite?: "strict" | "lax" | "none"
	path?: string
	maxAge?: number
	expires?: Date
	domain?: string
	partitioned?: boolean
	priority?: "low" | "medium" | "high"
}

export function setSessionIdFromCookie(
	response: SessionCookieTarget,
	sessionId: string,
	options: SessionCookieOptions = {},
): void {
	const defaults: SessionCookieOptions = {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
	}
	response.cookies.set("session", sessionId, { ...defaults, ...options })
}

export function parseJsonSafe<T>(body: string | null): T | null {
	if (!body) return null
	try {
		return JSON.parse(body) as T
	} catch {
		return null
	}
}
