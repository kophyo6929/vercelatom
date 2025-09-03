# 🚀 Deploy Atom Point Web App to Vercel

This guide will help you deploy your full-stack Atom Point Web application to Vercel hosting platform.

## 📋 Prerequisites

- ✅ Vercel account (you already have this)
- ✅ GitHub account
- ✅ Your application code ready

## 🎯 Deployment Strategy

Since Vercel specializes in frontend hosting with serverless functions, we'll use:
- **Frontend**: Static React build hosted on Vercel
- **Backend**: Vercel Serverless Functions (API routes)
- **Database**: Vercel Postgres (or continue with SQLite for simplicity)

## 📦 Step 1: Prepare Your Code for Vercel

### 1.1 Create Vercel Configuration
Create `vercel.json` in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

### 1.2 Update Package.json Scripts
Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "vercel-build": "npm run build"
  }
}
```

## 🔧 Step 2: Convert Backend to Vercel Functions

### 2.1 Create API Directory Structure
Create this folder structure in your project root:
```
/api/
  /auth/
    login.js
    register.js
    profile.js
  /products/
    index.js
    [id].js
  /orders/
    index.js
    my-orders.js
  /settings/
    payment-details.js
    admin-contact.js
  /users/
    index.js
    [id].js
```

### 2.2 Example API Function (api/auth/login.js):
```javascript
import { DatabaseManager } from '../../server/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export default async function handler(req, res) {
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
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = new DatabaseManager();
    const user = db.getUserByUsername(username);

    if (!user || user.banned) {
      return res.status(400).json({ error: 'Invalid credentials or account banned' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
}
```

## 🌐 Step 3: Deploy to Vercel

### Method A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from your project directory**:
```bash
vercel
```

4. **Follow the prompts**:
   - Link to existing project? **No**
   - Project name? **atom-point-web**
   - Directory? **./** (current directory)
   - Auto-deploy? **Yes**

### Method B: Using GitHub Integration

1. **Push code to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/atom-point-web.git
git push -u origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub
   - Select your repository
   - Configure build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

## ⚙️ Step 4: Environment Variables

Set these environment variables in Vercel dashboard:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add these variables:

```
JWT_SECRET=your-super-secret-jwt-key-change-this
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=production
```

## 🗄️ Step 5: Database Options

### Option A: Keep SQLite (Simpler)
- SQLite database will be recreated on each deployment
- Good for testing and small applications
- No additional setup required

### Option B: Upgrade to Vercel Postgres (Recommended)
1. In Vercel dashboard, go to "Storage" → "Create Database"
2. Select "Postgres"
3. Follow setup instructions
4. Update your database connection in the code

## 🔧 Step 6: Update API Base URL

Update your `api/ApiService.ts` file:

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-app-name.vercel.app/api'  // Replace with your actual Vercel URL
  : 'http://localhost:3001/api';
```

## 🚀 Step 7: Final Deployment Commands

```bash
# Build and deploy
npm run build
vercel --prod

# Or if using GitHub integration, just push:
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

## 📱 Step 8: Custom Domain (Optional)

1. In Vercel dashboard, go to "Settings" → "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions

## 🔍 Testing Your Deployed App

1. **Visit your Vercel URL**: `https://your-app-name.vercel.app`
2. **Test login**: Use admin account (Tw / password123)
3. **Check API**: Visit `https://your-app-name.vercel.app/api/health`
4. **Test features**: Registration, product browsing, purchasing

## 🐛 Troubleshooting

### Common Issues:

1. **API Not Working**: 
   - Check Environment Variables are set
   - Verify API routes are in correct `/api/` folder structure

2. **Database Issues**:
   - SQLite: Database recreates on each deployment
   - Solution: Upgrade to Vercel Postgres

3. **Build Failures**:
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`

4. **CORS Errors**:
   - Verify CORS headers are set in API functions
   - Check API_BASE_URL points to correct domain

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Use Vercel CLI: `vercel logs`
3. Visit [Vercel Documentation](https://vercel.com/docs)

---

## 🎉 Success!

Your Atom Point Web app is now live on Vercel! Users can access it from any device/browser with real database persistence.

**Your live URL**: `https://your-app-name.vercel.app`