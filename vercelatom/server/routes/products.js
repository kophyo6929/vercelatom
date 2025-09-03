const express = require('express');
const { body, validationResult } = require('express-validator');
const DatabaseManager = require('../database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', (req, res) => {
    try {
        const db = new DatabaseManager();
        const products = db.getAllProducts();

        // Group products by category and subcategory
        const groupedProducts = products.reduce((acc, product) => {
            if (!acc[product.category]) {
                acc[product.category] = {};
            }
            if (!acc[product.category][product.subcategory || 'default']) {
                acc[product.category][product.subcategory || 'default'] = [];
            }
            acc[product.category][product.subcategory || 'default'].push({
                id: product.id,
                name: product.name,
                price: product.price,
                description: product.description,
                stock: product.stock,
                imageUrl: product.image_url
            });
            return acc;
        }, {});

        res.json(groupedProducts);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product
router.get('/:id', (req, res) => {
    try {
        const productId = req.params.id;
        const db = new DatabaseManager();
        const product = db.getProductById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            subcategory: product.subcategory,
            description: product.description,
            stock: product.stock,
            imageUrl: product.image_url,
            active: product.active
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create product (admin only)
router.post('/', [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
], AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, price, category, subcategory, description, stock } = req.body;
        const db = new DatabaseManager();

        const result = db.createProduct({
            name,
            price: parseFloat(price),
            category,
            subcategory: subcategory || null,
            description: description || null,
            stock: parseInt(stock)
        });

        const newProduct = db.getProductById(result.lastInsertRowid);

        res.status(201).json({
            message: 'Product created successfully',
            product: {
                id: newProduct.id,
                name: newProduct.name,
                price: newProduct.price,
                category: newProduct.category,
                subcategory: newProduct.subcategory,
                description: newProduct.description,
                stock: newProduct.stock
            }
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Purchase product
router.post('/:id/purchase', [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('paymentMethod').optional().trim().notEmpty().withMessage('Payment method required for paid products')
], AuthMiddleware.verifyToken, AuthMiddleware.requireValidUser, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const productId = parseInt(req.params.id);
        const { quantity } = req.body;
        const userId = req.user.userId;

        const db = new DatabaseManager();
        const product = db.getProductById(productId);

        if (!product || !product.active) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        const totalCost = product.price * quantity;
        const user = db.getUserById(userId);

        if (user.credits < totalCost) {
            return res.status(400).json({ error: 'Insufficient credits' });
        }

        // Create order
        const orderResult = db.createOrder({
            userId,
            productId,
            type: 'product',
            amount: totalCost,
            quantity,
            paymentMethod: 'credits'
        });

        // Deduct credits and update stock
        db.updateUserCredits(userId, user.credits - totalCost);
        db.updateProductStock(productId, product.stock - quantity);

        // Send notification to admin
        const ADMIN_ID = 123456;
        db.createNotification(ADMIN_ID, 
            `New order: ${user.username} purchased ${quantity}x ${product.name} for ${totalCost} credits`);

        res.json({
            message: 'Purchase successful',
            orderId: orderResult.lastInsertRowid,
            remainingCredits: user.credits - totalCost
        });

    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;