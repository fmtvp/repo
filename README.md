# Anonymous Confession App

A minimal full-stack application for anonymous confessions with admin moderation.

## Features

- **Public Form**: Users can submit anonymous confessions
- **Admin Authentication**: Secure login system for admin access
- **Admin CRUD**: Create, Read, Update, Delete confessions
- **Public Index**: Display approved confessions
- **Modern UI**: Clean, responsive design with tabbed admin interface

## Tech Stack

- Node.js + Express
- MongoDB with Mongoose
- EJS templating
- Docker & Docker Compose

## Quick Start

```bash
# Start with Docker
docker-compose up --build

# Or run locally (requires MongoDB)
npm install
npm start
```

Visit:
- http://localhost:3000 - Public confessions
- http://localhost:3000/submit - Submit confession
- http://localhost:3000/admin - Admin panel (requires login)

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`

**Important**: Change the default password in production!

## API Endpoints

- `GET /` - Public confessions page
- `GET /submit` - Submission form
- `POST /submit` - Submit confession
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Admin authentication
- `GET /admin` - Admin panel (authenticated)
- `POST /admin/approve/:id` - Approve confession
- `POST /admin/delete/:id` - Delete confession
- `POST /admin/edit/:id` - Edit confession content
- `POST /admin/logout` - Admin logout
