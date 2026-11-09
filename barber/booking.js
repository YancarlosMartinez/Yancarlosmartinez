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
  var NAMES = { kids: 'Kids Haircut', cut: 'Haircut + Eyebrows', beard: 'Haircut + Beard', eyebrows: 'Eyebrows Only' };
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

  // The last open times are remembered for 10 minutes so a returning visitor sees them right away
  // while fresh ones load. The booking itself is always checked against the live times.
  var SAVED = 'bkSlots', SAVED_FOR = 10 * 60 * 1000;
  function saved() { try { var c = JSON.parse(localStorage.getItem(SAVED) || 'null'); return c && Date.now() - c.at < SAVED_FOR && c.d && c.d.ok ? c.d : null; } catch (e) { return null; } }
  function save(d) { try { localStorage.setItem(SAVED, JSON.stringify({ at: Date.now(), d: d })); } catch (e) { } }
  function show(d) {
    state.data = d;
    $('bk-loading').hidden = true; off.hidden = true;
    if (!pendingGet()) form.hidden = false;
    drawServices(); drawPrices(); showHours(d.hours); drawDays(); summary();
  }
  function load() {
    var pc = pendingGet();
    if (pc) { $('bk-loading').hidden = true; form.hidden = true; off.hidden = true; showPay(pc); }
    var c = saved();
    if (c) show(c);
    else if (!state.data) {
      // show the form right away; only the day and time boxes wait for the open times
      $('bk-loading').hidden = true; form.hidden = false; drawServices();
      $('bk-days').innerHTML = '<p class="bk-hint bk-wait">Loading open times…</p>'; $('bk-times').innerHTML = '';
    }
    return fetch(API + '?action=slots').then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) throw new Error('bad');
      save(d); show(d);
    }).catch(function () {
      if (state.data || pendingGet()) return;          // keep showing the saved times / the payment step
      $('bk-loading').hidden = true;
      form.hidden = true;
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
    if (state.time && !(day && day.times.some(function (t) { return t.t === state.time; }))) state.time = '';
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
    if (!f.email.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) return fail('Enter your email. Your confirmation and booking number are sent there.', f.email);
    if (!f.agree.checked) return fail('Please agree to the rules to book.', f.agree);

    var btn = $('bk-go'); btn.disabled = true; btn.textContent = 'Holding your time…';
    var body = { service: state.service, date: state.date, time: state.time, name: f.name.value.trim(), phone: f.phone.value,
      email: f.email.value.trim(), kidAge: f.kidAge.value, notes: f.notes.value, pay: pay.value, payName: f.payName.value.trim(),
      photo: state.photo, website: f.website.value };
    fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Hold My Time';
      if (!r.ok) {
        fail(r.error || 'Something went wrong. Please try again.');
        if (r.taken) { try { localStorage.removeItem(SAVED); } catch (e) { } load(); }
        return;
      }
      showDone(r, pay.value, body.phone, body.payName);
    }).catch(function () {
      btn.disabled = false; btn.textContent = 'Hold My Time';
      fail('Couldn’t reach the booking system. Check your connection and try again.');
    });
  });

  // ---- Payment step. The time is only held: no booking number is shown and no confirmation is sent
  // until the deposit is sent AND Yan confirms it. The page stays on this step until the deposit is reported.
  var PENDING = 'bkPending', PENDING_FOR = 6 * 60 * 60 * 1000;
  function pendingGet() { try { var c = JSON.parse(sessionStorage.getItem(PENDING) || 'null'); return c && Date.now() - c.at < PENDING_FOR ? c : null; } catch (e) { return null; } }
  function pendingSet(c) { try { sessionStorage.setItem(PENDING, JSON.stringify(c)); } catch (e) { } }
  function pendingClear() { try { sessionStorage.removeItem(PENDING); } catch (e) { } guardLeave(false); }
  // warn before leaving while the deposit is still owed
  function guardLeave(on) {
    window.onbeforeunload = on ? function (e) { e.preventDefault(); e.returnValue = ''; return ''; } : null;
  }

  function showDone(r, pay, phone, payName) {
    try { localStorage.removeItem(SAVED); } catch (e) { }   // the time just booked must not show again
    var d = state.data || {};
    pendingSet({ at: Date.now(), id: r.id, phone: phone || '', payName: payName || '', pay: pay, deposit: r.deposit,
      when: r.when, service: r.service, price: r.price, owed: r.owed,
      cashtag: r.cashtag || d.cashtag || '', zelle: r.zelle || d.zelle || '', payee: r.payee || '' });
    showPay(pendingGet());
  }

  function showPay(c) {
    var box = $('bk-paybox'), d = state.data || {};
    form.hidden = true; done.hidden = false; $('bk-paydone').hidden = true; $('bk-payform').hidden = false;
    $('bk-when').textContent = c.when;
    $('bk-what').textContent = c.service + ' ($' + money(c.price) + ')';
    var cashtag = c.cashtag || d.cashtag || '', zelle = c.zelle || d.zelle || '';
    if (c.pay === 'Cash App') {
      box.innerHTML = '<p>Send your <b></b> deposit on Cash App to <b></b>.</p><a class="btn btn-primary" target="_blank" rel="noopener"></a>';
      box.querySelectorAll('b')[0].textContent = '$' + money(c.deposit);
      box.querySelectorAll('b')[1].textContent = cashtag;
      var a = box.querySelector('a');
      a.href = 'https://cash.app/' + String(cashtag).replace(/[^$\w-]/g, '') + '/' + money(c.deposit);
      a.textContent = 'Pay $' + money(c.deposit) + ' on Cash App';
    } else {
      box.innerHTML = '<p>Send your <b></b> deposit with Zelle to:</p><p class="bk-zelle"><span></span><button type="button" class="btn btn-outline">Copy</button></p>' +
        (c.payee ? '<p class="bk-small">It shows up as <b></b>.</p>' : '');
      box.querySelector('b').textContent = '$' + money(c.deposit);
      box.querySelector('span').textContent = zelle;
      if (c.payee) box.querySelector('.bk-small b').textContent = c.payee;
      box.querySelector('button').addEventListener('click', function (ev) {
        var b = ev.currentTarget;
        (navigator.clipboard ? navigator.clipboard.writeText(zelle) : Promise.reject()).then(function () { b.textContent = 'Copied'; })
          .catch(function () { var s = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(box.querySelector('span')); s.removeAllRanges(); s.addRange(rg); });
      });
    }
    $('bk-paid-name').value = c.payName || '';
    $('bk-owed').hidden = !c.owed;
    if (c.owed) $('bk-owed').textContent = 'Heads up: you have a $' + c.owed + ' late fee from a past visit. It’s added to this cut.';
    guardLeave(true);
    done.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // "I've sent my deposit": tells Yan the payment is on its way so he can check it
  $('bk-payform').addEventListener('submit', function (e) {
    e.preventDefault();
    var c = pendingGet(), err2 = $('bk-pay-err'), btn = $('bk-paid-go');
    if (!c) { window.location.reload(); return; }
    var payName = $('bk-paid-name').value.trim(), proof = $('bk-proof').value.trim();
    err2.textContent = '';
    if (!payName) { err2.textContent = 'Enter the name on your payment.'; return; }
    if (proof.length < 4) { err2.textContent = 'Enter the payment ID or the last 4 digits of the transaction number from your payment app.'; return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch(API, { method: 'POST', body: JSON.stringify({ kind: 'paid', id: c.id, phone: c.phone, payName: payName, proof: proof }) })
      .then(function (r) { return r.json(); }).then(function (r) {
        if (!r.ok) { var x = new Error(r.error || 'Something went wrong. Please try again.'); x.server = true; throw x; }
        pendingClear();
        $('bk-paybox').hidden = true; $('bk-payform').hidden = true; $('bk-owed').hidden = true;
        $('bk-paydone').hidden = false;
        done.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }).catch(function (x) {
        btn.disabled = false; btn.textContent = 'I’ve sent my deposit';
        err2.textContent = x.server ? x.message : 'Couldn’t reach the booking system. Check your connection and try again.';
      });
  });

  $('bk-again').addEventListener('click', function () {
    pendingClear(); $('bk-payform').hidden = false; $('bk-paybox').hidden = false;
    done.hidden = true; form.reset(); state.service = ''; state.time = ''; state.photo = '';
    $('bk-thumb').hidden = true; $('bk-kid').hidden = true; load();
  });

  load();
})();
