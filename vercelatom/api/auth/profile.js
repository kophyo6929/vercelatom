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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const db = new DatabaseManager();
    const user = db.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.banned) {
      return res.status(403).json({ error: 'Account is banned.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin,
      credits: user.credits,
      securityAmount: user.security_amount,
      banned: user.banned,
      createdAt: user.created_at
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(400).json({ error: 'Invalid token.' });
  }
};