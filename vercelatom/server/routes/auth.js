const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const DatabaseManager = require('../database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('securityAmount').isNumeric().withMessage('Security amount must be a number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password, securityAmount } = req.body;
        const db = new DatabaseManager();

        // Check if user exists
        const existingUser = db.getUserByUsername(username);
        if (existingUser) {
            if (existingUser.banned) {
                return res.status(403).json({ error: 'Username is banned' });
            }
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = db.createUser({
            username,
            password: hashedPassword,
            securityAmount: parseInt(securityAmount)
        });

        const newUser = db.getUserById(result.lastInsertRowid);
        
        // Create welcome notification
        db.createNotification(newUser.id, 'Welcome to the new Atom Point Web!');

        // Generate token
        const token = AuthMiddleware.generateToken(newUser);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newUser.id,
                username: newUser.username,
                isAdmin: newUser.is_admin,
                credits: newUser.credits,
                securityAmount: newUser.security_amount,
                banned: newUser.banned
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const db = new DatabaseManager();

        // Find user
        const user = db.getUserByUsername(username);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (user.banned) {
            return res.status(403).json({ error: 'Account is banned' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = AuthMiddleware.generateToken(user);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.is_admin,
                credits: user.credits,
                securityAmount: user.security_amount,
                banned: user.banned
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user profile
router.get('/profile', AuthMiddleware.verifyToken, AuthMiddleware.requireValidUser, (req, res) => {
    const user = req.userRecord;
    res.json({
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        credits: user.credits,
        securityAmount: user.security_amount,
        banned: user.banned,
        createdAt: user.created_at
    });
});

// Password reset (for admin)
router.post('/reset-password', [
    body('userId').isNumeric().withMessage('User ID must be a number'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, newPassword } = req.body;
        const db = new DatabaseManager();

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        db.updateUser(userId, { password: hashedPassword });

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;