# SafeSpeak — Complete Developer Handoff Document
### For Frontend AI / Developer Reference

---

## PROJECT OVERVIEW

SafeSpeak is an anonymous AI-powered web platform where Indian citizens can report communal tensions, threats, and early conflict signs safely. There are **two separate UIs**: an Authority Panel and a Public User Panel.

---

## FILE STRUCTURE

```
safespeak/
├── backend/
│   ├── server.js                   ← Express entry point (PORT 5000)
│   ├── package.json
│   ├── .env.example                ← Copy to .env
│   ├── models/
│   │   ├── Report.js               ← Report schema
│   │   ├── Authority.js            ← Authority (police/NGO/admin)
│   │   ├── ResolvePost.js          ← Community posts (ResolveSpace)
│   │   └── Alert.js                ← Authority alerts
│   ├── routes/
│   │   ├── auth.js                 ← Login / authority management
│   │   ├── reports.js              ← Submit & manage reports
│   │   ├── resolveSpace.js         ← Community posts, likes, replies
│   │   ├── heatmap.js              ← Heatmap data for India map
│   │   ├── alerts.js               ← Authority alert management
│   │   ├── cases.js                ← Case management (resolve/dismiss)
│   │   └── dashboard.js            ← Analytics & stats
│   ├── middleware/
│   │   ├── auth.js                 ← JWT protect middleware
│   │   └── upload.js               ← Multer file upload config
│   └── utils/
│       ├── nlp.js                  ← NLP analysis engine
│       └── seed.js                 ← DB seeder (run once)
```

---

## HOW TO RUN — STEP BY STEP

### 1. Prerequisites
- Node.js v18+
- MongoDB (local) OR MongoDB Atlas account
- npm

### 2. Install dependencies
```bash
cd safespeak/backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Open .env and set your MONGODB_URI and JWT_SECRET
```

### 4. Seed the database (creates admin + sample data)
```bash
npm run seed
```

### 5. Start the backend server
```bash
npm run dev     # development (auto-reload)
# OR
npm start       # production
```
Server runs at: **http://localhost:5000**

### 6. Default Login Credentials (after seeding)
| Role  | Email                    | Password     |
|-------|--------------------------|--------------|
| Admin | admin@safespeak.in       | Admin@1234   |
| Police| police@safespeak.in      | Police@1234  |

---

## ALL API ENDPOINTS

### Base URL: `http://localhost:5000/api`

---

### 🔐 AUTH ROUTES — `/api/auth`

#### POST `/api/auth/login`
Authority login.
- **Body:** `{ email, password }`
- **Returns:** `{ success, token, authority: { name, email, role, department, jurisdiction } }`
- **Store token** in localStorage and send as `Authorization: Bearer <token>` header.

#### POST `/api/auth/register`  *(Admin only — requires token)*
Register new authority account.
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ name, email, password, role, department, badgeId, jurisdiction: { state, district, city } }`
- **role options:** `"police"` | `"ngo"` | `"admin"` | `"district_officer"`

#### GET `/api/auth/me`  *(Requires token)*
Get current authority profile.

#### GET `/api/auth/authorities`  *(Admin only)*
List all authority accounts.

#### PATCH `/api/auth/authorities/:id/deactivate`  *(Admin only)*
Deactivate an authority.

---

### 📋 REPORTS ROUTES — `/api/reports`

#### POST `/api/reports/submit`
**Public (no auth).** Submit anonymous incident report.
- **Method:** `multipart/form-data`
- **Fields:**
  - `title` (required) — incident title
  - `description` (required) — detailed description
  - `media` (optional, up to 5 files) — images/videos/audio
  - `latitude` — decimal number (e.g. 28.6139)
  - `longitude` — decimal number (e.g. 77.2090)
  - `address` — full text address
  - `state` — e.g. "Delhi"
  - `district` — e.g. "South East Delhi"
  - `city` — e.g. "New Delhi"
  - `pincode` — 6-digit pincode
  - `detectedMethod` — `"auto"` or `"manual"`
- **Returns:** `{ success, message, reportId, severity }`
- **Note:** NLP runs automatically. Spam/fake reports are silently filtered.

#### GET `/api/reports`  *(Requires token)*
Get all reports with filters.
- **Query params:** `status`, `severity`, `state`, `district`, `from`, `to`, `page`, `limit`
- `status` options: `"Pending"` | `"Under Review"` | `"Resolved"` | `"Dismissed"`
- `severity` options: `"Low"` | `"Medium"` | `"Critical"`

#### GET `/api/reports/search/:reportId`  *(Requires token)*
Search by human-readable ID (e.g. `RPT-1703001234-AB12C`).
- Used in the **Search Reports** feature in authority dashboard.

#### GET `/api/reports/:id`  *(Requires token)*
Get single report by MongoDB `_id`.

#### PATCH `/api/reports/:id/status`  *(Requires token)*
Update report status.
- **Body:** `{ status: "Under Review" | "Resolved" | "Dismissed", resolutionNote: "..." }`

#### PATCH `/api/reports/:id/assign`  *(Requires token)*
Assign report to current logged-in authority (marks as Under Review).

#### GET `/api/reports/public/history`  *(Public)*
List of resolved reports (anonymized) for public history section.

---

### 🏘️ RESOLVE-SPACE ROUTES — `/api/resolve-space`

#### POST `/api/resolve-space/posts`
**Public.** Create community post.
- **Body:** `{ title, description, address, state, district, city }`
- **Returns:** `{ success, post, postId }`
- **Duplicate logic:** If a similar post exists in same district, it increments `toleranceCount`. At 4+, higher authority is auto-alerted.

#### GET `/api/resolve-space/posts`
**Public.** Get all community posts.
- **Query:** `state`, `district`, `page`, `limit`
- Posts are returned without any user identification.

#### GET `/api/resolve-space/posts/:postId`
**Public.** Get a single post with full replies.

#### POST `/api/resolve-space/posts/:postId/like`
**Public.** Toggle like on a post (deduplicated by hashed IP).
- **Returns:** `{ success, liked: true/false, likeCount }`

#### POST `/api/resolve-space/posts/:postId/reply`
**Public.** Add anonymous reply.
- **Body:** `{ content }`
- **Returns:** `{ success, reply: { _id, content, createdAt } }`

#### GET `/api/resolve-space/history`
**Public.** Full history of all posts.

---

### 🗺️ HEATMAP ROUTES — `/api/heatmap`

#### GET `/api/heatmap/data`  *(Requires token)*
All geolocated reports for India map.
- **Query:** `days` (default 30)
- **Returns array of:** `{ reportId, title, description, lat, lng, address, severity, category, status, createdAt }`
- Use `lat/lng` to place map markers. Color code by `severity`:
  - `"Low"` → Yellow
  - `"Medium"` → Orange  
  - `"Critical"` → Red

#### GET `/api/heatmap/critical`  *(Requires token)*
Most critical active issues for the **list below the map**.
- Returns up to 20 issues sorted by severity score.
- Each item has `fullAddress` for display.

#### GET `/api/heatmap/report/:reportId`  *(Requires token)*
Get full report details when user **clicks a map pin**.
- Use this to populate the modal/popup on map click.

#### GET `/api/heatmap/sample`  *(Requires token)*
Returns 15 hardcoded sample India locations for demo/testing when no real reports exist.
- Always include these to show the map is populated.

---

### 🔔 ALERTS ROUTES — `/api/alerts`

#### GET `/api/alerts`  *(Requires token)*
Get all authority alerts.
- **Query:** `isRead` (true/false), `severity`, `page`, `limit`
- **Returns:** `{ alerts, total, unreadCount }`
- Show `unreadCount` as badge on bell icon.

#### PATCH `/api/alerts/:id/read`  *(Requires token)*
Mark single alert as read. Call when user clicks/views an alert.

#### PATCH `/api/alerts/mark-all-read`  *(Requires token)*
Mark all alerts as read.

---

### 📁 CASES ROUTES — `/api/cases`

#### GET `/api/cases/active`  *(Requires token)*
All Pending + Under Review cases (for Active Alerts section in dashboard).

#### GET `/api/cases/resolved`  *(Requires token)*
All resolved cases with resolution notes.

#### GET `/api/cases/all`  *(Requires token)*
All cases, all statuses. Supports pagination + filtering.
- **Query:** `status`, `severity`, `page`, `limit`

#### PATCH `/api/cases/:id/resolve`  *(Requires token)*
**Mark case as Resolved.** ← Main "Mark as Resolved" button.
- **Body:** `{ resolutionNote: "Action taken..." }`

#### PATCH `/api/cases/:id/dismiss`  *(Requires token)*
Mark case as Dismissed.
- **Body:** `{ resolutionNote: "Reason..." }`

---

### 📊 DASHBOARD ROUTES — `/api/dashboard`

#### GET `/api/dashboard/stats`  *(Requires token)*
Complete analytics for authority dashboard.
- **Returns:**
```json
{
  "stats": {
    "totalReports": 120,
    "activeReports": 45,
    "pendingReports": 30,
    "underReview": 15,
    "resolvedReports": 68,
    "dismissedReports": 7,
    "criticalReports": 12,
    "reportsLast24h": 5,
    "reportsLast7d": 23,
    "unreadAlerts": 8,
    "communityPosts": 34
  },
  "charts": {
    "severityDistribution": [{ "_id": "Critical", "count": 12 }, ...],
    "categoryDistribution": [{ "_id": "Communal", "count": 30 }, ...],
    "stateDistribution": [{ "_id": "Delhi", "count": 25 }, ...],
    "dailyTrend": [{ "_id": "2024-12-19", "count": 5 }, ...]
  },
  "recentCritical": [ ... 5 most recent critical reports ... ],
  "hotspots": [{ "location": "Delhi_South East Delhi", "reportCount": 7, "criticalCount": 3, "riskLevel": "Critical" }]
}
```

---

## FRONTEND — BUTTON / FUNCTION NAMES TO IMPLEMENT

### Authority Panel Buttons & Actions

| Button Label | API Call | Route |
|---|---|---|
| `Login` | POST `/api/auth/login` | Auth page |
| `Logout` | Clear token from localStorage | Auth page |
| `Mark as Resolved` | PATCH `/api/cases/:id/resolve` | Dashboard |
| `Dismiss Case` | PATCH `/api/cases/:id/dismiss` | Dashboard |
| `Assign to Me` | PATCH `/api/reports/:id/assign` | Dashboard |
| `Search Report` (by ID) | GET `/api/reports/search/:reportId` | Dashboard |
| `Mark Alert as Read` | PATCH `/api/alerts/:id/read` | Alerts |
| `Mark All Read` | PATCH `/api/alerts/mark-all-read` | Alerts |
| `View on Map` | GET `/api/heatmap/report/:reportId` | Heatmap popup |
| `Load Heatmap` | GET `/api/heatmap/data` + GET `/api/heatmap/sample` | Heatmap section |
| `Filter Reports` | GET `/api/reports?status=...&severity=...` | Dashboard |
| `Refresh Dashboard` | GET `/api/dashboard/stats` | Dashboard |
| `Register Authority` (Admin) | POST `/api/auth/register` | Admin panel |

### User Panel Buttons & Actions

| Button Label | API Call | Section |
|---|---|---|
| `Submit Report` | POST `/api/reports/submit` (multipart) | Report Incident |
| `Use My Location` | Browser `navigator.geolocation.getCurrentPosition()` then reverse geocode | Report Incident |
| `Upload Media` | File input → append to FormData as `media` | Report Incident |
| `Post Issue` | POST `/api/resolve-space/posts` | ResolveSpace |
| `Like` / `Unlike` | POST `/api/resolve-space/posts/:postId/like` | ResolveSpace |
| `Reply` | POST `/api/resolve-space/posts/:postId/reply` | ResolveSpace |
| `View History` | GET `/api/reports/public/history` | History section |
| `Load Community Posts` | GET `/api/resolve-space/posts` | ResolveSpace |
| `Load Post Replies` | GET `/api/resolve-space/posts/:postId` | ResolveSpace |

---

## SPECIAL LOGIC TO IMPLEMENT IN FRONTEND

### 1. Auto Location Detection
```javascript
// When user clicks "Use My Location":
navigator.geolocation.getCurrentPosition(async (pos) => {
  const { latitude, longitude } = pos.coords;
  // Call reverse geocoding API to fill address fields
  // Recommended: https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json
  // Then auto-fill: address, state, district, city, pincode fields
  // Set detectedMethod = "auto"
});
```

### 2. Tolerance Badge (ResolveSpace — Right Aligned)
Each community post has a `toleranceCount` field.
- Show a small badge right-aligned: `🔁 Reported 3x`
- If `toleranceCount >= 4` AND `escalated === true`, show: `⚠️ Escalated to Authorities`
- Max visual: 3 normal indicators. 4th triggers escalation (auto, backend handles this).

### 3. Map Integration (Authority Heatmap)
Use **Leaflet.js** with **OpenStreetMap** tiles (free, no API key needed):
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
```
- Center map: `[20.5937, 78.9629]` (center of India), zoom `5`
- On load: call `/api/heatmap/data` + `/api/heatmap/sample`
- Place circle markers, color by severity
- On marker click: call `/api/heatmap/report/:reportId` → show popup modal

### 4. File Upload (Report Incident)
```javascript
const formData = new FormData();
formData.append('title', title);
formData.append('description', description);
formData.append('latitude', lat);
formData.append('longitude', lng);
// ...other fields...
files.forEach(file => formData.append('media', file));

fetch('/api/reports/submit', {
  method: 'POST',
  body: formData  // NO Content-Type header — let browser set multipart boundary
});
```

### 5. Auth Token Handling
```javascript
// After login, save token:
localStorage.setItem('safespeak_token', token);

// All authority API calls need:
headers: { 'Authorization': `Bearer ${localStorage.getItem('safespeak_token')}` }

// On 401 response → redirect to login page
```

---

## NLP / AI FEATURES (AUTOMATIC — NO FRONTEND ACTION NEEDED)

These run automatically on the backend when reports are submitted:

| Feature | What it does |
|---|---|
| **Severity Detection** | Classifies as Low / Medium / Critical based on keywords |
| **Spam Filtering** | Rejects obviously fake/test submissions silently |
| **Fake Report Detection** | Detects reports saying "just testing" etc. |
| **Category Classification** | Auto-tags: Communal, Criminal, Political, etc. |
| **Hotspot Detection** | Groups reports by district; flags 3+ as hotspot |
| **Auto Escalation** | 4th duplicate ResolveSpace post → notifies higher authority |

Display these in UI:
- Show `aiAnalysis.severity` badge on each report card
- Show `aiAnalysis.category` tag
- Show `aiAnalysis.analysisNote` as an info tooltip if present

---

## DATA MODELS REFERENCE (for frontend display)

### Report Object
```json
{
  "reportId": "RPT-1703001234-AB12C",
  "title": "...",
  "description": "...",
  "media": [{ "type": "image", "url": "/uploads/filename.jpg" }],
  "location": {
    "latitude": 28.6139, "longitude": 77.2090,
    "address": "...", "state": "Delhi", "district": "...", "city": "...", "pincode": "..."
  },
  "aiAnalysis": {
    "severity": "Critical",
    "severityScore": 88,
    "category": "Communal",
    "keywords": ["riot", "communal"],
    "analysisNote": "CRITICAL: Immediate attention required."
  },
  "status": "Pending",
  "priority": "Critical",
  "assignedTo": { "name": "...", "role": "police" },
  "resolvedBy": null,
  "resolvedAt": null,
  "resolutionNote": "",
  "createdAt": "2024-12-20T10:30:00Z"
}
```

### ResolvePost Object
```json
{
  "postId": "POST-1703001234-XY12",
  "title": "...",
  "description": "...",
  "location": { "address": "...", "state": "...", "district": "...", "city": "..." },
  "likeCount": 12,
  "replyCount": 5,
  "toleranceCount": 2,
  "escalated": false,
  "aiAnalysis": { "severity": "Low", "isSpam": false },
  "status": "Active",
  "createdAt": "2024-12-20T10:30:00Z"
}
```

---

## SOS NUMBERS FOR FOOTER

```
Police:          100
Ambulance:       108
Fire:            101
Women Helpline:  1091
Child Helpline:  1098
Disaster:        1079
Anti-Terror:     1090
Senior Citizen:  14567
```

---

## FOOTER DISCLAIMER TEXT

```
SafeSpeak is an anonymous public safety reporting platform. All reports are handled by 
verified government and NGO authorities. This platform does not store personal information. 
Information shared is used solely for public safety purposes. Misuse of this platform to 
file false reports is punishable under Indian law (IPC Section 182/211). 

© 2024 SafeSpeak | Built for Bharat | Not affiliated with any political organization.
```

---

## CORS & DEPLOYMENT NOTES

- Backend runs on `http://localhost:5000`
- Set `FRONTEND_URL` in `.env` to your frontend dev server URL
- All `/uploads/` files are publicly accessible via `http://localhost:5000/uploads/filename.jpg`
- For production: use HTTPS, set a strong `JWT_SECRET`, use MongoDB Atlas

---

## RECOMMENDED FRONTEND TECH STACK

- **React** (Vite) or **Next.js**
- **Tailwind CSS** for styling
- **Leaflet.js** for India map (free, no API key)
- **Chart.js** or **Recharts** for dashboard analytics
- **Axios** or native `fetch` for API calls
- **React Router** for navigation
