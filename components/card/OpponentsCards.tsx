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
import { OpponentsCardsProps } from "@/common/interface"
import type { Card } from "@/common/interface"
import {
	RoundEnum,
	PlayerActionEnum,
	SuitEnum,
	PlayerRoleEnum,
} from "@/common/enum"
import { UIUtils, GameUtils } from "@/lib/GameUtils"
import { stringToCard } from "@/lib/Deck"
import { cn } from "@/lib/utils"
// No suit conversion needed; CardLayout accepts SuitEnum

export default function OpponentsCards({
	player,
	currentRound,
	winners,
	showActions,
	validation,
	processPlayerAction,
	handleRaiseAmountChange,
	raiseAmount,
	playerInfo,
	dbPlayerData,
	communityCards,
}: OpponentsCardsProps) {
	const isSHOWDOWN = currentRound === RoundEnum.SHOWDOWN
	const isCARD_REVEAL = currentRound === RoundEnum.CARD_REVEAL
	const isWinner = winners.some((winner) => winner.id === player.id)
	const isFolded = player.isFolded
	const isTURNOwner = playerInfo?.isActive
	const isViewer = player.role === PlayerRoleEnum.VIEWER

	// Get cards from database data during showdown phases
	const getCardsToDisplay = () => {
		// During SHOWDOWN or CARD_REVEAL, try to get cards from database
		if (
			(isSHOWDOWN || isCARD_REVEAL || isWinner) &&
			dbPlayerData &&
			!isViewer
		) {
			// Find the matching player in database data by username (more reliable than ID mapping)
			const dbPlayer = dbPlayerData.find((dp) => dp.username === player.name)
			if (dbPlayer && dbPlayer.firstCard && dbPlayer.secondCard) {
				// Convert database card strings to Card objects
				const dbCards = [
					stringToCard(dbPlayer.firstCard),
					stringToCard(dbPlayer.secondCard),
				].filter(Boolean) as Card[]

				if (dbCards.length === 2) {
					return dbCards
				}
			}
		}

		// Fallback to player.hand or show backs
		return isSHOWDOWN || isCARD_REVEAL || isWinner ? player.hand : [null, null]
	}

	const cardsToDisplay = getCardsToDisplay()

	// Get hand ranking for display during showdown phases
	const getHandRankingDisplay = () => {
		// Only show hand rankings during CARD_REVEAL or SHOWDOWN phases
		if (
			(isCARD_REVEAL || isSHOWDOWN) &&
			!isViewer &&
			communityCards &&
			communityCards.length >= 3
		) {
			// Try to get cards from database data first
			const dbPlayer = dbPlayerData?.find((dp) => dp.username === player.name)
			if (dbPlayer && dbPlayer.firstCard && dbPlayer.secondCard) {
				const dbCards = [
					stringToCard(dbPlayer.firstCard),
					stringToCard(dbPlayer.secondCard),
				].filter(Boolean) as Card[]

				if (dbCards.length === 2) {
					// Create a temporary player object with the database cards for evaluation
					const playerWithCards = { ...player, hand: dbCards }
					const evaluation = GameUtils.evaluatePlayerHand(
						playerWithCards,
						communityCards,
					)
					if (evaluation && evaluation.rank) {
						return GameUtils.getHandRankDisplayName(evaluation.rank)
					}
				}
			}

			// Fallback to existing player hand if available
			if (player.hand && player.hand.length === 2) {
				const evaluation = GameUtils.evaluatePlayerHand(player, communityCards)
				if (evaluation && evaluation.rank) {
					return GameUtils.getHandRankDisplayName(evaluation.rank)
				}
			}
		}

		// Return playerInfo.bestHand if no better option available
		return playerInfo?.bestHand || ""
	}

	const handRankingDisplay = getHandRankingDisplay()

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-6 transition-opacity duration-500",
				(isFolded && !isSHOWDOWN && !isCARD_REVEAL) || isViewer
					? "opacity-50"
					: "opacity-100",
			)}
		>
			{/* Don't show any cards for viewers */}
			{!isViewer && (
				<div className="flex -space-x-6">
					<AnimatePresence>
						{cardsToDisplay.map((card, i) => {
							// If showing backs, use dummy suit/value
							const value = card ? String(card.rank) : "?"
							const suit = card ? card.suit : SuitEnum.SPADES
							// Create unique key that changes when cards change or round changes
							const uniqueKey = card
								? `${card.suit}-${card.rank}-${i}-${player.id}-${currentRound}`
								: `back-${i}-${player.id}-${currentRound}`
							return (
								<motion.div
									key={uniqueKey}
									initial={{ opacity: 0, y: -20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									transition={{ delay: i * 0.1 }}
									className={cn(i === 1 ? "relative top-3" : "")}
								>
									<CardLayout
										variant={
											isSHOWDOWN || isCARD_REVEAL || isWinner ? "front" : "back"
										}
										suit={suit}
										value={value}
									/>
								</motion.div>
							)
						})}
					</AnimatePresence>
				</div>
			)}

			{/* Player’s Info */}
			<div className="flex items-center gap-4">
				<Avatar>
					<AvatarImage src="https://github.com/shadcn.png" />
					<AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
				</Avatar>
				<div className="flex flex-col">
					<div className="flex items-center gap-1">
						<p className="text-accent-white text-[12px]">{player.name}</p>
						{isViewer ? (
							<span className="rounded bg-gray-600 px-1 text-[10px] font-bold text-gray-300">
								VIEWER
							</span>
						) : (
							playerInfo?.positions?.map((pos, idx) => (
								<span
									key={idx}
									className="rounded bg-black/50 px-1 text-[10px] font-bold text-yellow-400"
								>
									{pos}
								</span>
							))
						)}
						{!isViewer && isTURNOwner && (
							<span className="ml-1 rounded bg-yellow-400 px-1 text-[10px] font-bold text-black">
								Playing
							</span>
						)}
					</div>
					<p className="text-accent-white text-[12px]">
						{isViewer ? "Eliminated" : `Chips: $${player.chips}`}
					</p>
					{!isViewer && (playerInfo?.currentBet ?? 0) > 0 && (
						<p className="text-[10px] text-green-400">
							Current Bet: ${playerInfo?.currentBet ?? 0}
						</p>
					)}
					{!isViewer &&
						(currentRound === RoundEnum.SHOWDOWN ||
							currentRound === RoundEnum.CARD_REVEAL) && (
							<p className="text-[10px] font-semibold text-blue-400">
								{handRankingDisplay}
							</p>
						)}
				</div>
			</div>
			{/* Action Buttons for testing (hide for viewers) */}
			{!isViewer && showActions && validation && (
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
			)}
		</div>
	)
}
