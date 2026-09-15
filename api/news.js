const FEEDS = [
  {
    region: 'Nigeria',
    query: 'Nigeria energy electricity power diesel gas solar when:30d',
    locale: { hl: 'en-NG', gl: 'NG', ceid: 'NG:en' }
  },
  {
    region: 'Africa',
    query: 'Africa energy electricity renewable solar gas when:30d',
    locale: { hl: 'en', gl: 'ZA', ceid: 'ZA:en' }
  },
  {
    region: 'World',
    query: 'global energy IEA IRENA electricity oil gas renewables when:30d',
    locale: { hl: 'en-US', gl: 'US', ceid: 'US:en' }
  }
];

const storedArchive = require('../data/news-archive.json');

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(value = '') {
  return decodeXml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u2013\u2014]/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? cleanText(match[1]) : '';
}

function parseFeed(xml, region) {
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const block of blocks) {
    const source = getTag(block, 'source') || 'Energy sector publisher';
    const rawTitle = getTag(block, 'title');
    const title = rawTitle.endsWith(` - ${source}`)
      ? rawTitle.slice(0, -(` - ${source}`.length))
      : rawTitle;
    const link = getTag(block, 'link');
    const publishedAt = getTag(block, 'pubDate');

    const excludedAudience = /\b(?:filling|petrol|fuel) stations?\b/i.test(title);
    if (!title || excludedAudience || !link || !/^https:\/\//i.test(link) || Number.isNaN(Date.parse(publishedAt))) continue;

    items.push({
      region,
      title: title.slice(0, 180),
      source: source.slice(0, 80),
      url: link,
      publishedAt: new Date(publishedAt).toISOString()
    });
  }

  return items.slice(0, 14);
}

function feedUrl(feed) {
  const params = new URLSearchParams({ q: feed.query, ...feed.locale });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

async function loadFeed(feed) {
  const response = await fetch(feedUrl(feed), {
    headers: { 'User-Agent': 'CityGrid Energy Newsroom/1.0' },
    signal: AbortSignal.timeout(7000)
  });

  if (!response.ok) throw new Error(`Feed returned ${response.status}`);
  return parseFeed(await response.text(), feed.region);
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function collectNews() {
  const results = await Promise.allSettled(FEEDS.map(loadFeed));
  return deduplicate(
    results
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value)
  ).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const liveItems = await collectNews();
  const archivedItems = Array.isArray(storedArchive.items) ? storedArchive.items : [];
  const items = deduplicate([...liveItems, ...archivedItems])
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  response.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(200).json({
    updatedAt: new Date().toISOString(),
    rangeDays: 365,
    provider: 'Google News RSS',
    archiveUpdatedAt: storedArchive.updatedAt,
    items
  });
};

module.exports.parseFeed = parseFeed;
module.exports.cleanText = cleanText;
module.exports.collectNews = collectNews;
module.exports.deduplicate = deduplicate;
