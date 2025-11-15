"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"

// Shadcn UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Components
import CardLayout from "@/components/card/CardLayout"

// Game Logic and Types
import { PlayerCardsProps } from "@/common/interface"
import { PlayerActionEnum, PlayerRoleEnum } from "@/common/enum"
import { UIUtils, GameUtils } from "@/lib/GameUtils"
import { cn } from "@/lib/utils"
// No suit conversion needed; CardLayout accepts SuitEnum

export default function PlayerCards({
	player,
	isCurrentPlayer,
	showActions,
	validation,
	processPlayerAction,
	handleRaiseAmountChange,
	raiseAmount,
	playerInfo,
	communityCards,
}: PlayerCardsProps) {
	// Check if player is a viewer
	const isViewer = player.role === PlayerRoleEnum.VIEWER

	// Calculate hand ranking for display during showdown phases
	const getHandRankingDisplay = () => {
		// For the current player, always show hand rankings if they have cards
		if (!isViewer && player.hand && player.hand.length === 2) {
			// If we have community cards, evaluate with them
			if (communityCards && communityCards.length >= 3) {
				const evaluation = GameUtils.evaluatePlayerHand(player, communityCards)
				if (evaluation && evaluation.rank) {
					return GameUtils.getHandRankDisplayName(evaluation.rank)
				}
			} else {
				// If no community cards yet, analyze pocket cards only
				const card1 = player.hand[0]
				const card2 = player.hand[1]

				if (card1.rank === card2.rank) {
					return "One Pair"
				} else {
					// Determine high card
					const rankOrder = [
						"2",
						"3",
						"4",
						"5",
						"6",
						"7",
						"8",
						"9",
						"10",
						"J",
						"Q",
						"K",
						"A",
					]
					const rank1Index = rankOrder.indexOf(card1.rank)
					const rank2Index = rankOrder.indexOf(card2.rank)
					const highRank = rank1Index > rank2Index ? card1.rank : card2.rank
					return `High Card (${highRank})`
				}
			}
		}

		// Return playerInfo.bestHand if no better option available
		return playerInfo.bestHand || ""
	}

	const handRankingDisplay = getHandRankingDisplay()

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-6",
				isViewer && "opacity-60",
			)}
		>
			{/* Don't show any cards for viewers */}
			{!isViewer && (
				<div className="flex -space-x-6">
					<AnimatePresence>
						{player.hand.map((card, i) => {
							const value = String(card.rank)
							// Create unique key combining card properties and index to ensure proper re-rendering
							const uniqueKey = `${card.suit}-${card.rank}-${i}-${player.id}`
							return (
								<motion.div
									key={uniqueKey}
									initial={{ opacity: 0, y: -20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									transition={{ delay: i * 0.1 }}
									className={cn(i === 1 ? "relative top-3" : "")}
								>
									<CardLayout suit={card.suit} value={value} />
								</motion.div>
							)
						})}
					</AnimatePresence>
				</div>
			)}

			{/* Player’s Info */}
			{/* Player's Info */}
			<div className="flex items-center gap-4">
				<Avatar>
					<AvatarImage src="https://github.com/shadcn.png" />
					<AvatarFallback>CN</AvatarFallback>
				</Avatar>
				<div className="flex flex-col">
					<div className="flex items-center gap-1">
						<p className="text-accent-white text-[12px]">{player.name}</p>
						{player.role === PlayerRoleEnum.VIEWER ? (
							<span className="ml-1 rounded bg-red-500 px-1 text-[10px] font-bold text-white">
								VIEWER
							</span>
						) : (
							playerInfo.positions.map((pos, idx) => (
								<span
									key={idx}
									className="rounded bg-black/50 px-1 text-[10px] font-bold text-yellow-400"
								>
									{pos}
								</span>
							))
						)}
						{isCurrentPlayer && player.role !== PlayerRoleEnum.VIEWER && (
							<span className="ml-1 rounded bg-yellow-400 px-1 text-[10px] font-bold text-black">
								Your TURN
							</span>
						)}
					</div>
					<p className="text-accent-white text-[12px]">
						{player.role === PlayerRoleEnum.VIEWER
							? "Eliminated"
							: `Your Chips: $${player.chips}`}
					</p>
					{player.role !== PlayerRoleEnum.VIEWER &&
						playerInfo.currentBet > 0 && (
							<p className="text-[10px] text-green-400">
								Current Bet: ${playerInfo.currentBet}
							</p>
						)}
					{player.role !== PlayerRoleEnum.VIEWER && handRankingDisplay && (
						<p className="text-[10px] font-semibold text-blue-400">
							{handRankingDisplay}
						</p>
					)}
				</div>
			</div>

			{/* Action Buttons */}
			{isViewer ? (
				// Viewer actions - no actions available for viewers
				<div className="mt-4 flex flex-col gap-2">
					<p className="text-center text-xs text-gray-400">
						You&apos;ve been eliminated from the tournament
					</p>
				</div>
			) : (
				// Active player actions
				showActions &&
				validation && (
					<div className="mt-4 flex flex-col gap-2">
						<div className="flex flex-wrap gap-1">
							{validation.allowedActions.includes(PlayerActionEnum.Fold) && (
								<Button
									size="sm"
									variant="outline"
									onClick={() =>
										processPlayerAction(player.id, PlayerActionEnum.Fold)
									}
								>
									Fold
								</Button>
							)}
							{validation.allowedActions.includes(PlayerActionEnum.Check) && (
								<Button
									size="sm"
									variant="outline"
									onClick={() =>
										processPlayerAction(player.id, PlayerActionEnum.Check)
									}
								>
									Check
								</Button>
							)}
							{UIUtils.shouldShowCallButton(validation, player) && (
								<Button
									size="sm"
									variant="outline"
									onClick={() =>
										processPlayerAction(player.id, PlayerActionEnum.Call)
									}
								>
									Call ${validation.callAmount}
								</Button>
							)}
							{UIUtils.shouldShowAllInButton(validation, player) && (
								<Button
									size="sm"
									variant="outline"
									className="border-white text-white hover:bg-white hover:text-black"
									onClick={() =>
										processPlayerAction(player.id, PlayerActionEnum.AllIn)
									}
								>
									All In (${player.chips})
								</Button>
							)}
						</div>

						{validation.allowedActions.includes(PlayerActionEnum.Raise) && (
							<div className="flex gap-1">
								<Input
									type="number"
									placeholder={`Min: ${validation.minRaise}`}
									min={validation.minRaise || 0}
									max={player.chips + player.currentBet}
									value={raiseAmount[player.id] || ""}
									onChange={(e) =>
										handleRaiseAmountChange(player.id, e.target.value)
									}
									className="flex-1"
								/>
								<Button
									size="sm"
									onClick={() =>
										processPlayerAction(
											player.id,
											PlayerActionEnum.Raise,
											raiseAmount[player.id],
										)
									}
									disabled={UIUtils.isRaiseDisabled(
										raiseAmount[player.id],
										validation.minRaise,
									)}
								>
									Raise
								</Button>
							</div>
						)}
					</div>
				)
			)}
		</div>
	)
}
