"use server"
import { GameStateManager } from "./GameStateManager"
import { Action, GameState } from "@/common/interface"

// Create a singleton instance
const gameStateManager = new GameStateManager()

export async function getGameState(roomId: string): Promise<GameState | null> {
	return gameStateManager.getGameState(roomId)
}

export async function createGame(roomId: string, playerNames: string[]) {
	return gameStateManager.createGame(roomId, playerNames)
}

export async function joinGame(
	roomId: string,
	playerId: string,
	playerName: string,
) {
	return gameStateManager.joinGame(roomId, playerId, playerName)
}

export async function handleAction(
	roomId: string,
	playerId: string,
	action: Action,
) {
	return gameStateManager.handleAction(roomId, playerId, action)
}

export async function removePlayer(roomId: string, playerId: string) {
	return gameStateManager.removePlayer(roomId, playerId)
}
