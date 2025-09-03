const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DatabaseManager = require('../../server/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, securityAmount } = req.body;
    
    if (!username || !password || !securityAmount) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = new DatabaseManager();
    const existingUser = db.getUserByUsername(username);
    
    if (existingUser) {
      if (existingUser.banned) {
        return res.status(403).json({ error: 'Username is banned' });
      }
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = db.createUser({
      username,
      password: hashedPassword,
      securityAmount: parseInt(securityAmount)
    });

    const newUser = db.getUserById(result.lastInsertRowid);
    db.createNotification(newUser.id, 'Welcome to the new Atom Point Web!');

    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, isAdmin: newUser.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
};