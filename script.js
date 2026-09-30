(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile-Menü
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Header-Zustand und Zurück-nach-oben
  var header = document.querySelector('.site-header');
  var toTop = document.getElementById('toTop');
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('scrolled', y > 10);
    if (toTop) {
      toTop.hidden = false;
      toTop.classList.toggle('show', y > 600);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  // Einblenden beim Scrollen (gestaffelt)
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    items.forEach(function (el, i) {
      el.style.setProperty('--d', ((i % 3) * 0.08) + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Aktiver Menüpunkt beim Scrollen
  var links = document.querySelectorAll('.nav a[href^="#"]:not(.btn)');
  if ('IntersectionObserver' in window && links.length) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (a) { a.classList.remove('active'); });
          map[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  // Klick-Welle auf Buttons
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.btn');
    if (!btn || reduce) return;
    var r = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    var dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.width = dot.style.height = size + 'px';
    dot.style.left = (e.clientX - r.left - size / 2) + 'px';
    dot.style.top = (e.clientY - r.top - size / 2) + 'px';
    btn.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 650);
  });

  // Statisches Formular: baut eine E-Mail im Mailprogramm des Besuchers
  var form = document.getElementById('kontaktform');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var body = [
        'Name: ' + f.get('name'),
        'E-Mail: ' + f.get('email'),
        'Telefon: ' + (f.get('telefon') || '-'),
        'Anliegen: ' + f.get('anliegen'),
        '',
        f.get('nachricht')
      ].join('\n');
      window.location.href = 'mailto:info@ainohaustechnik.ch?subject=' +
        encodeURIComponent('Anfrage Webseite: ' + f.get('anliegen')) +
        '&body=' + encodeURIComponent(body);
    });
  }
})();


/* ===== Extras: Wassertropfen beim Klick, Lightbox, Logo folgt der Maus ===== */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tropfen (Wasser blau, Feuer orange) an der Klickstelle
  if (!reduce) {
    document.addEventListener('click', function (e) {
      for (var i = 0; i < 8; i++) {
        var d = document.createElement('span');
        var a = (Math.PI * 2 * i) / 8 + Math.random() * 0.6;
        var r = 36 + Math.random() * 34;
        d.className = 'drop ' + (i % 2 ? 'fire' : 'water');
        d.style.left = e.clientX + 'px';
        d.style.top = e.clientY + 'px';
        d.style.setProperty('--dx', Math.cos(a) * r + 'px');
        d.style.setProperty('--dy', Math.sin(a) * r + 'px');
        document.body.appendChild(d);
        (function (n) { setTimeout(function () { n.remove(); }, 850); })(d);
      }
      var t = e.target.closest && e.target.closest('.card, .steps li, .contact-list li, .person, .about-card');
      if (t) { t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); }
    });
  }

  // Lightbox fuer Referenzfotos
  var items = [].slice.call(document.querySelectorAll('[data-lightbox]'));
  if (items.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Bildansicht');
    lb.innerHTML = '<button class="lb-close" aria-label="Schliessen">&times;</button><button class="lb-prev" aria-label="Zurück">&#8249;</button><button class="lb-next" aria-label="Weiter">&#8250;</button><figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img'), cap = lb.querySelector('figcaption'), cur = 0;
    function show(n) {
      cur = (n + items.length) % items.length;
      var src = items[cur].querySelector('img');
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = src.alt;
    }
    function open(n) { show(n); lb.classList.add('open'); document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    items.forEach(function (it, i) {
      it.tabIndex = 0;
      it.setAttribute('role', 'button');
      it.addEventListener('click', function () { open(i); });
      it.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    lb.addEventListener('click', function (e) {
      if (e.target.classList.contains('lb-next')) show(cur + 1);
      else if (e.target.classList.contains('lb-prev')) show(cur - 1);
      else if (e.target.tagName !== 'IMG') close();
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
  }

  // AINO-Logo (Wasser und Feuer) folgt der Maus traege
  var f = document.querySelector('.logo-follow');
  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (f && fine && !reduce) {
    var tx = 0, ty = 0, x = 0, y = 0, seen = false;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { x = tx; y = ty; seen = true; f.classList.add('on'); }
    });
    document.addEventListener('mouseleave', function () { f.classList.remove('on'); seen = false; });
    (function loop() {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      var tilt = Math.max(-25, Math.min(25, (tx - x) * 0.35));
      f.style.transform = 'translate3d(' + (x + 16) + 'px,' + (y + 16) + 'px,0) rotate(' + tilt + 'deg)';
      requestAnimationFrame(loop);
    })();
  }
})();
