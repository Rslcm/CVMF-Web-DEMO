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
import json
import re
import subprocess
import sys
import unicodedata
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
FAV = "https://www.favoley.net/publico/seccion.php?"
CLUB = "MANUEL DE FALLA"
CATEGORIES = ["Sénior", "Juvenil", "Cadete", "Infantil", "Alevín", "Benjamín", "Escuela"]
DEFAULT_JORNADAS = 18


def fetch(query):
    request = urllib.request.Request(FAV + query, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read().decode("utf-8", errors="replace")


def fold(text):
    return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().upper()


def clean(fragment):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def team_name(raw):
    name = raw.title()
    name = re.sub(r"\bClub Voleibol\b", "CV", name)
    name = re.sub(r"\bCv\b", "CV", name)
    name = re.sub(r"\bCd\b", "CD", name)
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
    return found


def max_jornada(page):
    numbers = [int(n) for n in re.findall(r"jornada=(\d+)", page)]
    return max(numbers) if numbers else DEFAULT_JORNADAS


def parse_matches(page, competition_id, group, phase, title):
    matches = []
    for block in re.findall(r'<button type="button" class="portal-comp-partido[^"]*".*?</button>', page, re.S):
        if fold(CLUB) not in fold(block):
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

        category = category_of(title)
        jornada_number = re.search(r"\d+", jornada_text)
        matches.append({
            "evento": f"{home} – {away}",
            "categoria": category,
            "competicion": f"{title} · {jornada_text}".strip(" ·"),
            "fecha": fecha,
            "marcador": marcador,
            "estado": state,
            "youtube": "",
            "fav": f"{FAV}seccion=competicion&id={competition_id}&vista=calendario&grupo={group}&fase={phase}",
            "_equipo": f"{competition_id}-{group}",
            "_jornada": int(jornada_number.group(0)) if jornada_number else 0,
            "_id": (re.search(r'data-id-partido="(\d+)"', block) or [None, ""])[1],
        })
    return matches


def title_of(page):
    heading = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
    text = clean(heading.group(1)) if heading else ""
    return text.title().replace(" Masculino", " masculino").replace(" Femenino", " femenino")


def collect_group(competition_id, group, phase):
    base = f"seccion=competicion&id={competition_id}&vista=calendario&grupo={group}&fase={phase}"
    first = fetch(base)
    title = title_of(first)
    found = []
    for jornada in range(1, max_jornada(first) + 1):
        page = fetch(f"{base}&jornada={jornada}")
        found.extend(parse_matches(page, competition_id, group, phase, title))
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
        key = (match["evento"], match["competicion"], match["fecha"])
        if key not in seen:
            seen.add(key)
            unique.append(match)

    next_by_team = {}
    for match in unique:
        if match["estado"] not in ("next", "live"):
            continue
        team = match["_equipo"]
        if team not in next_by_team or match["_jornada"] < next_by_team[team]["_jornada"]:
            next_by_team[team] = match

    last_by_team = {}
    for match in unique:
        if match["estado"] != "final":
            continue
        when = sort_key_date(match["fecha"]) or datetime.min
        team = match["_equipo"]
        if team not in last_by_team or when > last_by_team[team][0]:
            last_by_team[team] = (when, match)

    live = [m for m in unique if m["estado"] == "live"]
    chosen = live + [m for m in next_by_team.values() if m["estado"] != "live"] + [item[1] for item in last_by_team.values()]
    return chosen


def fetch_detail(match_id):
    request = urllib.request.Request(
        f"https://www.favoley.net/publico/competicion_partido_datos.php?id={match_id}",
        headers={"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest"},
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


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
            "club": fold(CLUB) in fold(cells[1]),
        })
    return rows


def public(match):
    return {key: value for key, value in match.items() if not key.startswith("_")}


def build_teams(matches):
    groups = {}
    for match in matches:
        groups.setdefault(match["_equipo"], []).append(match)

    teams = []
    for items in groups.values():
        first = items[0]
        competition = first["competicion"].split(" · ")[0]
        ids = dict(re.findall(r"(id|grupo|fase)=(\d+)", first["fav"]))
        try:
            standings = fetch_standings(ids["id"], ids["grupo"], ids["fase"])
        except Exception:
            standings = []

        pending = sorted([m for m in items if m["estado"] in ("next", "live")], key=lambda m: m["_jornada"])
        finals = sorted([m for m in items if m["estado"] == "final"],
                        key=lambda m: sort_key_date(m["fecha"]) or datetime.min, reverse=True)

        teams.append({
            "categoria": first["categoria"],
            "genero": "Femenino" if "FEMENINO" in fold(competition) else "Masculino",
            "competicion": competition,
            "clasificacion": standings,
            "proximo": public(pending[0]) if pending else None,
            "resultados": [
                {"evento": m["evento"], "fecha": m["fecha"], "marcador": m["marcador"]}
                for m in finals[:5]
            ],
        })

    teams.sort(key=lambda t: (-category_rank(t["categoria"]), t["genero"] != "Masculino"))
    return teams


def category_rank(name):
    order = ["Sénior", "Juvenil", "Cadete", "Infantil", "Alevín", "Benjamín", "Escuela"]
    return len(order) - order.index(name) if name in order else 0


def write_block(source, block_id, payload):
    body = json.dumps(payload, ensure_ascii=False, indent=2)
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

    source = INDEX.read_text(encoding="utf-8")
    live_found = re.search(r'<script type="application/json" id="live-data">(.*?)</script>', source, re.S)
    if not live_found:
        print("No encuentro el bloque live-data en index.html.")
        return 1

    live = json.loads(live_found.group(1))
    live["eventos"] = events
    updated = write_block(source, "live-data", live)
    updated = write_block(updated, "equipos-data", {
        "actualizado": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "equipos": teams,
    })

    if updated != source:
        INDEX.write_text(updated, encoding="utf-8")
        subprocess.run([sys.executable, str(ROOT / "tools" / "build-preview.py")], check=True)
        print(f"Actualizado: {len(events)} partidos del club y {len(teams)} equipos.")
    else:
        print("Sin cambios.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
