const express = require('express');
const { body, validationResult } = require('express-validator');
const DatabaseManager = require('../database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const db = new DatabaseManager();
        const users = db.getAllUsers();
        
        // Remove passwords from response
        const sanitizedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            isAdmin: user.is_admin,
            credits: user.credits,
            securityAmount: user.security_amount,
            banned: user.banned,
            createdAt: user.created_at
        }));

        res.json(sanitizedUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user (admin only)
router.put('/:id', [
    body('credits').optional().isNumeric().withMessage('Credits must be a number'),
    body('banned').optional().isBoolean().withMessage('Banned must be boolean'),
    body('isAdmin').optional().isBoolean().withMessage('IsAdmin must be boolean')
], AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.id;
        const updates = {};

        if (req.body.credits !== undefined) updates.credits = req.body.credits;
        if (req.body.banned !== undefined) updates.banned = req.body.banned;
        if (req.body.isAdmin !== undefined) updates.is_admin = req.body.isAdmin;

        const db = new DatabaseManager();
        db.updateUser(userId, updates);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user notifications
router.get('/:id/notifications', AuthMiddleware.verifyToken, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // Users can only access their own notifications, unless admin
        if (userId !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const db = new DatabaseManager();
        const notifications = db.getNotificationsByUser(userId);

        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Broadcast message to users (admin only)
router.post('/broadcast', [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('targetIds').isArray().withMessage('Target IDs must be an array')
], AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { message, targetIds } = req.body;
        const db = new DatabaseManager();

        // Send notification to each target user
        targetIds.forEach(userId => {
            db.createNotification(userId, message);
        });

        res.json({ 
            message: 'Broadcast sent successfully', 
            count: targetIds.length 
        });

    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;