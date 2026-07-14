# 🎓 College Gate Management System

A full MERN stack app for managing student, visitor, HOD, and gate keeper entry/exit flows.

---

## 📁 Project Structure

```
college-gate/
├── backend/
│   ├── models/         → User.js, Request.js, History.js
│   ├── routes/         → auth.js, requests.js, qr.js, history.js
│   ├── middleware/     → auth.js (JWT)
│   ├── server.js
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/      → LandingPage, StudentPage, VisitorPage, HodPage, GatekeeperPage
        ├── context/    → AuthContext.js
        └── App.js
```

---

## 🚀 Setup (Step by Step)

### Prerequisites
- Node.js v16+ (nodejs.org)
- MongoDB Atlas free account (mongodb.com/atlas) OR local MongoDB

---

### Step 1 — Backend

```bash
cd college-gate/backend
npm install
```

Create a `.env` file inside `college-gate/backend/`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=anysecretkey123
```

Then run:
```bash
npm run dev
```
✅ You should see: `MongoDB Connected` and `Server running on port 5000`

---

### Step 2 — Frontend (new terminal)

```bash
cd college-gate/frontend
npm install
npm start
```
✅ Browser opens at http://localhost:3000

---

## 👥 Roles & What They Can Do

| Role | Type | Features |
|------|------|----------|
| **Student** | User | Submit exit requests, choose cause, view QR pass with countdown timer |
| **Visitor** | User | Submit entry requests, view QR pass |
| **HOD** | Admin | Approve/reject requests (generates QR), view full entry/exit history with search |
| **Gate Keeper** | Admin | Scan QR codes via camera, tap Entry/Exit per person |

---

## 🔄 Flow

```
Student → Submit Exit Request
    ↓
HOD → Approve → QR generated on student's profile
    ↓
Gate Keeper → Scans QR → Eligible / Expired / Not Eligible
    ↓
Scan logged → Visible in HOD History tab
```

For morning entry: Gate Keeper just taps Entry — no QR needed.

---

## ⏱ Exit Causes & Durations

| Cause | Duration |
|-------|----------|
| Class Over | Till 5:00 PM |
| Lunch Break | 1 hour |
| Medical / Health | Entire day |
| Personal Work | 2 hours |
| Family Emergency | Entire day |
| Sports / Event | 3 hours |
| Library / Study | 1.5 hours |
| Bank / ATM | 1 hour |
| Custom | User-defined (in hours) |

---

## 🛠 Tech Stack

- **Frontend**: React 18, React Router v6, Axios, jsQR
- **Backend**: Node.js, Express.js, Mongoose
- **Database**: MongoDB
- **Auth**: JWT + bcryptjs
- **QR Generation**: qrcode (server-side)
- **QR Scanning**: jsQR + getUserMedia (browser camera)
