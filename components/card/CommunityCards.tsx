"use client"
import { motion, AnimatePresence } from "framer-motion"

// Components
import CardLayout from "@/components/card/CardLayout"

// Types
import { CommunityCardsProps } from "@/common/interface"
// No suit conversion needed; CardLayout accepts SuitEnum

export default function CommunityCards({ cards }: CommunityCardsProps) {
	return (
		<div className="flex gap-2">
			<AnimatePresence>
				{cards.map((c, index) => {
					const value = String(c.rank)
					return (
						<motion.div
							key={`${c.suit}-${value}-${index}`}
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ delay: index * 0.1 }}
						>
							<CardLayout suit={c.suit} value={value} />
						</motion.div>
					)
				})}
			</AnimatePresence>
		</div>
	)
}
