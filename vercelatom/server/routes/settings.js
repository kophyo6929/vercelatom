const express = require('express');
const { body, validationResult } = require('express-validator');
const DatabaseManager = require('../database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Get payment details
router.get('/payment-details', (req, res) => {
    try {
        const db = new DatabaseManager();
        const paymentDetails = db.getPaymentDetails();

        res.json(paymentDetails);
    } catch (error) {
        console.error('Get payment details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get admin contact
router.get('/admin-contact', (req, res) => {
    try {
        const db = new DatabaseManager();
        const adminContact = db.getAppSetting('admin_contact');

        res.json({ adminContact: adminContact || 'https://t.me/CEO_METAVERSE' });
    } catch (error) {
        console.error('Get admin contact error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update admin contact (admin only)
router.put('/admin-contact', [
    body('adminContact').trim().notEmpty().withMessage('Admin contact is required')
], AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { adminContact } = req.body;
        const db = new DatabaseManager();

        db.updateAppSetting('admin_contact', adminContact);

        res.json({ 
            message: 'Admin contact updated successfully',
            adminContact 
        });

    } catch (error) {
        console.error('Update admin contact error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update payment details (admin only)
router.put('/payment-details', [
    body('paymentDetails').isObject().withMessage('Payment details must be an object')
], AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { paymentDetails } = req.body;
        const db = new DatabaseManager();

        // Clear existing payment details
        db.db.prepare('DELETE FROM payment_details').run();

        // Insert new payment details
        const insertPayment = db.db.prepare(`
            INSERT INTO payment_details (method, name, number)
            VALUES (?, ?, ?)
        `);

        Object.entries(paymentDetails).forEach(([method, details]) => {
            insertPayment.run(method, details.name, details.number);
        });

        res.json({ 
            message: 'Payment details updated successfully',
            paymentDetails 
        });

    } catch (error) {
        console.error('Update payment details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;