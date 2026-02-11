/**
 * Player data model
 */

export type PlayerStatus = 'active' | 'bust' | 'held' | 'won';

export interface PlayerData {
    id: string;
    name: string;
    score: number;
    status: PlayerStatus;
}

export default class Player {
    public id: string;
    public name: string;
    public socketId: string;
    public score: number;
    public status: PlayerStatus;
    public joinedAt: number;

    constructor(id: string, name: string, socketId: string) {
        this.id = id;
        this.name = name;
        this.socketId = socketId;
        this.score = 0;
        this.status = 'active';
        this.joinedAt = Date.now();
    }

    /**
     * Reset player state for a new game
     */
    reset(): void {
        this.score = 0;
        this.status = 'active';
    }

    /**
     * Get serializable player data (for sending to clients)
     */
    toJSON(): PlayerData {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            status: this.status
        };
    }
}
