# Anonymous Confession App

A serverless confession app with admin moderation, built for Vercel deployment.

## Features

- **Anonymous Confessions**: Submit confessions with activation codes
- **Admin Panel**: Manage confessions and activation codes
- **MongoDB Sessions**: Persistent sessions using MongoDB store
- **Serverless Ready**: Optimized for Vercel deployment

## Vercel Deployment

### Environment Variables Required:
- `MONGO_URL` - MongoDB connection string
- `SESSION_SECRET` - Session secret key

### Deploy Steps:
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically

## Usage

- **Public**: `/` - View approved confessions (requires activation code)
- **Submit**: `/submit` - Submit new confession (requires activation code)  
- **Setup**: `/setup` - Create first admin account (only when no admin exists)
- **Admin**: `/admin/login` - Admin login
- **Admin Panel**: `/admin` - Manage confessions and codes

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- EJS Templates
- MongoDB Session Store
- Vercel Serverless Functions
