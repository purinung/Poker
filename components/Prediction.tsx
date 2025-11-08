"use client"

import { useState, useEffect } from "react"
import { MonteCarloSimulation } from "@/lib/MonteCarloSimulation"
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
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card"

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
import { TrendingUp, BarChart3, Target, Loader2 } from "lucide-react"
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

				return allHandRanks.map((handRank) => ({
					handType: getHandRankDisplayName(handRank),
					handRank: handRank,
					playerOdds: (playerHandMap.get(handRank) || 0).toFixed(1),
					opponentOdds: (opponentHandMap.get(handRank) || 0).toFixed(1),
				}))
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

										{/* Integrated Strategic Recommendation */}
										<div className="border-accent-gray/20 mt-4 border-t pt-3">
											{prediction.winRate >= 70 ? (
												<div className="bg-accent-green/10 rounded-lg p-3 text-left">
													<div className="mb-2 flex items-center gap-2">
														<Target className="text-accent-green h-4 w-4" />
														<p className="text-accent-green text-base font-medium">
															Strong Hand - Consider Aggressive Play
														</p>
													</div>
													<p className="text-accent-gray text-sm">
														Your win probability is excellent. This is a good
														spot for betting and raising.
													</p>
												</div>
											) : prediction.winRate >= 50 ? (
												<div className="bg-accent-gray/10 rounded-lg p-3 text-left">
													<div className="mb-2 flex items-center gap-2">
														<Target className="text-accent-gray h-4 w-4" />
														<p className="text-accent-gray text-base font-medium">
															Moderate Hand - Play Cautiously
														</p>
													</div>
													<p className="text-accent-gray text-sm">
														You have decent chances. Consider the pot odds and
														opponent&apos;s actions.
													</p>
												</div>
											) : (
												<div className="bg-accent-red/10 rounded-lg p-3 text-left">
													<div className="mb-2 flex items-center gap-2">
														<Target className="text-accent-red h-4 w-4" />
														<p className="text-accent-red text-base font-medium">
															Weak Hand - Consider Folding
														</p>
													</div>
													<p className="text-accent-gray text-sm">
														Low win probability. Unless the pot odds are
														excellent, folding might be wise.
													</p>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</UICard>

							{/* Hand Strength Distribution */}
							<UICard className="bg-accent-black">
								<CardHeader className="pb-3">
									<CardTitle className="text-accent-white text-xl">
										Hand Strength Analysis
									</CardTitle>
								</CardHeader>
								<CardContent>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="text-sm">Hand Type</TableHead>
												<TableHead className="text-center text-sm">
													You
												</TableHead>
												<TableHead className="text-center text-sm">
													Opponent
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{tableData.map((row) => (
												<TableRow key={row.handType} className="text-sm">
													<TableCell className="py-2 font-medium">
														<HoverCard>
															<HoverCardTrigger asChild>
																<span className="cursor-help hover:underline">
																	{row.handType}
																</span>
															</HoverCardTrigger>
															<HoverCardContent
																className="bg-accent-black w-64"
																align="start"
															>
																<div className="space-y-3">
																	<div>
																		<h4 className="text-accent-white text-base font-semibold">
																			{row.handType}
																		</h4>
																		<p className="text-accent-gray mt-1 text-sm">
																			{HandExamples.getHandDescription(
																				row.handRank,
																			)}
																		</p>
																	</div>
																	<div>
																		<p className="text-accent-gray mb-2 text-sm">
																			Example:
																		</p>
																		<div className="flex justify-center gap-1">
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
															</HoverCardContent>
														</HoverCard>
													</TableCell>
													<TableCell className="py-2 text-center">
														<Badge className="bg-accent-green text-accent-white text-sm">
															{row.playerOdds}%
														</Badge>
													</TableCell>
													<TableCell className="py-2 text-center">
														<Badge className="bg-accent-gray text-accent-white text-sm">
															{row.opponentOdds}%
														</Badge>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
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
