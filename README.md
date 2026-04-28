# SafeSpeak

SafeSpeak is an anonymous public safety reporting platform. Citizens can submit incidents, and authorities can view, categorize, route, monitor, and resolve reports from a dashboard.

## Tech Stack

**Frontend**
- React 19
- Vite
- Tailwind CSS
- Axios
- React Router
- Framer Motion
- Leaflet / React Leaflet
- Three.js / React Three Fiber
- Lucide React icons

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- Multer file uploads
- Helmet, CORS, rate limiting
- EXIF metadata support for media checks

## Main Functions

- Anonymous incident reporting
- Authority login and protected dashboard
- AI keyword-based severity detection
- Authority category routing:
  - Law & Order
  - Municipal / Civic Issues
  - Public Safety & Emergency
  - Health & Sanitation
  - Community Disputes
  - Traffic & Transport
  - Cyber / Online Threats
  - Women & Child Safety
  - Rural / Land Issues
- Clickable category filter in authority dashboard
- Recent incident reports table
- Heatmap view for reports
- Critical issue list
- Case status updates: Pending, Under Review, Resolved, Dismissed
- ResolveSpace community posts and duplicate escalation logic

## Run Locally

### 1. Clone and install

```bash
git clone https://github.com/saniya6-11/safespeak.git
cd safespeak
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### 2. Create backend environment file

Copy:

```bash
backend/.env.example
```

Create:

```bash
backend/.env
```

Set these values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/safespeak
JWT_SECRET=replace_with_a_strong_random_secret
FRONTEND_URL=http://localhost:5173
IP_SALT=replace_with_a_strong_random_salt
MAX_FILE_SIZE_MB=50
```

### 3. Start MongoDB

Use local MongoDB or MongoDB Atlas. For local MongoDB, make sure the MongoDB service is running.

### 4. Seed demo data

Run once:

```bash
cd backend
npm run seed
```

### 5. Start backend

```bash
cd backend
npm run dev
```

If nodemon is not available:

```bash
npm start
```

Backend runs on:

```text
http://localhost:5000
```

### 6. Start frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

Authority dashboard:

```text
http://localhost:5173/authority/dashboard
```

## Demo Login

After running `npm run seed`:

```text
Admin:  admin@safespeak.in  / Admin@1234
Police: police@safespeak.in / Police@1234
```

## Deploy Online

Recommended setup:

- Database: MongoDB Atlas
- Backend API: Render
- Frontend: Vercel

### 1. Create a MongoDB Atlas database

Create a free Atlas cluster, add a database user, allow network access, and copy the connection string. Use a database name such as `safespeak`:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/safespeak
```

### 2. Deploy the backend on Render

Create a new Render Web Service from this repository.

Use these settings if you are not using the included `render.yaml` blueprint:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Set these Render environment variables:

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=use_a_long_random_secret
IP_SALT=use_a_long_random_salt
FRONTEND_URL=https://your-vercel-app.vercel.app
MAX_FILE_SIZE_MB=50
```

After the backend deploys, test:

```text
https://your-render-service.onrender.com/api/health
```

### 3. Deploy the frontend on Vercel

Import this repository into Vercel and set:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Set this Vercel environment variable:

```env
VITE_API_URL=https://your-render-service.onrender.com
```

After Vercel gives you the final frontend URL, update Render's `FRONTEND_URL` value to that exact URL and redeploy the backend.

### 4. Seed production demo users

If you want the demo authority logins online, run this once against the production database:

```bash
cd backend
npm run seed
```

Make sure `MONGODB_URI` points to your Atlas database before running the seed command.

### Deployment Notes

- Render free services can sleep after inactivity, so the first API request may take a moment.
- Render's local filesystem is ephemeral. Uploaded files in `backend/uploads` are fine for demos, but production should use persistent storage such as S3 or Cloudinary.
- Vercel needs `frontend/vercel.json` so React Router pages work after a browser refresh.

## File Structure

```text
safespeak/
+-- backend/
|   +-- middleware/
|   |   +-- auth.js
|   |   +-- upload.js
|   +-- models/
|   |   +-- Alert.js
|   |   +-- Authority.js
|   |   +-- Report.js
|   |   +-- ResolvePost.js
|   +-- routes/
|   |   +-- alerts.js
|   |   +-- auth.js
|   |   +-- cases.js
|   |   +-- dashboard.js
|   |   +-- heatmap.js
|   |   +-- reports.js
|   |   +-- resolveSpace.js
|   +-- utils/
|   |   +-- nlp.js
|   |   +-- seed.js
|   +-- .env.example
|   +-- package.json
|   +-- server.js
+-- frontend/
|   +-- public/
|   +-- src/
|   |   +-- components/
|   |   |   +-- Earth3D.jsx
|   |   |   +-- Footer.jsx
|   |   |   +-- Navbar.jsx
|   |   +-- pages/
|   |   |   +-- Authority/
|   |   |   |   +-- Dashboard.jsx
|   |   |   +-- AuthorityLogin.jsx
|   |   |   +-- Home.jsx
|   |   |   +-- ReportIncident.jsx
|   |   |   +-- ResolveSpace.jsx
|   |   +-- App.jsx
|   |   +-- index.css
|   |   +-- main.jsx
|   +-- package.json
|   +-- vite.config.js
+-- docs/
|   +-- README.md
+-- .gitignore
+-- README.md
```

## Important Backend Routes

```text
POST   /api/auth/login
GET    /api/auth/me
POST   /api/reports/submit
GET    /api/reports
GET    /api/reports/search/:reportId
PATCH  /api/reports/:id/status
GET    /api/cases/all
PATCH  /api/cases/:id/resolve
PATCH  /api/cases/:id/dismiss
GET    /api/dashboard/stats
GET    /api/heatmap/data
GET    /api/heatmap/critical
GET    /api/alerts
GET    /api/resolve-space
POST   /api/resolve-space
```

## Notes

- Do not commit `backend/.env`.
- Do not commit `node_modules`, `frontend/dist`, or `backend/uploads`.
- Use `.env.example` only as a template.
