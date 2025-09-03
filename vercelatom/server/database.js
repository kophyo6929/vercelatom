const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        // Create database in /tmp directory for Vercel serverless functions
        const dbPath = process.env.NODE_ENV === 'production' 
            ? '/tmp/atom_point.db' 
            : path.join(__dirname, 'atom_point.db');
            
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        this.db = new Database(dbPath);
        this.initializeTables();
        this.createInitialData();
    }

    initializeTables() {
        // Users table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                credits INTEGER DEFAULT 0,
                security_amount INTEGER DEFAULT 0,
                banned BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Products table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT,
                description TEXT,
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Orders table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER,
                type TEXT NOT NULL CHECK (type IN ('product', 'credit')),
                amount REAL NOT NULL,
                quantity INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
                payment_method TEXT,
                payment_screenshot TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
            )
        `);

        // Notifications table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);

        // Payment details table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS payment_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                method TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                number TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // App settings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async createInitialData() {
        try {
            // Check if admin user exists
            const adminExists = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('Tw');
            
            if (adminExists.count === 0) {
                // Create admin user
                const hashedPassword = await bcrypt.hash('password123', 10);
                this.db.prepare(`
                    INSERT INTO users (id, username, password, is_admin, credits, security_amount)
                    VALUES (123456, ?, ?, TRUE, 10000, 1000)
                `).run('Tw', hashedPassword);

                // Add admin notification
                this.db.prepare(`
                    INSERT INTO notifications (user_id, message)
                    VALUES (123456, 'Welcome to Atom Point Admin Panel!')
                `).run();
            }

            // Create sample products
            const productExists = this.db.prepare('SELECT COUNT(*) as count FROM products').get();
            
            if (productExists.count === 0) {
                const products = [
                    {
                        name: 'Facebook Account',
                        price: 5.99,
                        category: 'Social Media',
                        subcategory: 'Accounts',
                        description: 'Premium Facebook account with full access',
                        stock: 50
                    },
                    {
                        name: 'Instagram Account',
                        price: 7.99,
                        category: 'Social Media',
                        subcategory: 'Accounts',
                        description: 'Verified Instagram account with followers',
                        stock: 30
                    },
                    {
                        name: 'Netflix Premium',
                        price: 12.99,
                        category: 'Streaming',
                        subcategory: 'Entertainment',
                        description: '1-month Netflix premium subscription',
                        stock: 100
                    },
                    {
                        name: 'Spotify Premium',
                        price: 9.99,
                        category: 'Streaming',
                        subcategory: 'Music',
                        description: '1-month Spotify premium access',
                        stock: 75
                    }
                ];

                const insertProduct = this.db.prepare(`
                    INSERT INTO products (name, price, category, subcategory, description, stock)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                products.forEach(product => {
                    insertProduct.run(product.name, product.price, product.category, 
                                    product.subcategory, product.description, product.stock);
                });
            }

            // Create payment details
            const paymentExists = this.db.prepare('SELECT COUNT(*) as count FROM payment_details').get();
            
            if (paymentExists.count === 0) {
                this.db.prepare(`
                    INSERT INTO payment_details (method, name, number)
                    VALUES ('KPay', 'ATOM Point Admin', '09 987 654 321')
                `).run();
                
                this.db.prepare(`
                    INSERT INTO payment_details (method, name, number)
                    VALUES ('Wave Pay', 'ATOM Point Services', '09 123 456 789')
                `).run();
            }

            // Set admin contact
            const contactExists = this.db.prepare('SELECT COUNT(*) as count FROM app_settings WHERE key = ?').get('admin_contact');
            
            if (contactExists.count === 0) {
                this.db.prepare(`
                    INSERT INTO app_settings (key, value)
                    VALUES ('admin_contact', 'https://t.me/CEO_METAVERSE')
                `).run();
            }

        } catch (error) {
            console.error('Error creating initial data:', error);
        }
    }

    // User methods
    getUserByUsername(username) {
        return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }

    getUserById(id) {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    createUser(userData) {
        const { username, password, securityAmount } = userData;
        return this.db.prepare(`
            INSERT INTO users (username, password, security_amount)
            VALUES (?, ?, ?)
        `).run(username, password, securityAmount);
    }

    updateUserCredits(userId, credits) {
        return this.db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(credits, userId);
    }

    getAllUsers() {
        return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    }

    updateUser(userId, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        return this.db.prepare(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                     .run(...values, userId);
    }

    // Product methods
    getAllProducts() {
        return this.db.prepare('SELECT * FROM products WHERE active = TRUE ORDER BY category, name').all();
    }

    getProductById(id) {
        return this.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    }

    updateProductStock(productId, newStock) {
        return this.db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, productId);
    }

    createProduct(productData) {
        const { name, price, category, subcategory, description, stock } = productData;
        return this.db.prepare(`
            INSERT INTO products (name, price, category, subcategory, description, stock)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(name, price, category, subcategory, description, stock);
    }

    // Order methods
    createOrder(orderData) {
        const { userId, productId, type, amount, quantity, paymentMethod } = orderData;
        return this.db.prepare(`
            INSERT INTO orders (user_id, product_id, type, amount, quantity, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, productId, type, amount, quantity, paymentMethod);
    }

    getOrdersByUser(userId) {
        return this.db.prepare(`
            SELECT o.*, p.name as product_name
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `).all(userId);
    }

    getAllOrders() {
        return this.db.prepare(`
            SELECT o.*, u.username, p.name as product_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN products p ON o.product_id = p.id
            ORDER BY o.created_at DESC
        `).all();
    }

    updateOrderStatus(orderId, status) {
        return this.db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
    }

    // Notification methods
    createNotification(userId, message) {
        return this.db.prepare(`
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
        `).run(userId, message);
    }

    getNotificationsByUser(userId) {
        return this.db.prepare(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `).all(userId);
    }

    // Payment and settings methods
    getPaymentDetails() {
        const details = this.db.prepare('SELECT * FROM payment_details').all();
        const result = {};
        details.forEach(detail => {
            result[detail.method] = { name: detail.name, number: detail.number };
        });
        return result;
    }

    getAppSetting(key) {
        const result = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
        return result ? result.value : null;
    }

    updateAppSetting(key, value) {
        return this.db.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(key, value);
    }

    close() {
        this.db.close();
    }
}

module.exports = DatabaseManager;