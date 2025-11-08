"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Player } from "@/common/interface"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TournamentWinnerModalProps {
	isOpen: boolean
	winner: Player | null
	roomId: string
	onTournamentCleanup: () => Promise<void>
}

const TournamentWinnerModal: React.FC<TournamentWinnerModalProps> = ({
	isOpen,
	winner,
	roomId,
	onTournamentCleanup,
}) => {
	const [timeLeft, setTimeLeft] = useState(10) // 10 seconds countdown
	const [isCleaning, setIsCleaning] = useState(false)

	const handleAutoCleanup = React.useCallback(async () => {
		if (isCleaning) return
		setIsCleaning(true)
		try {
			await onTournamentCleanup()
		} catch (error) {
			console.error("Failed to cleanup tournament:", error)
		}
	}, [isCleaning, onTournamentCleanup])

	useEffect(() => {
		if (!isOpen) return

		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				// Don't auto-cleanup if user already initiated cleanup
				if (isCleaning) {
					clearInterval(timer)
					return prev
				}

				if (prev <= 1) {
					clearInterval(timer)
					// Auto-cleanup when timer reaches 0
					handleAutoCleanup()
					return 0
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(timer)
	}, [isOpen, isCleaning, handleAutoCleanup])

	if (!isOpen || !winner) return null

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
			>
				<motion.div
					initial={{ scale: 0.5, opacity: 0, y: 50 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.5, opacity: 0, y: 50 }}
					className="bg-accent-black relative mx-4 max-w-md rounded-lg border-2 border-yellow-400 p-8 shadow-2xl"
				>
					{/* Confetti/Trophy Icon */}
					<div className="mb-6 text-center">
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/20 text-4xl">
							🏆
						</div>
						<h1 className="font-secondary text-accent-white text-[32px] drop-shadow-lg">
							TOURNAMENT WINNER!
						</h1>
					</div>

					{/* Winner Info */}
					<div className="mb-6 flex flex-col items-center text-center">
						<Avatar className="mb-3 h-16 w-16 border-4 border-yellow-400">
							<AvatarImage src="/avatar.png" />
							<AvatarFallback className="text-accent-black bg-yellow-400 text-2xl font-bold">
								{winner.name?.[0]?.toUpperCase() || "?"}
							</AvatarFallback>
						</Avatar>
						<h2 className="font-secondary text-accent-white text-[24px] drop-shadow-md">
							{winner.name}
						</h2>
						<p className="text-accent-white text-[16px]">
							Final Chips: ${winner.chips.toLocaleString()}
						</p>
					</div>

					{/* Congratulations Message */}
					<div className="bg-accent-gray/20 border-accent-gray/30 mb-6 rounded-lg border p-4 text-center">
						<p className="text-accent-white text-primary">
							🎉 Congratulations! You&apos;ve eliminated all other players and
							won the tournament! 🎉
						</p>
					</div>

					{/* Countdown Timer */}
					<div className="mb-6 text-center">
						{isCleaning ? (
							<p className="text-accent-gray text-[14px]">
								Cleaning up tournament...
							</p>
						) : (
							<>
								<p className="text-accent-gray text-[14px]">
									Automatically leaving in {timeLeft} seconds
								</p>
								<div className="bg-accent-gray/30 mt-2 h-2 w-full overflow-hidden rounded-full">
									<motion.div
										className="bg-accent-red h-full"
										initial={{ width: "100%" }}
										animate={{ width: "0%" }}
										transition={{ duration: 10, ease: "linear" }}
									/>
								</div>
							</>
						)}
					</div>

					{/* Room Info */}
					<div className="text-accent-gray mt-4 text-center text-[12px]">
						Room: {roomId}
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	)
}

export default TournamentWinnerModal
