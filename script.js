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

  /* Equipos: categorías, submenú, clasificación y partidos ------------------ */
  var TEAM_SECTIONS = [
    ['jugadores', 'Jugadores'],
    ['clasificacion', 'Clasificación'],
    ['proximo', 'Próximo partido'],
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

  function renderPlayers(content) {
    content.appendChild(makeEl('p', 'equipos-note', 'Nombres y fotos próximamente.'));
    var list = makeEl('ul', 'equipos-players');
    for (var i = 0; i < 6; i += 1) {
      var card = makeEl('li', 'equipos-player');
      card.appendChild(makeEl('span', 'equipos-photo'));
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
    var match = team.proximo;
    if (!match) {
      content.appendChild(makeEl('p', 'equipos-note', 'No hay próximo partido publicado.'));
      return;
    }
    var live = match.estado === 'live';
    content.appendChild(makeEl('p', 'equipos-kicker', live ? 'En juego' : 'Próximo partido'));
    content.appendChild(makeEl('h3', '', match.evento));
    var meta = [match.competicion, match.fecha].filter(Boolean).join(' · ');
    content.appendChild(makeEl('p', 'equipos-meta', meta));
    var venue = liveVenue(match, match.estado);
    if (venue) content.appendChild(makeEl('p', 'equipos-meta', venue.indexOf('Sede') === 0 ? venue : 'Sede: ' + venue));
    if (live && match.marcador) {
      var score = makeEl('p', 'equipos-score', match.marcador);
      if (match.puntos) score.appendChild(makeEl('small', '', 'Puntos: ' + match.puntos));
      content.appendChild(score);
    }
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

  function renderTeams() {
    var data = readBlock('equipos-data');
    var app = document.getElementById('equipos-app');
    var empty = document.getElementById('equipos-empty');
    var teams = data && Array.isArray(data.equipos) ? data.equipos : [];
    if (!app || !teams.length) {
      if (empty) empty.hidden = false;
      return;
    }

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

    var state = { category: categories[0], variant: null, section: 'proximo' };

    function teamsInCategory() {
      return teams.filter(function (team) { return team.categoria === state.category; });
    }

    function currentTeam() {
      var inCategory = teamsInCategory();
      var match = inCategory.filter(function (team) { return team.variante === state.variant; })[0];
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
        cats.appendChild(makeButton(category, category === state.category, function () {
          state.category = category;
          state.variant = null;
          render();
        }));
      });

      var team = currentTeam();
      var inCategory = teamsInCategory();
      if (inCategory.length > 1) {
        inCategory.forEach(function (option) {
          gender.appendChild(makeButton(option.variante, option === team, function () {
            state.variant = option.variante;
            render();
          }));
        });
      } else {
        gender.appendChild(makeEl('p', 'equipos-note', team.variante));
      }

      TEAM_SECTIONS.forEach(function (section) {
        sub.appendChild(makeButton(section[1], section[0] === state.section, function () {
          state.section = section[0];
          render();
        }));
      });

      if (team.nombre) content.appendChild(makeEl('p', 'equipos-kicker', team.nombre + (team.competicion ? ' · ' + team.competicion : '')));
      if (state.section === 'jugadores') renderPlayers(content);
      else if (team.sinCompeticion) content.appendChild(makeEl('p', 'equipos-note', team.sinCompeticion));
      else if (state.section === 'clasificacion') renderStandings(content, team);
      else if (state.section === 'proximo') renderNextMatch(content, team);
      else if (state.section === 'resultados') renderResults(content, team);
    }

    render();
    app.hidden = false;
  }

  renderTeams();

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
