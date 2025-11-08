"use client"
import Link from "next/link"
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"

import { useEffect, useState } from "react"
import Modal from "@/components/ui/modal"
import { GameRoom } from "@/common/interface"
import { useRouter } from "next/navigation"
import { GameStatusEnum } from "@/common/enum"
import { VALIDATION_ERRORS, UI_LABELS } from "@/common/label"

const Lobby = () => {
	const router = useRouter()
	const [rooms, setRooms] = useState<GameRoom[]>([])
	const [loading, setLoading] = useState(true)
	const [username, setUsername] = useState("")
	const [showModal, setShowModal] = useState(false)
	const [roomName, setRoomName] = useState("")
	const [playerMax, setPlayerMax] = useState(4)
	const [creating, setCreating] = useState(false)

	useEffect(() => {
		fetch("/api/auth/check", {
			credentials: "include",
		})
			.then((res) => {
				if (res.ok) {
					return res.json()
				} else {
					router.replace("/")
					return null
				}
			})
			.then((data) => {
				if (data?.username) {
					setUsername(data.username)

					// Check if player is already in a room
					if (data.gameRoomId && data.gameRoom) {
						// Only redirect if the room is still active (not finished)
						if (data.gameRoom.status !== GameStatusEnum.FINISHED) {
							router.replace(`/gameroom/${data.gameRoom.id}`)
							return
						}
					}
				} else {
					setUsername("")
				}
			})
			.catch(() => {
				setUsername("")
				router.replace("/")
			})
	}, [router])

	useEffect(() => {
		const fetchRooms = async () => {
			try {
				const res = await fetch("/api/gameroom")
				const data = await res.json()
				setRooms(data)
			} catch {
				setRooms([])
			} finally {
				setLoading(false)
			}
		}
		fetchRooms()
	}, [])

	const handleLogout = async () => {
		await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "include",
		})
		router.replace("/")
	}

	const handleJoin = async (roomId: string) => {
		// Check session cookie before redirect
		const res = await fetch("/api/auth/check", { credentials: "include" })
		if (!res.ok) {
			router.replace("/")
			return
		}
		// Get playerId from session
		const playerRes = await fetch("/api/auth/check", { credentials: "include" })
		const playerData = await playerRes.json()
		const playerId = playerData?.id
		if (!playerId) {
			router.replace("/")
			return
		}
		// Save player join to DB, send playerId in body
		const joinRes = await fetch(`/api/gameroom/${roomId}/join`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ playerId }),
		})
		const data = await joinRes.json()
		if (joinRes.ok && data.player?.id) {
			router.push(`/gameroom/${roomId}?playerId=${data.player.id}`)
		} else {
			// Check if the error includes a redirect suggestion
			if (data.redirect) {
				const shouldRedirect = confirm(
					`${data.error}\n\nWould you like to go back to your current room?`,
				)
				if (shouldRedirect) {
					router.push(data.redirect)
				}
			} else {
				alert(data.error || VALIDATION_ERRORS.FAILED_TO_JOIN_ROOM)
			}
		}
	}

	// Open modal
	const openCreateRoomModal = () => {
		setRoomName("")
		setShowModal(true)
	}

	// Handle modal submit
	const handleCreateRoom = async (e?: React.FormEvent) => {
		if (e) e.preventDefault()
		if (!roomName.trim()) return
		setCreating(true)
		try {
			const res = await fetch("/api/gameroom", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ name: roomName, playerMax }),
			})
			const data = await res.json()
			if (res.ok && data.id) {
				setShowModal(false)
				setRoomName("")
				await handleJoin(data.id)
			} else {
				alert(data.error || VALIDATION_ERRORS.FAILED_TO_CREATE_ROOM)
			}
		} catch {
			alert(VALIDATION_ERRORS.ERROR_CREATING_ROOM)
		}
		setCreating(false)
	}

	return (
		<section className="relative flex w-full flex-col p-6">
			{/* Top bar */}
			<div className="mb-2 flex items-center justify-between">
				<div>
					<h2 className="text-header text-white">PREDICTION</h2>
					<p className="text-primary text-accent-red">POKER LOBBY</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-4">
						<span className="text-primary font-semibold">
							{username && `Welcome, ${username}`}
						</span>
						<button className="btn-primary text-base" onClick={handleLogout}>
							Logout
						</button>
						<button
							className="btn-primary text-base"
							onClick={openCreateRoomModal}
						>
							Create Room
						</button>
					</div>
				</div>
			</div>

			{/* Table */}
			<Table className="mt-6">
				<TableCaption>Good luck at the tables!</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[300px]">ROOM NAME</TableHead>
						<TableHead>PLAYER</TableHead>
						<TableHead className="w-1/10 text-right">ACTION</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="text-gray-300">
					{loading ? (
						<TableRow>
							<TableCell colSpan={3} className="text-center">
								Loading...
							</TableCell>
						</TableRow>
					) : rooms.length === 0 ? (
						<TableRow>
							<TableCell colSpan={3} className="text-center">
								No rooms found.
							</TableCell>
						</TableRow>
					) : (
						rooms.map((item) => {
							const currentPlayers = item.playerCount || 0
							const isFull = currentPlayers >= item.playerMax
							return (
								<TableRow key={item.id}>
									<TableCell>{item.name}</TableCell>
									<TableCell>{`${currentPlayers} / ${item.playerMax}`}</TableCell>
									<TableCell className="text-right">
										<button
											className={`btn-primary ${isFull ? "cursor-not-allowed bg-gray-800 hover:bg-gray-700" : ""}`}
											disabled={isFull}
											onClick={() => handleJoin(item.id)}
										>
											{isFull ? "Full" : "Join"}
										</button>
									</TableCell>
								</TableRow>
							)
						})
					)}
				</TableBody>
			</Table>
			{/* Modal for creating room */}
			<Modal
				isOpen={showModal}
				onClose={() => setShowModal(false)}
				title={UI_LABELS.CREATE_ROOM}
			>
				<form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
					<input
						id="roomName"
						type="text"
						value={roomName}
						onChange={(e) => setRoomName(e.target.value)}
						className="bg-accent-black rounded-[4px] px-3 py-2"
						placeholder="Enter room name"
						autoFocus
						required
					/>

					<h3 className="text-accent-black text-[20px] font-bold">
						Max Players
					</h3>
					<select
						id="playerMax"
						value={playerMax}
						onChange={(e) =>
							setPlayerMax(Math.max(2, Math.min(9, Number(e.target.value))))
						}
						className="bg-accent-black rounded-[4px] px-2 py-2"
						required
					>
						{[...Array(8)].map((_, i) => {
							const val = i + 2
							return (
								<option key={val} value={val}>
									{val}
								</option>
							)
						})}
					</select>

					<button
						type="submit"
						className="btn-primary"
						disabled={creating || !roomName.trim()}
					>
						{creating ? UI_LABELS.CREATING_ROOM : UI_LABELS.CREATE_ROOM}
					</button>
				</form>
			</Modal>

			{/* Back button bottom right */}
			<div className="fixed right-6 bottom-6">
				<Link href="/">
					<button className="btn-primary">Back</button>
				</Link>
			</div>
		</section>
	)
}

export default Lobby
