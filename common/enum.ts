// Centralized enums for Poker game

export enum SuitEnum {
	SPADES = "SPADES",
	HEARTS = "HEARTS",
	DIAMONDS = "DIAMONDS",
	CLUBS = "CLUBS",
}

export enum RankEnum {
	R2 = "2",
	R3 = "3",
	R4 = "4",
	R5 = "5",
	R6 = "6",
	R7 = "7",
	R8 = "8",
	R9 = "9",
	R10 = "10",
	J = "J",
	Q = "Q",
	K = "K",
	A = "A",
}

export enum HandRankEnum {
	HIGHCARD = "HIGHCARD",
	ONEPAIR = "ONEPAIR",
	TWOPAIR = "TWOPAIR",
	THREEOFAKIND = "THREEOFAKIND",
	STRAIGHT = "STRAIGHT",
	FLUSH = "FLUSH",
	FULLHOUSE = "FULLHOUSE",
	FOUROFKIND = "FOUROFKIND",
	STRAIGHTFLUSH = "STRAIGHTFLUSH",
	ROYALFLUSH = "ROYALFLUSH",
}

export enum RoundEnum {
	PreRoundBetting = "PreRoundBetting",
	PREFLOP = "PREFLOP",
	FLOP = "FLOP",
	TURN = "TURN",
	RIVER = "RIVER",
	CARD_REVEAL = "CARD_REVEAL",
	SHOWDOWN = "SHOWDOWN",
}

export enum PlayerActionEnum {
	Fold = "fold",
	Check = "check",
	Call = "call",
	Raise = "raise",
	AllIn = "all-in",
}

export enum GameStatusEnum {
	WAITING = "WAITING",
	PLAYING = "PLAYING",
	FINISHED = "FINISHED",
}

export enum PositionEnum {
	Dealer = "D",
	SmallBlind = "SB",
	BigBlind = "BB",
}

export enum PlayerRoleEnum {
	DEALER = "DEALER",
	SMALL_BLIND = "SMALL_BLIND",
	BIG_BLIND = "BIG_BLIND",
	VIEWER = "VIEWER",
	NO_ROLE = "",
}
