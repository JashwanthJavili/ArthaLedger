# ArthaLedger — Where every rupee has meaning

A production-quality Progressive Web App for mindful financial tracking with a peaceful devotional design language.

## Stack

- **Frontend**: React + React Router + Tailwind CSS + Framer Motion + Lucide + jsPDF
- **Backend**: FastAPI + Firebase Admin SDK
- **Auth**: Firebase Authentication with email verification
- **Database**: Firebase Realtime Database
- **PWA**: Installable with offline support

## Architecture

**Hierarchy**: User → Projects → Books → Entries

**Firebase path**: `users/{uid}/projects/{projectId}/books/{bookId}/entries/{entryId}`

## Features

✅ **Authentication**
- Email/password signup with mandatory email verification
- Google OAuth sign-in
- Password reset flow
- Change password (for email/password users)

✅ **Core Functionality**
- Multi-level organization: Projects → Books → Entries
- Cash In / Cash Out transactions with running balance
- Category management with inline add
- Payment modes: Cash, UPI, Online, Bank Transfer
- Advanced filters (type, mode, category, person, date range)
- Live search across entries
- PDF export with formatted tables

✅ **Analytics**
- Monthly income vs expense charts
- Category breakdown (pie chart + bar chart)
- Payment mode distribution
- Top categories with progress bars

✅ **Settings**
- Dark mode / Light devotional mode
- Currency selection (INR, USD, EUR, GBP, JPY, AED, SGD)
- Push notification preferences
- Export all data as JSON
- Change password

✅ **Design**
- Mobile-first responsive design
- Peaceful saffron gradient theme
- Smooth animations with Framer Motion
- Glass-morphism cards
- Touch-friendly tap targets
- Daily rotating mindful quotes

✅ **PWA**
- Installable on mobile home screen
- Service worker with network-first strategy
- Offline fallback
- App manifest with theme colors

## Setup

### Frontend

```bash
cd frontend
cp .env.example .env
# Fill in your Firebase credentials in .env
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# .venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Add your Firebase Admin SDK JSON path and database URL to .env
uvicorn app.main:app --reload
```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Email/Password** authentication in Firebase Authentication
3. Enable **Google** sign-in provider (optional)
4. Create a **Realtime Database** in production mode
5. Download your **service account JSON** for the backend (Settings → Service Accounts)
6. Copy your **web app credentials** to `frontend/.env`
7. Set your **database URL** in `backend/.env`

### Recommended Firebase Realtime Database Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

### Email Verification Setup

To prevent verification emails from going to spam:

1. Go to **Firebase Console → Authentication → Templates → Email address verification**
2. Set **Sender name** to `ArthaLedger`
3. Set **Subject** to `Verify your ArthaLedger account 🙏`
4. Customize the email body with your branding
5. (Optional) Set up a **custom email domain** in Firebase to send from your own domain

## Project Structure

```
ArthaLedger/
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context (Auth, AppData)
│   │   ├── lib/             # Firebase, PDF, quotes
│   │   ├── pages/           # Route pages
│   │   └── main.jsx
│   ├── public/              # PWA assets (manifest, service worker, icons)
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST API routes
│   │   ├── core/            # Config
│   │   └── services/        # Firebase Admin SDK
│   └── requirements.txt
└── README.md
```

## API Endpoints

- `GET /api/auth/health` — Health check
- `GET /api/auth/verify` — Verify Firebase ID token
- `GET /api/auth/me` — Get current user profile
- `GET /api/projects` — List all projects
- `POST /api/projects` — Create project
- `GET /api/projects/{id}/books` — List books in project
- `POST /api/projects/{id}/books` — Create book
- `GET /api/projects/{id}/books/{id}/entries` — List entries (with pagination & filters)
- `POST /api/projects/{id}/books/{id}/entries` — Create entry
- `GET /api/analytics/summary` — Overall income/expense summary
- `GET /api/analytics/monthly` — Monthly breakdown
- `GET /api/analytics/by-category` — Category totals
- `GET /api/analytics/by-mode` — Payment mode totals

## Security Features

- Rate limiting (120 req/min per IP)
- Firebase ID token verification on all protected endpoints
- Email verification required for email/password accounts
- CORS restricted to allowed origins
- Input validation with Pydantic
- Secure password requirements (min 6 chars, strength indicator)

## Notes

- Frontend build validated ✓
- Backend requires Python 3.11+ and Firebase Admin SDK credentials
- Service worker uses network-first strategy to prevent stale cache issues
- All amounts respect the user's currency setting from Settings page
- Dark mode preference persists in localStorage

---

**"Artha" means wealth/meaning in Sanskrit. ArthaLedger — where every rupee has meaning.**
