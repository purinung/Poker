# 🃏 Texas Hold'em Poker

## 📋 Overview

A comprehensive Texas Hold'em poker engine built with TypeScript and Next.js. Features complete poker game logic, hand evaluation, betting systems, and an interactive test interface.

## 🗂️ Project Structure

```
lib/
├── PokerGame.ts        # Main poker game orchestrator
├── GameEngine.ts       # Core game logic, hand evaluation, and game flow
├── PlayerActions.ts    # Player action validation and processing
├── GameUtils.ts        # Utility functions and configuration
├── Deck.ts            # Card deck management and dealing

types/
└── Poker.ts           # Comprehensive type definitions

app/
├── page.tsx           # Main application page
└── test/
    └── page.tsx       # Interactive poker game test interface
```

## 🎯 Core Features

### ✅ **Complete Hand Evaluation System**

- All 10 poker hand ranks (High Card to Royal FLUSH)
- Sophisticated tiebreaker logic for identical hand ranks
- Supports 5-7 card evaluation (hole cards + community cards)
- Handles edge cases like A-2-3-4-5 STRAIGHT (wheel)
- Comprehensive test coverage for all hand combinations

### ✅ **Advanced Betting System**

- Complete action validation (fold, check, call, raise, all-in)
- Smart minimum raise calculations
- Betting round completion detection
- Side pot creation for complex all-in scenarios
- Proper bet collection and pot management
- All-in player handling with continued game flow

### ✅ **Professional Game Flow**

- Complete hand progression (Pre-FLOP → FLOP → TURN → RIVER → SHOWDOWN)
- Automatic dealer button rotation
- Proper blind assignment (supports 2-10 players, heads-up rules)
- Pre-FLOP and post-FLOP betting order management
- Player elimination handling
- Persistent game logging system

### ✅ **Interactive Test Interface**

- Real-time game state visualization
- Player action buttons with validation
- Community card display
- Pot and betting information
- Game log with timestamps
- Hand progression controls

## 🏗️ Architecture

The poker engine uses a modular architecture with clear separation of concerns:

- **`PokerGame`**: High-level game orchestration and public API
- **`GameEngine`**: Core game logic, hand evaluation, and betting management
- **`PlayerActions`**: Action validation and processing logic
- **`GameUtils`**: Configuration, utilities, and helper functions
- **`Deck`**: Card management and dealing operations

## 🎰 Game Rules Implemented

### Standard Texas Hold'em ✅

- 2-10 players supported
- 2 hole cards per player
- 5 community cards (FLOP, TURN, RIVER)
- Standard betting rounds with proper limits
- Dealer button rotation
- Small blind / Big blind structure
- All-in protection with side pots

### Advanced Features ✅

- Minimum raise enforcement
- Action validation and error handling
- Proper heads-up play (dealer = small blind)
- Multiple side pot calculations
- Comprehensive game logging
- Player elimination tracking

## Configuration

Game settings can be customized in `GameUtils.ts`:

## 🎉 Features Roadmap

### ✅ Completed

- Complete hand evaluation system
- Betting and action validation
- Game flow management
- Interactive test interface
- Comprehensive test suite
- TypeScript type safety

### 🚧 In Progress

- Enhanced error handling and logging
- Performance optimizations

### 📋 Planned

- Multi-table support
- Hand history tracking
- Statistics and analytics
- Real-time multiplayer support

## 🔧 Development

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI components
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier
