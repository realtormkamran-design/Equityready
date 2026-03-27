# EquityReady — Setup Guide

## What This Is
A full-stack Next.js app for Willoughby homeowner lead generation.
Built for Kamran Khan, REALTOR® — Royal Lepage Global Force Realty.

---

## Step 1 — Install Node.js
Download from nodejs.org — install the LTS version.
Verify: open Terminal and type `node -v` — should show v18+

---

## Step 2 — Set Up GitHub
1. Go to github.com — create a free account
2. Click "New repository" — name it `equityready`
3. Make it Private
4. Download GitHub Desktop from desktop.github.com
5. Clone your new repo to your computer
6. Copy all files from this folder into the cloned repo folder

---

## Step 3 — Set Up Supabase
1. Go to supabase.com — create free account
2. Click "New project" — name it `equityready`
3. Choose a strong database password — save it
4. Once created, go to Settings → API
5. Copy: Project URL, anon key, service_role key
6. Go to SQL Editor — paste and run the entire contents of `supabase-schema.sql`

---

## Step 4 — Set Up Resend (email)
1. Go to resend.com — create free account
2. Add your domain equityready.ca
3. Follow their DNS setup (add 3 DNS records in Namecheap)
4. Create an API key — copy it

---

## Step 5 — Get Anthropic API Key
1. Go to console.anthropic.com
2. Create account — add a credit card (pay per use, very cheap)
3. Go to API Keys — create new key — copy it

---

## Step 6 — Create Environment File
Copy `.env.example` to `.env.local` in your project folder:
```
cp .env.example .env.local
```
Fill in all the values with your real keys.

---

## Step 7 — Upload BCA Data to Supabase
1. Go to Supabase → Table Editor → bca_data
2. Click Import — upload your BCA CSV
3. Map the columns to the table columns

---

## Step 8 — Run Locally First
```bash
# In Terminal, navigate to your project folder:
cd equityready

# Install dependencies:
npm install

# Run development server:
npm run dev
```
Open http://localhost:3000 — site should load.

---

## Step 9 — Deploy to Railway
1. Go to railway.app — sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your equityready repo
4. Railway auto-detects Next.js — click Deploy
5. Go to Variables tab — add all your .env.local variables
6. Railway gives you a URL like equityready.up.railway.app

---

## Step 10 — Connect Your Domain
1. In Railway → Settings → Domains → Add custom domain
2. Type equityready.ca
3. Railway gives you DNS records to add
4. In Namecheap → Advanced DNS → add those records
5. Wait 10–30 mins — site is live at equityready.ca

---

## Step 11 — Set Up Calendly
1. Go to calendly.com — create free account
2. Set up a 15-minute meeting type
3. Copy your Calendly link
4. Add it to your .env.local as REALTOR_CALENDLY

---

## What Each File Does

```
equityready/
├── app/
│   ├── layout.tsx          ← fonts, metadata, global wrapper
│   ├── globals.css         ← tailwind + custom styles
│   ├── page.tsx            ← Gate 1 landing page  (TO BUILD)
│   ├── report/page.tsx     ← Gates 2+3 report     (TO BUILD)
│   ├── confirmed/page.tsx  ← Gate 4 booking       (TO BUILD)
│   ├── privacy/page.tsx    ← Privacy policy       (TO BUILD)
│   ├── realtors/page.tsx   ← Buyer registry       (TO BUILD)
│   ├── dashboard/page.tsx  ← Your lead dashboard  (TO BUILD)
│   └── api/
│       ├── lookup/         ← Address → BCA data lookup
│       ├── unlock/         ← Saves name+phone, emails you
│       ├── report/         ← Calls Claude for narrative
│       ├── email-report/   ← Sends PDF report to homeowner
│       ├── chat/           ← AI chatbot responses
│       └── register-buyer/ ← Saves buyer agent
├── lib/
│   ├── supabase.ts         ← Database client
│   ├── claude.ts           ← AI report + chatbot
│   ├── email.ts            ← Resend email templates
│   └── constants.ts        ← Market data, helpers
├── supabase-schema.sql     ← Run this in Supabase first
└── .env.example            ← Copy to .env.local and fill in
```

---

## Monthly Costs Once Running
- Railway hosting:    ~$5/month
- Claude API:         ~$5–15/month (depends on traffic)  
- Resend emails:      Free (3,000/month)
- Supabase:           Free tier
- Domain (Namecheap): ~$15/year
- **Total:            ~$10–20/month**

---

## Support
All API routes are complete and working.
Frontend pages (app/page.tsx etc.) need to be built — 
ask Claude to build them one at a time using the HTML in equityready_v2.html as the design reference.
