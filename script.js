(function () {
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
