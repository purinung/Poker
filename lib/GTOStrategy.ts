import {
	Card,
	GTOStrategy,
	GTOLevel,
	GTOActionRecommendation,
	BettingSizingGTO,
	ActionFrequencyGTO,
} from "@/common/interface"
import { RoundEnum, PositionEnum } from "@/common/enum"

export class GTOStrategyCalculator {
	// Define the 5 GTO levels with matching color scheme
	private static readonly GTO_LEVELS: Record<number, GTOLevel> = {
		5: {
			tier: 5,
			name: "PREMIUM AGGRO",
			description: "Maximum value extraction - Premium hands",
			color: "#ffffff",
			bgColor: "#558378", // accent-green
			icon: "💎",
		},
		4: {
			tier: 4,
			name: "VALUE BET",
			description: "Strong value betting - Good equity",
			color: "#ffffff",
			bgColor: "#999589", // accent-gray (lighter)
			icon: "🎯",
		},
		3: {
			tier: 3,
			name: "MIXED PLAY",
			description: "Balanced strategy - Medium strength",
			color: "#ffffff",
			bgColor: "#666461", // darker gray
			icon: "⚖️",
		},
		2: {
			tier: 2,
			name: "DEFENSIVE",
			description: "Pot control - Marginal hands",
			color: "#ffffff",
			bgColor: "#4a453f", // very dark gray
			icon: "🛡️",
		},
		1: {
			tier: 1,
			name: "FOLD/BLUFF",
			description: "High fold frequency or selective bluffs",
			color: "#ffffff",
			bgColor: "#ff2226", // accent-red
			icon: "⚡",
		},
	}

	/**
	 * Calculate GTO strategy recommendation based on hand strength and game context
	 */
	static calculateGTOStrategy(
		winRate: number,
		tieRate: number,
		handCards: Card[],
		communityCards: Card[],
		numOpponents: number,
		currentRound: RoundEnum,
		position?: PositionEnum,
	): GTOStrategy {
		// Calculate hand strength category
		const handStrength = this.categorizeHandStrength(winRate, tieRate)

		// Calculate action recommendation
		const action = this.calculateActionRecommendation(
			winRate,
			handStrength,
			currentRound,
			numOpponents,
			position,
		)

		// Calculate betting sizing
		const bettingSizing = this.calculateBettingSizing(
			winRate,
			handStrength,
			currentRound,
		)

		// Calculate mixed strategy frequencies
		const frequency = this.calculateActionFrequencies(
			winRate,
			handStrength,
			currentRound,
			numOpponents,
		)

		// Generate reasoning
		const reasoning = this.generateReasoning(
			winRate,
			handStrength,
			action,
			currentRound,
			numOpponents,
		)

		// Calculate confidence based on hand strength and position
		const confidence = this.calculateConfidence(
			winRate,
			handStrength,
			position,
			numOpponents,
		)

		// Determine GTO level based on hand strength and action priority
		const level = this.determineGTOLevel(
			winRate,
			handStrength,
			action.priority,
			confidence,
		)

		return {
			level,
			action,
			bettingSizing,
			frequency,
			reasoning,
			confidence,
		}
	}

	/**
	 * Categorize hand strength for GTO decision making
	 */
	private static categorizeHandStrength(
		winRate: number,
		tieRate: number,
	): "premium" | "strong" | "medium" | "weak" | "bluff" {
		const totalEquity = winRate + tieRate / 2

		if (totalEquity >= 80) return "premium"
		if (totalEquity >= 65) return "strong"
		if (totalEquity >= 45) return "medium"
		if (totalEquity >= 25) return "weak"
		return "bluff"
	}

	/**
	 * Calculate primary action recommendation based on GTO principles
	 */
	private static calculateActionRecommendation(
		winRate: number,
		handStrength: string,
		currentRound: RoundEnum,
		numOpponents: number,
		position?: PositionEnum,
	): GTOActionRecommendation {
		const isLatePosition = position === PositionEnum.Dealer

		// Premium hands (80%+ equity) - Always aggressive
		if (handStrength === "premium") {
			return {
				primary: "bet",
				alternative: "raise",
				priority: 5,
			}
		}

		// Strong hands (65-80% equity) - Mostly aggressive, some calls
		if (handStrength === "strong") {
			if (numOpponents <= 2 || isLatePosition) {
				return {
					primary: "bet",
					alternative: "call",
					priority: 4,
				}
			} else {
				return {
					primary: "call",
					alternative: "bet",
					priority: 4,
				}
			}
		}

		// Medium hands (45-65% equity) - Mixed strategy
		if (handStrength === "medium") {
			if (currentRound === RoundEnum.PREFLOP && isLatePosition) {
				return {
					primary: "call",
					alternative: "bet",
					priority: 3,
				}
			} else if (numOpponents <= 2) {
				return {
					primary: "call",
					alternative: "check",
					priority: 3,
				}
			} else {
				return {
					primary: "check",
					alternative: "call",
					priority: 2,
				}
			}
		}

		// Weak hands (25-45% equity) - Mostly defensive
		if (handStrength === "weak") {
			if (
				currentRound === RoundEnum.PREFLOP &&
				isLatePosition &&
				numOpponents <= 1
			) {
				return {
					primary: "call",
					alternative: "fold",
					priority: 2,
				}
			} else {
				return {
					primary: "check",
					alternative: "fold",
					priority: 1,
				}
			}
		}

		// Bluff hands (<25% equity) - Selective aggression
		if (
			isLatePosition &&
			numOpponents <= 2 &&
			currentRound !== RoundEnum.RIVER
		) {
			return {
				primary: "bet", // Bluff opportunity
				alternative: "fold",
				priority: 2,
			}
		} else {
			return {
				primary: "fold",
				alternative: "check",
				priority: 1,
			}
		}
	}

	/**
	 * Calculate optimal betting sizes based on GTO principles
	 */
	private static calculateBettingSizing(
		winRate: number,
		handStrength: string,
		currentRound: RoundEnum,
	): BettingSizingGTO {
		// Standard GTO sizing based on hand strength and board texture
		switch (handStrength) {
			case "premium":
				return {
					recommended: 0.75, // 3/4 pot for maximum value
					alternatives: [1.0, 0.67],
					reasoning: "Large sizing to maximize value from premium hand",
				}

			case "strong":
				return {
					recommended: 0.67, // 2/3 pot for good value
					alternatives: [0.5, 0.75],
					reasoning: "Standard value betting size for strong hands",
				}

			case "medium":
				if (
					currentRound === RoundEnum.FLOP ||
					currentRound === RoundEnum.TURN
				) {
					return {
						recommended: 0.5, // 1/2 pot for protection
						alternatives: [0.33, 0.67],
						reasoning: "Medium sizing for protection and thin value",
					}
				} else {
					return {
						recommended: 0.33, // 1/3 pot on river
						alternatives: [0.5],
						reasoning: "Small sizing for thin value on river",
					}
				}

			case "weak":
				return {
					recommended: 0.33, // Small sizing if betting
					alternatives: [0.25, 0.5],
					reasoning: "Small sizing for pot control with marginal hand",
				}

			case "bluff":
				if (currentRound === RoundEnum.RIVER) {
					return {
						recommended: 0.75, // Large bluff sizing
						alternatives: [1.0, 0.67],
						reasoning: "Large sizing to maximize fold equity on river",
					}
				} else {
					return {
						recommended: 0.67, // Standard bluff sizing
						alternatives: [0.5, 0.75],
						reasoning: "Standard bluff sizing to build pot and apply pressure",
					}
				}

			default:
				return {
					recommended: 0.5,
					alternatives: [0.33, 0.67],
					reasoning: "Standard sizing",
				}
		}
	}

	/**
	 * Calculate mixed strategy frequencies for GTO play
	 */
	private static calculateActionFrequencies(
		winRate: number,
		handStrength: string,
		currentRound: RoundEnum,
		numOpponents: number,
	): ActionFrequencyGTO {
		const baseFrequencies = { fold: 0, call: 0, bet: 0, raise: 0, check: 0 }

		switch (handStrength) {
			case "premium":
				return { ...baseFrequencies, bet: 85, raise: 10, call: 5 }

			case "strong":
				if (numOpponents <= 2) {
					return { ...baseFrequencies, bet: 70, call: 25, check: 5 }
				} else {
					return { ...baseFrequencies, bet: 45, call: 45, check: 10 }
				}

			case "medium":
				if (currentRound === RoundEnum.PREFLOP) {
					return { ...baseFrequencies, call: 60, bet: 25, fold: 15 }
				} else {
					return { ...baseFrequencies, check: 40, call: 35, bet: 15, fold: 10 }
				}

			case "weak":
				return { ...baseFrequencies, check: 50, call: 25, fold: 25 }

			case "bluff":
				if (numOpponents <= 2) {
					return { ...baseFrequencies, fold: 60, bet: 25, check: 15 }
				} else {
					return { ...baseFrequencies, fold: 80, check: 15, bet: 5 }
				}

			default:
				return { ...baseFrequencies, check: 40, call: 30, fold: 30 }
		}
	}

	/**
	 * Generate human-readable reasoning for the GTO recommendation
	 */
	private static generateReasoning(
		winRate: number,
		handStrength: string,
		action: GTOActionRecommendation,
		currentRound: RoundEnum,
		numOpponents: number,
	): string {
		const equity = winRate.toFixed(1)
		const roundName = currentRound.toLowerCase()

		switch (handStrength) {
			case "premium":
				return `With ${equity}% equity, this premium hand should extract maximum value. Aggressive play is optimal on the ${roundName}.`

			case "strong":
				if (action.primary === "bet") {
					return `${equity}% equity justifies value betting. Strong hands should bet for value against ${numOpponents} opponent${numOpponents > 1 ? "s" : ""}.`
				} else {
					return `With ${equity}% equity, calling builds pot while controlling variance against multiple opponents.`
				}

			case "medium":
				return `${equity}% equity suggests a mixed strategy. This hand has showdown value but needs protection on the ${roundName}.`

			case "weak":
				if (action.primary === "check") {
					return `${equity}% equity makes this a marginal hand. Check-calling or check-folding maintains pot control.`
				} else {
					return `With ${equity}% equity, this hand should mostly be played passively to minimize losses.`
				}

			case "bluff":
				if (action.primary === "bet") {
					return `${equity}% equity makes this a bluff candidate. Fold equity compensates for low showdown value.`
				} else {
					return `${equity}% equity is too low for profitable bluffs. Folding minimizes losses against ${numOpponents} opponent${numOpponents > 1 ? "s" : ""}.`
				}

			default:
				return `Based on ${equity}% equity and game context, a balanced approach is recommended.`
		}
	}

	/**
	 * Calculate confidence level in the GTO recommendation
	 */
	private static calculateConfidence(
		winRate: number,
		handStrength: string,
		position?: PositionEnum,
		numOpponents?: number,
	): number {
		let confidence = 50 // Base confidence

		// Adjust for hand strength clarity
		if (handStrength === "premium") confidence += 40
		else if (handStrength === "strong") confidence += 25
		else if (handStrength === "medium") confidence += 10
		else if (handStrength === "weak") confidence -= 10
		else confidence -= 20

		// Adjust for position
		if (position === PositionEnum.Dealer) confidence += 15
		else if (
			position === PositionEnum.BigBlind ||
			position === PositionEnum.SmallBlind
		)
			confidence -= 10

		// Adjust for number of opponents
		if (numOpponents && numOpponents <= 2) confidence += 10
		else if (numOpponents && numOpponents >= 4) confidence -= 15

		// Clamp between 0 and 100
		return Math.max(0, Math.min(100, confidence))
	}

	/**
	 * Analyze board texture for more informed GTO decisions
	 */
	private static analyzeBoardTexture(communityCards: Card[]): {
		isDry: boolean
		isWet: boolean
		isDrawHeavy: boolean
		isPaired: boolean
		flushPossible: boolean
		straightPossible: boolean
	} {
		if (communityCards.length < 3) {
			return {
				isDry: true,
				isWet: false,
				isDrawHeavy: false,
				isPaired: false,
				flushPossible: false,
				straightPossible: false,
			}
		}

		// Check for pairs on board
		const ranks = communityCards.map((c) => c.rank)
		const rankCounts = ranks.reduce(
			(acc, rank) => {
				acc[rank] = (acc[rank] || 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)
		const isPaired = Object.values(rankCounts).some((count) => count >= 2)

		// Check for flush draws
		const suits = communityCards.map((c) => c.suit)
		const suitCounts = suits.reduce(
			(acc, suit) => {
				acc[suit] = (acc[suit] || 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)
		const flushPossible = Object.values(suitCounts).some((count) => count >= 2)

		// Check for straight possibilities (simplified)
		const rankValues = ranks.map(this.getRankValue).sort((a, b) => a - b)
		const straightPossible = this.hasStraightPossibility(rankValues)

		// Determine board wetness
		const isDrawHeavy = flushPossible || straightPossible
		const isWet = isDrawHeavy || isPaired
		const isDry = !isWet

		return {
			isDry,
			isWet,
			isDrawHeavy,
			isPaired,
			flushPossible,
			straightPossible,
		}
	}

	/**
	 * Convert rank to numeric value for analysis
	 */
	private static getRankValue(rank: string): number {
		const rankMap: Record<string, number> = {
			"2": 2,
			"3": 3,
			"4": 4,
			"5": 5,
			"6": 6,
			"7": 7,
			"8": 8,
			"9": 9,
			"10": 10,
			J: 11,
			Q: 12,
			K: 13,
			A: 14,
		}
		return rankMap[rank] || 0
	}

	/**
	 * Check if straight draws are possible
	 */
	private static hasStraightPossibility(sortedRankValues: number[]): boolean {
		for (let i = 0; i < sortedRankValues.length - 1; i++) {
			for (let j = i + 1; j < sortedRankValues.length; j++) {
				if (sortedRankValues[j] - sortedRankValues[i] <= 4) {
					return true
				}
			}
		}
		return false
	}

	/**
	 * Determine the GTO level based on various factors
	 */
	private static determineGTOLevel(
		winRate: number,
		handStrength: string,
		actionPriority: number,
		confidence: number,
	): GTOLevel {
		// Calculate level based on multiple factors
		let levelTier: 1 | 2 | 3 | 4 | 5

		if (handStrength === "premium" && winRate >= 75) {
			levelTier = 5 // PREMIUM AGGRO
		} else if (handStrength === "strong" && winRate >= 60) {
			levelTier = 4 // VALUE BET
		} else if (
			handStrength === "medium" ||
			(handStrength === "strong" && winRate < 60)
		) {
			levelTier = 3 // MIXED PLAY
		} else if (handStrength === "weak" && winRate >= 25) {
			levelTier = 2 // DEFENSIVE
		} else {
			levelTier = 1 // FOLD/BLUFF
		}

		// Adjust based on action priority and confidence
		if (actionPriority >= 5 && confidence >= 80) {
			levelTier = Math.min(5, levelTier + 1) as 1 | 2 | 3 | 4 | 5
		} else if (actionPriority <= 2 || confidence <= 40) {
			levelTier = Math.max(1, levelTier - 1) as 1 | 2 | 3 | 4 | 5
		}

		return this.GTO_LEVELS[levelTier]
	}
}
