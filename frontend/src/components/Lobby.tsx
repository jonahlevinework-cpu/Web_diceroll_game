import { useState } from 'react';
import socketService from '../services/socketService';
import type { RoomState, PlayerData } from '../types/game';
import './Lobby.css';

function Lobby() {
    const [playerName, setPlayerName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // Handle room creation
    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        setIsCreating(true);
        setError(null);

        socketService.createRoom(playerName, (data) => {
            console.log('Room created:', data);
            setCurrentRoomId(data.payload.roomId);
            setPlayerId(data.payload.playerId);
            setPlayers(data.payload.roomState.players);
            setIsCreating(false);
        });

        // Listen for game state updates
        socketService.onGameStateUpdate((data) => {
            console.log('Game state update:', data);
            setPlayers(data.payload.roomState.players);
        });

        // Listen for player left
        socketService.onPlayerLeft((data) => {
            console.log('Player left:', data);
            setPlayers(data.payload.roomState.players);
        });

        // Listen for errors
        socketService.onError((data) => {
            setError(data.payload.message);
            setIsCreating(false);
            setIsJoining(false);
        });
    };

    // Handle joining room
    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }

        setIsJoining(true);
        setError(null);

        socketService.joinRoom(roomId, playerName, (data) => {
            console.log('Joined room:', data);
            setCurrentRoomId(roomId);
            setPlayerId(data.payload.playerId);
            setPlayers(data.payload.roomState.players);
            setIsJoining(false);
        });

        // Listen for game state updates
        socketService.onGameStateUpdate((data) => {
            console.log('Game state update:', data);
            setPlayers(data.payload.roomState.players);
        });

        // Listen for player left
        socketService.onPlayerLeft((data) => {
            console.log('Player left:', data);
            setPlayers(data.payload.roomState.players);
        });

        // Listen for errors
        socketService.onError((data) => {
            setError(data.payload.message);
            setIsJoining(false);
        });
    };

    // Copy room ID to clipboard
    const copyRoomId = () => {
        if (currentRoomId) {
            navigator.clipboard.writeText(currentRoomId);
            alert('Room ID copied to clipboard!');
        }
    };

    return (
        <div className="lobby">
            <div className="lobby-container">
                <h1 className="lobby-title">🎲 Race to 18</h1>

                {!currentRoomId ? (
                    <div className="lobby-main">
                        <div className="input-group">
                            <label htmlFor="playerName">Your Name</label>
                            <input
                                id="playerName"
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name..."
                                maxLength={20}
                                disabled={isCreating || isJoining}
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <div className="lobby-actions">
                            <div className="create-section">
                                <h2>Create New Room</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateRoom}
                                    disabled={isCreating || isJoining}
                                >
                                    {isCreating ? 'Creating...' : 'Create Room'}
                                </button>
                            </div>

                            <div className="divider">
                                <span>OR</span>
                            </div>

                            <div className="join-section">
                                <h2>Join Existing Room</h2>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="Enter Room ID..."
                                    disabled={isCreating || isJoining}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleJoinRoom}
                                    disabled={isCreating || isJoining}
                                >
                                    {isJoining ? 'Joining...' : 'Join Room'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="room-lobby">
                        <div className="room-header">
                            <h2>Waiting Room</h2>
                            <div className="room-id-display">
                                <span className="label">Room ID:</span>
                                <code className="room-id">{currentRoomId}</code>
                                <button className="btn-copy" onClick={copyRoomId} title="Copy to clipboard">
                                    📋
                                </button>
                            </div>
                        </div>

                        <div className="players-list">
                            <h3>Players ({players.length}/4)</h3>
                            <div className="players-grid">
                                {players.map((player) => (
                                    <div
                                        key={player.id}
                                        className={`player-card ${player.id === playerId ? 'is-you' : ''}`}
                                    >
                                        <div className="player-avatar">
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="player-info">
                                            <div className="player-name">
                                                {player.name}
                                                {player.id === playerId && <span className="you-badge">You</span>}
                                            </div>
                                            <div className="player-status">{player.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="waiting-message">
                            {players.length < 2 ? (
                                <p>⏳ Waiting for at least one more player to join...</p>
                            ) : (
                                <p>✅ Ready to start! Game will begin shortly.</p>
                            )}
                        </div>

                        <div className="lobby-instructions">
                            <h4>How to Invite Friends:</h4>
                            <ol>
                                <li>Copy the Room ID above</li>
                                <li>Share it with your friends</li>
                                <li>They can join using "Join Room"</li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Lobby;
