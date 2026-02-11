/**
 * Socket.IO event handlers for game communication
 */

import { v4 as uuidv4 } from 'uuid';
import { CLIENT_MESSAGES, SERVER_MESSAGES, createMessage } from './messageTypes.js';
import GameRoom from '../game/GameRoom.js';
import Player from '../game/Player.js';
import logger from '../utils/logger.js';

// In-memory storage for active game rooms
const rooms = new Map();

/**
 * Initialize Socket.IO handlers
 * @param {Server} io - Socket.IO server instance
 */
export function initializeSocketHandlers(io) {
    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.id}`);

        // Handle room creation
        socket.on(CLIENT_MESSAGES.CREATE_ROOM, (data) => {
            handleCreateRoom(io, socket, data);
        });

        // Handle joining a room
        socket.on(CLIENT_MESSAGES.JOIN_ROOM, (data) => {
            handleJoinRoom(io, socket, data);
        });

        // Handle dice roll
        socket.on(CLIENT_MESSAGES.ROLL_DICE, (data) => {
            handleRollDice(io, socket, data);
        });

        // Handle hold action
        socket.on(CLIENT_MESSAGES.HOLD, (data) => {
            handleHold(io, socket, data);
        });

        // Handle new game request
        socket.on(CLIENT_MESSAGES.NEW_GAME, (data) => {
            handleNewGame(io, socket, data);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            handleDisconnect(io, socket);
        });
    });

    // Cleanup empty rooms periodically
    setInterval(() => {
        cleanupEmptyRooms();
    }, 60000); // Every minute
}

/**
 * Handle room creation
 */
function handleCreateRoom(io, socket, data) {
    try {
        const { playerName } = data;

        if (!playerName || playerName.trim() === '') {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Player name is required'
            }));
            return;
        }

        const roomId = uuidv4();
        const playerId = uuidv4();
        const player = new Player(playerId, playerName, socket.id);

        const maxPlayers = parseInt(process.env.MAX_PLAYERS_PER_ROOM) || 4;
        const room = new GameRoom(roomId, io, maxPlayers);
        room.addPlayer(player);

        rooms.set(roomId, room);
        socket.join(roomId);

        // Store room and player info on socket for later use
        socket.roomId = roomId;
        socket.playerId = playerId;

        logger.info(`Room created: ${roomId} by ${playerName}`);

        socket.emit(SERVER_MESSAGES.ROOM_CREATED, createMessage(SERVER_MESSAGES.ROOM_CREATED, {
            roomId,
            playerId,
            roomState: room.getState()
        }));

    } catch (error) {
        logger.error('Error creating room:', error);
        socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
            message: 'Failed to create room'
        }));
    }
}

/**
 * Handle joining a room
 */
function handleJoinRoom(io, socket, data) {
    try {
        const { roomId, playerName } = data;

        if (!roomId || !playerName) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Room ID and player name are required'
            }));
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Room not found'
            }));
            return;
        }

        const playerId = uuidv4();
        const player = new Player(playerId, playerName, socket.id);

        const success = room.addPlayer(player);
        if (!success) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Room is full or player already exists'
            }));
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerId = playerId;

        logger.info(`Player ${playerName} joined room ${roomId}`);

        // Notify the joining player
        socket.emit(SERVER_MESSAGES.PLAYER_JOINED, createMessage(SERVER_MESSAGES.PLAYER_JOINED, {
            playerId,
            roomState: room.getState()
        }));

        // Notify all other players in the room
        socket.to(roomId).emit(SERVER_MESSAGES.GAME_STATE_UPDATE, createMessage(SERVER_MESSAGES.GAME_STATE_UPDATE, {
            roomState: room.getState(),
            message: `${playerName} joined the game`
        }));

    } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
            message: 'Failed to join room'
        }));
    }
}

/**
 * Handle dice roll
 */
function handleRollDice(io, socket, data) {
    try {
        const { roomId } = socket;
        const { playerId } = socket;

        if (!roomId || !playerId) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Not in a room'
            }));
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Room not found'
            }));
            return;
        }

        const currentPlayer = room.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== playerId) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Not your turn'
            }));
            return;
        }

        // Roll the dice (server-authoritative)
        const roll = room.gameState.rollDice();
        const result = room.gameState.updateScore(currentPlayer, roll);

        logger.debug(`Player ${currentPlayer.name} rolled ${roll} in room ${roomId}`);

        // Broadcast the roll result to all players
        room.broadcast(SERVER_MESSAGES.DICE_ROLLED, createMessage(SERVER_MESSAGES.DICE_ROLLED, {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            roll,
            newScore: result.newScore,
            status: result.status,
            message: result.message
        }));

        // Check if game is over
        if (room.gameState.checkGameOver(room.players)) {
            const winner = room.players.find(p => p.id === room.gameState.winner);
            room.broadcast(SERVER_MESSAGES.GAME_OVER, createMessage(SERVER_MESSAGES.GAME_OVER, {
                winner: winner ? winner.toJSON() : null,
                roomState: room.getState(),
                message: winner ? `${winner.name} wins!` : 'Game over - everyone busted!'
            }));
        } else {
            // Move to next turn
            room.nextTurn();
            const nextPlayer = room.getCurrentPlayer();

            room.broadcast(SERVER_MESSAGES.TURN_CHANGED, createMessage(SERVER_MESSAGES.TURN_CHANGED, {
                currentTurn: nextPlayer?.id || null,
                roomState: room.getState()
            }));
        }

    } catch (error) {
        logger.error('Error rolling dice:', error);
        socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
            message: 'Failed to roll dice'
        }));
    }
}

/**
 * Handle hold action
 */
function handleHold(io, socket, data) {
    try {
        const { roomId } = socket;
        const { playerId } = socket;

        if (!roomId || !playerId) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Not in a room'
            }));
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Room not found'
            }));
            return;
        }

        const currentPlayer = room.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== playerId) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Not your turn'
            }));
            return;
        }

        const result = room.gameState.hold(currentPlayer);

        logger.debug(`Player ${currentPlayer.name} held at ${currentPlayer.score} in room ${roomId}`);

        // Broadcast hold action
        room.broadcast(SERVER_MESSAGES.GAME_STATE_UPDATE, createMessage(SERVER_MESSAGES.GAME_STATE_UPDATE, {
            roomState: room.getState(),
            message: result.message
        }));

        // Check if game is over
        if (room.gameState.checkGameOver(room.players)) {
            const winner = room.players.find(p => p.id === room.gameState.winner);
            room.broadcast(SERVER_MESSAGES.GAME_OVER, createMessage(SERVER_MESSAGES.GAME_OVER, {
                winner: winner ? winner.toJSON() : null,
                roomState: room.getState(),
                message: winner ? `${winner.name} wins with ${winner.score}!` : 'Game over!'
            }));
        } else {
            // Move to next turn
            room.nextTurn();
            const nextPlayer = room.getCurrentPlayer();

            room.broadcast(SERVER_MESSAGES.TURN_CHANGED, createMessage(SERVER_MESSAGES.TURN_CHANGED, {
                currentTurn: nextPlayer?.id || null,
                roomState: room.getState()
            }));
        }

    } catch (error) {
        logger.error('Error handling hold:', error);
        socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
            message: 'Failed to hold'
        }));
    }
}

/**
 * Handle new game request
 */
function handleNewGame(io, socket, data) {
    try {
        const { roomId } = socket;

        if (!roomId) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Not in a room'
            }));
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
                message: 'Room not found'
            }));
            return;
        }

        room.resetGame();
        logger.info(`New game started in room ${roomId}`);

        room.broadcast(SERVER_MESSAGES.GAME_STATE_UPDATE, createMessage(SERVER_MESSAGES.GAME_STATE_UPDATE, {
            roomState: room.getState(),
            message: 'New game started!'
        }));

    } catch (error) {
        logger.error('Error starting new game:', error);
        socket.emit(SERVER_MESSAGES.ERROR, createMessage(SERVER_MESSAGES.ERROR, {
            message: 'Failed to start new game'
        }));
    }
}

/**
 * Handle player disconnect
 */
function handleDisconnect(io, socket) {
    try {
        const { roomId, playerId } = socket;

        if (!roomId || !playerId) {
            logger.info(`Client disconnected: ${socket.id}`);
            return;
        }

        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.getPlayer(playerId);
        if (player) {
            logger.info(`Player ${player.name} disconnected from room ${roomId}`);

            room.removePlayer(playerId);

            // Notify remaining players
            room.broadcast(SERVER_MESSAGES.PLAYER_LEFT, createMessage(SERVER_MESSAGES.PLAYER_LEFT, {
                playerId,
                roomState: room.getState(),
                message: `${player.name} left the game`
            }));

            // Clean up empty room
            if (room.isEmpty()) {
                rooms.delete(roomId);
                logger.info(`Room ${roomId} deleted (empty)`);
            }
        }

    } catch (error) {
        logger.error('Error handling disconnect:', error);
    }
}

/**
 * Clean up empty rooms
 */
function cleanupEmptyRooms() {
    const now = Date.now();
    const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, room] of rooms.entries()) {
        if (room.isEmpty() || (now - room.createdAt > ROOM_TIMEOUT && room.players.length < 2)) {
            rooms.delete(roomId);
            logger.info(`Room ${roomId} cleaned up`);
        }
    }
}

/**
 * Get active rooms count (for monitoring)
 */
export function getActiveRoomsCount() {
    return rooms.size;
}
