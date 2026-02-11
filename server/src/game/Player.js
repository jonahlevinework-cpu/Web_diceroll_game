/**
 * Player data model
 */

export default class Player {
    constructor(id, name, socketId) {
        this.id = id;               // Unique player ID (UUID)
        this.name = name;           // Display name
        this.socketId = socketId;   // Socket.IO connection ID
        this.score = 0;             // Current game score
        this.status = 'active';     // 'active' | 'bust' | 'held' | 'won'
        this.joinedAt = Date.now(); // Timestamp when player joined
    }

    /**
     * Reset player state for a new game
     */
    reset() {
        this.score = 0;
        this.status = 'active';
    }

    /**
     * Get serializable player data (for sending to clients)
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            status: this.status
        };
    }
}
