import { useState, useEffect } from 'react';
import socketService from './services/socketService';
import Lobby from './components/Lobby';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Connect to Socket.IO server
      const socket = socketService.connect();

      if (!socket) {
        setError('Failed to create socket connection');
        return;
      }

      socket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setError(`Connection error: ${err.message}`);
      });

      // Cleanup on unmount
      return () => {
        socketService.disconnect();
      };
    } catch (err) {
      console.error('Error in App useEffect:', err);
      setError(`App error: ${err}`);
    }
  }, []);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f44336',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        padding: '2rem'
      }}>
        <h1>⚠️ Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
        <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
      </div>

      <Lobby />
    </div>
  );
}

export default App;
