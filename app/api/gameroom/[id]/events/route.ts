import { NextRequest } from "next/server"
import { getGameState } from "@/lib/gameActions"
import { RouteContext } from "@/common/interface"

export async function GET(request: NextRequest, context: RouteContext) {
	const { id: roomId } = await context.params

	// Set headers for SSE
	const response = new Response(
		new ReadableStream({
			start(controller) {
				const encoder = new TextEncoder()

				// Only push when state changes; keep a small heartbeat
				let lastPayload: string | null = null
				let lastBeat = Date.now()

				const sendIfChanged = async () => {
					const gameState = await getGameState(roomId)
					const payload = JSON.stringify(gameState)
					if (payload !== lastPayload) {
						controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
						lastPayload = payload
						lastBeat = Date.now()
					} else if (Date.now() - lastBeat > 15000) {
						// Heartbeat to keep connection alive when idle
						controller.enqueue(encoder.encode(`: ping\n\n`))
						lastBeat = Date.now()
					}
				}

				// Send initial state immediately
				sendIfChanged()

				// Check for updates every second
				const interval = setInterval(() => {
					sendIfChanged()
				}, 1000)

				// Clean up on client disconnect
				request.signal.addEventListener("abort", () => {
					clearInterval(interval)
				})
			},
		}),
		{
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		},
	)

	return response
}
