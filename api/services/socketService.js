/**
 * @module services/socketService
 * @description WebSocket service for real-time notifications
 */

const { logInfo, logError } = require('../../utils/logger');

let io = null;
const connectedUsers = new Map(); // userId -> socketId

/**
 * Initialize Socket.IO
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
exports.initializeSocket = (server) => {
    if (io) {
        return io;
    }

    const socketIo = require('socket.io');
    io = socketIo(server, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        logInfo('WebSocket client connected', { socketId: socket.id });

        // Authenticate user
        socket.on('authenticate', (data) => {
            const { userId } = data;
            if (userId) {
                connectedUsers.set(userId, socket.id);
                socket.userId = userId;
                socket.join(`user:${userId}`);
                logInfo('User authenticated on WebSocket', { userId, socketId: socket.id });
                socket.emit('authenticated', { success: true });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                logInfo('WebSocket client disconnected', { 
                    socketId: socket.id, 
                    userId: socket.userId 
                });
            }
        });

        // Handle errors
        socket.on('error', (error) => {
            logError('WebSocket error', { socketId: socket.id, error });
        });
    });

    logInfo('WebSocket server initialized');
    return io;
};

/**
 * Get Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
exports.getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket first.');
    }
    return io;
};

/**
 * Send notification to a specific user
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
exports.notifyUser = (userId, event, data) => {
    try {
        if (!io) {
            return;
        }

        io.to(`user:${userId}`).emit(event, {
            timestamp: new Date().toISOString(),
            ...data
        });

        logInfo('User notified via WebSocket', { userId, event });
    } catch (error) {
        logError('Failed to send WebSocket notification', { userId, event, error });
    }
};

/**
 * Send notification to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
exports.notifyAll = (event, data) => {
    try {
        if (!io) {
            return;
        }

        io.emit(event, {
            timestamp: new Date().toISOString(),
            ...data
        });

        logInfo('All users notified via WebSocket', { event });
    } catch (error) {
        logError('Failed to broadcast WebSocket notification', { event, error });
    }
};

/**
 * Get connected user count
 * @returns {number} Number of connected users
 */
exports.getConnectedUsersCount = () => {
    return connectedUsers.size;
};

/**
 * Check if user is connected
 * @param {string} userId - User ID
 * @returns {boolean} Connection status
 */
exports.isUserConnected = (userId) => {
    return connectedUsers.has(userId);
};
