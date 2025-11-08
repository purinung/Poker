import React from "react"
// React Icons (PascalCase names)
import { GiDiamonds, GiHearts, GiClubs, GiSpades } from "react-icons/gi"
import { SuitEnum } from "@/common/enum"

type CardProps = {
	value: string
	suit: SuitEnum
	variant?: "front" | "back"
}

const suitColors: Record<SuitEnum, string> = {
	[SuitEnum.CLUBS]: "text-accent-black",
	[SuitEnum.SPADES]: "text-accent-black",
	[SuitEnum.HEARTS]: "text-accent-red",
	[SuitEnum.DIAMONDS]: "text-accent-red",
}

const suitIcons: Record<SuitEnum, React.ComponentType> = {
	[SuitEnum.CLUBS]: GiClubs,
	[SuitEnum.SPADES]: GiSpades,
	[SuitEnum.HEARTS]: GiHearts,
	[SuitEnum.DIAMONDS]: GiDiamonds,
}

export default function CardLayout({
	suit,
	value,
	variant = "front",
}: CardProps) {
	// If back variant, render card back style
	if (variant === "back") {
		return (
			<div className="relative flex h-[80px] w-[60px] items-center justify-center rounded-[8px] border-2 border-white bg-gradient-to-br from-[#D35875] to-[#7B1FA2] p-1 shadow-xl">
				{/* Poker chip or pattern for back of card */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#7B1FA2] bg-white/80">
						<span className="text-xl font-bold text-[#D35875]">★</span>
					</div>
				</div>
			</div>
		)
	}

	// Default front variant
	const color = suitColors[suit]
	const Icon = suitIcons[suit]

	return (
		<div className="bg-accent-white flex h-[80px] w-[60px] flex-col rounded-[8px] p-1 shadow-xl">
			<div className="flex h-full flex-col justify-between">
				<div className={`${color} text-[16px]`}>
					<Icon />
				</div>

				<div className="flex flex-grow items-center justify-center">
					<p className={`${color} font-secondary text-[40px] leading-none`}>
						{value}
					</p>
				</div>

				<div className={`${color} rotate-180 text-[S]`}>
					<Icon />
				</div>
			</div>
		</div>
	)
}
