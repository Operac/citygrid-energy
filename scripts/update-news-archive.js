const fs = require('fs');
const path = require('path');
const news = require('../api/news');

const archivePath = path.join(__dirname, '..', 'data', 'news-archive.json');
const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
const existingItems = Array.isArray(archive.items) ? archive.items : [];

async function updateArchive() {
  const liveItems = await news.collectNews();
  if (liveItems.length === 0) throw new Error('No live headlines were returned');

  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  const items = news
    .deduplicate([...liveItems, ...existingItems])
    .filter((item) => Date.parse(item.publishedAt) >= oneYearAgo)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 1000);

  const nextArchive = {
    updatedAt: new Date().toISOString(),
    items
  };

  fs.writeFileSync(archivePath, `${JSON.stringify(nextArchive, null, 2)}\n`);
  console.log(`Stored ${items.length} energy headlines.`);
}

updateArchive().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
