"use client"

import React, { useState, useEffect } from "react"
import {
	RoundEnum,
	GameStatusEnum,
	PlayerActionEnum,
	PlayerRoleEnum,
} from "@/common/enum"
import { useRouter, useSearchParams } from "next/navigation"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Player, GameRoom, RoomPlayerApi, GameState } from "@/common/interface"
import type { Card } from "@/common/interface"
import { UI_LABELS } from "@/common/label"
import { stringToCard } from "@/lib/Deck"
import { PokerGame } from "@/lib/PokerGame"
import { GameUtils } from "@/lib/GameUtils"
import CommunityCards from "@/components/card/CommunityCards"
import PlayerLayout from "@/components/card/PlayerLayout"
import Prediction from "@/components/Prediction"
import TournamentWinnerModal from "@/components/TournamentWinnerModal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const GameRoomContent = () => {
	// Game state
	const [isClient, setIsClient] = useState(false)
	const [roomId, setRoomId] = useState<string | null>(null)
	const params = useParams()
	const [playerId, setPlayerId] = useState<string | null>(null)
	const [username, setUsername] = useState<string>("")
	const [forceRefresh, setForceRefresh] = useState(0)
	const [raiseAmount, setRaiseAmount] = useState<{
		[playerId: string]: number
	}>({})
	// Viewer hole cards fetched from DB (like "ASPADES"), typed to Card
	const [viewerCards, setViewerCards] = useState<Card[]>([])

	// Map of server playerId -> local PokerGame playerId (index-based)
	const [idMap, setIdMap] = useState<Record<string, string>>({})

	const [gameState, setGameState] = useState<GameRoom>({
		id: "local",
		name: UI_LABELS.LOCAL_ROOM,
		round: RoundEnum.PREFLOP,
		winners: [],
		message: "",
		currentHand: 1,
		pokerGame: null,
		gameStarted: false,
		gameLog: [],
		currentPlayerIndex: 0,
		pot: 0,
		communityCards: [],
		bigBlind: 20,
		smallBlind: 10,
		minBet: 20,
		lastRaise: 20,
		playerMax: 9,
		playerCount: 0,
		players: [],
		status: GameStatusEnum.WAITING,
		lastUpdate: new Date(),
		tournamentWinner: null,
		gameEnded: false,
	})

	// Room meta for waiting state UI
	const [roomPlayerMax, setRoomPlayerMax] = useState<number>(9)
	const [roomPlayers, setRoomPlayers] = useState<
		Array<{ id: string; username: string; seatNumber?: number }>
	>([])

	const router = useRouter()
	const searchParams = useSearchParams()

	// --- helpers: shared room fetch/update and utilities ---
	const sortPlayersBySeat = React.useCallback(
		(players: RoomPlayerApi[] = []): RoomPlayerApi[] =>
			[...players].sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)),
		[],
	)

	const fetchRoomMeta = async (
		roomId: string,
	): Promise<{
		players?: RoomPlayerApi[]
		playerMax?: number
		// Prisma returns GameRoom with string status/round
		status?: string
		round?: string
	} | null> => {
		try {
			const response = await fetch(`/api/gameroom/${roomId}`)
			const text = await response.text()
			try {
				return JSON.parse(text)
			} catch {
				if (text.startsWith("<!DOCTYPE")) return null
				return null
			}
		} catch {
			return null
		}
	}

	const applyRoomMeta = React.useCallback(
		(
			room: {
				players?: RoomPlayerApi[]
				playerMax?: number
				status?: string
				round?: string
			} | null,
		) => {
			if (!room) return
			const sorted = Array.isArray(room.players)
				? sortPlayersBySeat(room.players)
				: []
			setRoomPlayers(
				sorted.map((p) => ({
					id: p.id,
					username: p.username,
					seatNumber: p.seatNumber,
				})),
			)
			setRoomPlayerMax(room.playerMax || 9)
			// Derive game started from room.status (PLAYING) or non-waiting round
			if (room.status || room.round) {
				const status = (room.status || "").toUpperCase()
				const started = status === GameStatusEnum.PLAYING
				setGameState((prev) => ({ ...prev, gameStarted: !!started }))
			}
			// Update viewer cards from DB for logged-in player (only if not eliminated)
			if (playerId) {
				const me = sorted.find((p) => p.id === playerId)
				if (me) {
					// If player is eliminated (VIEWER role), don't show their cards
					if (me.role === PlayerRoleEnum.VIEWER) {
						setViewerCards([])
					} else {
						const c1 = me.firstCard ?? undefined
						const c2 = me.secondCard ?? undefined
						const next = [c1, c2]
							.map((s) => (s ? stringToCard(s) : null))
							.filter(Boolean) as Card[]
						setViewerCards(next)
					}
				}
			}
		},
		[playerId, sortPlayersBySeat],
	)

	// Add a log message
	const addLog = React.useCallback((message: string) => {
		setGameState((prev: GameRoom) => ({
			...prev,
			gameLog: [
				...((prev.gameLog ?? []) as string[]),
				GameUtils.createLogMessage((prev.currentHand ?? 0) as number, message),
			],
			message,
		}))
	}, [])

	// Removed unused startNewHand helper; server orchestrates hands

	// Using these variables to maintain game state
	React.useEffect(() => {
		if (gameState.message) console.log("Game message:", gameState.message)
		if ((gameState.gameLog ?? []).length)
			console.log("Game log:", gameState.gameLog)
		if (forceRefresh) {
			console.log("Force refresh:", forceRefresh)
			// Re-render components when needed
		}
	}, [gameState.message, gameState.gameLog, forceRefresh])

	// Set up client-side initialization
	useEffect(() => {
		setIsClient(true)
		// Get roomId from Next.js params
		let id: string | null = null
		if (params?.id) {
			if (Array.isArray(params.id)) {
				id = params.id[0]
			} else {
				id = params.id
			}
		}
		// Get playerId and username from session (same as Lobby)
		const fetchSession = async () => {
			try {
				const res = await fetch("/api/auth/check", { credentials: "include" })
				if (!res.ok) {
					router.push("/lobby")
					return
				}
				const data = await res.json()
				const pid = data?.id
				const uname = data?.username
				if (!id || !pid) {
					router.push("/lobby")
					return
				}

				// Check if player is in this room or no room at all
				if (data.gameRoomId && data.gameRoomId !== id) {
					// Player is in a different room, redirect to their actual room
					if (
						data.gameRoom &&
						data.gameRoom.status !== GameStatusEnum.FINISHED
					) {
						router.push(`/gameroom/${data.gameRoomId}`)
					} else {
						router.push("/lobby")
					}
					return
				}

				setRoomId(id)
				setPlayerId(pid)
				setUsername(uname || "Unknown")
			} catch {
				router.push("/lobby")
			}
		}
		fetchSession()
	}, [searchParams, router, params])

	// Initial room fetch only once per roomId
	useEffect(() => {
		if (!isClient || !roomId || !playerId) return
		let cancelled = false
		const run = async () => {
			const room = await fetchRoomMeta(roomId)
			if (cancelled || !room) return
			applyRoomMeta(room)
		}
		run()
		return () => {
			cancelled = true
		}
	}, [isClient, roomId, playerId, applyRoomMeta])

	// If the room is PLAYING but we still don't have a local PokerGame yet (SSE delay),
	// create a provisional local game using current room player order; it will be
	// immediately synchronized by SSE when it arrives.
	useEffect(() => {
		if (!isClient || !gameState.gameStarted) return
		if (gameState.pokerGame) return
		if (roomPlayers.length < 2) return
		try {
			const names = roomPlayers
				.slice()
				.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0))
				.map((p) => p.username)
			const game = new PokerGame(names)
			// Start a local hand so UI has sensible defaults; SSE will override state shortly
			game.startNewHand()
			setGameState((prev: GameRoom) => ({ ...prev, pokerGame: game }))
			setForceRefresh((x) => x + 1)
		} catch {
			// no-op; wait for SSE
		}
	}, [isClient, gameState.gameStarted, gameState.pokerGame, roomPlayers])

	// Initialize SSE connection and game state (single connection per room)
	useEffect(() => {
		if (!isClient || !roomId || !playerId) return

		// Redirect to sign in if not authenticated
		if (!playerId || !username || !roomId) {
			router.push("/")
			return
		}

		let mounted = true

		// Refresh room meta
		const checkFirstPlayer = async () => {
			const room = await fetchRoomMeta(roomId)
			if (!room || !room.players) {
				setRoomPlayers([])
				setRoomPlayerMax(room?.playerMax || 9)
				return
			}
			if (mounted) {
				applyRoomMeta(room)
			}
		}
		checkFirstPlayer()

		// Track the round for meta refresh throttling
		const lastMetaRoundRef: { current: RoundEnum | null } = { current: null }

		// Initialize EventSource for SSE
		const eventSource = new EventSource(`/api/gameroom/${roomId}/events`)

		eventSource.onmessage = (event) => {
			let receivedGameState: GameState | null = null
			try {
				receivedGameState = JSON.parse(event.data) as GameState
			} catch (jsonError) {
				if (event.data && event.data.startsWith("<!DOCTYPE")) {
					console.error("SSE returned HTML error page, not JSON.")
					// Treat as transient error; don't kick user, just wait
					return
				}
				console.warn("Failed to parse SSE JSON:", jsonError)
				return
			}
			// If no in-memory game yet (e.g., only 1 player), stay in room and show waiting state
			if (!receivedGameState) {
				setGameState((prev) => ({
					...prev,
					message: "Waiting for more players to join…",
				}))
				return
			}
			if (
				!receivedGameState.players ||
				receivedGameState.players.length === 0
			) {
				// Some servers might stream partial state; ignore until players are available
				return
			}
			// Initialize local PokerGame once with server player ordering, and sync its state immediately
			if (!gameState.pokerGame) {
				const game = new PokerGame(
					receivedGameState.players.map((p: Player) => p.name),
				)
				// Build DB-id -> local-id map using username matching
				const mapping: Record<string, string> = {}
				const localPlayers = game.getGameState().players
				receivedGameState.players.forEach((sp: Player, idx: number) => {
					const dbP = roomPlayers.find((rp) => rp.username === sp.name)
					if (dbP) mapping[dbP.id] = localPlayers[idx]?.id
					// Sync per-player role and bets immediately on first init
					const lp = localPlayers[idx]
					if (lp) {
						lp.chips = sp.chips
						lp.currentBet = sp.currentBet
						lp.totalBet = sp.totalBet
						lp.isFolded = sp.isFolded
						lp.isAllIn = sp.isAllIn
						lp.hasActed = sp.hasActed
						lp.role = sp.role || PlayerRoleEnum.NO_ROLE
					}
				})
				// Sync top-level round, pot, community, and current player index
				const gs = game.getGameState()
				gs.round = receivedGameState.round
				gs.pot = receivedGameState.pot
				gs.communityCards = [...receivedGameState.communityCards]
				if (
					receivedGameState.currentPlayerIndex >= 0 &&
					receivedGameState.currentPlayerIndex < gs.players.length
				) {
					gs.currentPlayerIndex = receivedGameState.currentPlayerIndex
				}
				setIdMap(mapping)
				setGameState((prev: GameRoom) => ({ ...prev, pokerGame: game }))
			}

			// If we have a local game, sync critical fields from server so UI/validation match
			const game = gameState.pokerGame
			if (game) {
				const gs = game.getGameState()
				// Sync round, pot, community cards
				gs.round = receivedGameState.round
				gs.pot = receivedGameState.pot
				gs.communityCards = [...receivedGameState.communityCards]
				// Sync current player index from server (by seat order)
				if (
					receivedGameState.currentPlayerIndex >= 0 &&
					receivedGameState.currentPlayerIndex < gs.players.length
				) {
					gs.currentPlayerIndex = receivedGameState.currentPlayerIndex
				}
				// Sync per-player public state (chips/bets/fold/all-in/acted)
				receivedGameState.players.forEach((sp: Player, idx: number) => {
					const lp = gs.players[idx]
					if (!lp) return
					lp.chips = sp.chips
					lp.currentBet = sp.currentBet
					lp.totalBet = sp.totalBet
					lp.isFolded = sp.isFolded
					lp.isAllIn = sp.isAllIn
					lp.hasActed = sp.hasActed
					lp.role = sp.role || PlayerRoleEnum.NO_ROLE
					// Do not overwrite hole cards on client for privacy in multiplayer
				})
			}

			// Reflect basic server-driven UI state
			setForceRefresh((prev) => prev + 1)
			setGameState((prev: GameRoom) => ({
				...prev,
				round: receivedGameState.round,
				winners: receivedGameState.winners || [], // Include winners from SSE
				message: receivedGameState.message || "",
				// Derive started state from round (SSE sends GameState without gameStarted)
				gameStarted: true,
				pot: receivedGameState.pot || 0,
				tournamentWinner: receivedGameState.tournamentWinner || null,
				gameEnded: receivedGameState.gameEnded || false,
			}))

			// Trigger a single DB meta fetch whenever the round changes
			try {
				const newRound = (receivedGameState.round ||
					RoundEnum.PREFLOP) as RoundEnum
				if (lastMetaRoundRef.current !== newRound) {
					// Fire-and-forget: refresh room meta (player list, viewer cards)
					fetchRoomMeta(roomId).then((room) => {
						if (room) applyRoomMeta(room)
					})
					lastMetaRoundRef.current = newRound
				}
			} catch {}
		}

		eventSource.onerror = (error) => {
			console.error("SSE Error:", error)
			eventSource.close()
		}

		// Cleanup on unmount
		return () => {
			mounted = false
			eventSource.close()
		}
		// We intentionally keep deps minimal to avoid duplicate SSE connections
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isClient, roomId, playerId, username, applyRoomMeta])

	// Inject the viewer's DB hole cards into the local PokerGame state to ensure parity
	useEffect(() => {
		const game = gameState.pokerGame
		if (!game) return
		if (!viewerCards || viewerCards.length === 0) return
		try {
			const gs = game.getGameState()
			// Resolve viewer local player by username first, then idMap
			const localId =
				gs.players.find((p) => p.name === username)?.id ||
				(playerId ? idMap[playerId] : "")
			if (!localId) return
			const lp = gs.players.find((p) => p.id === localId)
			if (!lp) return
			// If already matches, skip
			const same =
				lp.hand.length === viewerCards.length &&
				lp.hand.every((c, i) => c === viewerCards[i])
			if (same) return
			const prevHand = [...lp.hand]
			// Remove DB cards from deck if present
			gs.deck = gs.deck.filter((c) => !viewerCards.includes(c as Card))
			// Return previous hand cards back to deck if they are not already there
			for (const old of prevHand) {
				if (!gs.deck.includes(old as Card)) {
					gs.deck.push(old as Card)
				}
			}
			// Set player hand to DB cards
			lp.hand = [...viewerCards]
			// Force refresh so UI updates
			setForceRefresh((x) => x + 1)
		} catch {
			// no-op
		}
	}, [gameState.pokerGame, viewerCards, username, idMap, playerId])

	const processPlayerAction = async (
		playerId: string,
		action: PlayerActionEnum,
		amount?: number,
	) => {
		if (!roomId) return

		try {
			const response = await fetch(`/api/gameroom/${roomId}/action`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					playerId,
					action,
					amount,
				}),
			})

			if (!response.ok) {
				throw new Error("Failed to process action")
			}

			const result = await response.json()

			if (result.success) {
				addLog(result.message)
			} else {
				addLog(`Error: ${result.message}`)
			}
		} catch (error) {
			console.error("Failed to process action:", error)
			addLog("Failed to process action. Please try again.")
		}
	}

	const handleRaiseAmountChange = (playerId: string, amount: string) => {
		// Use local ids in client state for inputs
		GameUtils.handleRaiseAmountChange(playerId, amount, setRaiseAmount)
	}

	const checkAndAdvanceGame = () => {
		// Server now auto-advances after actions; keep placeholder for compatibility
	}

	const startGame = async () => {
		if (!roomId) return
		if (roomPlayers.length !== roomPlayerMax) {
			setGameState((prev) => ({
				...prev,
				message: `Need all ${roomPlayerMax} players to start. Currently ${roomPlayers.length}/${roomPlayerMax} players joined.`,
			}))
			return
		}

		try {
			const response = await fetch(`/api/gameroom/${roomId}/start`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			})

			if (!response.ok) {
				throw new Error("Failed to start game")
			}

			const result = await response.json()
			if (result.success) {
				setGameState((prev: GameRoom) => ({ ...prev, gameStarted: true }))
				addLog("Game started!")
			}
		} catch (error) {
			console.error("Failed to start game:", error)
			addLog("Failed to start game")
		}
	}

	const finishHand = async () => {
		// Server schedules next hand after SHOWDOWN; no-op here
	}

	const handleTournamentCleanup = async () => {
		if (!roomId || !playerId) return
		try {
			const response = await fetch(
				`/api/gameroom/${roomId}/tournament-cleanup`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ playerId }),
				},
			)

			// Handle both success and "already cleaned up" cases
			if (response.ok) {
				const result = await response.json()
				console.log("Tournament cleanup result:", result.message)
			} else {
				// Even if there's an error, try to parse the response for details
				try {
					const errorData = await response.json()
					console.warn("Tournament cleanup warning:", errorData.error)
				} catch {
					console.warn(
						"Tournament cleanup failed with status:",
						response.status,
					)
				}
			}

			// Always redirect to lobby regardless of cleanup result
			// The important thing is getting the user out of the game
			router.push("/lobby")
		} catch (error) {
			console.error("Tournament cleanup network error:", error)
			// Still redirect to lobby even if there's a network error
			// The server-side cleanup might have succeeded even if we didn't get a response
			router.push("/lobby")
		}
	}

	// Get current game state
	const players = Array.isArray(gameState.pokerGame?.getPlayers())
		? gameState.pokerGame?.getPlayers()
		: []
	const communityCards = Array.isArray(gameState.pokerGame?.getCommunityCards())
		? gameState.pokerGame?.getCommunityCards()
		: []
	// Derive current player ID robustly from currentPlayerIndex to avoid undefined cases
	const currentIndex =
		gameState.pokerGame?.getGameState().currentPlayerIndex ?? -1
	const currentPlayerIdSafe =
		currentIndex >= 0 && currentIndex < players.length
			? players[currentIndex]?.id || ""
			: ""
	const { pot } = gameState

	// Derive if the viewer is the first player (lowest seat number). Fallback to first in list.
	const isViewerFirst = React.useMemo(() => {
		if (!playerId || roomPlayers.length === 0) return false
		const withSeat = roomPlayers.filter(
			(p) => typeof p.seatNumber === "number" && (p.seatNumber as number) > 0,
		)
		const first = withSeat.length
			? withSeat.reduce((a, b) =>
					(a.seatNumber as number) <= (b.seatNumber as number) ? a : b,
				)
			: roomPlayers[0]
		return first?.id === playerId
	}, [playerId, roomPlayers])

	// In waiting state, poll room meta every 2s so player count and first-player status stay fresh
	useEffect(() => {
		if (!isClient || !roomId) return
		if (gameState.gameStarted) return
		let cancelled = false
		const interval = setInterval(async () => {
			const room = await fetchRoomMeta(roomId)
			if (!cancelled && room) applyRoomMeta(room)
		}, 2000)
		return () => {
			cancelled = true
			clearInterval(interval)
		}
	}, [isClient, roomId, gameState.gameStarted, applyRoomMeta])

	// Resolve the local PokerGame id for the current viewer by username first, then fallback to idMap
	const viewerLocalId = gameState.pokerGame
		? gameState.pokerGame.getPlayers().find((p) => p.name === username)?.id ||
			(playerId ? idMap[playerId] : "")
		: ""

	// Seat positions around the table (up to 9)
	const waitingSeats = [
		{
			className:
				"absolute top-[calc(50%+220px)] left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%+220px)] left-[calc(50%+280px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%+100px)] left-[calc(50%+470px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%-100px)] left-[calc(50%+470px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%-220px)] left-[calc(50%-280px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%-220px)] left-[calc(50%+280px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%-100px)] left-[calc(50%-470px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%+100px)] left-[calc(50%-470px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
		{
			className:
				"absolute top-[calc(50%+220px)] left-[calc(50%-280px)] z-30 flex -translate-x-1/2 -translate-y-1/2",
		},
	]

	return (
		<section className="flex h-screen w-full flex-col">
			{/* Header */}
			<div className="fixed top-0 left-0 z-50 flex w-full items-center justify-between p-6">
				{/* Room Detail */}
				<div>
					<p className="text-[12px]">Room Id: {roomId || "Unknown"}</p>
					<p className="text-[12px]">
						Player: {Array.isArray(players) ? players.length : 0}/
						{Array.isArray(players) ? players.length : 0}
					</p>
					<p className="text-[12px]">Playing as: {username}</p>
				</div>
			</div>

			{/* Table */}
			<div className="relative flex flex-grow items-center justify-center">
				<div className="bg-accent-green border-accent-gray absolute h-[400px] w-[900px] rounded-full border-[8px]"></div>

				{/* Pot Display */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[150px] text-center">
					<p className="text-[20px] font-bold text-yellow-400">POT</p>
					<p className="text-[26px] font-bold">${pot}</p>
				</div>

				{/* Community Cards */}
				<div className="relative flex">
					<CommunityCards cards={communityCards} />
				</div>

				{/* Waiting seats overlay when game hasn't started */}
				{!gameState.gameStarted && (
					<>
						{(() => {
							// Rotate room players so the viewer (playerId) is at bottom (index 0)
							const vIdx = roomPlayers.findIndex((p) => p.id === playerId)
							const rotated =
								vIdx > 0
									? [...roomPlayers.slice(vIdx), ...roomPlayers.slice(0, vIdx)]
									: roomPlayers
							const count = Math.min(roomPlayerMax, waitingSeats.length)
							return Array.from({ length: count }).map((_, idx) => {
								const seat = waitingSeats[idx]
								if (!seat) return null
								const p = rotated[idx]
								const isYou = p && p.id === playerId
								return (
									<div key={idx} className={seat.className}>
										<div className="flex items-center gap-2 rounded-xl bg-black/50 px-3 py-2 shadow-md">
											<Avatar className="h-8 w-8">
												<AvatarImage src="/avatar.png" />
												<AvatarFallback>
													{p ? p.username?.[0]?.toUpperCase() || "?" : "+"}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col leading-none">
												<p className="text-[12px] text-white">
													{p ? p.username : UI_LABELS.OPEN_SEAT}
												</p>
												{isYou && (
													<p className="text-[11px] text-green-400">You</p>
												)}
											</div>
										</div>
									</div>
								)
							})
						})()}
						{/* Center waiting text (shifted up to avoid overlap) */}
						<div className="absolute top-[45%] left-1/2 z-20 -translate-x-1/2 -translate-y-[10px] text-center">
							<p className="text-base font-semibold text-white">
								Waiting for players…
							</p>
							<p className="text-sm text-gray-300">
								{roomPlayers.length}/{roomPlayerMax} seated
							</p>
						</div>
					</>
				)}

				{/* Start Game Button - Only visible to first player, only when room is full, and before game starts */}
				{isViewerFirst &&
					!gameState.gameStarted &&
					roomPlayers.length === roomPlayerMax && (
						<motion.button
							initial={{ scale: 0.5, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							className="absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-green-600 px-6 py-3 font-bold text-white shadow-lg transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:opacity-60"
							onClick={startGame}
							disabled={roomPlayers.length !== roomPlayerMax}
							title={
								roomPlayers.length !== roomPlayerMax
									? `Need all ${roomPlayerMax} players to start (${roomPlayers.length}/${roomPlayerMax} joined)`
									: "Start the game"
							}
							aria-disabled={roomPlayers.length !== roomPlayerMax}
						>
							{roomPlayers.length !== roomPlayerMax
								? `Waiting for ${roomPlayerMax - roomPlayers.length} more players`
								: UI_LABELS.START_GAME}
						</motion.button>
					)}

				{/* Card Reveal Phase Display */}
				<AnimatePresence>
					{gameState.round === RoundEnum.CARD_REVEAL && (
						<motion.div
							initial={{ scale: 0.5, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.5, opacity: 0 }}
							className="absolute inset-0 z-20 flex flex-col items-center justify-center"
						>
							<div className="bg-accent-black flex items-center rounded-lg p-4 shadow-lg">
								<h2 className="font-secondary text-[56px] text-blue-400">
									REVEALING CARDS...
								</h2>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Winners Display (only on SHOWDOWN, not during CARD_REVEAL) */}
				<AnimatePresence>
					{(gameState.winners ?? []).length > 0 &&
						gameState.round === RoundEnum.SHOWDOWN && (
							<motion.div
								initial={{ scale: 0.5, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.5, opacity: 0 }}
								className="absolute inset-0 z-20 flex flex-col items-center justify-center"
							>
								<div className="bg-accent-black flex items-center rounded-lg p-4 shadow-lg">
									<h2 className="font-secondary mr-4 text-[56px] text-yellow-400">
										{(gameState.winners ?? []).length > 1
											? "WINNER!"
											: "WINNER!"}
									</h2>
									{(gameState.winners ?? []).map((winner: Player) => (
										<p
											key={winner.id}
											className="font-secondary text-accent-white text-[56px]"
										>
											{winner.name}
										</p>
									))}
								</div>
							</motion.div>
						)}
				</AnimatePresence>

				{/* Player Layout */}
				<PlayerLayout
					players={Array.isArray(players) ? players : []}
					currentPlayerId={currentPlayerIdSafe}
					viewerPlayerId={viewerLocalId}
					viewerUsername={username}
					viewerCards={viewerCards}
					currentRound={gameState.round}
					winners={(gameState.winners ?? []) as Player[]}
					processPlayerAction={processPlayerAction}
					handleRaiseAmountChange={handleRaiseAmountChange}
					raiseAmount={raiseAmount}
					pokerGame={(gameState.pokerGame ?? null) as PokerGame | null}
					checkAndAdvanceGame={checkAndAdvanceGame}
					finishHand={finishHand}
				/>
			</div>

			{/* Bottom UI Bar: Predictions & Actions */}
			<div className="fixed bottom-0 left-0 z-50 flex items-center justify-between p-6">
				{/* Prediction Component on the left */}
				<div className="w-1/4">
					{roomId && playerId && (
						<Prediction
							roomId={roomId}
							viewerId={playerId}
							communityCards={communityCards}
							viewerCards={viewerCards}
							players={players}
							currentRound={gameState.round}
						/>
					)}
				</div>

				<div className="w-1/2"></div>

				{/* Message Display */}
				<div className="w-1/4"></div>
			</div>

			{/* Tournament Winner Modal */}
			<TournamentWinnerModal
				isOpen={!!gameState.tournamentWinner && !!gameState.gameEnded}
				winner={gameState.tournamentWinner || null}
				roomId={roomId || ""}
				onTournamentCleanup={handleTournamentCleanup}
			/>
		</section>
	)
}

export default GameRoomContent
