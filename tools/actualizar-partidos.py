#!/usr/bin/env python3
"""Actualiza solo los partidos del club desde la web de la FAV.

Uso:
    python3 tools/actualizar-partidos.py

Lee todas las competiciones de la Federación Andaluza de Voleibol, busca los
partidos del club y reescribe el bloque <script id="live-data"> de index.html.
Después regenera ABRIR-WEB-CLUB-VOLEIBOL.html. Si la FAV no responde o no
encuentra partidos, no toca nada y termina sin error.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
import html
import hashlib
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
DATOS = ROOT / "datos.json"
FAV = "https://www.favoley.net/publico/seccion.php?"
CLUB_NAMES = ["MANUEL DE FALLA", "CVMF"]
CATEGORIES = ["Sénior", "Juvenil", "Cadete", "Infantil", "Alevín", "Benjamín", "Escuela"]

def is_club(name):
    folded = fold(name)
    return any(fold(club) in folded for club in CLUB_NAMES)
DEFAULT_JORNADAS = 18


def fetch(query):
    last = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(FAV + query, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read().decode("utf-8", errors="replace")
        except Exception as error:
            last = error
            time.sleep(0.6 * (attempt + 1))
    raise last


def fold(text):
    return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().upper()


def clean(fragment):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def team_name(raw):
    name = raw.title()
    name = re.sub(r"\bClub Voleibol\b", "CV", name)
    name = re.sub(r"\bCv\b", "CV", name)
    name = re.sub(r"\bCd\b", "CD", name)
    name = re.sub(r"\bCvmf\b", "CVMF", name)
    name = re.sub(r"\b(De|Del|Y)\b", lambda m: m.group(0).lower(), name)
    return name


def category_of(title):
    folded = fold(title)
    for name in CATEGORIES:
        if fold(name) in folded:
            return name
    return ""


def groups_from(page):
    found = set()
    for group, phase in re.findall(r"grupo=(\d+)&amp;fase=(\d+)", page):
        found.add((group, phase))
    return sorted(found)


def max_jornada(page):
    numbers = [int(n) for n in re.findall(r"jornada=(\d+)", page)]
    return max(numbers) if numbers else DEFAULT_JORNADAS


def parse_matches(page, competition_id, group, phase, title, categoria, division):
    matches = []
    for block in re.findall(r'<button type="button" class="portal-comp-partido[^"]*".*?</button>', page, re.S):
        if not any(is_club(b) for b in re.findall(r"<b>(.*?)</b>", block, re.S)):
            continue
        jornada_text = clean(re.search(r"<strong>(Jornada[^<]*)</strong>", block).group(1)) if re.search(r"<strong>(Jornada[^<]*)</strong>", block) else ""
        state_match = re.search(r'<em class="estado-([a-z-]+)">', block)
        state_key = state_match.group(1) if state_match else "proximo"
        if state_key == "finalizado":
            state = "final"
        elif state_key in ("en_juego", "en-juego"):
            state = "live"
        else:
            state = "next"

        when = re.search(r'<span class="material-symbols-rounded">schedule</span>\s*<span>([^<]+)</span>', block)
        when_text = clean(when.group(1)) if when else "Sin fecha"
        date_match = re.match(r"(\d{2})-(\d{2})-(\d{4})\s*·\s*(\d{2}:\d{2})", when_text)
        fecha = f"{date_match.group(1)}/{date_match.group(2)}/{date_match.group(3)} · {date_match.group(4)}" if date_match else "Por confirmar"

        teams = []
        for team_block in re.findall(r'<span class="portal-comp-partido-equipo">(.*?)</span>\s*(?=<span class="portal-comp-partido-equipo">|<span class="portal-comp-partido-open">)', block, re.S):
            name = re.search(r"<b>(.*?)</b>", team_block, re.S)
            score = re.search(r"<strong>(.*?)</strong>", team_block, re.S)
            teams.append((
                team_name(clean(name.group(1))) if name else "",
                clean(score.group(1)) if score else "",
            ))
        if len(teams) != 2:
            continue

        (home, home_score), (away, away_score) = teams
        marcador = f"{home_score}–{away_score}" if home_score.isdigit() and away_score.isdigit() else ""
        if state == "final" and not marcador:
            state = "next"

        club_names = [name for name, _ in teams if is_club(name)]
        jornada_number = re.search(r"\d+", jornada_text)
        matches.append({
            "evento": f"{home} – {away}",
            "categoria": categoria or category_of(title),
            "competicion": f"{title} · {jornada_text}".strip(" ·"),
            "fecha": fecha,
            "marcador": marcador,
            "estado": state,
            "youtube": "",
            "fav": f"{FAV}seccion=competicion&id={competition_id}&vista=calendario&grupo={group}&fase={phase}",
            "_equipo": f"{competition_id}-{group}",
            "_genero": division,
            "_nombre": club_names[0] if club_names else "",
            "_jornada": int(jornada_number.group(0)) if jornada_number else 0,
            "_id": (re.search(r'data-id-partido="(\d+)"', block) or [None, ""])[1],
        })
    return matches


def title_of(page):
    heading = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
    text = clean(heading.group(1)) if heading else ""
    return text.title().replace(" Masculino", " masculino").replace(" Femenino", " femenino")


def page_info(page):
    category = re.search(r"<span>Categoría</span>\s*<strong>([^<]+)</strong>", page)
    division = re.search(r"<span>División</span>\s*<strong>([^<]+)</strong>", page)
    return (clean(category.group(1)) if category else "", clean(division.group(1)) if division else "")


def collect_group(competition_id, group, phase):
    base = f"seccion=competicion&id={competition_id}&vista=calendario&grupo={group}&fase={phase}"
    first = fetch(base)
    title = title_of(first)
    categoria, division = page_info(first)
    found = []
    for jornada in range(1, max_jornada(first) + 1):
        page = fetch(f"{base}&jornada={jornada}")
        found.extend(parse_matches(page, competition_id, group, phase, title, categoria, division))
    return found


def sort_key_date(text):
    match = re.match(r"(\d{2})/(\d{2})/(\d{4}) · (\d{2}):(\d{2})", text)
    if not match:
        return None
    return datetime(int(match.group(3)), int(match.group(2)), int(match.group(1)), int(match.group(4)), int(match.group(5)))


def select(matches):
    seen = set()
    unique = []
    for match in matches:
        key = (match["_equipo"], match["_nombre"], match["evento"], match["competicion"], match["fecha"])
        if key not in seen:
            seen.add(key)
            unique.append(match)

    next_by_team = {}
    for match in unique:
        if match["estado"] not in ("next", "live"):
            continue
        team = (match["_equipo"], match["_nombre"])
        if team not in next_by_team or match["_jornada"] < next_by_team[team]["_jornada"]:
            next_by_team[team] = match

    last_by_team = {}
    for match in unique:
        if match["estado"] != "final":
            continue
        when = sort_key_date(match["fecha"]) or datetime.min
        team = (match["_equipo"], match["_nombre"])
        if team not in last_by_team or when > last_by_team[team][0]:
            last_by_team[team] = (when, match)

    live = [m for m in unique if m["estado"] == "live"]
    chosen = live + [m for m in next_by_team.values() if m["estado"] != "live"] + [item[1] for item in last_by_team.values()]
    return chosen


def fetch_detail(match_id):
    last = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                f"https://www.favoley.net/publico/competicion_partido_datos.php?id={match_id}",
                headers={"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest"},
            )
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.loads(response.read().decode("utf-8", errors="replace"))
        except Exception as error:
            last = error
            time.sleep(0.6 * (attempt + 1))
    raise last


def enrich(match):
    try:
        datos = fetch_detail(match["_id"])["datos"]
    except Exception:
        return
    partido = datos["partido"]
    venue = team_name(partido.get("instalacion") or "")
    if venue:
        if partido.get("espacio"):
            venue += f" · {partido['espacio']}"
        if partido.get("localidad") and fold(partido["localidad"]) not in fold(venue):
            venue += f" ({team_name(partido['localidad'])})"
        match["sede"] = venue
    if match["estado"] == "live":
        local = partido.get("sets_local")
        visitante = partido.get("sets_visitante")
        if local is not None and visitante is not None:
            match["marcador"] = f"{local}–{visitante}"
        parciales = datos.get("parciales") or []
        if parciales:
            match["puntos"] = " · ".join(f"{p['puntos_local']}–{p['puntos_visitante']}" for p in parciales)
    hora = partido.get("hora")
    fecha = partido.get("fecha")
    if fecha and hora and match["fecha"] == "Por confirmar":
        year, month, day = fecha.split("-")
        match["fecha"] = f"{day}/{month}/{year} · {hora}"


def fetch_standings(competition_id, group, phase):
    page = fetch(f"seccion=competicion&id={competition_id}&vista=clasificacion&grupo={group}&fase={phase}")
    body = re.search(r"<tbody>(.*?)</tbody>", page, re.S)
    rows = []
    if not body:
        return rows
    for row in re.findall(r"<tr>(.*?)</tr>", body.group(1), re.S):
        cells = [clean(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) < 12:
            continue
        rows.append({
            "pos": cells[0],
            "equipo": team_name(cells[1]),
            "pts": cells[2],
            "pj": cells[3],
            "pg": cells[4],
            "pp": cells[5],
            "sf": cells[10],
            "sc": cells[11],
            "club": is_club(cells[1]),
        })
    return rows


def public(match):
    return {key: value for key, value in match.items() if not key.startswith("_")}


def event_order(event):
    state = {"live": 0, "next": 1, "final": 2}.get(event.get("estado"), 3)
    when = sort_key_date(event.get("fecha", "")) or datetime.max
    return (state, when, event.get("evento", ""), event.get("competicion", ""))


def build_teams(matches):
    groups = {}
    for match in matches:
        groups.setdefault((match["_equipo"], match["_nombre"]), []).append(match)

    teams = []
    for items in groups.values():
        first = items[0]
        ids = dict(re.findall(r"(id|grupo|fase)=(\d+)", first["fav"]))
        try:
            standings = fetch_standings(ids["id"], ids["grupo"], ids["fase"])
        except Exception:
            standings = []

        pending = sorted([m for m in items if m["estado"] in ("next", "live")], key=lambda m: m["_jornada"])
        upcoming = next_matches(pending)
        finals = sorted([m for m in items if m["estado"] == "final"],
                        key=lambda m: sort_key_date(m["fecha"]) or datetime.min, reverse=True)
        name = first["_nombre"]
        teams.append({
            "categoria": display_category(first["categoria"]),
            "genero": first["_genero"],
            "variante": variant_label(first["_genero"], name),
            "nombre": name,
            "competicion": first["competicion"].split(" · ")[0],
            "clasificacion": standings,
            "proximo": public(upcoming[0]) if upcoming else None,
            "proximos": [public(m) for m in upcoming],
            "resultados": [
                {"evento": m["evento"], "fecha": m["fecha"], "marcador": m["marcador"]}
                for m in finals[:5]
            ],
        })

    for categoria, variante in PENDING_GROUPS:
        if any(t["categoria"] == categoria and t["variante"] == variante for t in teams):
            continue
        teams.append({
            "categoria": categoria,
            "genero": "Femenino" if "Femenino" in variante else ("Mixto" if "Mixto" in variante else "Masculino"),
            "variante": variante,
            "nombre": "",
            "competicion": "",
            "clasificacion": [],
            "proximo": None,
            "resultados": [],
            "sinCompeticion": "Este grupo figura en el horario del club, pero todavía no aparece en la FAV esta temporada.",
        })

    teams.append({
        "categoria": "Escuela deportiva",
        "genero": "Mixto",
        "variante": "Escuela deportiva",
        "nombre": "",
        "competicion": "",
        "clasificacion": [],
        "proximo": None,
        "resultados": [],
        "sinCompeticion": "La escuela deportiva no compite en la FAV. Entrena en La Cigüeña; consulta los horarios.",
    })
    teams.sort(key=lambda t: (-category_rank(t["categoria"]), t["genero"] != "Masculino", t["variante"]))
    return teams


PENDING_GROUPS = [
    ("Alevín", "Femenino blanco"),
    ("Infantil", "Femenino blanco"),
    ("Sénior", "Femenino"),
    ("Sénior", "Mixto"),
]


def display_category(name):
    return "Sénior" if "SENIOR" in fold(name or "") else name


ALIASES = {
    "RENAULT HINOJOSA MARQUEZ CVMF": "Femenino oro",
}


def next_matches(pending, minimum=2):
    """Partidos de la próxima jornada; si solo hay uno, añade el siguiente."""
    if not pending:
        return []
    ordered = sorted(pending, key=lambda m: (m["_jornada"], sort_key_date(m["fecha"]) or datetime.max))
    jornada = ordered[0]["_jornada"]
    chosen = [m for m in ordered if m["_jornada"] == jornada]
    if len(chosen) < minimum:
        seen = {id(m) for m in chosen}
        for match in ordered:
            if len(chosen) >= minimum:
                break
            if id(match) not in seen:
                chosen.append(match)
                seen.add(id(match))
    chosen.sort(key=lambda m: (sort_key_date(m["fecha"]) or datetime.max, m["_jornada"], m["evento"]))
    return chosen


def variant_label(genero, name):
    folded = fold(name or "")
    if folded in ALIASES:
        return ALIASES[folded]
    color = re.search(r"\b(AZUL|BLANCO|ORO|PLATA|NEGRO|ROJO|VERDE|AMARILLO)\b", folded)
    if not color:
        return genero
    return f"{genero} {color.group(1).lower()}"


def category_rank(name):
    folded = fold(name or "")
    order = [("SENIOR", 90), ("JUNIOR", 80), ("JUVENIL", 70), ("CADETE", 60),
             ("INFANTIL", 50), ("PROMESAS", 45), ("ALEVIN", 40), ("BENJAMIN", 30), ("ESCUELA", 10)]
    for key, rank in order:
        if key in folded:
            return rank
    return 0


def write_block(source, block_id, payload):
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    # Los datos vienen de la FAV. Aunque el texto se limpia, hay que impedir que
    # un valor con «</script>» (o entidades que se conviertan en él) rompa el
    # bloque JSON y permita inyectar HTML o JavaScript en la página.
    body = (body.replace("<", "\\u003c")
                .replace("\u2028", "\\u2028")
                .replace("\u2029", "\\u2029"))
    pattern = re.compile(rf'(<script type="application/json" id="{block_id}">)(.*?)(</script>)', re.S)
    found = pattern.search(source)
    if found:
        return source[:found.start()] + found.group(1) + "\n" + body + "\n  " + found.group(3) + source[found.end():]
    anchor = re.search(r'<script type="application/json" id="live-data">.*?</script>', source, re.S)
    snippet = f'\n\n  <script type="application/json" id="{block_id}">\n{body}\n  </script>'
    return source[:anchor.end()] + snippet + source[anchor.end():]


def main():
    try:
        competitions = sorted(set(re.findall(r"seccion=competicion&amp;id=(\d+)\"", fetch("seccion=competiciones"))), key=int)
    except Exception as error:
        print(f"No se pudo leer la FAV ({error}). No se ha cambiado nada.")
        return 0
    if not competitions:
        print("La FAV no devolvió competiciones. No se ha cambiado nada.")
        return 0

    def groups_of(competition_id):
        try:
            return [(competition_id, g, p) for g, p in groups_from(fetch(f"seccion=competicion&id={competition_id}"))]
        except Exception:
            return []

    with ThreadPoolExecutor(16) as pool:
        groups = [item for result in pool.map(groups_of, competitions) for item in result]

    def collect(item):
        try:
            return collect_group(*item)
        except Exception:
            return []

    with ThreadPoolExecutor(16) as pool:
        matches = [m for result in pool.map(collect, groups) for m in result]

    selected = select(matches)
    if not selected:
        print("No se han encontrado partidos del club. No se ha cambiado nada.")
        return 0
    for match in selected:
        enrich(match)

    teams = build_teams(matches)
    events = [public(match) for match in selected]
    events.sort(key=event_order)

    source = INDEX.read_text(encoding="utf-8")
    live_found = re.search(r'<script type="application/json" id="live-data">(.*?)</script>', source, re.S)
    if not live_found:
        print("No encuentro el bloque live-data en index.html.")
        return 1

    live = json.loads(live_found.group(1))
    live["eventos"] = events

    version = hashlib.sha1(
        json.dumps({"live": live, "equipos": teams}, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()[:12]
    previous = {}
    if DATOS.exists():
        try:
            previous = json.loads(DATOS.read_text(encoding="utf-8"))
        except Exception:
            previous = {}
    if previous.get("version") == version and previous.get("actualizado"):
        stamp = previous["actualizado"]
    else:
        stamp = datetime.now().strftime("%d/%m/%Y %H:%M")

    teams_payload = {"actualizado": stamp, "equipos": teams}
    updated = write_block(source, "live-data", live)
    updated = write_block(updated, "equipos-data", teams_payload)
    datos = {"version": version, "actualizado": stamp, "live": live, "equipos": teams_payload}
    datos_body = json.dumps(datos, ensure_ascii=False, indent=2) + "\n"

    changed = False
    if updated != source:
        INDEX.write_text(updated, encoding="utf-8")
        changed = True
    if not DATOS.exists() or DATOS.read_text(encoding="utf-8") != datos_body:
        DATOS.write_text(datos_body, encoding="utf-8")
        changed = True

    if changed:
        subprocess.run([sys.executable, str(ROOT / "tools" / "build-preview.py")], check=True)
        print(f"Actualizado: {len(events)} partidos del club, {len(teams)} equipos y datos.json.")
    else:
        print("Sin cambios.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
