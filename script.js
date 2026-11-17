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
    var points = liveText(event.puntos);
    if (points && state === 'live') {
      var pointsEl = document.createElement('span');
      pointsEl.className = 'live-ticker-points';
      pointsEl.textContent = points;
      link.appendChild(pointsEl);
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
    if (!ticker || !track) return;
    if (!items.length) {
      ticker.hidden = true;
      return;
    }

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
    var points = liveText(event.puntos);
    var link = state === 'final' ? url : (state === 'live' && id) ? url : liveChannel;

    var hero = document.getElementById('hero-live');
    var heroEvent = document.getElementById('hero-live-event');
    var heroState = document.getElementById('hero-live-state');
    var heroPoints = document.getElementById('hero-live-points');
    if (hero && heroEvent && heroState) {
      hero.href = link;
      heroEvent.textContent = name;
      heroState.textContent = state === 'live' && score ? label + ' · ' + score : label;
      heroState.hidden = false;
    }
    if (heroPoints) {
      heroPoints.textContent = state === 'live' && points ? 'Puntos: ' + points : '';
      heroPoints.hidden = !(state === 'live' && points);
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
      if (state === 'live' && points) details.push('Puntos ' + points);
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
    Array.prototype.forEach.call(document.querySelectorAll('.live-ticker'), function (ticker) {
      var toggle = ticker.querySelector('.live-ticker-toggle');
      if (!toggle) return;
      toggle.addEventListener('click', function () {
        var paused = ticker.classList.toggle('is-paused');
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.setAttribute('aria-label', paused ? 'Reanudar la tira' : 'Pausar la tira');
      });
    });
  }

  var renderedSignature = '';

  function refreshLive() {
    var items = orderEvents(liveEvents, Date.now());
    if (!items.length) return;
    var upcoming = items.filter(function (item) { return item.state !== 'final'; });
    var signature = upcoming.map(function (item) { return item.index + ':' + item.state; }).join('|');
    if (signature !== renderedSignature) {
      renderedSignature = signature;
      renderTicker(upcoming);
    }
    applyFeatured(items[0].event, items[0].state);
  }

  function setLiveData(data) {
    if (!data || !Array.isArray(data.eventos)) return;
    liveEvents = data.eventos.filter(function (item) { return item && typeof item === 'object'; });
    liveChannel = /^https:\/\//i.test(data.canal || '') ? data.canal : LIVE_CHANNEL;
    renderedSignature = '';
    if (liveEvents.length) refreshLive();
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

  /* Tiras en movimiento: entrenamientos, últimos resultados y próximos partidos */
  var DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var SEASON_START = new Date(2026, 8, 1).getTime();
  var SEASON_END = new Date(2027, 4, 1).getTime();
  var STRIP_LIMIT = 12;
  var stripTeams = [];
  var stripKeys = {};

  function clockMinutes(text) {
    var parts = text.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function readTrainings() {
    var sessions = [];
    Array.prototype.forEach.call(document.querySelectorAll('.schedule tbody tr'), function (row) {
      var name = row.querySelector('.sched-name');
      var meta = row.querySelector('.sched-meta');
      if (!name) return;
      Array.prototype.forEach.call(row.querySelectorAll('td[data-label]'), function (cell) {
        var day = DAY_NAMES.indexOf(cell.getAttribute('data-label'));
        var time = cell.querySelector('.sched-time');
        var range = time ? /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/.exec(liveText(time.textContent)) : null;
        if (day < 0 || !range) return;
        sessions.push({
          day: day,
          start: clockMinutes(range[1]),
          end: clockMinutes(range[2]),
          time: range[1] + '–' + range[2],
          name: liveText(name.textContent),
          meta: meta ? liveText(meta.textContent) : ''
        });
      });
    });
    return sessions;
  }

  var trainings = readTrainings();

  function trainingState(session, now) {
    var today = now.getDay();
    if (today === 0 || today === 6 || session.day < today) return 'done';
    if (session.day > today) return 'soon';
    var minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes >= session.end) return 'done';
    if (minutes >= session.start) return 'live';
    return 'soon';
  }

  function trainingItems(now) {
    return trainings
      .slice()
      .sort(function (a, b) { return a.day - b.day || a.start - b.start; })
      .map(function (session) {
        return { session: session, state: trainingState(session, now) };
      });
  }

  function matchKey(match) {
    return liveText(match.evento) + '|' + liveText(match.fecha);
  }

  function resultItems() {
    var seen = {};
    var list = [];
    stripTeams.forEach(function (team) {
      (team.resultados || []).forEach(function (match) {
        var key = matchKey(match);
        var when = parseStart(match.fecha);
        if (seen[key] || when === null) return;
        seen[key] = true;
        list.push({ match: match, when: when });
      });
    });
    list.sort(function (a, b) { return b.when - a.when; });
    return list.slice(0, STRIP_LIMIT);
  }

  function stripBadge(text, dotClass) {
    var badge = makeEl('span', 'live-ticker-state');
    var dot = makeEl('span', 'strip-dot ' + dotClass);
    dot.setAttribute('aria-hidden', 'true');
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(text));
    return badge;
  }

  function stripNode(badge, title, meta, score) {
    var item = makeEl('span', 'live-ticker-item');
    item.appendChild(badge);
    item.appendChild(makeEl('strong', 'live-ticker-match', title));
    if (meta) item.appendChild(makeEl('span', 'live-ticker-meta', meta));
    if (score) item.appendChild(makeEl('span', 'live-ticker-score', score));
    return item;
  }

  function trainingNode(item) {
    var session = item.session;
    var label = item.state === 'live' ? 'En curso' : item.state === 'done' ? 'Terminado' : 'Por empezar';
    var dot = item.state === 'live' ? 'strip-dot-live' : item.state === 'done' ? 'strip-dot-done' : 'strip-dot-soon';
    var meta = [DAY_NAMES[session.day], session.time, session.meta].filter(Boolean).join(' · ');
    return stripNode(stripBadge(label, dot), session.name, meta);
  }

  function resultNode(item) {
    return stripNode(
      stripBadge('Final', 'strip-dot-done'),
      liveText(item.match.evento),
      liveText(item.match.fecha),
      liveText(item.match.marcador)
    );
  }

  function sizeStrip(strip) {
    var group = strip.querySelector('.live-ticker-group');
    var track = strip.querySelector('.live-ticker-track');
    var width = group ? group.getBoundingClientRect().width : 0;
    if (!width || !track) return;
    track.style.setProperty('--ticker-duration', Math.max(20, Math.round(width / 40)) + 's');
  }

  function sizeStrips() {
    ['strip-entrenos', 'strip-resultados'].forEach(function (id) {
      var strip = document.getElementById(id);
      if (strip && !strip.hidden) sizeStrip(strip);
    });
  }

  function renderStrip(id, nodes) {
    var strip = document.getElementById(id);
    if (!strip) return;
    if (!nodes.length) {
      strip.hidden = true;
      stripKeys[id] = '';
      return;
    }
    var group = makeEl('div', 'live-ticker-group');
    nodes.forEach(function (node) { group.appendChild(node); });
    if (!strip.hidden && group.textContent === stripKeys[id]) return;
    stripKeys[id] = group.textContent;

    var track = strip.querySelector('.live-ticker-track');
    track.textContent = '';
    track.appendChild(group);
    var clone = group.cloneNode(true);
    clone.setAttribute('data-clone', '');
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    strip.hidden = false;
    sizeStrip(strip);
  }

  function refreshStrips() {
    var now = new Date();
    var inSeason = now.getTime() >= SEASON_START && now.getTime() < SEASON_END;
    renderStrip('strip-entrenos', inSeason ? trainingItems(now).map(trainingNode) : []);
    renderStrip('strip-resultados', resultItems().map(resultNode));
  }

  refreshStrips();
  window.setInterval(refreshStrips, 30000);
  window.addEventListener('resize', sizeStrips);
  window.addEventListener('load', sizeStrips);

  /* Equipos: categorías, submenú, clasificación y partidos ------------------ */
  var TEAM_SECTIONS = [
    ['jugadores', 'Jugadores'],
    ['clasificacion', 'Clasificación'],
    ['proximo', 'Próximos partidos'],
    ['resultados', 'Resultados']
  ];

  function readBlock(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    try {
      return JSON.parse(el.textContent || '{}');
    } catch (error) {
      return null;
    }
  }

  function makeEl(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function makeButton(label, pressed, onClick) {
    var button = makeEl('button', '', label);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(pressed));
    button.addEventListener('click', onClick);
    return button;
  }

  var PLAYER_SILHOUETTE =
    '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<circle cx="32" cy="23" r="11.5"/>' +
      '<path d="M32 37c-11.6 0-21 8.4-21 18.8V64h42v-8.2C53 45.4 43.6 37 32 37Z"/>' +
    '</svg>';

  function renderPlayers(content) {
    content.appendChild(makeEl('p', 'equipos-note', 'Fotos y nombres, próximamente.'));
    var list = makeEl('ul', 'equipos-players');
    for (var i = 0; i < 6; i += 1) {
      var card = makeEl('li', 'equipos-player');
      var photo = makeEl('span', 'equipos-photo');
      photo.innerHTML = PLAYER_SILHOUETTE;
      photo.setAttribute('role', 'img');
      photo.setAttribute('aria-label', 'Foto del jugador o jugadora, pendiente');
      card.appendChild(photo);
      card.appendChild(makeEl('span', '', 'Jugador/a por confirmar'));
      list.appendChild(card);
    }
    content.appendChild(list);
  }

  function renderStandings(content, team) {
    if (!team.clasificacion || !team.clasificacion.length) {
      content.appendChild(makeEl('p', 'equipos-note', 'La clasificación todavía no está publicada.'));
      return;
    }
    var wrap = makeEl('div', 'equipos-table-wrap');
    var table = makeEl('table', 'equipos-table');
    table.appendChild(makeEl('caption', '', 'Clasificación · ' + team.competicion));
    var head = makeEl('tr');
    ['Pos.', 'Equipo', 'Pts', 'PJ', 'PG', 'PP', 'SF', 'SC'].forEach(function (label) {
      var th = makeEl('th', '', label);
      th.setAttribute('scope', 'col');
      head.appendChild(th);
    });
    var thead = makeEl('thead');
    thead.appendChild(head);
    table.appendChild(thead);

    var tbody = makeEl('tbody');
    team.clasificacion.forEach(function (row) {
      var tr = makeEl('tr', row.club ? 'is-club' : '');
      [row.pos, row.equipo, row.pts, row.pj, row.pg, row.pp, row.sf, row.sc].forEach(function (value) {
        tr.appendChild(makeEl('td', '', value));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    content.appendChild(wrap);
  }

  function renderNextMatch(content, team) {
    var matches = team.proximos && team.proximos.length ? team.proximos : (team.proximo ? [team.proximo] : []);
    if (!matches.length) {
      content.appendChild(makeEl('p', 'equipos-note', 'No hay próximo partido publicado.'));
      return;
    }
    var anyLive = matches.some(function (match) { return match.estado === 'live'; });
    content.appendChild(makeEl('p', 'equipos-kicker', anyLive ? 'En juego' : (matches.length > 1 ? 'Próximos partidos' : 'Próximo partido')));

    var list = makeEl('div', 'equipos-next');
    matches.forEach(function (match) {
      var live = match.estado === 'live';
      var item = makeEl('article', live ? 'equipos-next-item is-live' : 'equipos-next-item');
      item.appendChild(makeEl('p', 'equipos-next-date', match.fecha || 'Por confirmar'));
      item.appendChild(makeEl('h3', '', match.evento));
      if (match.competicion) item.appendChild(makeEl('p', 'equipos-meta', match.competicion));
      var venue = liveVenue(match, match.estado);
      if (venue) item.appendChild(makeEl('p', 'equipos-meta', venue.indexOf('Sede') === 0 ? venue : 'Sede: ' + venue));
      if (live && match.marcador) {
        var score = makeEl('p', 'equipos-score', match.marcador);
        if (match.puntos) score.appendChild(makeEl('small', '', 'Puntos: ' + match.puntos));
        item.appendChild(score);
      }
      list.appendChild(item);
    });
    content.appendChild(list);
  }

  function renderResults(content, team) {
    if (!team.resultados || !team.resultados.length) {
      content.appendChild(makeEl('p', 'equipos-note', 'Todavía no hay resultados publicados.'));
      return;
    }
    var list = makeEl('ul', 'equipos-list');
    team.resultados.forEach(function (match) {
      var item = makeEl('li');
      item.appendChild(makeEl('time', '', match.fecha));
      item.appendChild(makeEl('strong', '', match.evento));
      item.appendChild(makeEl('b', '', match.marcador));
      list.appendChild(item);
    });
    content.appendChild(list);
  }

  var teamsState = { category: null, variant: null, section: 'proximo' };

  function renderTeamsData(data) {
    var app = document.getElementById('equipos-app');
    var empty = document.getElementById('equipos-empty');
    var teams = data && Array.isArray(data.equipos) ? data.equipos : [];
    if (!app || !teams.length) {
      if (empty) empty.hidden = false;
      return;
    }
    stripTeams = teams;
    refreshStrips();

    var updated = document.getElementById('equipos-updated');
    if (updated && data.actualizado) updated.textContent = 'Datos de la FAV a ' + data.actualizado + '.';
    var stamp = document.getElementById('data-updated');
    if (stamp && data.actualizado) {
      stamp.textContent = 'Datos de la FAV · última actualización: ' + data.actualizado + '.';
      stamp.hidden = false;
    }

    var categories = [];
    teams.forEach(function (team) {
      if (categories.indexOf(team.categoria) === -1) categories.push(team.categoria);
    });
    if (categories.indexOf(teamsState.category) === -1) {
      teamsState.category = categories[0];
      teamsState.variant = null;
    }

    function teamsInCategory() {
      return teams.filter(function (team) { return team.categoria === teamsState.category; });
    }

    function currentTeam() {
      var inCategory = teamsInCategory();
      var match = inCategory.filter(function (team) { return team.variante === teamsState.variant; })[0];
      return match || inCategory[0];
    }

    function render() {
      var cats = document.getElementById('equipos-cats');
      var sub = document.getElementById('equipos-sub');
      var gender = document.getElementById('equipos-gender');
      var content = document.getElementById('equipos-content');
      cats.textContent = '';
      sub.textContent = '';
      gender.textContent = '';
      content.textContent = '';

      categories.forEach(function (category) {
        cats.appendChild(makeButton(category, category === teamsState.category, function () {
          teamsState.category = category;
          teamsState.variant = null;
          render();
        }));
      });

      var team = currentTeam();
      var inCategory = teamsInCategory();
      if (inCategory.length > 1) {
        inCategory.forEach(function (option) {
          gender.appendChild(makeButton(option.variante, option === team, function () {
            teamsState.variant = option.variante;
            render();
          }));
        });
      } else {
        gender.appendChild(makeEl('p', 'equipos-note', team.variante));
      }

      TEAM_SECTIONS.forEach(function (section) {
        sub.appendChild(makeButton(section[1], section[0] === teamsState.section, function () {
          teamsState.section = section[0];
          render();
        }));
      });

      if (team.nombre) content.appendChild(makeEl('p', 'equipos-kicker', team.nombre + (team.competicion ? ' · ' + team.competicion : '')));
      if (teamsState.section === 'jugadores') renderPlayers(content);
      else if (team.sinCompeticion) content.appendChild(makeEl('p', 'equipos-note', team.sinCompeticion));
      else if (teamsState.section === 'clasificacion') renderStandings(content, team);
      else if (teamsState.section === 'proximo') renderNextMatch(content, team);
      else if (teamsState.section === 'resultados') renderResults(content, team);
    }

    render();
    app.hidden = false;
  }

  function renderTeams() {
    renderTeamsData(readBlock('equipos-data'));
  }

  renderTeams();

  /* Datos frescos desde datos.json ------------------------------------------ */
  var dataSync = { version: '', busy: false, timer: 0 };

  function applyPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    var version = liveText(payload.version);
    if (!version || version === dataSync.version) return false;
    dataSync.version = version;
    if (payload.live) setLiveData(payload.live);
    if (payload.equipos) renderTeamsData(payload.equipos);
    return true;
  }

  function dataCheckDelay() {
    var now = Date.now();
    var live = liveEvents.some(function (event) { return effectiveState(event, now) === 'live'; });
    return live ? 60000 : 300000;
  }

  function scheduleDataCheck(delay) {
    window.clearTimeout(dataSync.timer);
    dataSync.timer = window.setTimeout(checkData, delay);
  }

  function checkData() {
    window.clearTimeout(dataSync.timer);
    if (document.hidden) {
      scheduleDataCheck(60000);
      return;
    }
    dataSync.busy = true;
    window.fetch('datos.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(applyPayload)
      .catch(function () { return false; })
      .then(function () {
        dataSync.busy = false;
        scheduleDataCheck(dataCheckDelay());
      });
  }

  window.__cvmfCheckData = checkData;
  window.__cvmfApply = applyPayload;

  if (window.fetch && location.protocol !== 'file:') {
    checkData();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkData();
    });
  }

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
