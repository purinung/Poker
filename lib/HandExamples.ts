import { Card } from "@/common/interface"
import { HandRankEnum, RankEnum, SuitEnum } from "@/common/enum"
import { GAME_MESSAGES } from "@/common/label"

/**
 * Utility class to generate example poker hands for each hand rank
 * Used in UI components to show visual examples of different hand types
 */
export class HandExamples {
	/**
	 * Gets example cards for a given hand rank
	 */
	public static getExampleHand(handRank: HandRankEnum): Card[] {
		switch (handRank) {
			case HandRankEnum.ROYALFLUSH:
				return [
					{ rank: RankEnum.A, suit: SuitEnum.SPADES },
					{ rank: RankEnum.K, suit: SuitEnum.SPADES },
					{ rank: RankEnum.Q, suit: SuitEnum.SPADES },
					{ rank: RankEnum.J, suit: SuitEnum.SPADES },
					{ rank: RankEnum.R10, suit: SuitEnum.SPADES },
				]

			case HandRankEnum.STRAIGHTFLUSH:
				return [
					{ rank: RankEnum.R9, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.R8, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.R7, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.R6, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.R5, suit: SuitEnum.HEARTS },
				]

			case HandRankEnum.FOUROFKIND:
				return [
					{ rank: RankEnum.A, suit: SuitEnum.SPADES },
					{ rank: RankEnum.A, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.A, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.A, suit: SuitEnum.CLUBS },
					{ rank: RankEnum.K, suit: SuitEnum.SPADES },
				]

			case HandRankEnum.FULLHOUSE:
				return [
					{ rank: RankEnum.K, suit: SuitEnum.SPADES },
					{ rank: RankEnum.K, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.K, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.Q, suit: SuitEnum.SPADES },
					{ rank: RankEnum.Q, suit: SuitEnum.CLUBS },
				]

			case HandRankEnum.FLUSH:
				return [
					{ rank: RankEnum.A, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.J, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.R9, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.R7, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.R5, suit: SuitEnum.DIAMONDS },
				]

			case HandRankEnum.STRAIGHT:
				return [
					{ rank: RankEnum.R10, suit: SuitEnum.SPADES },
					{ rank: RankEnum.R9, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.R8, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.R7, suit: SuitEnum.CLUBS },
					{ rank: RankEnum.R6, suit: SuitEnum.SPADES },
				]

			case HandRankEnum.THREEOFAKIND:
				return [
					{ rank: RankEnum.Q, suit: SuitEnum.SPADES },
					{ rank: RankEnum.Q, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.Q, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.A, suit: SuitEnum.CLUBS },
					{ rank: RankEnum.R8, suit: SuitEnum.SPADES },
				]

			case HandRankEnum.TWOPAIR:
				return [
					{ rank: RankEnum.K, suit: SuitEnum.SPADES },
					{ rank: RankEnum.K, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.R8, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.R8, suit: SuitEnum.CLUBS },
					{ rank: RankEnum.A, suit: SuitEnum.SPADES },
				]

			case HandRankEnum.ONEPAIR:
				return [
					{ rank: RankEnum.J, suit: SuitEnum.SPADES },
					{ rank: RankEnum.J, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.A, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.R9, suit: SuitEnum.CLUBS },
					{ rank: RankEnum.R7, suit: SuitEnum.SPADES },
				]

			case HandRankEnum.HIGHCARD:
				return [
					{ rank: RankEnum.A, suit: SuitEnum.SPADES },
					{ rank: RankEnum.K, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.Q, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.J, suit: SuitEnum.CLUBS },
					{ rank: RankEnum.R9, suit: SuitEnum.SPADES },
				]

			default:
				return [
					{ rank: RankEnum.A, suit: SuitEnum.SPADES },
					{ rank: RankEnum.K, suit: SuitEnum.HEARTS },
					{ rank: RankEnum.Q, suit: SuitEnum.DIAMONDS },
					{ rank: RankEnum.J, suit: SuitEnum.CLUBS },
					{ rank: RankEnum.R9, suit: SuitEnum.SPADES },
				]
		}
	}

	/**
	 * Gets a description for the hand rank
	 */
	public static getHandDescription(handRank: HandRankEnum): string {
		switch (handRank) {
			case HandRankEnum.ROYALFLUSH:
				return "A, K, Q, J, 10, all of the same suit"

			case HandRankEnum.STRAIGHTFLUSH:
				return "Five cards in sequence, all of the same suit"

			case HandRankEnum.FOUROFKIND:
				return "Four cards of the same rank"

			case HandRankEnum.FULLHOUSE:
				return "Three cards of one rank and two cards of another rank"

			case HandRankEnum.FLUSH:
				return "Five cards of the same suit, not in sequence"

			case HandRankEnum.STRAIGHT:
				return "Five cards in sequence, not all of the same suit"

			case HandRankEnum.THREEOFAKIND:
				return "Three cards of the same rank"

			case HandRankEnum.TWOPAIR:
				return "Two cards of one rank and two cards of another rank"

			case HandRankEnum.ONEPAIR:
				return "Two cards of the same rank"

			case HandRankEnum.HIGHCARD:
				return "No matching cards, highest card wins"

			default:
				return GAME_MESSAGES.UNKNOWN_HAND_TYPE
		}
	}
}
