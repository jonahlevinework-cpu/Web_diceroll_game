/**
 * Game room management
 * Handles multiplayer game sessions
 */

import { Server } from 'socket.io';
import GameState from './GameState.js';
import Player, { PlayerData } from './Player.js';
import logger from '../utils/logger.js';

export interface RoomState {
    roomId: string;
    players: PlayerData[];
    currentTurn: string | null;
    gameStarted: boolean;
    gameOver: boolean;
    winner: string | null;
}

export default class GameRoom {
    public id: string;
    public io: Server;
    public players: Player[];
    public gameState: GameState;
    public currentTurnIndex: number;
    public maxPlayers: number;
    public createdAt: number;

    constructor(id: string, io: Server, maxPlayers: number = 4) {
        this.id = id;
        this.io = io;
        this.players = [];
        this.gameState = new GameState();
        this.currentTurnIndex = 0;
        this.maxPlayers = maxPlayers;
        this.createdAt = Date.now();
    }

    /**
     * Add a player to the room
     */
    addPlayer(player: Player): boolean {
        if (this.players.length >= this.maxPlayers) {
            logger.warn(`Room ${this.id} is full`);
            return false;
        }

        if (this.players.find(p => p.id === player.id)) {
            logger.warn(`Player ${player.id} already in room ${this.id}`);
            return false;
        }

        this.players.push(player);
        logger.info(`Player ${player.name} joined room ${this.id}`);

        // Start game if we have at least 2 players
        if (this.players.length >= 2 && !this.gameState.gameStarted) {
            this.gameState.start();
            logger.info(`Game started in room ${this.id}`);
        }

        return true;
    }

    /**
     * Remove a player from the room
     */
    removePlayer(playerId: string): boolean {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index === -1) return false;

        const player = this.players[index];
        this.players.splice(index, 1);
        logger.info(`Player ${player.name} left room ${this.id}`);

        // Adjust turn index if needed
        if (this.currentTurnIndex >= this.players.length) {
            this.currentTurnIndex = 0;
        }

        // Check if game should end
        if (this.players.length < 2) {
            this.gameState.gameOver = true;
            logger.info(`Room ${this.id} has insufficient players, ending game`);
        }

        return true;
    }

    /**
     * Get the current player whose turn it is
     */
    getCurrentPlayer(): Player | null {
        if (this.players.length === 0) return null;

        // Skip players who are bust or held
        let attempts = 0;
        while (attempts < this.players.length) {
            const player = this.players[this.currentTurnIndex];
            if (player.status === 'active') {
                return player;
            }
            this.nextTurn();
            attempts++;
        }

        // No active players left
        return null;
    }

    /**
     * Move to the next player's turn
     */
    nextTurn(): void {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
    }

    /**
     * Get player by ID
     */
    getPlayer(playerId: string): Player | null {
        return this.players.find(p => p.id === playerId) || null;
    }

    /**
     * Broadcast a message to all players in the room
     */
    broadcast(event: string, data: any): void {
        this.io.to(this.id).emit(event, data);
    }

    /**
     * Get serializable room state (for sending to clients)
     */
    getState(): RoomState {
        return {
            roomId: this.id,
            players: this.players.map(p => p.toJSON()),
            currentTurn: this.getCurrentPlayer()?.id || null,
            gameStarted: this.gameState.gameStarted,
            gameOver: this.gameState.gameOver,
            winner: this.gameState.winner
        };
    }

    /**
     * Reset the game for a new round
     */
    resetGame(): void {
        this.gameState.reset();
        this.players.forEach(p => p.reset());
        this.currentTurnIndex = 0;

        if (this.players.length >= 2) {
            this.gameState.start();
        }

        logger.info(`Game reset in room ${this.id}`);
    }

    /**
     * Check if room is empty
     */
    isEmpty(): boolean {
        return this.players.length === 0;
    }
}
