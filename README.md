# Tridika Rituals — deploy to Vercel (with live Panchang)

This folder is the complete website **plus** a small secure proxy that fetches the
daily Panchang from ProKerala. Your API keys are **never** in these files — you paste
them into Vercel as environment variables, and only the server can see them.

## What's inside
- `index.html` + images — the website
- `api/panchang.js` — the Panchang proxy (runs on Vercel, holds your keys)
- `package.json`, `.env.example`, `.gitignore` — project config

## Deploy — easiest route (GitHub + Vercel, no software to install)

1. **Create a GitHub account** at https://github.com (free) if you don't have one.
2. Click **New repository** → name it `tridika-rituals` → Create.
3. On the new repo page, click **"uploading an existing file"** → drag in **all**
   the files from this folder (including the `api` folder) → **Commit changes**.
4. **Create a Vercel account** at https://vercel.com → **Sign up with GitHub**.
5. In Vercel: **Add New… → Project** → **Import** your `tridika-rituals` repo.
6. Before clicking Deploy, open **Environment Variables** and add:
   - `PROKERALA_CLIENT_ID` = your Client ID
   - `PROKERALA_CLIENT_SECRET` = your Client Secret
7. Click **Deploy**. In ~1 minute you get a live URL like
   `https://tridika-rituals.vercel.app`.
8. The homepage Panchang strip switches from "Sample Preview" to **live Delhi/NCR data**
   automatically.

## Check it worked
- Visit `https://YOUR-SITE.vercel.app/api/panchang` — you should see today's Panchang as JSON.
- If something looks off, visit `https://YOUR-SITE.vercel.app/api/panchang?debug=1`
  and send me what it shows — that reveals ProKerala's raw response so I can fine-tune
  the field mapping.

## Add your own domain later
Vercel → Project → **Settings → Domains** → add `tridikarituals.com` and follow the
DNS steps.

## Notes
- Free plan is enough: the Panchang is fetched once per day and cached.
- To change the city, set `PANCHANG_COORDS` (e.g. `28.6139,77.2090` for Delhi).
