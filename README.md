# 🇧🇩 Bangladesh Frontend & Full-Stack Job Alert Bot

Automated daily Discord notifier for Frontend and Full-Stack developer positions in Bangladesh and worldwide remote roles. Runs 100% free in the cloud via GitHub Actions.

## ✨ Features

- **Daily Schedule:** Runs automatically every day at **7:00 PM BST** (13:00 UTC).
- **Multi-Source Scraping & Aggregation:**
  - 🟢 **LinkedIn:** Direct scraping via public guest search (extracts live Frontend & Full-Stack postings without requiring login/cookies).
  - 🔵 **BDTechJobs:** Live API integration for Dhaka tech firms (MERN, React, Next.js, Node.js).
  - 🔷 **Facebook Groups & LinkedIn Posts:** Scrapes indexed social posts via Google Search.
  - 🟣 **Worldwide Remote:** Remote developer circulars open to Asian/Worldwide applicants (Jobicy).
- **Rich Discord Embeds:** Posts organized cards with company name, location, work type (Onsite/Hybrid/Remote), required tech stack, and direct apply links.
- **Deduplication Engine:** Automatically cleans and removes duplicate job listings.
- **One-Click Quick Search Links:** Pre-filtered links for the past 24 hours on:
  - LinkedIn (Frontend Bangladesh)
  - LinkedIn (Full-Stack Bangladesh)
  - Facebook TECH JOBS BD Community
  - Google Jobs Dhaka

---

## 🚀 Setup & Activation (2 Steps)

### 1. Create a Discord Webhook
1. In your Discord server, go to your target channel (e.g. `#job-alerts`).
2. Go to **Channel Settings** ⚙️ $\rightarrow$ **Integrations** $\rightarrow$ **Webhooks**.
3. Click **New Webhook**, name it (e.g. `Job Hunter`), and click **Copy Webhook URL**.

### 2. Add the Webhook Secret to GitHub
1. Open this repository on GitHub.
2. Go to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
3. Click **New repository secret**.
4. Set:
   - **Name:** `DISCORD_WEBHOOK_URL`
   - **Secret:** *[Paste your copied Discord Webhook URL]*
5. *(Optional)* To enable Google-indexed Facebook/LinkedIn post scraping:
   - `GOOGLE_SEARCH_API_KEY`: Your free Google Custom Search API Key
   - `GOOGLE_SEARCH_CX`: Your Custom Search Engine ID

---

## 🧪 Testing

### Manual Run on GitHub Actions
1. Go to the **Actions** tab on your GitHub repository.
2. Under "All workflows", click **Daily Job Alert to Discord (7:00 PM BST)**.
3. Click **Run workflow** $\rightarrow$ **Run workflow**.

### Local Test Run (Dry Run)
You can test the scraper on your local machine without needing a Discord webhook:
```bash
npm run test:dry
```
To test sending directly to Discord locally:
```bash
$env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
npm start
```
