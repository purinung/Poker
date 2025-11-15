// Components
import OpponentsCards from "@/components/card/OpponentsCards"
import PlayerCards from "@/components/card/PlayerCards"
// Types from our game logic
import { PlayerLayoutProps } from "@/common/interface"
import {
	PlayerActionEnum,
	PositionEnum,
	PlayerRoleEnum,
	RoundEnum,
} from "@/common/enum"
import { GameUtils } from "@/lib/GameUtils"

// Hardcoded seat positions for up to 9 players
const playerSeats = [
	{
		className:
			"absolute top-[calc(50%+220px)] left-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%+220px)] left-[calc(50%+280px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%+100px)] left-[calc(50%+470px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%-100px)] left-[calc(50%+470px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%-220px)] left-[calc(50%-280px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%-220px)] left-[calc(50%+280px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%-100px)] left-[calc(50%-470px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%+100px)] left-[calc(50%-470px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
	{
		className:
			"absolute top-[calc(50%+220px)] left-[calc(50%-280px)] z-40 flex -translate-x-1/2 -translate-y-1/2",
	},
]

export default function PlayerLayout({
	players,
	currentPlayerId,
	viewerPlayerId,
	viewerUsername,
	viewerCards,
	currentRound,
	winners,
	dbPlayerData,
	communityCards,
	processPlayerAction,
	handleRaiseAmountChange,
	raiseAmount,
	pokerGame,
}: PlayerLayoutProps) {
	// Current acting player id (owner of the TURN)
	const currentId = currentPlayerId

	// Rotate players so the viewer is at index 0 (bottom seat)
	const viewerIndex = players.findIndex(
		(p) =>
			p.id === viewerPlayerId ||
			(viewerUsername ? p.name === viewerUsername : false),
	)
	const rotatedPlayers =
		viewerIndex > 0
			? [...players.slice(viewerIndex), ...players.slice(0, viewerIndex)]
			: players

	return (
		<>
			{rotatedPlayers.map((player, index) => {
				// Current user is always rendered at the bottom seat
				const isCurrentUser =
					player.id === viewerPlayerId ||
					(!!viewerUsername && player.name === viewerUsername)
				// TURN owner is derived from currentPlayerId (not the viewer)
				const isTURNOwner = player.id === currentId
				// Check if player has been eliminated and is now a viewer/spectator
				const isEliminatedViewer = player.role === PlayerRoleEnum.VIEWER
				const positions: PositionEnum[] = []
				if (player.role === PlayerRoleEnum.DEALER)
					positions.push(PositionEnum.Dealer)
				if (player.role === PlayerRoleEnum.SMALL_BLIND)
					positions.push(PositionEnum.SmallBlind)
				if (player.role === PlayerRoleEnum.BIG_BLIND)
					positions.push(PositionEnum.BigBlind)
				const bestHand = pokerGame
					? GameUtils.evaluatePlayerHand(player, pokerGame.getCommunityCards())
							?.rank || ""
					: ""
				const seat = playerSeats[index]
				// Only the current user should ever see action buttons, and only on their TURN, and only if not eliminated
				// Also hide actions during CARD_REVEAL and SHOWDOWN phases
				const showActions =
					isCurrentUser &&
					isTURNOwner &&
					!player.isFolded &&
					!isEliminatedViewer &&
					currentRound !== RoundEnum.CARD_REVEAL &&
					currentRound !== RoundEnum.SHOWDOWN
				const validation =
					showActions && pokerGame
						? pokerGame.validatePlayerAction({
								playerId: player.id,
								type: PlayerActionEnum.Check,
							})
						: undefined

				if (!seat) return null

				return (
					<div key={player.id} className={seat.className}>
						{isCurrentUser ? (
							<PlayerCards
								player={{
									...player,
									// If server provided cards for the viewer, prefer those to align with DB
									hand:
										Array.isArray(viewerCards) && viewerCards.length > 0
											? viewerCards
											: player.hand,
								}}
								isCurrentPlayer={isTURNOwner}
								showActions={showActions}
								validation={validation}
								processPlayerAction={processPlayerAction}
								handleRaiseAmountChange={handleRaiseAmountChange}
								raiseAmount={raiseAmount}
								currentRound={currentRound}
								communityCards={communityCards}
								playerInfo={{
									bestHand,
									positions,
									currentBet: player.currentBet,
									totalChips: player.chips,
									isActive: isTURNOwner,
								}}
							/>
						) : (
							<OpponentsCards
								player={player}
								currentRound={currentRound}
								winners={winners}
								showActions={showActions}
								validation={validation}
								processPlayerAction={processPlayerAction}
								handleRaiseAmountChange={handleRaiseAmountChange}
								dbPlayerData={dbPlayerData}
								communityCards={communityCards}
								playerInfo={{
									bestHand,
									positions,
									currentBet: player.currentBet,
									totalChips: player.chips,
									isActive: isTURNOwner,
								}}
								raiseAmount={raiseAmount}
							/>
						)}
					</div>
				)
			})}
		</>
	)
}
