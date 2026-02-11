/**
 * Game state logic for "Race to 18"
 * 
 * Rules:
 * - Players roll dice (1-6) to accumulate points
 * - Goal: Get as close to 18 as possible without going over
 * - Score > 18 = BUST (player loses)
 * - Score = 18 = PERFECT (instant win)
 * - Players can HOLD to keep their current score
 */

export default class GameState {
    constructor() {
        this.targetScore = 18;
        this.gameStarted = false;
        this.gameOver = false;
        this.winner = null;
    }

    /**
     * Generate a random dice roll (1-6)
     * Server-authoritative to prevent cheating
     */
    rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    /**
     * Update player score and check win/bust conditions
     * @param {Player} player - Player object
     * @param {number} roll - Dice roll result (1-6)
     * @returns {Object} Result with status and message
     */
    updateScore(player, roll) {
        player.score += roll;

        // Check for bust
        if (player.score > this.targetScore) {
            player.status = 'bust';
            return {
                status: 'bust',
                message: `${player.name} BUSTED with ${player.score}!`,
                newScore: player.score
            };
        }

        // Check for perfect score
        if (player.score === this.targetScore) {
            player.status = 'won';
            this.gameOver = true;
            this.winner = player.id;
            return {
                status: 'perfect',
                message: `${player.name} hit PERFECT 18! 🎉`,
                newScore: player.score
            };
        }

        // Normal roll
        return {
            status: 'playing',
            message: `${player.name} rolled ${roll}. Score: ${player.score}`,
            newScore: player.score
        };
    }

    /**
     * Player holds their current score
     * @param {Player} player - Player object
     * @returns {Object} Result with status and message
     */
    hold(player) {
        if (player.status !== 'active') {
            return {
                status: 'error',
                message: 'Player cannot hold in current state'
            };
        }

        player.status = 'held';
        const distance = this.targetScore - player.score;

        return {
            status: 'held',
            message: `${player.name} held at ${player.score} (${distance} away from 18)`,
            finalScore: player.score
        };
    }

    /**
     * Check if game is over
     * Game ends when:
     * - Someone hits 18 (perfect)
     * - All players have busted or held
     * @param {Array<Player>} players - Array of all players
     * @returns {boolean}
     */
    checkGameOver(players) {
        if (this.gameOver) return true;

        // Check if all players are done (bust or held)
        const activePlayers = players.filter(p => p.status === 'active');
        if (activePlayers.length === 0) {
            this.gameOver = true;
            this.determineWinner(players);
            return true;
        }

        return false;
    }

    /**
     * Determine winner when game ends
     * Winner = highest score without busting
     * @param {Array<Player>} players - Array of all players
     */
    determineWinner(players) {
        const validPlayers = players.filter(p => p.status === 'held' || p.status === 'won');

        if (validPlayers.length === 0) {
            this.winner = null; // Everyone busted
            return;
        }

        // Find player with highest score
        const winner = validPlayers.reduce((best, current) => {
            return current.score > best.score ? current : best;
        });

        this.winner = winner.id;
        winner.status = 'won';
    }

    /**
     * Reset game state for a new round
     */
    reset() {
        this.gameStarted = false;
        this.gameOver = false;
        this.winner = null;
    }

    /**
     * Start the game
     */
    start() {
        this.gameStarted = true;
        this.gameOver = false;
        this.winner = null;
    }
}
