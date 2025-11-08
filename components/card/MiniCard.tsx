"use client"

import { Card } from "@/common/interface"
import { SuitEnum } from "@/common/enum"
import { cn } from "@/lib/utils"

interface MiniCardProps {
	card: Card
	className?: string
}

const MiniCard = ({ card, className }: MiniCardProps) => {
	const getSuitSymbol = (suit: SuitEnum): string => {
		switch (suit) {
			case SuitEnum.SPADES:
				return "♠"
			case SuitEnum.HEARTS:
				return "♥"
			case SuitEnum.DIAMONDS:
				return "♦"
			case SuitEnum.CLUBS:
				return "♣"
		}
	}

	const getSuitColor = (suit: SuitEnum): string => {
		switch (suit) {
			case SuitEnum.HEARTS:
			case SuitEnum.DIAMONDS:
				return "text-red-500"
			case SuitEnum.SPADES:
			case SuitEnum.CLUBS:
				return "text-gray-900"
		}
	}

	const getRankDisplay = (rank: string): string => {
		return rank === "10" ? "10" : rank
	}

	return (
		<div
			className={cn(
				"flex min-h-[28px] min-w-[20px] flex-col items-center justify-center rounded border border-gray-300 bg-white text-[10px] font-bold shadow-sm",
				className,
			)}
		>
			<div className={cn("leading-none", getSuitColor(card.suit))}>
				{getRankDisplay(card.rank)}
			</div>
			<div className={cn("leading-none", getSuitColor(card.suit))}>
				{getSuitSymbol(card.suit)}
			</div>
		</div>
	)
}

export default MiniCard
