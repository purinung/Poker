"use client"

import React, { useState, useEffect } from "react"
import { MonteCarloSimulation } from "@/lib/MonteCarloSimulation"
import { GameEngine } from "@/lib/GameEngine"
import { PredictionResult, Card } from "@/common/interface"
import { HandRankEnum } from "@/common/enum"
import { getHandRankDisplayName } from "@/common/label"

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet"

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs"

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
	Card as UICard,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { TrendingUp, BarChart3, Loader2 } from "lucide-react"
import MiniCard from "@/components/card/MiniCard"
import { HandExamples } from "@/lib/HandExamples"

import { Player } from "@/common/interface"

interface PredictionProps {
	roomId: string
	viewerId: string
	communityCards: Card[]
	viewerCards: Card[]
	players: Player[]
	currentRound: string
}

const Prediction = ({
	viewerId,
	communityCards,
	viewerCards,
	players,
}: PredictionProps) => {
	const [prediction, setPrediction] = useState<PredictionResult | null>(null)
	const [isCalculating, setIsCalculating] = useState(false)
	const [isOpen, setIsOpen] = useState(false)
	const [expandedHandType, setExpandedHandType] = useState<string | null>(null)

	// Helper function to get all combinations of k elements from an array
	const getCombinations = <T,>(arr: T[], k: number): T[][] => {
		if (k === 0) return [[]]
		if (arr.length === 0) return []
		const [first, ...rest] = arr
		return [
			...getCombinations(rest, k),
			...getCombinations(rest, k - 1).map((c) => [first, ...c]),
		]
	}

	// Auto-calculate prediction whenever cards change
	useEffect(() => {
		// viewerCards: 2 cards, communityCards: at least 3 cards
		if (viewerCards.length === 2 && communityCards.length >= 3) {
			setIsCalculating(true)
			const numOpponents = players.filter(
				(p) => !p.isFolded && p.id !== viewerId,
			).length

			// Use setTimeout to prevent blocking the UI thread
			setTimeout(() => {
				try {
					const result = MonteCarloSimulation.runSimulation(
						viewerCards,
						communityCards,
						numOpponents,
					)
					setPrediction(result)
				} catch (error) {
					console.error("Prediction calculation failed:", error)
					setPrediction(null)
				} finally {
					setIsCalculating(false)
				}
			}, 0)
		} else {
			setPrediction(null)
			setIsCalculating(false)
		}
	}, [viewerCards, communityCards, players, viewerId])

	// Don't render the trigger if we don't have enough cards
	if (viewerCards.length !== 2 || communityCards.length < 3) {
		return null
	}

	const winRate = prediction ? prediction.winRate.toFixed(1) : "..."
	const canShowPrediction = prediction && !isCalculating

	const tableData = prediction
		? // Create a map for quick lookup of existing hand strengths
		(() => {
			const playerHandMap = new Map(
				prediction.handStrengths.map((h) => [h.handRank, h.percentage]),
			)
			const opponentHandMap = new Map(
				prediction.opponentHandStrengths.map((h) => [
					h.handRank,
					h.percentage,
				]),
			)

			// Show all possible hand ranks, ordered from best to worst
			const allHandRanks = [
				HandRankEnum.ROYALFLUSH,
				HandRankEnum.STRAIGHTFLUSH,
				HandRankEnum.FOUROFKIND,
				HandRankEnum.FULLHOUSE,
				HandRankEnum.FLUSH,
				HandRankEnum.STRAIGHT,
				HandRankEnum.THREEOFAKIND,
				HandRankEnum.TWOPAIR,
				HandRankEnum.ONEPAIR,
				HandRankEnum.HIGHCARD,
			]

			const tableRows = allHandRanks.map((handRank) => {
				const handStrength = prediction.handStrengths.find(
					(h) => h.handRank === handRank,
				)
				return {
					handType: getHandRankDisplayName(handRank),
					handRank: handRank,
					playerOdds: (playerHandMap.get(handRank) || 0).toFixed(1),
					opponentOdds: (opponentHandMap.get(handRank) || 0).toFixed(1),
					playerPercentage: playerHandMap.get(handRank) || 0,
					opponentPercentage: opponentHandMap.get(handRank) || 0,
					tiePercentage: handStrength?.tiePercentage || 0,
					winPercentage: handStrength?.winPercentage || 0,
					losePercentage: handStrength?.losePercentage || 0,
					// Opponent stats
					opponentWinPercentage:
						prediction.opponentHandStrengths.find((h) => h.handRank === handRank)
							?.winPercentage || 0,
					opponentTiePercentage:
						prediction.opponentHandStrengths.find((h) => h.handRank === handRank)
							?.tiePercentage || 0,
					opponentLosePercentage:
						prediction.opponentHandStrengths.find((h) => h.handRank === handRank)
							?.losePercentage || 0,
				}
			})

			// Find highest and lowest percentages
			const maxPlayerPercentage = Math.max(
				...tableRows.map((row) => row.playerPercentage),
			)
			const minPlayerPercentage = Math.min(
				...tableRows
					.filter((row) => row.playerPercentage > 0)
					.map((row) => row.playerPercentage),
			)

			return tableRows.map((row) => {
				// Determine the dominant outcome for this hand type
				const maxOutcome = Math.max(
					row.winPercentage,
					row.tiePercentage,
					row.losePercentage,
				)
				let outcomeColor = "white"
				if (maxOutcome > 0) {
					if (row.winPercentage === maxOutcome) {
						outcomeColor = "green"
					} else if (row.tiePercentage === maxOutcome) {
						outcomeColor = "yellow"
					} else if (row.losePercentage === maxOutcome) {
						outcomeColor = "red"
					}
				}

				return {
					...row,
					isHighest:
						row.playerPercentage === maxPlayerPercentage &&
						maxPlayerPercentage > 0,
					isLowest:
						row.playerPercentage === minPlayerPercentage &&
						minPlayerPercentage > 0 &&
						minPlayerPercentage < maxPlayerPercentage,
					isTie:
						row.playerPercentage > 0 &&
						row.opponentPercentage > 0 &&
						row.playerPercentage === row.opponentPercentage,
					outcomeColor,
				}
			})
		})()
		: []

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="fixed bottom-4 left-4 z-50"
				>
					{isCalculating ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Calculating...
						</>
					) : canShowPrediction ? (
						<>
							<TrendingUp className="mr-2 h-4 w-4" />
							{winRate}% Win Rate
						</>
					) : (
						<>
							<BarChart3 className="mr-2 h-4 w-4" />
							Card Analysis
						</>
					)}
				</Button>
			</SheetTrigger>

			<SheetContent className="bg-accent-black w-96 overflow-y-auto px-2 sm:w-96">
				<SheetHeader>
					<SheetTitle></SheetTitle>
					<SheetDescription></SheetDescription>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					{isCalculating && (
						<UICard className="bg-accent-black">
							<CardContent className="pt-6">
								<div className="flex items-center justify-center space-x-3">
									<Loader2 className="text-accent-white h-6 w-6 animate-spin" />
									<span className="text-accent-white text-base">
										Running simulation...
									</span>
								</div>
							</CardContent>
						</UICard>
					)}

					{canShowPrediction && (
						<>
							{/* Win Rate Overview with Strategic Recommendation */}
							<UICard className="bg-accent-black">
								<CardHeader className="pb-3">
									<CardTitle className="text-accent-white text-xl">
										Win Probability & Strategy
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-4 text-center">
										<div className="text-accent-white text-5xl font-bold">
											{winRate}%
										</div>
										<div className="grid grid-cols-3 gap-2">
											<div className="text-center">
												<div className="text-accent-white text-base font-medium">
													Win
												</div>
												<Badge className="bg-accent-green text-accent-white">
													{prediction.winRate.toFixed(1)}%
												</Badge>
											</div>
											<div className="text-center">
												<div className="text-accent-white text-base font-medium">
													Tie
												</div>
												<Badge className="bg-accent-gray text-accent-white">
													{prediction.tieRate.toFixed(1)}%
												</Badge>
											</div>
											<div className="text-center">
												<div className="text-accent-white text-base font-medium">
													Lose
												</div>
												<Badge className="bg-accent-red text-accent-white">
													{prediction.loseRate.toFixed(1)}%
												</Badge>
											</div>
										</div>
										<p className="text-accent-gray text-sm">
											Based on {prediction.totalSimulations.toLocaleString()}{" "}
											simulations
										</p>

										{/* Current Hand Display */}
										<div className="border-accent-gray/20 mt-4 border-t pt-3">
											<div className="bg-accent-gray/10 rounded-lg p-3 text-center">
												<p className="text-accent-white mb-3 text-base font-medium">
													Your Current Hand
												</p>
												{/* Display the 5 best cards that make your hand */}
												<div className="mb-3 flex flex-wrap justify-center gap-1">
													{(() => {
														try {
															const allCards = [
																...viewerCards,
																...communityCards,
															]
															// Find the best 5 cards by evaluating all combinations
															let bestCards: Card[] = []
															let bestEvaluation = null

															// Get all 5-card combinations
															const combinations = getCombinations(allCards, 5)
															for (const combo of combinations) {
																const evaluation =
																	GameEngine.evaluateFive(combo)
																if (
																	!bestEvaluation ||
																	GameEngine.compareHands(
																		evaluation,
																		bestEvaluation,
																	) > 0
																) {
																	bestEvaluation = evaluation
																	bestCards = combo
																}
															}

															return bestCards.map((card, index) => (
																<MiniCard key={`best-${index}`} card={card} />
															))
														} catch {
															// Fallback to showing all cards if evaluation fails
															return [...viewerCards, ...communityCards].map(
																(card, index) => (
																	<MiniCard
																		key={`fallback-${index}`}
																		card={card}
																	/>
																),
															)
														}
													})()}
												</div>
												{/* Display current hand type */}
												<div className="text-accent-green text-lg font-semibold">
													{(() => {
														try {
															const allCards = [
																...viewerCards,
																...communityCards,
															]
															const currentHandEvaluation =
																GameEngine.evaluateBestHand(allCards)
															return getHandRankDisplayName(
																currentHandEvaluation.rank,
															)
														} catch {
															return "High Card"
														}
													})()}
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</UICard>

							{/* Hand Strength Analysis */}
							<UICard className="bg-accent-black">
								<CardHeader className="pb-3">
									<CardTitle className="text-accent-white text-xl">
										Hand Strength Analysis
									</CardTitle>
								</CardHeader>
								<CardContent>
									<Tabs defaultValue="player" className="w-full">
										<TabsList className="bg-accent-gray/20 grid w-full grid-cols-2 mb-4">
											<TabsTrigger value="player">Player</TabsTrigger>
											<TabsTrigger value="opponent">Opponent</TabsTrigger>
										</TabsList>

										<TabsContent value="player">
											<Table className="w-full table-fixed">
												<TableHeader>
													<TableRow>
														<TableHead className="w-[40%] px-2 text-sm">
															Hand Type
														</TableHead>
														<TableHead className="w-[20%] px-1 text-center text-sm">
															Win
														</TableHead>
														<TableHead className="w-[20%] px-1 text-center text-sm">
															Tie
														</TableHead>
														<TableHead className="w-[20%] px-1 text-center text-sm">
															Lose
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{tableData.map((row) => (
														<React.Fragment key={row.handType}>
															<TableRow className="text-sm">
																<TableCell className="w-[40%] px-2 py-2 font-medium">
																	<button
																		className={`block w-full cursor-pointer truncate text-left text-xs underline-offset-4 hover:underline focus:underline focus:outline-none ${row.outcomeColor === "green"
																			? "text-accent-green"
																			: row.outcomeColor === "yellow"
																				? "text-yellow-400"
																				: row.outcomeColor === "red"
																					? "text-accent-red"
																					: "text-accent-white"
																			}`}
																		onClick={() =>
																			setExpandedHandType(
																				expandedHandType === row.handType
																					? null
																					: row.handType,
																			)
																		}
																		title={row.handType}
																	>
																		{row.handType}
																	</button>
																</TableCell>
																<TableCell className="w-[20%] px-1 py-2 text-center">
																	<Badge className="bg-accent-green text-accent-white px-1 text-xs">
																		{row.winPercentage.toFixed(1)}%
																	</Badge>
																</TableCell>
																<TableCell className="w-[20%] px-1 py-2 text-center">
																	<Badge className="text-accent-white bg-yellow-500 px-1 text-xs">
																		{row.tiePercentage.toFixed(1)}%
																	</Badge>
																</TableCell>
																<TableCell className="w-[20%] px-1 py-2 text-center">
																	<Badge className="bg-accent-red text-accent-white px-1 text-xs">
																		{row.losePercentage.toFixed(1)}%
																	</Badge>
																</TableCell>
															</TableRow>
															{expandedHandType === row.handType && (
																<TableRow>
																	<TableCell colSpan={4} className="py-2">
																		<div className="bg-accent-black max-w-full space-y-2 overflow-hidden rounded-lg p-3">
																			<div>
																				<h4 className="text-accent-white text-sm font-semibold">
																					{row.handType}
																				</h4>
																				<p className="text-accent-gray mt-1 text-xs break-words">
																					{HandExamples.getHandDescription(
																						row.handRank,
																					)}
																				</p>
																			</div>
																			<div>
																				<p className="text-accent-gray mb-1 text-xs">
																					Example:
																				</p>
																				<div className="flex flex-wrap justify-center gap-1">
																					{HandExamples.getExampleHand(
																						row.handRank,
																					).map((card, cardIndex) => (
																						<MiniCard
																							key={`${card.rank}-${card.suit}-${cardIndex}`}
																							card={card}
																						/>
																					))}
																				</div>
																			</div>
																		</div>
																	</TableCell>
																</TableRow>
															)}
														</React.Fragment>
													))}
												</TableBody>
											</Table>
										</TabsContent>

										<TabsContent value="opponent">
											<div className="mb-2 text-center">
												<p className="text-accent-gray text-xs">
													What hands is the opponent holding?
												</p>
											</div>
											<Table className="w-full table-fixed">
												<TableHeader>
													<TableRow>
														<TableHead className="w-[40%] px-2 text-sm">
															Hand Type
														</TableHead>
														<TableHead className="w-[20%] px-1 text-center text-sm">
															Freq
														</TableHead>
														<TableHead className="w-[20%] px-1 text-center text-sm">
															Win
														</TableHead>
														<TableHead className="w-[20%] px-1 text-center text-sm">
															Lose
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{tableData.map((row) => (
														<TableRow key={row.handType} className="text-sm">
															<TableCell className="w-[40%] px-2 py-2 font-medium">
																<span className="text-accent-white block w-full truncate text-left text-xs">
																	{row.handType}
																</span>
															</TableCell>
															<TableCell className="w-[20%] px-1 py-2 text-center">
																<Badge
																	variant="outline"
																	className="text-accent-white border-accent-gray px-1 text-xs"
																>
																	{row.opponentPercentage.toFixed(1)}%
																</Badge>
															</TableCell>
															<TableCell className="w-[20%] px-1 py-2 text-center">
																<Badge className="bg-accent-green text-accent-white px-1 text-xs">
																	{row.opponentWinPercentage.toFixed(1)}%
																</Badge>
															</TableCell>
															<TableCell className="w-[20%] px-1 py-2 text-center">
																<Badge className="bg-accent-red text-accent-white px-1 text-xs">
																	{row.opponentLosePercentage.toFixed(1)}%
																</Badge>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TabsContent>
									</Tabs>
								</CardContent>
							</UICard>
						</>
					)}

					{!canShowPrediction && !isCalculating && (
						<UICard className="bg-accent-black">
							<CardContent className="pt-6">
								<div className="text-accent-gray text-center">
									<BarChart3 className="text-accent-gray mx-auto mb-3 h-12 w-12 opacity-50" />
									<p className="text-accent-gray text-base">
										Prediction will be available once the flop is dealt
									</p>
								</div>
							</CardContent>
						</UICard>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}

export default Prediction
