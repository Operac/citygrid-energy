const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('is-open', !isOpen);
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
document.getElementById('year').textContent = new Date().getFullYear();

const supplyForm = document.getElementById('supply-form');
supplyForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(supplyForm);
  const message = [
    'Hello CityGrid Energy, I would like to discuss a reliable power solution.',
    '',
    `Name: ${data.get('name')}`,
    `Company: ${data.get('company')}`,
    `Contact: ${data.get('contact')}`,
    `Site location: ${data.get('location')}`,
    `Energy requirement: ${data.get('volume')}`,
    `Solution interest: ${data.get('supplyType')}`,
    `Additional details: ${data.get('message') || 'None provided'}`
  ].join('\n');
  window.open(`https://wa.me/2348065570604?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});

const homepageNewsFeed = document.getElementById('homepage-news-feed');
const newsroomFeed = document.getElementById('news-feed');
const newsStatus = document.getElementById('news-status');
const loadMoreNews = document.getElementById('load-more-news');
const newsFilters = [...document.querySelectorAll('.news-filter')];

function formatNewsDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function createNewsCard(item, featured = false) {
  const article = document.createElement('article');
  article.className = `insight-card is-visible${featured ? ' insight-card-featured' : ''}`;

  const meta = document.createElement('div');
  meta.className = 'insight-meta';

  const source = document.createElement('span');
  source.textContent = `${item.region} · ${item.source}`;

  const time = document.createElement('time');
  time.dateTime = item.publishedAt;
  time.textContent = formatNewsDate(item.publishedAt);

  const title = document.createElement('h3');
  title.textContent = item.title;

  const summary = document.createElement('p');
  summary.textContent = `Latest energy-sector reporting selected for the ${item.region} news feed.`;

  const link = document.createElement('a');
  link.href = item.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Read full story';

  meta.append(source, time);
  article.append(meta, title, summary, link);
  return article;
}

function updateHomepageNews(items) {
  if (!homepageNewsFeed) return;

  const selected = ['Nigeria', 'Africa', 'World']
    .map((region) => items.find((item) => item.region === region))
    .filter(Boolean);

  if (selected.length !== 3) return;
  homepageNewsFeed.replaceChildren(...selected.map((item, index) => createNewsCard(item, index === 2)));
}

function initialiseNewsroom(items, updatedAt, rangeDays) {
  if (!newsroomFeed) return;

  let activeRegion = 'All';
  let visibleCount = 9;

  const render = () => {
    const matchingItems = activeRegion === 'All'
      ? items
      : items.filter((item) => item.region === activeRegion);
    const visibleItems = matchingItems.slice(0, visibleCount);

    newsroomFeed.replaceChildren(
      ...visibleItems.map((item, index) => createNewsCard(item, index % 6 === 2))
    );

    if (loadMoreNews) {
      loadMoreNews.hidden = visibleItems.length >= matchingItems.length;
      loadMoreNews.textContent = `Load older headlines (${matchingItems.length - visibleItems.length})`;
    }
  };

  newsFilters.forEach((button) => {
    button.addEventListener('click', () => {
      activeRegion = button.dataset.region || 'All';
      visibleCount = 9;
      newsFilters.forEach((filter) => {
        const isActive = filter === button;
        filter.classList.toggle('is-active', isActive);
        filter.setAttribute('aria-pressed', String(isActive));
      });
      render();
    });
  });

  loadMoreNews?.addEventListener('click', () => {
    visibleCount += 9;
    render();
  });

  if (newsStatus) {
    newsStatus.textContent = `Automatically refreshed ${formatNewsDate(updatedAt)} from sector publishers via Google News. Browse up to ${rangeDays} days of headlines.`;
  }

  render();
}

async function loadAutomaticNews() {
  if (!homepageNewsFeed && !newsroomFeed) return;

  try {
    const response = await fetch('/api/news', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('News service unavailable');

    const payload = await response.json();
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('No current headlines returned');
    }

    updateHomepageNews(payload.items);
    initialiseNewsroom(payload.items, payload.updatedAt, payload.rangeDays || 30);
  } catch (error) {
    if (newsStatus) {
      newsStatus.textContent = 'The live feed is temporarily unavailable. Showing verified CityGrid selections instead.';
    }
  }
}

loadAutomaticNews();
