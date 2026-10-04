/**
 * Daily Bangladesh Frontend & Full-Stack Job Alert for Discord
 * Author: Novo1999
 * Runs automatically at 7:00 PM BST via GitHub Actions
 */

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const IS_DRY_RUN = process.env.DRY_RUN === 'true' || !WEBHOOK_URL;

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
        deadline: job.applicationDeadline || null,
      }));
  } catch (error) {
    console.error('[BDTechJobs] Fetch error:', error.message);
    return [];
  }
}

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
        deadline: null,
      }));
  } catch (error) {
    console.error('[RemoteJobs] Fetch error:', error.message);
    return [];
  }
}

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
      `Here are the latest curated developer roles in Bangladesh and worldwide remote opportunities for **${currentDate}** (7:00 PM BST).\n\n` +
      `**Quick Search Links (Past 24 Hours):**\n` +
      `• [LinkedIn Frontend Jobs (BD)](https://bd.linkedin.com/jobs/search?keywords=Frontend%20Developer&location=Bangladesh&f_TPR=r86400)\n` +
      `• [LinkedIn Full-Stack Jobs (BD)](https://bd.linkedin.com/jobs/search?keywords=Full%20Stack%20Developer&location=Bangladesh&f_TPR=r86400)\n` +
      `• [Facebook TECH JOBS BD Group](https://www.facebook.com/groups/techjobsbd/)\n` +
      `• [Google Jobs in Dhaka](https://www.google.com/search?q=Frontend+Full+Stack+jobs+Dhaka+Bangladesh&ibp=htl;jobs)`,
    color: 0x5865f2,
    footer: { text: 'Automated Daily Alert • GitHub Actions & Antigravity' },
    timestamp: new Date().toISOString(),
  };

  const jobEmbeds = jobs.slice(0, 9).map((job) => {
    const isFrontend = job.title.toLowerCase().includes('frontend') || job.title.toLowerCase().includes('react');
    const color = isFrontend ? 0x00a86b : 0x0080ff;

    const fields = [
      { name: '🏢 Company', value: job.company, inline: true },
      { name: '📍 Location', value: `${job.location} (${job.type})`, inline: true },
    ];

    if (job.experience && job.experience !== 'Not specified') {
      fields.push({ name: '⏳ Experience', value: job.experience, inline: true });
    }

    if (job.skills) {
      fields.push({ name: '🛠️ Stack / Skills', value: job.skills, inline: false });
    }

    if (job.deadline) {
      fields.push({ name: '📅 Deadline', value: job.deadline, inline: true });
    }

    return {
      title: `💼 ${job.title}`,
      url: job.applyUrl,
      color,
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
  console.log('Fetching Bangladesh tech job opportunities...');
  const [bdJobs, remoteJobs] = await Promise.all([fetchBDTechJobs(), fetchRemoteJobs()]);
  const allJobs = [...bdJobs, ...remoteJobs];

  console.log(`Discovered ${allJobs.length} matching jobs.`);

  const payload = buildDiscordPayload(allJobs);

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
