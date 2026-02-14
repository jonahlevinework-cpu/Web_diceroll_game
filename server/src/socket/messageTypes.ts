/**
 * JSON message type definitions for client-server communication
 */

// Client → Server message types
export enum ClientMessageType {
    CREATE_ROOM = 'CREATE_ROOM',
    JOIN_ROOM = 'JOIN_ROOM',
    ROLL_DICE = 'ROLL_DICE',
    HOLD = 'HOLD',
    NEW_GAME = 'NEW_GAME',
    GET_ROOM_STATE = 'GET_ROOM_STATE',
    LEAVE_ROOM = 'LEAVE_ROOM'
}

// Server → Client message types
export enum ServerMessageType {
    ROOM_CREATED = 'ROOM_CREATED',
    PLAYER_JOINED = 'PLAYER_JOINED',
    PLAYER_LEFT = 'PLAYER_LEFT',
    DICE_ROLLED = 'DICE_ROLLED',
    GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
    TURN_CHANGED = 'TURN_CHANGED',
    GAME_OVER = 'GAME_OVER',
    ERROR = 'ERROR'
}

// Backward compatibility exports
export const CLIENT_MESSAGES = ClientMessageType;
export const SERVER_MESSAGES = ServerMessageType;

/**
 * Generic message structure
 */
export interface Message<T = any> {
    type: string;
    payload: T;
    timestamp: number;
}

/**
 * Create a standardized message object
 */
export function createMessage<T>(type: string, payload: T): Message<T> {
    return {
        type,
        payload,
        timestamp: Date.now()
    };
}
