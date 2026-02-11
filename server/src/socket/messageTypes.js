/**
 * JSON message type definitions for client-server communication
 */

// Client → Server message types
export const CLIENT_MESSAGES = {
    CREATE_ROOM: 'CREATE_ROOM',
    JOIN_ROOM: 'JOIN_ROOM',
    ROLL_DICE: 'ROLL_DICE',
    HOLD: 'HOLD',
    NEW_GAME: 'NEW_GAME',
    LEAVE_ROOM: 'LEAVE_ROOM'
};

// Server → Client message types
export const SERVER_MESSAGES = {
    ROOM_CREATED: 'ROOM_CREATED',
    PLAYER_JOINED: 'PLAYER_JOINED',
    PLAYER_LEFT: 'PLAYER_LEFT',
    DICE_ROLLED: 'DICE_ROLLED',
    GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
    TURN_CHANGED: 'TURN_CHANGED',
    GAME_OVER: 'GAME_OVER',
    ERROR: 'ERROR'
};

/**
 * Create a standardized message object
 */
export function createMessage(type, payload) {
    return {
        type,
        payload,
        timestamp: Date.now()
    };
}
