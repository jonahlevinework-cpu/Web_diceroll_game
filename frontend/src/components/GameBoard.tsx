import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import DiceCanvas from './DiceCanvas';
import type { PlayerData } from '../types/game';
import './GameBoard.css';

interface GameBoardProps {
    roomId: string;
    playerId: string;
    onLeaveRoom: () => void;
}

function GameBoard({ roomId, playerId, onLeaveRoom }: GameBoardProps) {
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [currentTurn, setCurrentTurn] = useState<string | null>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<string | null>(null);
    const [rollTrigger, setRollTrigger] = useState(0);
    const [lastRoll, setLastRoll] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [isRolling, setIsRolling] = useState(false);

    const isMyTurn = currentTurn === playerId;
    const me = players.find(p => p.id === playerId);

    useEffect(() => {
        // Request initial room state when component mounts
        socketService.getRoomState();

        // Listen for game state updates
        socketService.onGameStateUpdate((data) => {
            setPlayers(data.payload.roomState.players);
            setCurrentTurn(data.payload.roomState.currentTurn);
            setGameStarted(data.payload.roomState.gameStarted);
            setGameOver(data.payload.roomState.gameOver);
            setWinner(data.payload.roomState.winner);
        });

        // Listen for dice rolls
        socketService.onDiceRolled((data) => {
            const { roll, playerName, status, message: rollMsg } = data.payload;
            setLastRoll(roll);
            setMessage(rollMsg);
            // Server has processed the roll, re-enable buttons
            setIsRolling(false);
        });

        // Listen for turn changes
        socketService.onTurnChanged((data) => {
            setCurrentTurn(data.payload.currentTurn);
            setPlayers(data.payload.roomState.players);
            setIsRolling(false);
            setLastRoll(null);
        });

        // Listen for game over
        socketService.onGameOver((data) => {
            setGameOver(true);
            setWinner(data.payload.winner);
            setPlayers(data.payload.roomState.players);
            setMessage(data.payload.message);
        });

        // Listen for player leaving
        socketService.onPlayerLeft((data) => {
            setPlayers(data.payload.roomState.players);
            setMessage(`${data.payload.playerName} left the game`);
        });
    }, []);

    const handleRoll = () => {
        if (!isMyTurn || isRolling || gameOver) return;
        // Trigger the dice animation
        // The result will be sent to server when animation completes
        setRollTrigger(prev => prev + 1);
        setIsRolling(true);
    };

    const handleHold = () => {
        if (!isMyTurn || isRolling || gameOver) return;
        socketService.hold();
    };

    const handleDiceRollComplete = (value: number) => {
        // Dice animation complete - send result to server
        console.log('Dice settled on:', value);
        socketService.rollDice(value);
    };

    const getPlayerStatus = (player: PlayerData) => {
        if (player.status === 'bust') return '💥 BUST';
        if (player.status === 'won') return '🏆 WON';
        if (player.status === 'held') return '🛑 HELD';
        return '✓ Active';
    };

    const getPlayerStatusClass = (player: PlayerData) => {
        if (player.status === 'bust') return 'status-bust';
        if (player.status === 'won') return 'status-won';
        if (player.status === 'held') return 'status-held';
        return 'status-active';
    };

    if (gameOver && winner) {
        const winningPlayer = players.find(p => p.id === winner);
        return (
            <div className="game-board">
                <div className="game-over-screen">
                    <h1>🎉 Game Over!</h1>
                    <h2 className="winner-name">{winningPlayer?.name} Wins!</h2>
                    <div className="final-scores">
                        <h3>Final Scores:</h3>
                        {players.map(player => (
                            <div key={player.id} className={`final-score-item ${player.id === winner ? 'winner' : ''}`}>
                                <span className="player-name">{player.name}</span>
                                <span className="player-score">{player.score}</span>
                                <span className="player-status">{getPlayerStatus(player)}</span>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={onLeaveRoom}>
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="game-board">
            <div className="game-header">
                <div className="room-info">
                    <h2>🎲 Race to 18</h2>
                    <span className="room-id">Room: {roomId}</span>
                </div>
                <button className="btn-leave" onClick={onLeaveRoom}>Leave Game</button>
            </div>

            <div className="game-content">
                <div className="players-panel">
                    <h3>Players</h3>
                    <div className="players-list">
                        {players.map(player => (
                            <div
                                key={player.id}
                                className={`player-item ${currentTurn === player.id ? 'active-turn' : ''} ${player.id === playerId ? 'is-you' : ''} ${getPlayerStatusClass(player)}`}
                            >
                                <div className="player-avatar">
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="player-details">
                                    <div className="player-name">
                                        {player.name}
                                        {player.id === playerId && <span className="you-badge">You</span>}
                                        {currentTurn === player.id && <span className="turn-badge">• Turn</span>}
                                    </div>
                                    <div className="player-score-display">
                                        <span className="score-label">Score:</span>
                                        <span className="score-value">{player.score}</span>
                                    </div>
                                    <div className={`player-status-badge ${getPlayerStatusClass(player)}`}>
                                        {getPlayerStatus(player)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="game-main">
                    <div className="dice-area">
                        <DiceCanvas
                            triggerRoll={rollTrigger}
                            onRollComplete={handleDiceRollComplete}
                        />
                        {lastRoll !== null && (
                            <div className="roll-result">
                                Rolled: {lastRoll}
                            </div>
                        )}
                    </div>

                    <div className="game-info">
                        {message && <div className="game-message">{message}</div>}
                        {isMyTurn && !gameOver && (
                            <div className="turn-indicator">
                                🎯 Your Turn! {me && `(Score: ${me.score}/18)`}
                            </div>
                        )}
                    </div>

                    <div className="game-controls">
                        <button
                            className="btn btn-roll"
                            onClick={handleRoll}
                            disabled={!isMyTurn || isRolling || gameOver}
                        >
                            {isRolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
                        </button>
                        <button
                            className="btn btn-hold"
                            onClick={handleHold}
                            disabled={!isMyTurn || isRolling || gameOver || (me?.score === 0)}
                        >
                            🛑 Hold
                        </button>
                    </div>

                    <div className="game-rules">
                        <h4>How to Play:</h4>
                        <ul>
                            <li>Get as close to 18 as possible without going over</li>
                            <li>Roll the dice on your turn to add to your score</li>
                            <li>Hold to stay at your current score</li>
                            <li>Going over 18 = BUST (you lose)</li>
                            <li>Exactly 18 = Perfect score!</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameBoard;
