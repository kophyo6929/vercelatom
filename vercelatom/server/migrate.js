// Database Migration Script for Atom Point Web App
// This script helps migrate data or reset the database if needed

const DatabaseManager = require('./database');

class DatabaseMigration {
    constructor() {
        this.db = new DatabaseManager();
    }

    // Reset database to initial state
    async reset() {
        console.log('🔄 Resetting database...');
        
        // Drop all tables
        this.db.db.exec(`
            DROP TABLE IF EXISTS notifications;
            DROP TABLE IF EXISTS orders;
            DROP TABLE IF EXISTS products;
            DROP TABLE IF EXISTS users;
            DROP TABLE IF EXISTS payment_details;
            DROP TABLE IF EXISTS app_settings;
        `);

        // Recreate tables and initial data
        this.db.initializeTables();
        await this.db.createInitialData();
        
        console.log('✅ Database reset complete!');
    }

    // Add sample data for testing
    async addSampleData() {
        console.log('📊 Adding sample data...');
        
        try {
            // Add more sample users
            const bcrypt = require('bcryptjs');
            
            const sampleUsers = [
                { username: 'user1', password: await bcrypt.hash('password123', 10), securityAmount: 500 },
                { username: 'user2', password: await bcrypt.hash('password123', 10), securityAmount: 750 },
                { username: 'testuser', password: await bcrypt.hash('test123', 10), securityAmount: 1000 }
            ];

            const insertUser = this.db.db.prepare(`
                INSERT INTO users (username, password, security_amount, credits)
                VALUES (?, ?, ?, ?)
            `);

            sampleUsers.forEach(user => {
                insertUser.run(user.username, user.password, user.securityAmount, Math.floor(Math.random() * 100));
            });

            // Add more sample products
            const sampleProducts = [
                {
                    name: 'YouTube Premium',
                    price: 8.99,
                    category: 'Streaming',
                    subcategory: 'Entertainment',
                    description: '1-month YouTube Premium subscription',
                    stock: 200
                },
                {
                    name: 'Discord Nitro',
                    price: 9.99,
                    category: 'Gaming',
                    subcategory: 'Communication',
                    description: '1-month Discord Nitro subscription',
                    stock: 150
                },
                {
                    name: 'TikTok Account',
                    price: 15.99,
                    category: 'Social Media',
                    subcategory: 'Accounts',
                    description: 'Verified TikTok account with followers',
                    stock: 25
                }
            ];

            const insertProduct = this.db.db.prepare(`
                INSERT INTO products (name, price, category, subcategory, description, stock)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            sampleProducts.forEach(product => {
                insertProduct.run(product.name, product.price, product.category, 
                                product.subcategory, product.description, product.stock);
            });

            console.log('✅ Sample data added successfully!');

        } catch (error) {
            console.error('❌ Error adding sample data:', error);
        }
    }

    // Display database stats
    getStats() {
        console.log('📈 Database Statistics:');
        console.log('Users:', this.db.db.prepare('SELECT COUNT(*) as count FROM users').get().count);
        console.log('Products:', this.db.db.prepare('SELECT COUNT(*) as count FROM products').get().count);
        console.log('Orders:', this.db.db.prepare('SELECT COUNT(*) as count FROM orders').get().count);
        console.log('Notifications:', this.db.db.prepare('SELECT COUNT(*) as count FROM notifications').get().count);
    }

    close() {
        this.db.close();
    }
}

// Command line interface
if (require.main === module) {
    const migration = new DatabaseMigration();
    const command = process.argv[2];

    switch (command) {
        case 'reset':
            migration.reset().then(() => {
                migration.getStats();
                migration.close();
            });
            break;
        case 'sample':
            migration.addSampleData().then(() => {
                migration.getStats();
                migration.close();
            });
            break;
        case 'stats':
            migration.getStats();
            migration.close();
            break;
        default:
            console.log('Usage: node migrate.js [reset|sample|stats]');
            console.log('  reset  - Reset database to initial state');
            console.log('  sample - Add sample data for testing');
            console.log('  stats  - Show database statistics');
            migration.close();
    }
}

module.exports = DatabaseMigration;