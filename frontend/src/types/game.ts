/**
 * TypeScript types for the game
 */

export interface PlayerData {
    id: string;
    name: string;
    score: number;
    status: 'active' | 'bust' | 'held' | 'won';
}

export interface RoomState {
    roomId: string;
    players: PlayerData[];
    currentTurn: string | null;
    gameStarted: boolean;
    gameOver: boolean;
    winner: string | null;
}

export interface Message<T = any> {
    type: string;
    payload: T;
    timestamp: number;
}
