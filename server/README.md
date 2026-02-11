# Race to 18 - Multiplayer Dice Game Server

Backend server for the multiplayer "Race to 18" dice game using **TypeScript**, Node.js, Express, and Socket.IO.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- pnpm package manager

### Installation

```bash
cd server
pnpm install
```

### Running the Server

**Development mode** (with auto-restart and TypeScript support):
```bash
pnpm run dev
```

**Production mode**:
```bash
pnpm build  # Compile TypeScript to JavaScript
pnpm start  # Run compiled JavaScript
```

**Type checking** (without running):
```bash
pnpm typecheck
```

The server will start on **port 3000** by default.

---

## 📡 API Endpoints

### HTTP Endpoints

#### `GET /`
Server information and status.

**Response:**
```json
{
  "name": "Race to 18 - Multiplayer Dice Game Server",
  "version": "1.0.0",
  "status": "running",
  "activeRooms": 0
}
```

#### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "activeRooms": 2,
  "timestamp": "2026-02-11T06:52:56.892Z"
}
```

---

## 🎮 WebSocket Protocol

The server uses **Socket.IO** for real-time communication. Connect to `ws://localhost:3000`.

### Message Format

All messages follow this structure:
```javascript
{
  type: "MESSAGE_TYPE",
  payload: { /* message-specific data */ },
  timestamp: 1234567890
}
```

---

## 📤 Client → Server Messages

### `CREATE_ROOM`
Create a new game room.

**Payload:**
```javascript
{
  playerName: string  // Display name for the player
}
```

**Response:** `ROOM_CREATED` event

---

### `JOIN_ROOM`
Join an existing game room.

**Payload:**
```javascript
{
  roomId: string,     // Room ID to join
  playerName: string  // Display name for the player
}
```

**Response:** `PLAYER_JOINED` event

---

### `ROLL_DICE`
Roll the dice (must be your turn).

**Payload:**
```javascript
{
  // No additional payload needed
  // Room and player info stored in socket session
}
```

**Response:** `DICE_ROLLED` event broadcast to all players

---

### `HOLD`
Hold your current score (must be your turn).

**Payload:**
```javascript
{
  // No additional payload needed
}
```

**Response:** `GAME_STATE_UPDATE` event broadcast to all players

---

### `NEW_GAME`
Start a new game round.

**Payload:**
```javascript
{
  // No additional payload needed
}
```

**Response:** `GAME_STATE_UPDATE` event broadcast to all players

---

## 📥 Server → Client Messages

### `ROOM_CREATED`
Sent when a room is successfully created.

**Payload:**
```javascript
{
  roomId: string,
  playerId: string,
  roomState: {
    roomId: string,
    players: Player[],
    currentTurn: string,
    gameStarted: boolean,
    gameOver: boolean,
    winner: string | null
  }
}
```

---

### `PLAYER_JOINED`
Sent to the joining player when they successfully join a room.

**Payload:**
```javascript
{
  playerId: string,
  roomState: { /* same as above */ }
}
```

---

### `PLAYER_LEFT`
Broadcast when a player leaves the room.

**Payload:**
```javascript
{
  playerId: string,
  roomState: { /* same as above */ },
  message: string
}
```

---

### `DICE_ROLLED`
Broadcast when a player rolls the dice.

**Payload:**
```javascript
{
  playerId: string,
  playerName: string,
  roll: number,        // 1-6
  newScore: number,
  status: string,      // 'playing' | 'bust' | 'perfect'
  message: string
}
```

---

### `GAME_STATE_UPDATE`
Broadcast when game state changes.

**Payload:**
```javascript
{
  roomState: { /* room state object */ },
  message: string
}
```

---

### `TURN_CHANGED`
Broadcast when the turn moves to the next player.

**Payload:**
```javascript
{
  currentTurn: string,  // Player ID whose turn it is
  roomState: { /* room state object */ }
}
```

---

### `GAME_OVER`
Broadcast when the game ends.

**Payload:**
```javascript
{
  winner: {
    id: string,
    name: string,
    score: number,
    status: string
  } | null,
  roomState: { /* room state object */ },
  message: string
}
```

---

### `ERROR`
Sent when an error occurs.

**Payload:**
```javascript
{
  message: string
}
```

---

## 🎲 Game Rules

**Race to 18** is a turn-based dice game:

1. Players take turns rolling a six-sided die
2. Each roll adds to the player's total score
3. **Goal:** Get as close to 18 as possible without going over
4. **Bust:** Score > 18 → Player loses
5. **Perfect:** Score = 18 → Player wins instantly
6. **Hold:** Player can hold their current score and stop rolling
7. **Winner:** Last player standing or highest score when all players hold/bust

---

## 🔧 Configuration

Edit `.env` file to configure the server:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
MAX_PLAYERS_PER_ROOM=4
```

---

## 🏗️ Project Structure

```
server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── game/
│   │   ├── Player.ts         # Player data model
│   │   ├── GameState.ts      # Game logic (Race to 18)
│   │   └── GameRoom.ts       # Room management
│   ├── socket/
│   │   ├── socketHandler.ts  # WebSocket event handlers
│   │   └── messageTypes.ts   # Message protocol definitions
│   └── utils/
│       └── logger.ts         # Logging utility
├── package.json
├── tsconfig.json             # TypeScript configuration
└── .env
```

---

## 🧪 Testing the Server

### Test with Browser Console

1. Start the server: `pnpm run dev`
2. Open browser console
3. Load Socket.IO client library:
```html
<script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
```

4. Connect and create a room:
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('CREATE_ROOM', { playerName: 'Player1' });
});

socket.on('ROOM_CREATED', (data) => {
  console.log('Room created:', data);
});

socket.on('DICE_ROLLED', (data) => {
  console.log('Dice rolled:', data);
});
```

5. Roll the dice:
```javascript
socket.emit('ROLL_DICE', {});
```

---

## 🚀 Next Steps

To connect your frontend:

1. Install Socket.IO client in your React app:
```bash
pnpm add socket.io-client
```

2. Connect to the server:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
```

3. Use the message protocol documented above to communicate with the server

---

## 📝 Notes

- **Server-authoritative dice rolls:** The server generates all dice results to prevent cheating
- **Turn-based gameplay:** Players must wait for their turn to roll
- **Automatic cleanup:** Empty rooms are cleaned up after 30 minutes
- **Max 4 players per room** (configurable via `.env`)
