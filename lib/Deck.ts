//lib/Deck.ts
import { ALL_CARDS, Card, Player } from "@/common/interface"
import { RankEnum, SuitEnum } from "@/common/enum"

// Structured card helpers
export function createCard(rank: RankEnum, suit: SuitEnum): Card {
	return { rank, suit }
}

export function isSameCard(a: Card, b: Card): boolean {
	return a.rank === b.rank && a.suit === b.suit
}

export function cardToKey(card: Card): string {
	return `${card.rank}-${card.suit}`
}

// Convert a structured Card to simple UI-friendly parts
// parseCard removed; use Card.rank and Card.suit directly

// Serialize a structured Card to the DB string format like "ASPADES" or "10HEARTS"
export function cardToString(card: Card): string {
	return `${card.rank}${card.suit}`
}

// Convert a DB string like "ASPADES" or "10HEARTS" to a structured Card
export function stringToCard(code: string): Card | null {
	const m = /^([2-9]|10|J|Q|K|A)(SPADES|HEARTS|DIAMONDS|CLUBS)$/.exec(code)
	if (!m) return null
	const [, r, s] = m
	const rankMap: Record<string, RankEnum> = {
		"2": RankEnum.R2,
		"3": RankEnum.R3,
		"4": RankEnum.R4,
		"5": RankEnum.R5,
		"6": RankEnum.R6,
		"7": RankEnum.R7,
		"8": RankEnum.R8,
		"9": RankEnum.R9,
		"10": RankEnum.R10,
		J: RankEnum.J,
		Q: RankEnum.Q,
		K: RankEnum.K,
		A: RankEnum.A,
	}
	const suitMap: Record<string, SuitEnum> = {
		SPADES: SuitEnum.SPADES,
		HEARTS: SuitEnum.HEARTS,
		DIAMONDS: SuitEnum.DIAMONDS,
		CLUBS: SuitEnum.CLUBS,
	}
	return { rank: rankMap[r], suit: suitMap[s] }
}

// suitEnumToUi and uiToSuitEnum removed; UI now uses SuitEnum directly

export class Deck {
	private cards: Card[]
	private rng: () => number

	constructor() {
		this.cards = [...ALL_CARDS]
		this.rng = Math.random // Force Math.random for unpredictability
	}

	reset(): void {
		this.cards = [...ALL_CARDS]
		this.rng = Math.random // Reset also forces Math.random
	}

	shuffle(): void {
		for (let i = this.cards.length - 1; i > 0; i--) {
			const j = Math.floor(this.rng() * (i + 1))
			;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
		}
	}

	dealOne(): Card {
		if (this.cards.length === 0) {
			throw new Error("No more cards in the deck")
		}
		return this.cards.shift()!
	}

	burnOne(): Card {
		return this.dealOne()
	}

	// Relogiced dealToPlayers for easier testing of 2-card limit
	dealToPlayers(players: Player[]): void {
		if (players.length === 0) {
			return // No players to deal to, exit early
		}

		// Each player receives exactly 2 cards, one at a time, if their hand is empty
		for (let i = 0; i < 2; i++) {
			// Deal 2 cards per player
			for (const player of players) {
				if (player.hand.length < 2) {
					// Ensure player does not exceed 2 cards
					player.hand.push(this.dealOne())
				}
			}
		}
	}

	dealFLOP(): Card[] {
		this.burnOne()
		return [this.dealOne(), this.dealOne(), this.dealOne()]
	}

	dealTURN(): Card[] {
		this.burnOne()
		return [this.dealOne()]
	}

	dealRIVER(): Card[] {
		this.burnOne()
		return [this.dealOne()]
	}

	setCards(cards: Card[]): void {
		this.cards = [...cards]
	}

	getRemainingCards(): Card[] {
		return [...this.cards]
	}
}
