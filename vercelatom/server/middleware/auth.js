const jwt = require('jsonwebtoken');
const DatabaseManager = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

class AuthMiddleware {
    static generateToken(user) {
        return jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                isAdmin: user.is_admin 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
    }

    static verifyToken(req, res, next) {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(400).json({ error: 'Invalid token.' });
        }
    }

    static requireAdmin(req, res, next) {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required.' });
        }
        next();
    }

    static async requireValidUser(req, res, next) {
        try {
            const db = new DatabaseManager();
            const user = db.getUserById(req.user.userId);
            
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            if (user.banned) {
                return res.status(403).json({ error: 'Account is banned.' });
            }

            req.userRecord = user;
            next();
        } catch (error) {
            res.status(500).json({ error: 'Database error.' });
        }
    }
}

module.exports = AuthMiddleware;