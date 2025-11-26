import {
	Card,
	EvaluatedHand,
	ALL_CARDS,
	HandStrengthResult,
	PredictionResult,
} from "@/common/interface"
import { HandRankEnum, RankEnum, SuitEnum } from "@/common/enum"
import { getHandRankDisplayName, VALIDATION_ERRORS } from "@/common/label"
import { GameEngine } from "./GameEngine"
import { MONTE_CARLO_CONFIG } from "@/common/constant"

export class MonteCarloSimulation {
	private static readonly SIMULATION_COUNT = MONTE_CARLO_CONFIG.SIMULATION_COUNT

	// Memoization cache to prevent recalculation when cards haven't changed
	private static cache = new Map<string, PredictionResult>()

	/**
	 * Creates a cache key from player cards and community cards
	 */
	private static createCacheKey(
		playerCards: Card[],
		communityCards: Card[],
		numOpponents: number,
	): string {
		const playerKey = playerCards
			.map((c) => `${c.rank}${c.suit}`)
			.sort()
			.join("")
		const communityKey = communityCards
			.map((c) => `${c.rank}${c.suit}`)
			.sort()
			.join("")
		return `${playerKey}-${communityKey}-${numOpponents}`
	}

	/**
	 * Runs Monte Carlo simulation for Texas Hold'em prediction
	 * @param playerCards - The player's hole cards (2 cards)
	 * @param communityCards - The community cards on the board (3-5 cards)
	 * @param numOpponents - Number of opponents (default 1)
	 * @returns Prediction results with win rates and hand strength distributions
	 */
	public static runSimulation(
		playerCards: Card[],
		communityCards: Card[],
		numOpponents: number = 1,
	): PredictionResult {
		if (playerCards.length !== 2) {
			throw new Error(VALIDATION_ERRORS.PLAYER_EXACTLY_TWO_CARDS)
		}

		if (communityCards.length < 3 || communityCards.length > 5) {
			throw new Error(VALIDATION_ERRORS.COMMUNITY_CARDS_3_TO_5)
		}

		// Check cache first for memoization
		const cacheKey = this.createCacheKey(
			playerCards,
			communityCards,
			numOpponents,
		)
		const cached = this.cache.get(cacheKey)
		if (cached) {
			return cached
		}

		const usedCards = new Set(
			[...playerCards, ...communityCards].map(
				(card) => `${card.rank}-${card.suit}`,
			),
		)

		const availableCards = ALL_CARDS.filter(
			(card) => !usedCards.has(`${card.rank}-${card.suit}`),
		)

		// Use requestIdleCallback for better performance, fallback to setTimeout
		const result = this.runSimulationSync(
			playerCards,
			communityCards,
			availableCards,
			numOpponents,
		)

		// Cache the result
		this.cache.set(cacheKey, result)

		// Clean cache if it gets too large (prevent memory leaks)
		if (this.cache.size > 100) {
			const firstKey = this.cache.keys().next().value
			if (firstKey) {
				this.cache.delete(firstKey)
			}
		}

		return result
	}

	/**
	 * Synchronous simulation runner (extracted for better organization)
	 */
	private static runSimulationSync(
		playerCards: Card[],
		communityCards: Card[],
		availableCards: Card[],
		numOpponents: number,
	): PredictionResult {
		let wins = 0
		let ties = 0
		let losses = 0

		interface HandStrengthTracker {
			count: number
			wins: number
			ties: number
			losses: number
		}

		const playerHandStrengths: { [key in HandRankEnum]: HandStrengthTracker } =
			{
				HIGHCARD: { count: 0, wins: 0, ties: 0, losses: 0 },
				ONEPAIR: { count: 0, wins: 0, ties: 0, losses: 0 },
				TWOPAIR: { count: 0, wins: 0, ties: 0, losses: 0 },
				THREEOFAKIND: { count: 0, wins: 0, ties: 0, losses: 0 },
				STRAIGHT: { count: 0, wins: 0, ties: 0, losses: 0 },
				FLUSH: { count: 0, wins: 0, ties: 0, losses: 0 },
				FULLHOUSE: { count: 0, wins: 0, ties: 0, losses: 0 },
				FOUROFKIND: { count: 0, wins: 0, ties: 0, losses: 0 },
				STRAIGHTFLUSH: { count: 0, wins: 0, ties: 0, losses: 0 },
				ROYALFLUSH: { count: 0, wins: 0, ties: 0, losses: 0 },
			}

		const opponentHandStrengths: {
			[key in HandRankEnum]: HandStrengthTracker
		} = {
			HIGHCARD: { count: 0, wins: 0, ties: 0, losses: 0 },
			ONEPAIR: { count: 0, wins: 0, ties: 0, losses: 0 },
			TWOPAIR: { count: 0, wins: 0, ties: 0, losses: 0 },
			THREEOFAKIND: { count: 0, wins: 0, ties: 0, losses: 0 },
			STRAIGHT: { count: 0, wins: 0, ties: 0, losses: 0 },
			FLUSH: { count: 0, wins: 0, ties: 0, losses: 0 },
			FULLHOUSE: { count: 0, wins: 0, ties: 0, losses: 0 },
			FOUROFKIND: { count: 0, wins: 0, ties: 0, losses: 0 },
			STRAIGHTFLUSH: { count: 0, wins: 0, ties: 0, losses: 0 },
			ROYALFLUSH: { count: 0, wins: 0, ties: 0, losses: 0 },
		}

		for (let i = 0; i < this.SIMULATION_COUNT; i++) {
			const simulationResult = this.runSingleSimulation(
				playerCards,
				communityCards,
				availableCards,
				numOpponents,
			)

			// Track results
			if (simulationResult.playerWins) {
				wins++
			} else if (simulationResult.isTie) {
				ties++
			} else {
				losses++
			}

			// Track hand strengths with win/tie/lose breakdown
			const playerRank = simulationResult.playerHand.rank
			const opponentRank = simulationResult.bestOpponentHand.rank

			playerHandStrengths[playerRank].count++
			opponentHandStrengths[opponentRank].count++

			if (simulationResult.playerWins) {
				playerHandStrengths[playerRank].wins++
				opponentHandStrengths[opponentRank].losses++
			} else if (simulationResult.isTie) {
				playerHandStrengths[playerRank].ties++
				opponentHandStrengths[opponentRank].ties++
			} else {
				playerHandStrengths[playerRank].losses++
				opponentHandStrengths[opponentRank].wins++
			}
		}

		return {
			winRate: (wins / this.SIMULATION_COUNT) * 100,
			tieRate: (ties / this.SIMULATION_COUNT) * 100,
			loseRate: (losses / this.SIMULATION_COUNT) * 100,
			handStrengths: this.convertToHandStrengthResults(playerHandStrengths),
			opponentHandStrengths: this.convertToHandStrengthResults(
				opponentHandStrengths,
			),
			totalSimulations: this.SIMULATION_COUNT,
		}
	}

	/**
	 * Runs a single simulation round
	 */
	private static runSingleSimulation(
		playerCards: Card[],
		communityCards: Card[],
		availableCards: Card[],
		numOpponents: number,
	): {
		playerWins: boolean
		isTie: boolean
		playerHand: EvaluatedHand
		bestOpponentHand: EvaluatedHand
	} {
		// Shuffle available cards
		const shuffledCards = [...availableCards]
		this.shuffleArray(shuffledCards)

		let cardIndex = 0

		// Complete the community cards if needed (for turn/river)
		const finalCommunityCards = [...communityCards]
		while (finalCommunityCards.length < 5) {
			finalCommunityCards.push(shuffledCards[cardIndex++])
		}

		// Deal opponent hands
		const opponentHands: Card[][] = []
		for (let i = 0; i < numOpponents; i++) {
			const opponentHand = [
				shuffledCards[cardIndex++],
				shuffledCards[cardIndex++],
			]
			opponentHands.push(opponentHand)
		}

		// Evaluate player hand
		const playerAllCards = [...playerCards, ...finalCommunityCards]
		const playerHand = GameEngine.evaluateBestHand(playerAllCards)

		// Evaluate opponent hands
		const opponentEvaluations = opponentHands.map((opponentCards) => {
			const opponentAllCards = [...opponentCards, ...finalCommunityCards]
			return GameEngine.evaluateBestHand(opponentAllCards)
		})

		// Find the best opponent hand
		let bestOpponentHand = opponentEvaluations[0]
		for (let i = 1; i < opponentEvaluations.length; i++) {
			if (
				GameEngine.compareHands(opponentEvaluations[i], bestOpponentHand) > 0
			) {
				bestOpponentHand = opponentEvaluations[i]
			}
		}

		// Compare player hand with best opponent hand
		const comparison = GameEngine.compareHands(playerHand, bestOpponentHand)

		return {
			playerWins: comparison > 0,
			isTie: comparison === 0,
			playerHand,
			bestOpponentHand,
		}
	}

	/**
	 * Shuffles an array in place using Fisher-Yates algorithm
	 */
	private static shuffleArray<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[array[i], array[j]] = [array[j], array[i]]
		}
	}

	/**
	 * Converts hand strength counts to percentage results
	 */
	private static convertToHandStrengthResults(handStrengths: {
		[key in HandRankEnum]: {
			count: number
			wins: number
			ties: number
			losses: number
		}
	}): HandStrengthResult[] {
		const total = Object.values(handStrengths).reduce(
			(sum, tracker) => sum + tracker.count,
			0,
		)

		return Object.entries(handStrengths)
			.map(([handRank, tracker]) => ({
				handRank: handRank as HandRankEnum,
				count: tracker.count,
				percentage: total > 0 ? (tracker.count / total) * 100 : 0,
				wins: tracker.wins,
				ties: tracker.ties,
				losses: tracker.losses,
				winPercentage:
					tracker.count > 0 ? (tracker.wins / tracker.count) * 100 : 0,
				tiePercentage:
					tracker.count > 0 ? (tracker.ties / tracker.count) * 100 : 0,
				losePercentage:
					tracker.count > 0 ? (tracker.losses / tracker.count) * 100 : 0,
			}))
			.filter((result) => result.count > 0)
			.sort((a, b) => b.percentage - a.percentage)
	}

	/**
	 * Gets hand rank display name for UI
	 */
	public static getHandRankDisplayName(handRank: HandRankEnum): string {
		return getHandRankDisplayName(handRank)
	}

	/**
	 * Creates a sample card for testing purposes
	 */
	public static createSampleCard(rank: RankEnum, suit: SuitEnum): Card {
		return { rank, suit }
	}
}
