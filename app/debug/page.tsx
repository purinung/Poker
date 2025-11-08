"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"

export default function DebugPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [message, setMessage] = useState<{
		type: "success" | "error"
		text: string
	} | null>(null)

	const handleResetDatabase = async () => {
		if (
			!confirm(
				"Are you sure you want to delete ALL data in the database? This action cannot be undone!",
			)
		) {
			return
		}

		setIsLoading(true)
		setMessage(null)

		try {
			const response = await fetch("/api/debug/reset", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			})

			if (response.ok) {
				setMessage({
					type: "success",
					text: "Database has been reset successfully!",
				})
			} else {
				const errorData = await response.json()
				setMessage({
					type: "error",
					text: errorData.error || "Failed to reset database",
				})
			}
		} catch {
			setMessage({
				type: "error",
				text: "An error occurred while resetting the database",
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="container mx-auto max-w-md px-4 py-8">
			<div className="rounded-lg bg-white p-6 shadow-md">
				<h1 className="mb-6 text-center text-3xl font-bold text-red-600">
					Debug Panel
				</h1>

				<div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
					<h2 className="mb-2 text-xl font-semibold text-red-800">
						⚠️ Warning
					</h2>
					<p className="text-base text-red-700">
						This page is for development purposes only. The reset button will
						permanently delete all data from the database including all game
						rooms and players.
					</p>
				</div>

				{message && (
					<Alert
						className={`mb-4 ${message.type === "error" ? "border-red-500 text-red-700" : "border-green-500 text-green-700"}`}
					>
						{message.text}
					</Alert>
				)}

				<Button
					onClick={handleResetDatabase}
					disabled={isLoading}
					className="w-full bg-red-600 py-3 font-semibold text-white hover:bg-red-700"
				>
					{isLoading ? "Resetting Database..." : "🗑️ Reset Database"}
				</Button>

				<p className="mt-4 text-center text-sm text-gray-500">
					This will delete all GameRooms and Players from the database.
				</p>
			</div>
		</div>
	)
}
