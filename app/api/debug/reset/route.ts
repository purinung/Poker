import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { SUCCESS_MESSAGES, VALIDATION_ERRORS } from "@/common/label"

export async function POST() {
	try {
		// Delete all data from the database
		// Due to foreign key constraints, we need to delete in the correct order

		// First delete all players (this will cascade delete relationships)
		await prisma.player.deleteMany({})

		// Then delete all game rooms
		await prisma.gameRoom.deleteMany({})

		console.log("🗑️ Database has been reset - all data deleted")

		return NextResponse.json({
			success: true,
			message: SUCCESS_MESSAGES.DATABASE_RESET_SUCCESS,
			deletedTables: ["GameRoom", "Player"],
		})
	} catch (error) {
		console.error("Error resetting database:", error)
		return NextResponse.json(
			{
				error: VALIDATION_ERRORS.FAILED_TO_RESET_DATABASE,
				details:
					error instanceof Error
						? error.message
						: VALIDATION_ERRORS.UNKNOWN_ERROR,
			},
			{ status: 500 },
		)
	}
}

// Only allow POST method
export async function GET() {
	return NextResponse.json(
		{ error: VALIDATION_ERRORS.METHOD_NOT_ALLOWED_POST },
		{ status: 405 },
	)
}
