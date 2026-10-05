/**
 * Daily Bangladesh Frontend & Full-Stack Job Alert for Discord
 * Author: Novo1999
 * Runs automatically at 7:00 PM BST via GitHub Actions
 *
 * Scrapes:
 * 1. LinkedIn Jobs (via public guest jobs endpoint - no login required)
 * 2. BDTechJobs API (Bangladesh tech vacancies)
 * 3. Facebook & LinkedIn Posts (via Google Custom Search API, if configured)
 * 4. Worldwide Remote Jobs (Jobicy)
 */

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const IS_DRY_RUN = process.env.DRY_RUN === 'true' || !WEBHOOK_URL;
const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX;

const cleanText = (s) => (s ? s.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ') : '');

/**
 * 1. Scrape LinkedIn Public Jobs (Guest Endpoint)
 */
async function fetchLinkedInJobs() {
  const keywords = ['Frontend%20Developer', 'Full%20Stack%20Developer'];
  const jobs = [];

  for (const kw of keywords) {
    try {
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${kw}&location=Bangladesh&start=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!res.ok) {
        console.warn(`[LinkedIn] HTTP ${res.status} for keyword ${kw}`);
        continue;
      }

      const html = await res.text();
      const parts = html.split('</li>');

      for (const p of parts) {
        const titleMatch = p.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
        const companyMatch = p.match(/<h4[^>]*>([\s\S]*?)<\/h4>/);
        const locationMatch = p.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
        const linkMatch = p.match(/href="(https:\/\/[a-z.]*linkedin\.com\/jobs\/view\/[^"?]+)/);
        const dateMatch = p.match(/<time[^>]*datetime="([^"]+)"/);

        if (titleMatch && linkMatch) {
          jobs.push({
            title: cleanText(titleMatch[1]),
            company: cleanText(companyMatch ? companyMatch[1] : 'Company on LinkedIn'),
            location: cleanText(locationMatch ? locationMatch[1] : 'Bangladesh'),
            type: 'LinkedIn Circular',
            experience: 'See posting',
            skills: decodeURIComponent(kw).replace('%20', ' '),
            applyUrl: linkMatch[1],
            source: 'LinkedIn',
            postedDate: dateMatch ? dateMatch[1] : null,
          });
        }
      }
    } catch (err) {
      console.error(`[LinkedIn] Error scraping ${kw}:`, err.message);
    }
  }

  return jobs;
}

/**
 * 2. Fetch BDTechJobs Vacancies
 */
async function fetchBDTechJobs() {
  try {
    const res = await fetch('https://bdtechjobs.com/api/jobs?limit=50', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok) {
      console.warn(`[BDTechJobs] Failed to fetch: status ${res.status}`);
      return [];
    }
    const data = await res.json();
    const rawJobs = data.jobs || [];

    const relevantKeywords = [
      'frontend',
      'front-end',
      'front end',
      'fullstack',
      'full stack',
      'full-stack',
      'react',
      'next.js',
      'vue',
      'angular',
      'mern',
      'javascript',
      'typescript',
      'web developer',
    ];

    const excludedTitles = [
      'marketing',
      'seo',
      'growth',
      'sales',
      'telemarketing',
      'content',
      'network engineer',
      'system administrator',
      'vmware',
      'flutter',
      'android',
      'ios',
      'devops',
    ];

    return rawJobs
      .filter((job) => {
        const title = (job.designation || '').toLowerCase();
        const skills = (job.requiredSkills || []).join(' ').toLowerCase();

        if (excludedTitles.some((e) => title.includes(e))) return false;

        const matchesTitle = relevantKeywords.some((k) => title.includes(k));
        const matchesSkills = ['react', 'next.js', 'vue', 'frontend', 'full stack', 'typescript'].some((k) =>
          skills.includes(k)
        );

        return matchesTitle || matchesSkills;
      })
      .map((job) => ({
        title: job.designation,
        company: job.companyName || 'Not specified',
        location: job.location || 'Dhaka, Bangladesh',
        type: job.jobType || job.workType || 'Onsite',
        experience: job.experience || job.experienceYears || 'Not specified',
        skills: (job.requiredSkills || []).slice(0, 6).join(', '),
        applyUrl: job.applyLink || 'https://bdtechjobs.com',
        source: 'BDTechJobs',
        postedDate: job.postedDate && job.postedDate !== 'Not available' ? job.postedDate : null,
      }));
  } catch (error) {
    console.error('[BDTechJobs] Fetch error:', error.message);
    return [];
  }
}

/**
 * 3. Scrape Facebook Groups & LinkedIn Posts via Google Custom Search API
 */
async function fetchGoogleSocialPosts() {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.log('[Google Social] API Key or CX not provided; skipping Google index search for social posts.');
    return [];
  }

  const queries = [
    {
      q: 'site:facebook.com/groups/techjobsbd ("frontend" OR "full stack" OR "react" OR "hiring")',
      source: 'Facebook Group Post',
    },
    {
      q: 'site:linkedin.com/posts ("hiring" OR "vacancy") ("frontend" OR "full stack") ("Dhaka" OR "Bangladesh")',
      source: 'LinkedIn Post',
    },
  ];

  const results = [];
  for (const { q, source } of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(
        q
      )}&dateRestrict=d2`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[Google Social] HTTP ${res.status} for query: ${q}`);
        continue;
      }
      const data = await res.json();
      for (const item of data.items || []) {
        results.push({
          title: cleanText(item.title),
          company: source,
          location: 'Bangladesh (Social Post)',
          type: 'Social Circular',
          experience: 'See post',
          skills: cleanText(item.snippet).slice(0, 100) + '...',
          applyUrl: item.link,
          source: source,
          postedDate: 'Recent',
        });
      }
    } catch (err) {
      console.error(`[Google Social] Error for ${source}:`, err.message);
    }
  }

  return results;
}

/**
 * 4. Fetch Remote Worldwide Jobs (Jobicy)
 */
async function fetchRemoteJobs() {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=10&tag=frontend', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || [])
      .filter((j) => {
        const geo = (j.jobGeo || '').toLowerCase();
        return geo.includes('anywhere') || geo.includes('worldwide') || geo.includes('asia');
      })
      .slice(0, 3)
      .map((j) => ({
        title: j.jobTitle,
        company: j.companyName || 'Remote Company',
        location: `Remote (${j.jobGeo || 'Worldwide'})`,
        type: 'Remote',
        experience: j.jobLevel || 'Mid/Senior',
        skills: (j.jobExcerpt || '').slice(0, 80) + '...',
        applyUrl: j.url,
        source: 'Jobicy (Remote)',
        postedDate: null,
      }));
  } catch (error) {
    console.error('[RemoteJobs] Fetch error:', error.message);
    return [];
  }
}

/**
 * Deduplicate jobs by matching Title and Company or Apply URL
 */
function deduplicateJobs(jobs) {
  const seenUrls = new Set();
  const seenPairs = new Set();
  const result = [];

  for (const job of jobs) {
    const cleanUrl = job.applyUrl ? job.applyUrl.split('?')[0].toLowerCase() : '';
    const pair = `${job.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${job.company
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}`;

    if (cleanUrl && seenUrls.has(cleanUrl)) continue;
    if (seenPairs.has(pair)) continue;

    if (cleanUrl) seenUrls.add(cleanUrl);
    seenPairs.add(pair);
    result.push(job);
  }

  return result;
}

/**
 * Build Discord Embeds payload
 */
function buildDiscordPayload(jobs) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Dhaka',
  });

  const headerEmbed = {
    title: `🇧🇩 Daily Tech Job Digest (Frontend & Full-Stack)`,
    description:
      `Curated developer openings across **LinkedIn**, **BDTechJobs**, **Facebook Tech Groups**, and **Remote Feeds** for **${currentDate}** (7:00 PM BST).\n\n` +
      `**🔍 One-Click Fresh Search Links (Past 24 Hours):**\n` +
      `• [LinkedIn: Frontend Jobs in Bangladesh](https://bd.linkedin.com/jobs/search?keywords=Frontend%20Developer&location=Bangladesh&f_TPR=r86400)\n` +
      `• [LinkedIn: Full-Stack Jobs in Bangladesh](https://bd.linkedin.com/jobs/search?keywords=Full%20Stack%20Developer&location=Bangladesh&f_TPR=r86400)\n` +
      `• [Facebook: TECH JOBS BD Community](https://www.facebook.com/groups/techjobsbd/)\n` +
      `• [Google: Developer Jobs in Dhaka](https://www.google.com/search?q=Frontend+Full+Stack+jobs+Dhaka+Bangladesh&ibp=htl;jobs)`,
    color: 0x5865f2,
    footer: { text: 'Automated Daily Alert • GitHub Actions & Antigravity' },
    timestamp: new Date().toISOString(),
  };

  const getSourceColor = (job) => {
    if (job.source.includes('LinkedIn')) return 0x0a66c2; // LinkedIn Blue
    if (job.source.includes('Facebook')) return 0x1877f2; // Facebook Blue
    if (job.source === 'BDTechJobs') return 0x00a86b; // Green
    return 0x9b59b6; // Purple for Remote
  };

  const jobEmbeds = jobs.slice(0, 9).map((job) => {
    const fields = [
      { name: '🏢 Company', value: job.company, inline: true },
      { name: '📍 Location', value: `${job.location} (${job.type})`, inline: true },
    ];

    if (job.experience && job.experience !== 'Not specified' && job.experience !== 'See posting') {
      fields.push({ name: '⏳ Experience', value: job.experience, inline: true });
    }

    if (job.skills) {
      fields.push({ name: '🛠️ Skills / Description', value: job.skills, inline: false });
    }

    if (job.postedDate) {
      fields.push({ name: '📅 Date', value: job.postedDate, inline: true });
    }

    return {
      title: `💼 [${job.source}] ${job.title}`,
      url: job.applyUrl,
      color: getSourceColor(job),
      fields,
      footer: { text: `Source: ${job.source}` },
    };
  });

  return {
    content: `🔔 **Daily Job Report — ${currentDate} (7:00 PM BST)**`,
    embeds: [headerEmbed, ...jobEmbeds],
  };
}

async function run() {
  console.log('Fetching developer openings from all sources...');

  const [linkedInJobs, bdJobs, socialPosts, remoteJobs] = await Promise.all([
    fetchLinkedInJobs(),
    fetchBDTechJobs(),
    fetchGoogleSocialPosts(),
    fetchRemoteJobs(),
  ]);

  console.log(`- LinkedIn: ${linkedInJobs.length} jobs`);
  console.log(`- BDTechJobs: ${bdJobs.length} jobs`);
  console.log(`- Social Posts: ${socialPosts.length} posts`);
  console.log(`- Remote: ${remoteJobs.length} jobs`);

  const rawTotal = [...linkedInJobs, ...bdJobs, ...socialPosts, ...remoteJobs];
  const uniqueJobs = deduplicateJobs(rawTotal);
  console.log(`Total unique matching jobs: ${uniqueJobs.length}`);

  const payload = buildDiscordPayload(uniqueJobs);

  if (IS_DRY_RUN) {
    console.log('\n[DRY RUN MODE] No DISCORD_WEBHOOK_URL set. Here is the generated payload:');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('Sending alert to Discord Webhook...');
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook error (${res.status}): ${body}`);
  }

  console.log('Job alert successfully delivered to Discord!');
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
