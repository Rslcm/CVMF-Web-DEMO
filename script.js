/* Club Voleibol Manuel de Falla — interacciones */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var nav = document.getElementById('nav');
  var navToggle = document.querySelector('.nav-toggle');
  var toTop = document.querySelector('.to-top');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Cabecera sólida + botón "volver arriba" ---------------------------------- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (toTop) toTop.classList.toggle('show', y > 700);
    updateActiveLink(y);
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menú móvil -------------------------------------------------------------- */
  function setMenu(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setMenu(!nav.classList.contains('open'));
    });
  }

  if (nav) {
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });
  }

  document.addEventListener('click', function (event) {
    if (!nav || !nav.classList.contains('open')) return;
    if (event.target.closest('.header-inner')) return;
    setMenu(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 980) setMenu(false);
  });

  /* Enlace activo según la sección visible ---------------------------------- */
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];
  var sections = navLinks.map(function (link) {
    return { link: link, el: document.querySelector(link.getAttribute('href')) };
  }).filter(function (item) { return item.el; });

  function updateActiveLink(y) {
    if (!sections.length) return;
    var offset = y + 140;
    var current = null;
    sections.forEach(function (item) {
      if (item.el.offsetTop <= offset) current = item;
    });
    sections.forEach(function (item) {
      item.link.classList.toggle('active', item === current);
      if (item === current) item.link.setAttribute('aria-current', 'true');
      else item.link.removeAttribute('aria-current');
    });
  }

  /* Directo: tira de resultados y reproductor -------------------------------- */
  var LIVE_FAV = 'https://www.favoley.net/publico/seccion.php?seccion=directos';
  var LIVE_CHANNEL = 'https://www.youtube.com/@cvmf_brenes/live';
  var liveDataEl = document.getElementById('live-data');
  var liveData = null;

  if (liveDataEl) {
    try {
      liveData = JSON.parse(liveDataEl.textContent || '{}');
    } catch (error) {
      liveData = null;
    }
  }

  var liveEvents = liveData && Array.isArray(liveData.eventos)
    ? liveData.eventos.filter(function (item) { return item && typeof item === 'object'; })
    : [];
  var liveChannel = liveData && /^https:\/\//i.test(liveData.canal || '') ? liveData.canal : LIVE_CHANNEL;

  function liveText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function liveState(event) {
    var state = liveText(event && event.estado).toLowerCase();
    return state === 'live' || state === 'next' || state === 'final' ? state : 'next';
  }

  function liveVideoId(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : '';
  }

  function liveEventUrl(event) {
    var id = liveVideoId(event.youtube);
    if (id) return 'https://www.youtube.com/watch?v=' + id;
    if (liveText(event.fav) && /^https:\/\//i.test(event.fav)) return event.fav;
    return LIVE_FAV;
  }

  function liveStateLabel(state) {
    if (state === 'live') return 'En directo';
    if (state === 'final') return 'Final';
    return 'Próximo';
  }

  function buildTickerItem(event, state) {
    var link = document.createElement('a');
    link.className = 'live-ticker-item';
    link.href = liveEventUrl(event);
    link.target = '_blank';
    link.rel = 'noopener';

    var badge = document.createElement('span');
    badge.className = 'live-ticker-state live-ticker-state-' + state;
    if (state === 'live') {
      var dot = document.createElement('span');
      dot.className = 'live-dot';
      dot.setAttribute('aria-hidden', 'true');
      badge.appendChild(dot);
    }
    badge.appendChild(document.createTextNode(liveStateLabel(state)));
    link.appendChild(badge);

    var match = document.createElement('strong');
    match.className = 'live-ticker-match';
    match.textContent = liveText(event.evento) || 'Partido por confirmar';
    link.appendChild(match);

    var meta = [liveText(event.competicion), liveText(event.fecha), liveVenue(event, state)].filter(Boolean).join(' · ');
    if (meta) {
      var metaEl = document.createElement('span');
      metaEl.className = 'live-ticker-meta';
      metaEl.textContent = meta;
      link.appendChild(metaEl);
    }

    var score = liveText(event.marcador);
    if (score) {
      var scoreEl = document.createElement('span');
      scoreEl.className = 'live-ticker-score';
      scoreEl.textContent = score;
      link.appendChild(scoreEl);
    }

    if (event.ejemplo === true) {
      var tag = document.createElement('span');
      tag.className = 'live-ticker-tag';
      tag.textContent = 'Ejemplo';
      link.appendChild(tag);
    }

    return link;
  }

  function sizeTicker() {
    var track = document.getElementById('live-ticker-track');
    var group = track ? track.querySelector('.live-ticker-group') : null;
    if (!group) return;
    var width = group.getBoundingClientRect().width;
    if (!width) return;
    var duration = Math.max(20, Math.round(width / 40));
    track.style.setProperty('--ticker-duration', duration + 's');
  }

  var STATE_RANK = { live: 0, next: 1, final: 2 };
  var KICKOFF_WINDOW = 3 * 60 * 60 * 1000;
  var CATEGORY_ORDER = ['senior', 'juvenil', 'cadete', 'infantil', 'alevin', 'benjamin', 'escuela'];

  function normalizeText(value) {
    return liveText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function categoryRank(event) {
    var text = normalizeText(event.categoria || event.competicion);
    for (var i = 0; i < CATEGORY_ORDER.length; i += 1) {
      if (text.indexOf(CATEGORY_ORDER[i]) !== -1) return CATEGORY_ORDER.length - i;
    }
    return 0;
  }

  function parseStart(value) {
    var match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*·\s*(\d{1,2}):(\d{2})$/.exec(liveText(value));
    if (!match) return null;
    return new Date(+match[3], +match[2] - 1, +match[1], +match[4], +match[5]).getTime();
  }

  function effectiveState(event, now) {
    var state = liveState(event);
    var start = parseStart(event.fecha);
    if (state === 'next' && start !== null) {
      if (now >= start + KICKOFF_WINDOW) return 'final';
      if (now >= start) return 'live';
    }
    return state;
  }

  function orderEvents(events, now) {
    var items = events.map(function (event, index) {
      return {
        event: event,
        index: index,
        state: effectiveState(event, now),
        start: parseStart(event.fecha),
        category: categoryRank(event)
      };
    });
    items.sort(function (a, b) {
      var diff = STATE_RANK[a.state] - STATE_RANK[b.state];
      if (diff) return diff;
      var aDated = a.start !== null;
      var bDated = b.start !== null;
      if (aDated !== bDated) return aDated ? -1 : 1;
      if (aDated && a.start !== b.start) return a.state === 'final' ? b.start - a.start : a.start - b.start;
      if (a.category !== b.category) return b.category - a.category;
      return a.index - b.index;
    });
    return items;
  }

  function renderTicker(items) {
    var ticker = document.getElementById('live-ticker');
    var track = document.getElementById('live-ticker-track');
    if (!ticker || !track || !items.length) return;

    track.textContent = '';
    var group = document.createElement('div');
    group.className = 'live-ticker-group';
    items.forEach(function (item) { group.appendChild(buildTickerItem(item.event, item.state)); });
    track.appendChild(group);

    var clone = group.cloneNode(true);
    clone.setAttribute('data-clone', '');
    clone.setAttribute('aria-hidden', 'true');
    var cloneLinks = clone.querySelectorAll('a');
    for (var i = 0; i < cloneLinks.length; i += 1) cloneLinks[i].tabIndex = -1;
    track.appendChild(clone);

    var hasLive = items.some(function (item) { return item.state === 'live'; });
    var hasNext = items.some(function (item) { return item.state === 'next'; });
    var label = document.getElementById('live-ticker-label');
    var dot = document.getElementById('live-ticker-dot');
    if (label) label.textContent = hasLive ? 'En directo' : hasNext ? 'Próximo partido' : 'Resultados';
    if (dot) dot.hidden = !hasLive;

    ticker.hidden = false;
    sizeTicker();
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(sizeTicker);
    }
  }

  function liveVenue(event, state) {
    var venue = liveText(event.sede);
    if (venue) return venue;
    return state === 'next' ? 'Sede por confirmar' : '';
  }

  function liveButtonLabel(state, id) {
    if (state === 'live') return 'Directo';
    if (state === 'next') return 'Próximo directo';
    return id ? 'Repetición' : 'Resultado';
  }

  function applyFeatured(event, state) {
    var id = liveVideoId(event.youtube);
    var url = liveEventUrl(event);
    var name = liveText(event.evento) || 'Directos en YouTube';
    var meta = [liveText(event.competicion), liveText(event.fecha)].filter(Boolean).join(' · ');
    var category = liveText(event.categoria);
    var label = liveButtonLabel(state, id) + (category ? ' · ' + category : '');
    var score = liveText(event.marcador);
    var link = state === 'final' ? url : (state === 'live' && id) ? url : liveChannel;

    var hero = document.getElementById('hero-live');
    var heroEvent = document.getElementById('hero-live-event');
    var heroState = document.getElementById('hero-live-state');
    if (hero && heroEvent && heroState) {
      hero.href = link;
      heroEvent.textContent = name;
      heroState.textContent = state === 'live' && score ? label + ' · ' + score : label;
      heroState.hidden = false;
    }

    var card = document.getElementById('live-card-yt');
    var cardTitle = document.getElementById('live-card-title');
    var cardDesc = document.getElementById('live-card-desc');
    var cardCta = document.getElementById('live-card-cta');
    if (card && cardTitle && cardDesc && cardCta) {
      card.href = link;
      cardTitle.textContent = name;
      var details = [];
      if (meta) details.push(meta);
      if (liveVenue(event, state)) details.push(liveVenue(event, state));
      if (liveText(event.marcador)) details.push('Marcador ' + liveText(event.marcador));
      if (event.ejemplo === true) details.push('Ejemplo de prueba');
      cardDesc.textContent = details.join(' · ') || 'Los partidos que emitimos se ven en nuestro canal, en directo y en abierto.';
      cardCta.textContent = label;
    }

    renderPlayer(event, id);

    var demoNote = document.getElementById('live-demo-note');
    if (demoNote) demoNote.hidden = event.ejemplo !== true;
  }

  function loadPlayer(frame, id, name) {
    if (!frame) return;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    iframe.title = 'Vídeo: ' + (liveText(name) || 'emisión del club');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.setAttribute('allowfullscreen', '');
    iframe.loading = 'lazy';
    frame.textContent = '';
    frame.appendChild(iframe);
  }

  function renderPlayer(event, id) {
    var player = document.getElementById('live-player');
    if (!player) return;
    if (!id) {
      player.hidden = true;
      return;
    }

    var title = document.getElementById('live-player-title');
    var meta = document.getElementById('live-player-meta');
    var kicker = document.getElementById('live-player-kicker');
    var hint = document.getElementById('live-player-hint');
    var play = document.getElementById('live-player-play');
    var frame = document.getElementById('live-player-frame');
    var link = document.getElementById('live-player-link');

    if (title) title.textContent = liveText(event.evento) || 'Emisión en directo';
    if (meta) meta.textContent = [liveText(event.competicion), liveText(event.fecha)].filter(Boolean).join(' · ') || 'Emisión del club';
    if (kicker) kicker.textContent = event.ejemplo === true ? 'Prueba de emisión integrada' : 'Emisión integrada';
    if (hint) {
      hint.textContent = event.ejemplo === true
        ? 'Vídeo de ejemplo de la FAV · se carga al pulsar'
        : 'Se abre el reproductor de YouTube al pulsar';
    }
    if (link) link.href = 'https://www.youtube.com/watch?v=' + id;
    if (play && frame) {
      play.setAttribute('aria-label', 'Cargar la emisión: ' + (liveText(event.evento) || 'directo') + '. Se abre el reproductor de YouTube.');
      play.onclick = function () {
        loadPlayer(frame, id, event.evento);
      };
    }

    player.hidden = false;
  }

  function setupTickerToggle() {
    var ticker = document.getElementById('live-ticker');
    var toggle = document.getElementById('live-ticker-toggle');
    if (!ticker || !toggle) return;
    toggle.addEventListener('click', function () {
      var paused = ticker.classList.toggle('is-paused');
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Reanudar la tira de resultados' : 'Pausar la tira de resultados');
    });
  }

  var renderedSignature = '';

  function refreshLive() {
    var items = orderEvents(liveEvents, Date.now());
    if (!items.length) return;
    var signature = items.map(function (item) { return item.index + ':' + item.state; }).join('|');
    if (signature !== renderedSignature) {
      renderedSignature = signature;
      renderTicker(items);
    }
    applyFeatured(items[0].event, items[0].state);
  }

  if (liveEvents.length) {
    refreshLive();
    window.setInterval(refreshLive, 30000);
  }
  setupTickerToggle();

  var tickerResize = 0;
  window.addEventListener('resize', function () {
    if (!liveEvents.length) return;
    if (tickerResize) window.cancelAnimationFrame(tickerResize);
    tickerResize = window.requestAnimationFrame(sizeTicker);
  });
  window.addEventListener('load', sizeTicker);

  /* Aparición suave de bloques ---------------------------------------------- */
  var revealItems = document.querySelectorAll('.reveal');
  if (revealItems.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealItems.forEach(function (item) { observer.observe(item); });
    } else {
      revealItems.forEach(function (item) { item.classList.add('in'); });
    }

    /* Red de seguridad: nada debe quedarse oculto si el observador no responde. */
    window.setTimeout(function () {
      revealItems.forEach(function (item) { item.classList.add('in'); });
    }, 1200);
  }

  /* Volver arriba ------------------------------------------------------------ */
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* Año del pie -------------------------------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  window.__cvmfReady = true;
  onScroll();
})();
