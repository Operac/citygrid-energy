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
