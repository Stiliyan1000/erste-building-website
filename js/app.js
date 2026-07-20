(function () {
  const PAGES = ['home', 'about', 'projects', 'contact', 'visit'];
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
    formControllers.forEach((f) => f.update());
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

  // ---- Hide header on scroll down (mobile only) ----
  const siteHeader = document.querySelector('header');
  let lastScrollY = window.scrollY;
  let scrollDirection = null; // 'down' | 'up'
  let directionStartY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (window.innerWidth > 900) return;
    if (navLinksBox.classList.contains('open')) return;

    const y = window.scrollY;

    if (y < 80) {
      siteHeader.classList.remove('header-hidden');
      scrollDirection = null;
      directionStartY = y;
      lastScrollY = y;
      return;
    }

    const newDirection = y > lastScrollY ? 'down' : y < lastScrollY ? 'up' : scrollDirection;

    if (newDirection && newDirection !== scrollDirection) {
      scrollDirection = newDirection;
      directionStartY = lastScrollY;
    }

    if (scrollDirection && Math.abs(y - directionStartY) > 8) {
      if (scrollDirection === 'down') siteHeader.classList.add('header-hidden');
      else siteHeader.classList.remove('header-hidden');
    }

    lastScrollY = y;
  }, { passive: true });

  // ---- International phone inputs (intl-tel-input) ----
  if (window.intlTelInput) {
    ['cf-phone', 'vf-phone'].forEach(function (id) {
      const input = document.getElementById(id);
      if (!input) return;
      const iti = window.intlTelInput(input, {
        initialCountry: 'auto',
        geoIpLookup: function (cb) {
          fetch('https://ipapi.co/json')
            .then(function (r) { return r.json(); })
            .then(function (d) { cb(d && d.country_code ? d.country_code : 'bg'); })
            .catch(function () { cb('bg'); });
        },
        preferredCountries: ['bg', 'gb', 'de', 'gr', 'ro', 'tr'],
        separateDialCode: true,
        utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js'
      });

      // ---- Live validation (flags numbers that are too long/short/invalid) ----
      let utilsReady = false;
      if (iti.promise && typeof iti.promise.then === 'function') {
        iti.promise.then(function () { utilsReady = true; });
      }

      const errEl = document.createElement('div');
      errEl.className = 'tel-error';
      const wrap = input.closest('.iti');
      if (wrap) wrap.insertAdjacentElement('afterend', errEl);

      function validate() {
        const val = input.value.trim();
        if (!val || !utilsReady) {
          errEl.textContent = '';
          input.classList.remove('tel-invalid');
          return true;
        }
        if (iti.isValidNumber()) {
          errEl.textContent = '';
          input.classList.remove('tel-invalid');
          return true;
        }
        let msg = lang === 'bg' ? 'Невалиден телефонен номер.' : 'Invalid phone number.';
        try {
          const code = iti.getValidationError();
          const errors = (window.intlTelInputUtils && window.intlTelInputUtils.validationError) || {};
          const tooLong = typeof errors.TOO_LONG === 'number' ? errors.TOO_LONG : 3;
          const tooShort = typeof errors.TOO_SHORT === 'number' ? errors.TOO_SHORT : 2;
          if (code === tooLong) {
            msg = lang === 'bg' ? 'Твърде много цифри за избраната държава.' : 'Too many digits for the selected country.';
          } else if (code === tooShort) {
            msg = lang === 'bg' ? 'Твърде малко цифри за избраната държава.' : 'Too few digits for the selected country.';
          }
        } catch (e) {}
        errEl.textContent = msg;
        input.classList.add('tel-invalid');
        return false;
      }

      input.addEventListener('input', validate);
      input.addEventListener('blur', validate);
      input.addEventListener('countrychange', validate);

      // Replace the national number with the full international one on submit,
      // so FormData (read by setupForm's handler, registered later) picks it up.
      input.form.addEventListener('submit', function (e) {
        const raw = input.value.trim();
        if (!raw) return;
        if (!validate()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          input.focus();
          return;
        }
        let full = '';
        try { full = iti.getNumber(); } catch (e) { full = ''; }
        if (!full) {
          const cc = iti.getSelectedCountryData().dialCode || '';
          full = '+' + cc + raw.replace(/^0+/, '');
        }
        input.value = full;
      });
    });
  }

  // ---- Forms (Web3Forms) ----
  const formControllers = [];

  function setupForm(formId, submitId, statusId, submitKey) {
    const form = document.getElementById(formId);
    if (!form) return;
    const submitBtn = document.getElementById(submitId);
    const statusEl = document.getElementById(statusId);
    let sending = false;
    let status = '';

    function update() {
      const t = I18N[lang];
      submitBtn.textContent = sending ? t.fSending : t[submitKey];
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
      update();

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
      update();
    });

    formControllers.push({ update });
  }

  setupForm('contact-form', 'cf-submit', 'cf-status', 'fSubmit');
  setupForm('visit-form', 'vf-submit', 'vf-status', 'vfSubmit');

  // ---- Project gallery lightbox ----
  const GALLERIES = {
    'obekt-1': ['01', '02', '03', '04', '05', '06', '07', '08'].map(function (n) {
      return 'assets/projects/obekt-1/' + n + '.jpg';
    })
  };

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = document.getElementById('lb-img');
    const lbCount = document.getElementById('lb-count');
    let list = [];
    let idx = 0;

    function preload(i) {
      const im = new Image();
      im.src = list[(i + list.length) % list.length];
    }

    function show(i) {
      idx = (i + list.length) % list.length;
      lbImg.src = list[idx];
      lbCount.textContent = (idx + 1) + ' / ' + list.length;
      preload(idx + 1);
      preload(idx - 1);
    }

    function openGallery(name) {
      list = GALLERIES[name] || [];
      if (!list.length) return;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      show(0);
    }

    function closeGallery() {
      lightbox.hidden = true;
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-gallery]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openGallery(btn.getAttribute('data-gallery'));
      });
    });

    document.getElementById('lb-prev').addEventListener('click', function () { show(idx - 1); });
    document.getElementById('lb-next').addEventListener('click', function () { show(idx + 1); });
    document.getElementById('lb-close').addEventListener('click', closeGallery);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeGallery();
    });

    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeGallery();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });

    let touchX = null;
    lightbox.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (dx > 40) show(idx - 1);
      else if (dx < -40) show(idx + 1);
      touchX = null;
    }, { passive: true });
  }

  applyLang(lang);
  routeFromHash();
})();
