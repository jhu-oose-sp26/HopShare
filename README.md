# Hop-Share

Hop-Share is a community-based ridesharing coordination platform designed for students at Johns Hopkins University.

## Project Overview

Hop-Share was created to address a common challenge faced by Hopkins students: transportation. Because undergraduates are generally discouraged from bringing cars to campus and have limited parking access, many students rely on expensive ride-hailing services or inconvenient public transportation.

Hop-Share provides a practical and community-driven solution. It is a web-based platform where JHU students can coordinate shared rides based on destination, time, and preferences. Instead of a traditional ride-hailing service, the app operates a forum-like platform where students can post ride requests or offer rides to others heading in the same direction.

## What Hop-Share Does

With Hop-Share, students can:

- Log in using their Johns Hopkins University credentials.
- Post ride requests for specific destinations and times
- Offer rides if they own a car and want to share costs
- Browse and filter available ride posts
- Communicate securely within the app to coordinate logistics

## Tech Stack

- Frontend: React, TypeScript, Next.js
- Backend: Node.js, Express
- Database: MongoDB
- Deployment: Vercel

## How to run

### Backend

1. Install npm (and optionally pnpm [here](https://pnpm.io/installation))
2. Create a free account on [text](https://serpapi.com/users/sign_up?plan=free) to generate your SerpAPI key
2. Run ``cd backend``
3. Run ``pnpm install``
4. Create a .env using the .env.example as a template
5. Install mongodb at this [link](https://www.mongodb.com/try/download/community) and install Compass when prompted
6. Start a server at the default localhost using Compass or the mongodb shell
7. Run ``pnpm start``

### Frontend

1. Open a new terminal
2. Run ``cd frontend``
3. Run ``pnpm install``
4. Run ``pnpm start``
