/* ─── Shared Footer ───
   Include on every page: <script src="footer.js" defer></script>
   (or <script src="../footer.js" defer></script> from subdirs)
*/
(function () {
  const path = window.location.pathname;
  const inSubdir = path.includes('/shop/');
  const p = inSubdir ? '../' : '';

  const footerHTML = `
  <footer class="footer">
    <a href="${p}index.html" class="footer-logo">
      <img src="${p}images/logo-1.png" alt="HI">
    </a>
    <p class="tagline">A reminder to trust the innate intelligence of the human body.</p>
    <div class="footer-socials">
      <a href="#">Instagram</a>
      <a href="#">TikTok</a>
    </div>
    <p class="footer-copy">&copy; 2026 HI — Human Intelligence. All rights reserved.</p>
  </footer>`;

  document.body.insertAdjacentHTML('beforeend', footerHTML);
})();
