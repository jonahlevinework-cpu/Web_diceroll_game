/**
 * Socket.IO client service for connecting to the game server
 */

import { io, Socket } from 'socket.io-client';
import type { Message, RoomState } from '../types/game';

const SOCKET_URL = 'http://localhost:3000';

class SocketService {
    private socket: Socket | null = null;

    connect(): Socket {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                autoConnect: true,
            });

            this.socket.on('connect', () => {
                console.log('✅ Connected to server:', this.socket?.id);
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from server');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
            });
        }

        return this.socket;
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    // Game-specific methods
    createRoom(playerName: string, callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.emit('CREATE_ROOM', { playerName });
        this.socket.once('ROOM_CREATED', callback);
    }

    joinRoom(roomId: string, playerName: string, callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.emit('JOIN_ROOM', { roomId, playerName });
        this.socket.once('PLAYER_JOINED', callback);
    }

    onGameStateUpdate(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on('GAME_STATE_UPDATE', callback);
    }

    onPlayerLeft(callback: (data: Message<{ playerName: string; roomState: RoomState }>) => void) {
        this.socket?.on('PLAYER_LEFT', callback);
    }

    onError(callback: (data: Message<{ message: string }>) => void) {
        this.socket?.on('ERROR', callback);
    }

    // Game actions
    rollDice(roll?: number) {
        this.socket?.emit('ROLL_DICE', { roll });
    }

    hold() {
        this.socket?.emit('HOLD', {});
    }

    getRoomState() {
        this.socket?.emit('GET_ROOM_STATE', {});
    }

    // Game event listeners
    onDiceRolled(callback: (data: Message<{ playerId: string; playerName: string; roll: number; newScore: number; status: string; message: string }>) => void) {
        this.socket?.on('DICE_ROLLED', callback);
    }

    onTurnChanged(callback: (data: Message<{ currentTurn: string; roomState: RoomState }>) => void) {
        this.socket?.on('TURN_CHANGED', callback);
    }

    onGameOver(callback: (data: Message<{ winner: string | null; roomState: RoomState; message: string }>) => void) {
        this.socket?.on('GAME_OVER', callback);
    }

    // Remove event listeners
    off(event: string): void {
        if (!this.socket) return;
        this.socket.off(event);
    }
}

export default new SocketService();
