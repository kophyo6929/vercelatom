const express = require('express');
const { body, validationResult } = require('express-validator');
const DatabaseManager = require('../database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Get user orders
router.get('/my-orders', AuthMiddleware.verifyToken, AuthMiddleware.requireValidUser, (req, res) => {
    try {
        const userId = req.user.userId;
        const db = new DatabaseManager();
        const orders = db.getOrdersByUser(userId);

        res.json(orders);
    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all orders (admin only)
router.get('/', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const db = new DatabaseManager();
        const orders = db.getAllOrders();

        res.json(orders);
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create credit purchase order
router.post('/buy-credits', [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
    body('paymentMethod').trim().notEmpty().withMessage('Payment method is required')
], AuthMiddleware.verifyToken, AuthMiddleware.requireValidUser, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { amount, paymentMethod } = req.body;
        const userId = req.user.userId;

        const db = new DatabaseManager();

        // Create credit purchase order
        const orderResult = db.createOrder({
            userId,
            productId: null,
            type: 'credit',
            amount: parseFloat(amount),
            quantity: 1,
            paymentMethod
        });

        // Send notification to admin
        const ADMIN_ID = 123456;
        const user = db.getUserById(userId);
        db.createNotification(ADMIN_ID, 
            `New credit purchase: ${user.username} wants to buy ${amount} credits via ${paymentMethod}`);

        res.status(201).json({
            message: 'Credit purchase request created',
            orderId: orderResult.lastInsertRowid,
            status: 'pending'
        });

    } catch (error) {
        console.error('Buy credits error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update order status (admin only)
router.put('/:id/status', [
    body('status').isIn(['pending', 'approved', 'rejected', 'completed']).withMessage('Invalid status')
], AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const orderId = req.params.id;
        const { status } = req.body;

        const db = new DatabaseManager();
        
        // Get order details first
        const orders = db.getAllOrders();
        const order = orders.find(o => o.id === parseInt(orderId));

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order status
        db.updateOrderStatus(orderId, status);

        // If approving a credit purchase, add credits to user
        if (status === 'approved' && order.type === 'credit') {
            const user = db.getUserById(order.user_id);
            const newCredits = user.credits + order.amount;
            db.updateUserCredits(order.user_id, newCredits);

            // Notify user
            db.createNotification(order.user_id, 
                `Your credit purchase of ${order.amount} credits has been approved!`);
        }

        // If rejecting an order, notify user
        if (status === 'rejected') {
            db.createNotification(order.user_id, 
                `Your order has been rejected. Please contact admin for details.`);
        }

        res.json({ 
            message: 'Order status updated successfully',
            orderId,
            status 
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;