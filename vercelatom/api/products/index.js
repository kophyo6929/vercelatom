const DatabaseManager = require('../../server/database');

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
};