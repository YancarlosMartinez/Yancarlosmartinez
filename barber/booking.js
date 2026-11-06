/* Haircut booking form. Talks to the free Google Apps Script backend in Yan's Google account. */
(function () {
  // Paste the Google Apps Script "Web app" URL here. Until then the page says "text me to book".
  var API_URL = 'https://script.google.com/macros/s/AKfycbwyh70_6a0W65XfKHByQXqwP1vt4v0Vx1SxMeOgPkIbHFioa1XgMop_qjCdRe4Z4lw/exec';

  var API = window.BOOKING_API || API_URL;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('bkf'), off = $('bk-off'), done = $('bk-done'), err = $('bk-err');
  var state = { service: '', date: '', time: '', data: null, photo: '' };
  // Services, names and prices come from SERVICES in the Google script, so Yan changes them in one place.
  // These are only used if the script can't be reached.
  var PRICES = { kids: 30, cut: 40, beard: 45, eyebrows: 15 };
  var NAMES = { kids: 'Kids Haircut', cut: 'Haircut', beard: 'Haircut + Beard', eyebrows: 'Eyebrows Only' };
  // the small line under each service; a "note" in the Google script replaces it
  var SUB = { kids: 'Under 16', cut: '16 and over', beard: 'Full haircut with beard', eyebrows: 'Eyebrow cleanup, no haircut' };
  // $7.5 -> "7.50", $20 -> "20"
  var money = function (n) { n = Number(n); return n % 1 ? n.toFixed(2) : String(n); };

  /** [{key, title, sub, price}] in the order they're written in the Google script */
  function services() {
    var s = state.data && state.data.services;
    if (!s) return Object.keys(PRICES).map(function (k) { return { key: k, title: NAMES[k], sub: SUB[k], price: PRICES[k] }; });
    return Object.keys(s).filter(function (k) { return s[k] && Number(s[k].price) > 0; }).map(function (k) {
      var name = String(s[k].name || k), m = name.match(/^(.*?)\s*\((.*)\)\s*$/);   // "Haircut (16 and over)"
      var inParens = m ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : '';
      return { key: k, title: m ? m[1] : name, sub: s[k].note || SUB[k] || inParens, price: Number(s[k].price) };
    });
  }
  function svc(key) { return services().filter(function (v) { return v.key === key; })[0]; }
  var price = function (key) { var v = svc(key); return v ? v.price : 0; };

  function drawServices() {
    var list = services(), box = $('bk-svc');
    if (!svc(state.service)) state.service = '';
    box.innerHTML = '';
    list.forEach(function (v) {
      var l = document.createElement('label');
      l.innerHTML = '<input type="radio" name="service"><b></b>' + (v.sub ? '<small></small>' : '') + '<span class="p"></span><small class="d"></small>';
      var i = l.querySelector('input'); i.value = v.key; i.checked = v.key === state.service;
      l.querySelector('b').textContent = v.title;
      if (v.sub) l.querySelector('small').textContent = v.sub;
      l.querySelector('.p').textContent = '$' + money(v.price);
      l.querySelector('.d').textContent = '$' + money(v.price / 2) + ' deposit';
      box.appendChild(l);
    });
  }
  function drawPrices() {
    var box = $('price-list'); if (!box) return;
    box.innerHTML = '';
    box.classList.remove('wait');
    services().forEach(function (v) {
      var a = document.createElement('article'); a.className = 'price';
      a.innerHTML = '<h3></h3>' + (v.sub ? '<div class="who"></div>' : '') + '<div class="amt"></div><div class="dep">Deposit to book: <b></b></div>';
      a.querySelector('h3').textContent = v.title;
      if (v.sub) a.querySelector('.who').textContent = v.sub;
      a.querySelector('.amt').textContent = '$' + money(v.price);
      a.querySelector('.dep b').textContent = '$' + money(v.price / 2);
      box.appendChild(a);
    });
  }

  // show the typed-in prices if the live ones can't load
  var showFallbackPrices = function () { var b = $('price-list'); if (b) b.classList.remove('wait'); };

  if (!API) { off.hidden = false; showFallbackPrices(); return; }

  function load() {
    $('bk-loading').hidden = false;
    return fetch(API + '?action=slots').then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) throw new Error('bad');
      state.data = d;
      $('bk-loading').hidden = true;
      form.hidden = false;
      drawServices();
      drawPrices();
      showHours(d.hours);
      drawDays();
    }).catch(function () {
      $('bk-loading').hidden = true;
      off.hidden = false;
      showFallbackPrices();
      off.querySelector('p').textContent = 'Online booking isn’t loading right now. Text me to book, or try again in a few minutes.';
    });
  }

  function shortTimes(labels) {
    var am = [], pm = [];
    labels.forEach(function (l) {
      var m = l.match(/^(\d+):(\d+) (AM|PM)$/); if (!m) return;
      (m[3] === 'AM' ? am : pm).push(m[2] === '00' ? m[1] : m[1] + ':' + m[2]);
    });
    return [am.length ? am.join(', ') + '\u00a0AM' : '', pm.length ? pm.join(', ') + '\u00a0PM' : ''].filter(Boolean).join(' • ');
  }
  function showHours(hours) {
    var ul = $('hours-list'); if (!ul || !hours) return;
    ul.innerHTML = '';
    hours.forEach(function (h) {
      var li = document.createElement('li'); if (!h.times.length) li.className = 'off';
      li.innerHTML = '<span class="d"></span><span class="t"></span>';
      li.firstChild.textContent = h.day;
      li.lastChild.textContent = h.times.length ? shortTimes(h.times) : 'Closed';
      ul.appendChild(li);
    });
  }

  function chip(label, sub, selected, onPick) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', selected ? 'true' : 'false');
    b.innerHTML = '<span></span>' + (sub ? '<small></small>' : '');
    b.firstChild.textContent = label; if (sub) b.lastChild.textContent = sub;
    b.addEventListener('click', onPick);
    return b;
  }
  function drawDays() {
    var box = $('bk-days'); box.innerHTML = '';
    var days = state.data.days;
    if (!days.length) { box.innerHTML = '<p class="bk-hint">No open times in the next few weeks. Text me.</p>'; return; }
    if (!days.some(function (d) { return d.date === state.date; })) { state.date = days[0].date; state.time = ''; }
    days.forEach(function (d) {
      var p = d.label.split(', ');
      box.appendChild(chip(p[0], p[1], d.date === state.date, function () { state.date = d.date; state.time = ''; drawDays(); }));
    });
    drawTimes();
  }
  function drawTimes() {
    var box = $('bk-times'); box.innerHTML = '';
    var day = state.data.days.filter(function (d) { return d.date === state.date; })[0];
    (day ? day.times : []).forEach(function (t) {
      box.appendChild(chip(t.label, '', t.t === state.time, function () { state.time = t.t; drawTimes(); summary(); }));
    });
    summary();
  }

  function summary() {
    var s = state.service, day = state.data && state.data.days.filter(function (d) { return d.date === state.date; })[0];
    var t = day && day.times.filter(function (x) { return x.t === state.time; })[0];
    var dep = s ? price(s) / 2 : 0;
    $('bk-dep-amt').textContent = s ? '$' + money(dep) : 'half the price';
    $('bk-sum').textContent = (s ? svc(s).title + ' ($' + money(price(s)) + ')' : 'Pick a service') + ' • ' +
      (t ? day.label + ' at ' + t.label : 'pick a time') + (s ? ' • Deposit $' + money(dep) : '');
  }

  // service cards are redrawn from the Google script, so listen on the whole form
  form.addEventListener('change', function (e) {
    var r = e.target;
    if (r.name === 'service') {
      state.service = r.value;
      $('bk-kid').hidden = r.value !== 'kids';
      $('bk-kidage').required = r.value === 'kids';
      summary();
    }
    if (r.name === 'pay') $('bk-payname-l').textContent = 'Name on your ' + r.value;
  });

  // reference photo: shrink it before sending
  $('bk-photo').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; state.photo = ''; $('bk-thumb').hidden = true;
    if (!f) return;
    if (!/^image\//.test(f.type)) { e.target.value = ''; return; }
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () {
      var k = Math.min(1, 1200 / Math.max(img.width, img.height));
      var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      state.photo = c.toDataURL('image/jpeg', 0.82);
      $('bk-thumb').src = state.photo; $('bk-thumb').hidden = false;
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  function fail(msg, el) {
    err.textContent = msg;
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var f = form.elements, pay = form.querySelector('input[name="pay"]:checked');
    if (!state.service) return fail('Pick a service (step 1).', form.querySelector('input[name="service"]'));
    if (!state.time) return fail('Pick a time (step 3).', $('bk-times'));
    if (!f.name.value.trim()) return fail('Enter your name.', f.name);
    if (f.phone.value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').length !== 10) return fail('Enter your 10-digit phone number.', f.phone);
    if (state.service === 'kids') {
      var age = parseInt(f.kidAge.value, 10);
      if (!(age >= 1 && age < 16)) return fail('The kids price is for ages 15 and under. Pick “Haircut” for 16 and over.', f.kidAge);
    }
    if (!pay) return fail('Pick Cash App or Zelle for your deposit.', form.querySelector('input[name="pay"]'));
    if (!f.agree.checked) return fail('Please agree to the rules to book.', f.agree);

    var btn = $('bk-go'); btn.disabled = true; btn.textContent = 'Holding your time…';
    var body = { service: state.service, date: state.date, time: state.time, name: f.name.value.trim(), phone: f.phone.value,
      email: f.email.value.trim(), kidAge: f.kidAge.value, notes: f.notes.value, pay: pay.value, payName: f.payName.value.trim(),
      photo: state.photo, website: f.website.value };
    fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Hold My Time';
      if (!r.ok) {
        fail(r.error || 'Something went wrong. Please try again.');
        if (r.taken) load();
        return;
      }
      showDone(r, pay.value);
    }).catch(function () {
      btn.disabled = false; btn.textContent = 'Hold My Time';
      fail('Couldn’t reach the booking system. Check your connection and try again.');
    });
  });

  function showDone(r, pay) {
    form.hidden = true; done.hidden = false;
    $('bk-when').textContent = r.when;
    $('bk-what').textContent = r.service + ' ($' + money(r.price) + ')';
    $('bk-id').textContent = r.id;
    var d = state.data, box = $('bk-paybox');
    var cashtag = r.cashtag || d.cashtag, zelle = r.zelle || d.zelle || '';
    if (pay === 'Cash App') {
      box.innerHTML = '<p>Send your <b></b> deposit on Cash App to <b></b>.</p><a class="btn btn-primary" target="_blank" rel="noopener"></a>';
      box.querySelectorAll('b')[0].textContent = '$' + money(r.deposit);
      box.querySelectorAll('b')[1].textContent = cashtag;
      var a = box.querySelector('a');
      a.href = 'https://cash.app/' + String(cashtag).replace(/[^$\w-]/g, '') + '/' + money(r.deposit);
      a.textContent = 'Pay $' + money(r.deposit) + ' on Cash App';
    } else {
      box.innerHTML = '<p>Send your <b></b> deposit with Zelle to:</p><p class="bk-zelle"><span></span><button type="button" class="btn btn-outline">Copy</button></p>' +
        (r.payee ? '<p class="bk-small">It shows up as <b></b>.</p>' : '');
      box.querySelector('b').textContent = '$' + money(r.deposit);
      box.querySelector('span').textContent = zelle;
      if (r.payee) box.querySelector('.bk-small b').textContent = r.payee;
      box.querySelector('button').addEventListener('click', function (ev) {
        var b = ev.currentTarget;
        (navigator.clipboard ? navigator.clipboard.writeText(zelle) : Promise.reject()).then(function () { b.textContent = 'Copied'; })
          .catch(function () { var s = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(box.querySelector('span')); s.removeAllRanges(); s.addRange(rg); });
      });
    }
    $('bk-owed').hidden = !r.owed;
    if (r.owed) $('bk-owed').textContent = 'Heads up: you have a $' + r.owed + ' late fee from a past visit. It’s added to this cut.';
    $('bk-cal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(r.service + ' with Yan') +
      '&dates=' + r.start + '/' + r.end + '&ctz=America/New_York&details=' + encodeURIComponent('Booking ' + r.id + '. Be on time: 15+ minutes late = $5 late fee.');
    done.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  $('bk-again').addEventListener('click', function () {
    done.hidden = true; form.reset(); state.service = ''; state.time = ''; state.photo = '';
    $('bk-thumb').hidden = true; $('bk-kid').hidden = true; load();
  });

  load();
})();
