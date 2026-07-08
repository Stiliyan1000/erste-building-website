(function () {
  const PAGES = ['home', 'about', 'projects', 'contact'];
  const html = document.documentElement;
  const navLinks = document.querySelectorAll('.nav-link');
  const navLinksBox = document.getElementById('nav-links');
  const burger = document.getElementById('burger');
  const langBtns = { bg: document.getElementById('lang-bg'), en: document.getElementById('lang-en') };

  let lang = 'bg';
  try { lang = localStorage.getItem('erste-lang') || 'bg'; } catch (e) {}

  function applyLang(l) {
    lang = l === 'en' ? 'en' : 'bg';
    html.lang = lang;
    const t = I18N[lang];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key] !== undefined) el.setAttribute('placeholder', t[key]);
    });
    langBtns.bg.classList.toggle('active', lang === 'bg');
    langBtns.en.classList.toggle('active', lang === 'en');
    updateSubmitLabel();
  }

  function setLang(l) {
    try { localStorage.setItem('erste-lang', l); } catch (e) {}
    applyLang(l);
  }

  langBtns.bg.addEventListener('click', () => setLang('bg'));
  langBtns.en.addEventListener('click', () => setLang('en'));

  function showPage(name) {
    if (!PAGES.includes(name)) name = 'home';
    PAGES.forEach((p) => {
      document.getElementById('page-' + p).classList.toggle('active', p === name);
    });
    navLinks.forEach((l) => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + name);
    });
    window.scrollTo(0, 0);
    navLinksBox.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }

  function routeFromHash() {
    const name = (location.hash || '#home').replace('#', '');
    showPage(name);
  }

  window.addEventListener('hashchange', routeFromHash);

  burger.addEventListener('click', () => {
    const open = navLinksBox.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // ---- Contact form (Web3Forms) ----
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('cf-submit');
  const statusEl = document.getElementById('cf-status');
  let sending = false;
  let status = '';

  function updateSubmitLabel() {
    const t = I18N[lang];
    submitBtn.textContent = sending ? t.fSending : t.fSubmit;
    submitBtn.disabled = sending;
    if (status) {
      statusEl.textContent = status === 'ok' ? t.fOk : t.fErr;
      statusEl.className = 'form-status show ' + status;
    } else {
      statusEl.textContent = '';
      statusEl.className = 'form-status';
    }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    sending = true;
    status = '';
    updateSubmitLabel();

    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        status = 'ok';
        form.reset();
      } else {
        status = 'err';
      }
    } catch (err) {
      status = 'err';
    }
    sending = false;
    updateSubmitLabel();
  });

  applyLang(lang);
  routeFromHash();
})();
