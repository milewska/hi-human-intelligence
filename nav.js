/* ─── Shared Nav + Fade-in Observer ───
   Include on every page: <script src="nav.js" defer></script>
   (or <script src="../nav.js" defer></script> from subdirs)
*/
(function () {
  const path = window.location.pathname;
  const inSubdir = path.includes('/shop/');
  const p = inSubdir ? '../' : '';

  // Determine active page
  let active = '';
  if (path.endsWith('/') || path.includes('index')) active = 'Home';
  else if (path.includes('about')) active = 'About';
  else if (path.includes('shop') || path.includes('cap') || path.includes('classic') || path.includes('vneck') || path.includes('long-sleeve')) active = 'Shop';

  const links = [
    { label: 'Home', href: `${p}index.html` },
    { label: 'About', href: `${p}about.html` },
    { label: 'Shop', href: `${p}shop.html` },
  ];

  const navHTML = `
  <nav class="nav">
    <a href="${p}index.html" class="nav-logo">
      <img src="${p}images/logo-nav.png" alt="HI — Human Intelligence">
    </a>
    <button class="menu-toggle" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links">
      ${links.map(l => `<li><a href="${l.href}"${l.label === active ? ' class="active"' : ''}>${l.label}</a></li>`).join('\n      ')}
      <li>
        <a href="${p}cart.html" class="nav-cart" aria-label="Cart">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="cart-badge" id="cart-count" style="display:none">0</span>
        </a>
      </li>
    </ul>
  </nav>`;

  // Insert nav at the top of <body>
  document.body.insertAdjacentHTML('afterbegin', navHTML);

  // Menu toggle
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  // Fade-in observer (for pages that use .fade-in elements)
  const faders = document.querySelectorAll('.fade-in');
  if (faders.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    faders.forEach(el => observer.observe(el));
  }
})();
