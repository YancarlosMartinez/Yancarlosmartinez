/* How visitors reach Yan, on every page:
   1. A message / free-quote form. It opens from any "Get a Free Quote" or email button and from every price on /rates/.
      Messages go to Yan's Google Apps Script: saved in the "Quotes" tab, sent to his phone (ntfy) and to his email.
   2. Yan's assistant (the chat bubble): greets visitors with something about the page they're on, answers common
      questions about services, prices and booking, and hands anything else to Yan through the same form.
   3. Yan's voice: a short hello in his own voice on each page (files in /media/voice/). */
(function () {
  'use strict';
  var API = window.BOOKING_API || 'https://script.google.com/macros/s/AKfycbwyh70_6a0W65XfKHByQXqwP1vt4v0Vx1SxMeOgPkIbHFioa1XgMop_qjCdRe4Z4lw/exec';
  var EMAIL = 'yanmartinez92@gmail.com';
  var page = (document.body.className.match(/page-(\w+)/) || [])[1] || 'home';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
    seen: function (k) { try { return sessionStorage.getItem(k) === '1'; } catch (e) { return false; } },
    mark: function (k) { try { sessionStorage.setItem(k, '1'); } catch (e) { } }
  };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  /* ================================================================ 1. message / quote form */
  var SERVICES = ['Video editing', 'Green screen or background removal', 'VFX & CGI', 'AI video or images', 'Voice-over or AI voice',
    '3D character or animation', 'Logo, intro or motion graphics', 'Graphic design', 'Photography or photo editing', 'Filming',
    'Website', 'App or game', 'Online lessons', 'Something else', 'Just a question'];
  // which form choice each section of the rates page belongs to
  var BOARD = { editing: 'Video editing', 'green-screen': 'Green screen or background removal', vfx: 'VFX & CGI', 'ai-video': 'AI video or images',
    voice: 'Voice-over or AI voice', animation: '3D character or animation', logos: 'Logo, intro or motion graphics', design: 'Graphic design',
    photo: 'Photography or photo editing', filming: 'Filming', websites: 'Website', 'apps-games': 'App or game', lessons: 'Online lessons' };

  var dlg = el('dialog', 'qf');
  dlg.setAttribute('aria-labelledby', 'qf-t');
  dlg.innerHTML =
    '<form id="qf-form" novalidate>' +
      '<div class="qf-h"><h2 id="qf-t">Get a free quote</h2><button type="button" class="qf-x" aria-label="Close">&times;</button></div>' +
      '<p class="qf-sub" id="qf-sub">This goes straight to Yan’s phone. New clients get <b>50% off</b> their first project (up to $250 off).</p>' +
      '<div class="qf-two">' +
        '<label class="qf-f"><span>Your name</span><input id="qf-name" name="name" autocomplete="name"></label>' +
        '<label class="qf-f"><span>What do you need?</span><select id="qf-svc" name="service"></select></label>' +
      '</div>' +
      '<div class="qf-two">' +
        '<label class="qf-f"><span>Email</span><input id="qf-email" name="email" type="email" autocomplete="email" inputmode="email"></label>' +
        '<label class="qf-f"><span>Phone <small>(or just email)</small></span><input id="qf-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel"></label>' +
      '</div>' +
      '<label class="qf-f"><span>Tell Yan about it</span><textarea id="qf-msg" name="message" rows="4" placeholder="What it’s for, how long the video is, any examples you like…"></textarea></label>' +
      '<div class="qf-two" id="qf-extra">' +
        '<label class="qf-f"><span>Budget <small>(optional)</small></span><input id="qf-budget" name="budget" placeholder="e.g. $300"></label>' +
        '<label class="qf-f"><span>Needed by <small>(optional)</small></span><input id="qf-when" name="deadline" placeholder="e.g. December 1"></label>' +
      '</div>' +
      '<input class="qf-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="qf-err" id="qf-err" role="alert"></p>' +
      '<button class="btn btn-primary qf-go" id="qf-go" type="submit">Send to Yan</button>' +
      '<p class="qf-alt">Prefer email? <span id="qf-mail">' + EMAIL + '</span> <button type="button" class="qf-copy" id="qf-copy">Copy</button></p>' +
    '</form>' +
    '<div class="qf-done" id="qf-done" hidden><div class="qf-check" aria-hidden="true">&#10003;</div><h2>Sent!</h2>' +
      '<p id="qf-done-p">Yan got your message on his phone and will get back to you within a day or two.</p>' +
      '<button class="btn btn-primary" type="button" id="qf-ok">Done</button></div>';
  document.body.appendChild(dlg);
  var form = $('#qf-form', dlg), sel = $('#qf-svc', dlg), err = $('#qf-err', dlg), go = $('#qf-go', dlg), formType = 'quote';
  SERVICES.forEach(function (s) { var o = el('option', null, s); o.value = s; sel.appendChild(o); });

  function closeForm() { if (dlg.open) dlg.close(); }
  function openForm(o) {
    o = o || {};
    formType = o.type === 'question' ? 'question' : 'quote';
    $('#qf-t', dlg).textContent = o.title || (formType === 'question' ? 'Ask Yan a question' : 'Get a free quote');
    $('#qf-extra', dlg).hidden = formType === 'question';
    go.textContent = formType === 'question' ? 'Send my question' : 'Send to Yan';
    sel.value = o.service && SERVICES.indexOf(o.service) > -1 ? o.service : (formType === 'question' ? 'Just a question' : 'Something else');
    $('#qf-msg', dlg).value = o.message || '';
    $('#qf-name', dlg).value = $('#qf-name', dlg).value || store.get('qfName');
    $('#qf-email', dlg).value = $('#qf-email', dlg).value || store.get('qfEmail');
    $('#qf-phone', dlg).value = $('#qf-phone', dlg).value || store.get('qfPhone');
    err.textContent = ''; form.hidden = false; $('#qf-done', dlg).hidden = true;
    if (chatOpen()) toggleChat(false);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var first = !$('#qf-name', dlg).value ? '#qf-name' : '#qf-msg';
    setTimeout(function () { var f = $(first, dlg); f.focus(); if (f.value) f.setSelectionRange(f.value.length, f.value.length); }, 30);
  }
  window.openQuote = openForm;

  $('.qf-x', dlg).addEventListener('click', closeForm);
  $('#qf-ok', dlg).addEventListener('click', closeForm);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeForm(); });
  $('#qf-copy', dlg).addEventListener('click', function (e) {
    var b = e.currentTarget;
    (navigator.clipboard ? navigator.clipboard.writeText(EMAIL) : Promise.reject()).then(function () { b.textContent = 'Copied'; })
      .catch(function () { var r = document.createRange(); r.selectNodeContents($('#qf-mail', dlg)); var s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var f = form.elements, name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    var fail = function (m, fld) { err.textContent = m; if (fld) fld.focus(); };
    if (!name) return fail('Enter your name.', f.name);
    if (!email && !phone) return fail('Add your email or phone number so Yan can get back to you.', f.email);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('That email doesn’t look right.', f.email);
    if (!email && phone.length !== 10) return fail('Enter a 10-digit phone number, or add your email.', f.phone);
    if (!f.message.value.trim()) return fail('Tell Yan a little about what you need.', f.message);
    store.set('qfName', name); store.set('qfEmail', email); store.set('qfPhone', f.phone.value.trim());
    go.disabled = true; var label = go.textContent; go.textContent = 'Sending…';
    fetch(API, { method: 'POST', body: JSON.stringify({ kind: 'quote', type: formType, name: name, email: email, phone: phone,
      service: f.service.value, budget: formType === 'quote' ? f.budget.value : '', deadline: formType === 'quote' ? f.deadline.value : '',
      message: f.message.value.trim(), page: location.pathname, website: f.website.value }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        go.disabled = false; go.textContent = label;
        if (!r.ok) return fail(r.error || 'That didn’t go through. Please try again.');
        form.hidden = true; $('#qf-done', dlg).hidden = false;
        $('#qf-done-p', dlg).textContent = 'Yan got your message on his phone and will get back to you within a day or two.' +
          (email ? ' A copy is on its way to your email.' : ' He’ll text you back.');
        $('#qf-ok', dlg).focus();
        f.message.value = ''; f.budget.value = ''; f.deadline.value = '';
        if (chatReady) bot('Your message is on its way to Yan. Anything else I can help with?', [['See prices', function () { location.href = '/rates/'; }]]);
      })
      .catch(function () {
        go.disabled = false; go.textContent = label;
        fail('Couldn’t send right now. Check your connection, or email Yan at ' + EMAIL + '.');
      });
  });

  // every email link and "Get a Free Quote" button opens the form instead of an email app
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || e.defaultPrevented) return;
    e.preventDefault();
    var subject = decodeURIComponent((a.getAttribute('href').split('subject=')[1] || '').split('&')[0]);
    if (/lesson/i.test(subject)) openForm({ service: 'Online lessons', message: 'Please let me know when online lessons open. I want to learn: ' });
    else openForm({ service: page === 'web' ? 'Website' : undefined, title: /quote/i.test(subject) || page === 'rates' ? 'Get a free quote' : 'Send Yan a message' });
  });

  // on the rates page, every price opens a quote for that service
  if (page === 'rates') {
    $$('.board').forEach(function (b) {
      var cat = BOARD[b.id];
      $$('.rows li', b).forEach(function (li) {
        var h = $('h3', li), amt = $('.amt', li);
        if (!h || !amt) return;
        var sm = $('small', amt), price = (sm ? 'from ' : '') + amt.textContent.replace(sm ? sm.textContent : '', '').replace(/\s+/g, ' ').trim();
        li.classList.add('quotable'); li.tabIndex = 0; li.setAttribute('role', 'button');
        li.setAttribute('aria-label', 'Get a quote for ' + h.textContent + ', ' + price);
        var pick = function (e) {
          if (e.target.closest('a')) return;   // links inside a row still work
          openForm({ service: cat, message: 'I’m interested in: ' + h.textContent + ' (' + price + ').\n\n' });
        };
        li.addEventListener('click', pick);
        li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
      });
    });
  }

  /* ================================================================ 2. Yan's assistant (chat) */
  var chat = $('#chat'), msgs = $('#msgs'), q = $('#q'), tg = $('#tg'), chatReady = false, lastQ = '';
  if (!chat || !msgs || !q || !tg) return;
  var head = $('.ch span', chat); if (head) head.textContent = 'Yan’s Assistant';
  q.placeholder = 'Ask about prices, booking…';
  function chatOpen() { return !chat.classList.contains('hidden'); }

  var L = function (u, t) { return '<a href="' + u + '"' + (/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>'; };
  var IMDB = L('https://www.imdb.com/name/nm11192416/', 'IMDb');
  var RATES = L('/rates/', 'all prices');

  var quote = function (svc, msg) { return function () { openForm({ service: svc, message: msg || '' }); }; };
  var ask = function (text) { return function () { you(text); answer(text); }; };
  var go2 = function (url) { return function () { location.href = url; }; };
  var C_QUOTE = ['Get a free quote', quote()];
  var C_PRICES = ['See prices', go2('/rates/')];
  var C_ASK = ['Ask Yan directly', function () { openForm({ type: 'question', message: lastQ }); }];

  // prices on the haircut page come from the page itself, so they always match Yan's sheet
  function haircutPrices() {
    var list = $$('#price-list .price').map(function (p) { var h = $('h3', p), a = $('.amt', p); return h && a ? h.textContent + ' ' + a.textContent : ''; }).filter(Boolean);
    return list.length ? list.join(', ') : 'Kids $30, Haircut $40, Haircut + Beard $45, Eyebrows $15';
  }
  function haircutHours() {
    var list = $$('#hours-list li').map(function (li) { var d = $('.d', li), t = $('.t', li); return d && t ? '<b>' + d.textContent + ':</b> ' + t.textContent : ''; }).filter(Boolean);
    return list.length ? list.join('<br>') : 'See the Start Times section on the booking page.';
  }

  // [pattern, answer (html or function returning html), chips]
  var KB = [
    [/^(hi|hey|hello|yo|sup|good (morning|afternoon|evening))[\s!.,]*$/i, function () { return 'Hey! I can help with prices, booking, or anything about Yan’s work. What are you working on?'; }, function () { return INTRO[page] ? INTRO[page].chips : [C_PRICES, C_QUOTE]; }],
    [/thank|thx|appreciate/i, 'You’re welcome! Anything else?', [C_PRICES, C_QUOTE]],
    [/\bhair|barber|fade|beard|eyebrow|line ?up|taper|kids? cut/i, function () {
      return page === 'barber'
        ? 'Haircut prices: ' + haircutPrices() + '. Every appointment is 1 hour, and you send half as a deposit by Cash App or Zelle to hold your time.'
        : 'Yan also cuts hair by appointment. Pick a time on the ' + L('/barber/', 'Book a Haircut') + ' page and send half as a deposit to hold it.';
    }, function () { return page === 'barber' ? [['Hours', ask('What are your hours?')], ['Deposit & rules', ask('How does the deposit work?')], ['Book now', function () { toggleChat(false); location.hash = 'book'; }]] : [['Book a haircut', go2('/barber/')]]; }],
    [/\bhours\b|what times?\b|which days|schedule|time slots?|openings?/i, function () {
      return page === 'barber' ? 'Start times for haircuts:<br>' + haircutHours() + '<br>Only open times show in the booking form.' : 'For haircuts, see the times on the ' + L('/barber/', 'Book a Haircut') + ' page. For video, 3D or design work, tell Yan your deadline and he’ll fit you in.';
    }, [C_QUOTE]],
    [/deposit|cancel|no.?show|\blate\b|rules|refund/i, function () {
      return page === 'barber' ? 'Send half the price by Cash App or Zelle right after you book. It comes off your total. Cancel or move at least 24 hours before, or the deposit is kept. 15+ minutes late is a $5 fee.'
        : 'For projects: 50% up front to start, and the rest when you approve the final version. Apps and games are paid in stages.';
    }, [C_QUOTE]],
    [/where (are|is) (you|yan|he|it|the)|located|location|address|connecticut|hartford|near me|travel|remote|anywhere/i, function () {
      return page === 'barber' ? 'It’s a private home studio, not a shop. You get the address by email once your deposit comes in.'
        : 'Yan is based in Hartford County, Connecticut. Editing, VFX, 3D, AI and design work is done online, so he works with clients anywhere. Filming outside Hartford County may add a travel fee.';
    }, [C_QUOTE]],
    [/discount|deal|coupon|promo code|percent|% ?off|cheaper|budget|afford|negotiat/i, 'New clients get <b>50% off their first project</b> (up to $250 off). Returning clients get 25% off their next project, and bundles cost less. If your budget is different, tell Yan and he’ll work with you.', [C_QUOTE, C_PRICES]],
    [/how long|turnaround|deadline|rush|asap|urgent|how (fast|quick)|when (can|will)/i, 'Most videos, VFX and design jobs take a few days to two weeks. Need it in less than 3 days? Rush jobs add 25%. Apps and games take weeks or months and are paid in stages.', [C_QUOTE]],
    [/green ?screen|background|chroma|key(ing)?\b|remove.*back/i, 'Green screen removal: <b>$100</b> up to 30 seconds, <b>$150</b> up to 1 minute, +$75 each extra minute. No green screen? Background removal from <b>$150</b>. A full virtual news set starts at <b>$350</b>. You can see the Zikomo before and after on the ' + L('/films/', 'Films') + ' page (Green Screen &amp; VFX).', [['Quote for green screen', quote('Green screen or background removal')], C_PRICES]],
    [/vfx|cgi|effects?\b|clone|clean ?up|composit|explosion|muzzle|smoke|fire|track/i, 'VFX are priced per shot: cleanup from <b>$100</b>, clone shot from <b>$200</b>, advanced shots (tracking, set replacement, fire or smoke) from <b>$400</b>, and CGI creatures or vehicles from <b>$600</b>.', [['Quote for VFX', quote('VFX & CGI')], C_PRICES]],
    [/voice|narrat|eleven ?labs|dub|audio/i, 'Voice-over in Yan’s voice from <b>$100</b> (up to 60 seconds). AI voice-over from <b>$40</b>. A clone of your own voice from <b>$150</b>, only for your voice or one you have permission to use.', [['Quote for voice-over', quote('Voice-over or AI voice')]]],
    [/\bai\b|artificial|prompt|generat|seedance|kling|runway|sora|veo/i, 'AI video with no filming needed: a 10-second clip from <b>$75</b>, social video from <b>$250</b>, commercial from <b>$500</b>, music video from <b>$900</b>, AI presenter from <b>$300</b>, 5 images from <b>$50</b>. AI credits are included.', [['Quote for AI video', quote('AI video or images')]]],
    [/lesson|teach|learn|class|tutor|course|train/i, 'Online one-on-one lessons are <b>coming soon</b>: Blender, Character Creator, iClone, Unreal Engine, DaVinci Resolve and Premiere Pro. Want to be first in line?', [['Tell me when they open', quote('Online lessons', 'Please let me know when online lessons open. I want to learn: ')]]],
    [/\bapps?\b|mobile|ios|android|video ?game|\bgames?\b|unreal|unity|metahuman/i, 'Apps and games are quoted by project and paid in stages. A simple app starts at <b>$1,500</b>, a playable game prototype at <b>$1,500</b>, and a small complete game at <b>$5,000</b>. Game-ready characters start at <b>$700</b>.', [['Quote for an app or game', quote('App or game')]]],
    [/web|site|landing|online booking|booking system|domain|hosting/i, 'Websites: one page from <b>$500</b>, up to 5 pages from <b>$1,200</b>, online booking from <b>$300</b>, interactive 3D tour from <b>$750</b>. This site and the haircut booking page are his work. ' + L('/web-development/', 'See his websites') + '.', [['Quote for a website', quote('Website')]]],
    [/3d|character|animat|cartoon|avatar|turnaround|\brig(ged|ging)?\b|blender|iclone|character creator/i, 'Yan builds 3D characters in Character Creator, Blender and Maya and animates them in iClone and Unreal Engine 5. A 3D character starts at <b>$600</b>, a talking character (30 sec) at <b>$450</b>, 60 seconds of animation at <b>$800</b>, and a character plus welcome video like ' + L('/sylvia/', 'Sylvia') + ' at <b>$1,000</b>.', [['Quote for 3D', quote('3D character or animation')], ['See 3D work', go2('/')]]],
    [/logo|intro|outro|motion|album|lower third|titles?\b|canvas/i, '2D logo animation from <b>$100</b>, 3D logo reveal or channel intro from <b>$200</b>, animated album cover from <b>$150</b>, titles and lower thirds from <b>$75</b>.', [['Quote for a logo or intro', quote('Logo, intro or motion graphics')]]],
    [/design|flyer|poster|thumbnail|business card|cover art|mixtape|graphic|photoshop|illustrator/i, 'Graphic design: logo from <b>$200</b>, flyer or poster from <b>$60</b>, album cover from <b>$100</b>, 5 social posts from <b>$75</b>, YouTube thumbnail <b>$30</b>, business card from <b>$40</b>.', [['Quote for design', quote('Graphic design')]]],
    [/photo|headshot|portrait|retouch|picture|lightroom/i, 'Portrait or headshot session <b>$150</b> (1 hour, 15 edited photos). Events <b>$125/hour</b>. Product photos from <b>$150</b>. Photo editing <b>$10</b> a photo, retouching from <b>$30</b>, background removal <b>$5</b>.', [['Quote for photos', quote('Photography or photo editing')]]],
    [/\bedit|reel|\bshorts?\b|tiktok|youtube|music video|colou?r ?grad|premiere|davinci|cut my/i, 'Video editing: social clip from <b>$125</b>, promo or commercial from <b>$300</b>, YouTube video from <b>$400</b>, YouTube series from <b>$1,400/month</b>, music video from <b>$600</b>, short film from <b>$900</b>, color grading from <b>$100</b>.', [['Quote for editing', quote('Video editing')], C_PRICES]],
    [/film(ing)?\b|shoot|camera|videograph|event|wedding|interview|commercial|record/i, 'Filming with camera, lights and sound: half day <b>$450</b>, full day <b>$800</b>, interview video from <b>$600</b>, event with a highlight video from <b>$900</b>, commercial filmed and edited from <b>$1,200</b>.', [['Quote for filming', quote('Filming')], ['See his films', go2('/films/')]]],
    [/price|cost|how much|rates?\b|charge|\$|\bpay\b|\bfees?\b/i, function () { return page === 'barber' ? 'Haircut prices: ' + haircutPrices() + '.' : 'Prices start at $30 for a YouTube thumbnail, $100 for green screen or a VFX shot, $125 for a social clip and $600 for a 3D character. Here are ' + RATES + '. Tap any price on that page to get a quote.'; }, [C_PRICES, C_QUOTE]],
    [/contact|email|reach|message|talk to|call|text|phone|hire|quote|book|work with/i, 'The fastest way is a message right here. It goes straight to Yan’s phone and he’ll get back to you within a day or two.', [['Send Yan a message', function () { openForm({ title: 'Send Yan a message' }); }]]],
    [/imdb|award|school|nyfa|academy|goodwin|educat|experience|who is|about (yan|him)|background/i, 'Yancarlos Martinez is a 3D artist and filmmaker. He’s recognized on ' + IMDB + ' for editing the feature film “The Families Feud,” studied at the New York Film Academy (Class of 2019) and Goodwin College, and works as a cinematographer, editor, actor and game developer.', [['See his films', go2('/films/')], ['About Yan', go2('/about/')]]],
    [/movie|films?\b|tubi|prime|watch|feud|article 92|reflection/i, 'Yan has shot, edited, acted in or done the VFX for feature films, shorts, music videos and reels, some streaming on Tubi and Prime Video. ' + L('/films/', 'See the films') + '.', [['Editing prices', ask('How much is editing?')], C_QUOTE]],
    [/sylvia|welcome video/i, 'Sylvia is a 3D animated version of attorney Sylvia D. Reid. Yan built her welcome video and the salon presentation for the CCMC Charity Luncheon. A character plus a 30-second welcome video starts at $1,000.', [['Get one like Sylvia', quote('3D character or animation', 'I’d like an animated welcome video like Sylvia.\n\n')]]],
    [/salon|trish|ccmc|charity|hospital/i, 'The Ms. Trish Self-Care Salon is a planned salon inside Connecticut Children’s Medical Center. Yan designed it in 3D and built the narrated presentation. ' + L('/salon/', 'See the project') + '.', [C_QUOTE]],
    [/software|tools|programs?|maya|after effects|nuke|zbrush|houdini|substance|cinema 4d|capcut/i, 'Yan works in DaVinci Resolve, Premiere Pro, After Effects, Nuke, Houdini, Blender, Maya, ZBrush, Substance Painter, Cinema 4D, Character Creator, iClone, Unreal Engine 5, MetaHuman, Unity, Photoshop, Illustrator and ElevenLabs.', [C_PRICES]],
    [/instagram|tiktok|linkedin|facebook|social/i, 'Follow Yan: ' + L('https://www.instagram.com/yancarlosmart1nez', 'Instagram') + ', ' + L('https://www.tiktok.com/@yancarlosmart1nez', 'TikTok') + ', ' + L('https://www.linkedin.com/in/yancarlos-martinez-56a610203', 'LinkedIn') + ', ' + L('https://www.facebook.com/share/19sGsR39n8/', 'Facebook') + '.', []]
  ];

  // what the assistant says first on each page
  var INTRO = {
    home: { tease: 'Hi! Want to know how Yan builds these 3D characters?',
      text: 'Hey! I’m Yan’s assistant. This page is his 3D animation and character work, built in Character Creator, Blender and Unreal Engine 5. He can make a 3D character of you or your brand, starting at $600.',
      chips: [['3D prices', ask('How much is a 3D character?')], ['Games & apps', ask('Do you make games?')], C_QUOTE, ['See his films', go2('/films/')]] },
    films: { tease: 'Hi! Want to know what Yan did on these films?',
      text: 'Welcome to Yan’s films. He shoots, edits and does the VFX, and he’s recognized on ' + IMDB + ' for editing “The Families Feud.” Some of these are streaming on Tubi and Prime Video. Tap any project to watch.',
      chips: [['Editing prices', ask('How much is video editing?')], ['Green screen & VFX', ask('How much is green screen removal?')], ['Filming prices', ask('How much is filming?')], C_QUOTE] },
    sylvia: { tease: 'Want your own animated welcome video like Sylvia?',
      text: 'This is Sylvia, a 3D animated version of attorney Sylvia D. Reid. Yan designed her 3D character and animated her welcome for the Ms. Trish Self-Care Salon presentation at the CCMC Charity Luncheon. He can make one for you or your business: a character plus a 30-second welcome video starts at $1,000.',
      chips: [['Get one like Sylvia', quote('3D character or animation', 'I’d like an animated welcome video like Sylvia.\n\n')], ['3D prices', ask('How much is a 3D character?')], C_PRICES] },
    web: { tease: 'Need a website? I can show you prices and examples.',
      text: 'Yan builds fast, mobile-friendly websites with videos, 3D tours and online booking, like this site and his haircut booking page. One-page sites start at $500.',
      chips: [['Website prices', ask('How much is a website?')], ['Online booking', ask('Can you add online booking?')], ['Apps & games', ask('Do you make apps?')], C_QUOTE] },
    rates: { tease: 'Not sure which service you need? Ask me.',
      text: 'Need help picking? Tell me what you’re making and I’ll point you to the right service. Tap any price on this page to get a free quote. New clients get 50% off their first project (up to $250 off).',
      chips: [['Video editing', ask('How much is video editing?')], ['Green screen & VFX', ask('How much are VFX shots?')], ['3D & animation', ask('How much is 3D animation?')], ['Not sure, ask Yan', function () { openForm({ type: 'question', service: 'Just a question' }); }]] },
    about: { tease: 'Want to work with Yan? Message him right here.',
      text: 'Want to work with Yan? Send him a message here and it goes straight to his phone. He works on films, VFX, 3D animation, AI video, design and websites.',
      chips: [['Send Yan a message', function () { openForm({ title: 'Send Yan a message' }); }], ['What he does', ask('Who is Yan?')], C_PRICES] },
    barber: { tease: 'Questions about booking a haircut? Ask me.',
      text: 'Booking a haircut? Pick a service, a day and a time, then send half as a deposit with Cash App or Zelle to hold it. The rest is paid after your cut.',
      chips: [['Prices', ask('How much is a haircut?')], ['Hours', ask('What are your hours?')], ['Deposit & rules', ask('How does the deposit work?')], ['Where is it?', ask('Where are you located?')]] }
  };
  var intro = INTRO[page] || INTRO.home;

  function scroll() { msgs.scrollTop = msgs.scrollHeight; }
  function you(text) { msgs.appendChild(el('p', 'm-you', text)); scroll(); }
  function chips(list) {
    if (!list || !list.length) return;
    var box = el('div', 'm-chips');
    list.forEach(function (c) {
      var b = el('button', 'm-chip', c[0]); b.type = 'button';
      b.addEventListener('click', function () { c[1](); });
      box.appendChild(b);
    });
    msgs.appendChild(box); scroll();
  }
  function bot(html, list, now) {
    var t = el('p', 'm-bot m-typing'); t.innerHTML = '<span></span><span></span><span></span>';
    if (!now) { msgs.appendChild(t); scroll(); }
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
      var p = el('p', 'm-bot'); p.innerHTML = html; msgs.appendChild(p); chips(list); scroll();
    }, now ? 0 : 550);
  }
  function answer(text) {
    lastQ = text;
    var hit = KB.filter(function (k) { return k[0].test(text); })[0];
    if (!hit) return bot('Good question. I don’t have that answer yet, but Yan does. Want me to send it to him? It goes straight to his phone.', [C_ASK, C_PRICES]);
    var a = typeof hit[1] === 'function' ? hit[1]() : hit[1], c = typeof hit[2] === 'function' ? hit[2]() : hit[2];
    bot(a, c);
  }
  function send() { var t = q.value.trim(); if (!t) return; q.value = ''; you(t); answer(t); }

  function start() {
    if (chatReady) return; chatReady = true;
    msgs.innerHTML = '';
    bot(intro.text, intro.chips, true);
  }

  /* ================================================================ 3. Yan's voice
     A short hello in Yan's own voice (made with ElevenLabs, eleven_v4 model) for each page. It plays by itself when the browser allows it;
     browsers that block sound until the visitor touches the page start it on their first tap. Visitors can pause it,
     replay it from the chat, or turn it off for every page ("Voice off" is remembered on their device).
     It only plays once per page per visit, and it pauses when a video with sound starts. */
  var VOICE = { home: 27, films: 23, sylvia: 19, web: 21, rates: 34, about: 22, barber: 26 };   // seconds
  var voiceLen = VOICE[page] || 0, voiceSrc = voiceLen ? '/media/voice/' + page + '.mp3?v=2' : '';
  var audio = null, voiceState = 'idle', waitingOff = null;   // idle | waiting (for a tap) | playing | paused | done
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  var voiceOff = function () { return store.get('yanVoice') === 'off'; };
  var clock = function (s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };
  var bubble = null, bubbleTimer = 0;

  // the voice button in the chat header
  var vc = null;
  if (voiceSrc) {
    vc = el('button'); vc.id = 'vc'; vc.type = 'button';
    vc.addEventListener('click', function () { toggleVoice(); });
    var xcBtn = $('#xc', chat); if (xcBtn) xcBtn.parentNode.insertBefore(vc, xcBtn);
  }

  function talking() { return !!audio && !audio.paused && !audio.ended; }
  function soundVideoPlaying() {
    return $$('video').some(function (v) { return !v.paused && !v.ended && !v.muted && v.volume > 0; });
  }
  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio(voiceSrc); audio.preload = 'auto';
    audio.addEventListener('play', function () { voiceState = 'playing'; paint(); });
    audio.addEventListener('pause', function () { if (!audio.ended) { voiceState = 'paused'; paint(); } });
    audio.addEventListener('ended', function () {
      voiceState = 'done'; paint();
      clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hideBubble, 5000);
    });
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('error', function () { voiceState = 'idle'; voiceLen = 0; if (vc) vc.hidden = true; paint(); });
    return audio;
  }
  // returns a promise: true if the voice started
  function playVoice() {
    if (!voiceSrc || !voiceLen) return Promise.resolve(false);
    var a = ensureAudio();
    if (a.ended) a.currentTime = 0;
    var p;
    try { p = a.play(); } catch (e) { return Promise.resolve(false); }
    return p && p.then ? p.then(function () { return true; }, function () { return false; }) : Promise.resolve(!a.paused);
  }
  function pauseVoice() { if (talking()) audio.pause(); }
  function toggleVoice() {
    stopWaiting();
    if (talking()) return pauseVoice();
    if (voiceOff()) store.set('yanVoice', 'on');        // pressing play turns the voice back on
    playVoice().then(function (ok) { if (ok && !chatOpen()) showBubble(); });
  }
  function turnVoiceOff() {
    store.set('yanVoice', 'off'); stopWaiting(); pauseVoice(); paint();
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hideBubble, 2500);
  }

  // sound is blocked until the visitor touches the page: start on their first tap, unless that tap is on a video,
  // a project, a price, a link to another page or a form field (they're busy with that)
  var BUSY = 'video, iframe, .card, .proj, .quotable, dialog, a[href]:not([href^="#"]), input, textarea, select, .ai-bubble, #vc';
  function waitForTap() {
    voiceState = 'waiting'; paint();
    var evs = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
    var go = function (e) {
      if (voiceState !== 'waiting') return stopWaiting();
      if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Shift')) return;
      var t = e.target;
      if (t && t.closest && t.closest(BUSY)) { if (!t.closest('.ai-bubble, #vc')) { stopWaiting(); voiceState = 'idle'; paint(); } return; }
      if (voiceOff() || soundVideoPlaying()) return stopWaiting();
      playVoice().then(function (ok) { if (ok) { stopWaiting(); if (!chatOpen()) showBubble(); } });
    };
    evs.forEach(function (n) { addEventListener(n, go, true); });
    waitingOff = function () { evs.forEach(function (n) { removeEventListener(n, go, true); }); waitingOff = null; };
  }
  function stopWaiting() { if (waitingOff) waitingOff(); }

  // a video with sound always wins; so does leaving the tab
  document.addEventListener('play', function (e) { var m = e.target; if (m !== audio && m.tagName === 'VIDEO' && !m.muted) { pauseVoice(); stopWaiting(); } }, true);
  document.addEventListener('volumechange', function (e) { var m = e.target; if (m !== audio && m.tagName === 'VIDEO' && !m.muted && !m.paused) { pauseVoice(); stopWaiting(); } }, true);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseVoice(); });

  // keep the buttons and the status line in step with the voice
  function paint() {
    var on = talking();
    if (vc) {
      vc.innerHTML = on ? ICON.pause : ICON.speaker;
      vc.classList.toggle('on', on);
      vc.setAttribute('aria-label', on ? 'Pause Yan’s voice' : 'Hear Yan say hi');
      vc.title = on ? 'Pause' : 'Hear Yan say hi';
    }
    if (!bubble) return;
    bubble.classList.toggle('talking', on);
    var pb = $('.ai-b-play', bubble), st = $('.ai-b-st span', bubble), bar = $('.ai-b-bar i', bubble), mute = $('.ai-b-mute', bubble);
    if (pb) { pb.innerHTML = on ? ICON.pause : ICON.play; pb.setAttribute('aria-label', on ? 'Pause Yan’s voice' : 'Play Yan’s hello'); }
    if (st) {
      var len = (audio && isFinite(audio.duration) && audio.duration) || voiceLen, at = audio ? audio.currentTime : 0;
      st.textContent = on ? 'Yan is talking · ' + clock(at) + ' / ' + clock(len)
        : voiceOff() && voiceState !== 'idle' ? 'Voice is off on every page. Tap ▶ to hear it.'
        : voiceState === 'paused' ? 'Paused · ' + clock(at) + ' / ' + clock(len)
        : voiceState === 'done' ? 'Tap ▶ to hear it again'
        : 'Tap ▶ to hear Yan say hi (' + clock(len) + ')';
      if (bar) bar.style.width = (len ? Math.min(100, at / len * 100) : 0) + '%';
    }
    if (mute) mute.hidden = voiceOff();
  }

  function hideBubble() {
    clearTimeout(bubbleTimer);
    if (bubble) { bubble.classList.remove('on'); var b = bubble; bubble = null; setTimeout(function () { b.remove(); }, 300); }
  }
  function showBubble() {
    clearTimeout(bubbleTimer);
    if (!bubble) {
      bubble = el('div', 'ai-bubble' + (voiceSrc ? ' has-voice' : '')); bubble.setAttribute('role', 'status');
      if (voiceSrc && voiceLen) {
        var pb = el('button', 'ai-b-play'); pb.type = 'button';
        pb.addEventListener('click', toggleVoice);
        bubble.appendChild(pb);
      }
      var body = el('div', 'ai-b-body');
      var txt = el('button', 'ai-b-txt'); txt.type = 'button';
      txt.appendChild(el('b', null, 'Yan’s Assistant')); txt.appendChild(el('span', null, intro.tease));
      txt.addEventListener('click', function () { toggleChat(true); });
      body.appendChild(txt);
      if (voiceSrc && voiceLen) {
        var st = el('div', 'ai-b-st'); st.appendChild(el('span'));
        var mute = el('button', 'ai-b-mute', 'Voice off'); mute.type = 'button';
        mute.title = 'Turn off Yan’s voice on every page';
        mute.addEventListener('click', turnVoiceOff);
        st.appendChild(mute);
        var bar = el('i', 'ai-b-bar'); bar.appendChild(el('i'));
        body.appendChild(st); body.appendChild(bar);
      }
      bubble.appendChild(body);
      var x = el('button', 'ai-b-x'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.innerHTML = '&times;';
      x.addEventListener('click', function () { stopWaiting(); pauseVoice(); hideBubble(); });
      bubble.appendChild(x);
      document.body.appendChild(bubble);
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (bubble) bubble.classList.add('on'); }); });
    }
    paint();
    // the bubble stays while Yan is talking, then goes away by itself
    var later = function () { if (talking()) bubbleTimer = setTimeout(later, 4000); else hideBubble(); };
    bubbleTimer = setTimeout(later, voiceState === 'done' ? 5000 : 14000);
  }

  function toggleChat(open) {
    if (open === undefined) open = !chatOpen();
    chat.classList.toggle('hidden', !open);
    tg.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { start(); hideBubble(); store.mark('chatSeen-' + page); setTimeout(function () { if (matchMedia('(min-width: 700px)').matches) q.focus(); }, 50); }
  }
  tg.setAttribute('aria-controls', 'chat'); tg.setAttribute('aria-expanded', 'false');
  tg.onclick = function () { toggleChat(); };
  var xc = $('#xc'); if (xc) xc.onclick = function () { toggleChat(false); tg.focus(); };
  var snd = $('#snd'); if (snd) snd.onclick = send;
  q.onkeydown = function (e) { if (e.key === 'Enter') send(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && chatOpen() && !dlg.open) toggleChat(false); });
  paint();

  // the assistant says hi (and Yan's voice plays) shortly after the page opens, once per page per visit
  if (!store.seen('chatSeen-' + page)) {
    var greet = function () {
      var introBox = $('#intro');                                // wait for the home intro video, if it's showing
      if (introBox && !introBox.hidden) return setTimeout(greet, 800);
      if (chatOpen() || dlg.open || store.seen('chatSeen-' + page)) return;
      store.mark('chatSeen-' + page);
      showBubble();
      if (!voiceSrc || voiceOff() || soundVideoPlaying()) return;
      playVoice().then(function (ok) { if (!ok && !talking()) waitForTap(); });
    };
    setTimeout(greet, 1500);
  }
})();
