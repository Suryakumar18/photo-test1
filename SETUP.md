# Memorable Pictures — Setup Guide

## Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start development server
npm run dev

# 3. Open in browser
# http://localhost:3000
```

## Demo Login

- URL: http://localhost:3000/login
- Email: `admin@memorablepictures.com`
- Password: `Admin@2024`
- Role: Admin

## Environment Variables (.env.local)

Already configured with:
- Bunny.net CDN credentials
- JWT secret
- Admin credentials

For production, update `MONGODB_URI` with your MongoDB connection string.

## MongoDB Setup

Option 1 — Local MongoDB:
```bash
# Install MongoDB and start it
mongod --dbpath ./data
```

Option 2 — MongoDB Atlas (free):
1. Create free cluster at mongodb.com
2. Get connection string
3. Update `MONGODB_URI` in `.env.local`

## Pages

| Page | URL |
|------|-----|
| Landing | http://localhost:3000 |
| Login | http://localhost:3000/login |
| Admin Dashboard | http://localhost:3000/admin |
| Events | http://localhost:3000/admin/events |
| Create Event | http://localhost:3000/admin/events/create |
| Gallery | http://localhost:3000/admin/gallery |
| Upload Center | http://localhost:3000/admin/uploads |
| Analytics | http://localhost:3000/admin/analytics |
| Team | http://localhost:3000/admin/team |
| Settings | http://localhost:3000/admin/settings |
| Event QR Page | http://localhost:3000/event/[slug] |
| Event Gallery | http://localhost:3000/event/[slug]/gallery |

## Features

- **AI Face Recognition** — Upload selfie → find your photos instantly
- **QR Code Events** — Auto-generated QR for each wedding
- **Live Uploads** — Real-time photo upload with progress tracking
- **Bunny.net CDN** — Global CDN delivery for ultra-fast loading
- **Masonry Gallery** — Pinterest-style with lightbox, download, share
- **Admin Dashboard** — Full analytics, event management, team management
- **Dark/Light Theme** — Premium glassmorphism design
- **Fully Responsive** — Mobile, tablet, desktop optimized

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + ShadCN UI
- Framer Motion animations
- Zustand state management
- React Query data fetching
- MongoDB + Mongoose
- Bunny.net Storage & CDN
- JWT Authentication
