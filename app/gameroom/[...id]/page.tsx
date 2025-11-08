"use client"

import { Suspense } from "react"
import GameRoomContent from "./GameRoomContent"
import { BiLoaderAlt } from "react-icons/bi"

export default function GameRoomPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-screen w-full items-center justify-center">
					<BiLoaderAlt className="h-12 w-12 animate-spin text-gray-900" />
				</div>
			}
		>
			<GameRoomContent />
		</Suspense>
	)
}
