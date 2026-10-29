# ShareSphere AI — Institutional Smart Resource Sharing Platform

[![Netlify Status](https://api.netlify.com/api/v1/badges/sharesphere-ai/deploy-status)](https://app.netlify.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vite.dev/)

**ShareSphere AI** is an institutional smart resource sharing platform designed for universities, scientific labs, and research consortia. It eliminates equipment scheduling bottlenecks through collision detection, multi-tier approvals, cryptographic audit logs, and AI-powered project-to-equipment matching powered by Google Gemini.

---

## 🌟 Key Features

- **Decentralized Multi-Platform Catalog:** Cross-disciplinary discovery for lab equipment, supercomputing clusters (DGX A100), robotic arms (UR5e), confocal microscopes, and prototyping hardware.
- **Two-Category Institutional Portal:**
  - **Category 1 (Equipment Booking):** Researchers & students reserve instruments with safety clearance validation.
  - **Category 2 (Reviews & Approvals):** Custodians, department heads, and deans review, approve, or request clarification.
- **Google Gemini 2.5 Flash AI Planner:** Input natural language scientific objectives and obtain deterministic hardware compatibility scoring, optimal execution parameters, and protocols.
- **Cryptographic Audit Ledger:** Tamper-evident ledger with SHA-256 cryptographic hashes for full compliance.
- **Digital Handover & Condition Certificates:** Pristine pre-use check-in and post-use return verification.
- **Dynamic Resource Substitution & Memory:** Chronological maintenance timeline and alternative hardware recommendations.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Servers
```bash
# Terminal 1: Start Express Backend API (Port 3001)
npm run server

# Terminal 2: Start Vite Frontend (Port 5173)
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## ☁️ Deployment on Netlify

This project is pre-configured for one-click deployment on **Netlify**:

1. Push this repository to GitHub.
2. In the [Netlify Dashboard](https://app.netlify.com/), click **"Add new site"** → **"Import an existing project"**.
3. Select your GitHub repository (`heackcode-` / `ShareSphere AI website`).
4. Netlify will automatically detect configuration from `netlify.toml`:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **SPA Redirects:** Configured in `netlify.toml` and `public/_redirects` to route all paths (`/*`) to `/index.html` (HTTP 200).
5. Click **"Deploy Site"**!

---

## 🧪 Testing & Verification

Run the end-to-end automated QA test suite verifying all 54 workflows:
```bash
npm test
```

Build for production:
```bash
npm run build
```

---

## 👥 Demo Access Accounts

| Category | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Category 1 (Booking)** | `alex@institution.edu` | `Password@123` | Researcher / Student |
| **Category 2 (Reviews & Approvals)** | `marcus@institution.edu` | `Password@123` | Lab Custodian / Faculty |
| **Category 2 (Institutional Deans)** | `dean.jenkins@institution.edu` | `Password@123` | Dean of Engineering |
| **Medicine & Bioengineering** | `robert.cho@institution.edu` | `Password@123` | Medical School Admin |

---

## 📄 License
MIT License. Built for collegiate research and multi-facility equipment efficiency.
