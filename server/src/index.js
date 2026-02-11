/**
 * Main server entry point
 * Express + Socket.IO server for multiplayer dice game
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { initializeSocketHandlers, getActiveRoomsCount } from './socket/socketHandler.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        activeRooms: getActiveRoomsCount(),
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Race to 18 - Multiplayer Dice Game Server',
        version: '1.0.0',
        status: 'running',
        activeRooms: getActiveRoomsCount()
    });
});

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

// Start server
httpServer.listen(PORT, () => {
    logger.info(`🎲 Server running on port ${PORT}`);
    logger.info(`📡 WebSocket ready for connections`);
    logger.info(`🌐 CORS enabled for: ${CORS_ORIGIN}`);
    logger.info(`🎮 Max players per room: ${process.env.MAX_PLAYERS_PER_ROOM || 4}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});
