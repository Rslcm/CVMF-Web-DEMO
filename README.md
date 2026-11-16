# Club Voleibol Manuel de Falla — rediseño web

Rediseño estático y responsive de la web del **Club Voleibol Manuel de Falla** (Brenes, Sevilla), hecho a partir del contenido público de [cvmanueldefalla.jimdofree.com](https://cvmanueldefalla.jimdofree.com/).

La web original de Jimdo no se ha modificado. Esta carpeta contiene una versión nueva, lista para revisar y publicar.

> Esta carpeta está **separada** del resto de proyectos. No tiene relación con el panel PlexDesk ni con MardelShop.

## Ver la web en local

**La forma más fácil:** haz doble clic en `ABRIR-WEB-CLUB-VOLEIBOL.html`.

Ese archivo es una versión autocontenida: lleva dentro el CSS, el JavaScript y el favicon, así que se abre con estilos aunque lo muevas de sitio o no tengas servidor. Solo las tipografías (Barlow Condensed e Inter) se descargan de Google Fonts; sin conexión se usan las del sistema.

Si prefieres ver la versión de producción (la que se publica):

```bash
cd "/Users/ivanmartin/Documents/Club-Voleibol-Manuel-de-Falla"
python3 -m http.server 8000
```

Abre <http://localhost:8000> en el navegador. No necesita instalación ni build.

Vista rápida sin arrancar nada:

- `preview/desktop.png` — portada con la tira de resultados y la franja de temporada.
- `preview/mobile.png` — portada en móvil.
- `preview/directo.png` — sección «Directo» con el botón del evento y el reproductor de nivel 2.

## Qué incluye

- `index.html` — página completa: inicio, preinscripción, horarios, cuotas, actualidad, club, temporadas, redes y contacto.
- `ABRIR-WEB-CLUB-VOLEIBOL.html` — la misma página en un solo archivo, para verla con doble clic.
- `styles.css` — diseño responsive, paleta azul/amarillo/blanco, tipografía, animaciones y estilos de impresión.
- `script.js` — menú móvil, scrollspy, animaciones de aparición, botón «volver arriba» y la tira de resultados/directo.
- `assets/` — favicon y tarjeta para redes (`og-image.jpg`).
- `assets/originales/` — carteles e iconos originales del club. **La web no los carga**; se guardan solo como referencia.
- `tools/build-preview.py` — regenera `ABRIR-WEB-CLUB-VOLEIBOL.html` a partir de `index.html`, `styles.css` y `script.js`.
- `tools/og-image.html` — fuente de la tarjeta `assets/og-image.jpg`, con el escudo y el lema del 50 aniversario.
- **Tira de resultados** en movimiento sobre la franja amarilla del inicio, generada desde un bloque de datos editable.
- Sección **«Directo y resultados»** (`#directo`): botón de YouTube con el nombre del evento, enlace a la FAV y reproductor de nivel 2 que solo carga el vídeo al pulsar.
- Enlaces reales a formularios, documento de inscripción, baja, redes sociales y archivo de temporadas.

## Horarios y cuotas, sin carteles

Los horarios y las cuotas eran imágenes en la web original. Ahora están construidos en HTML:

- Una tabla con los **13 grupos** de la temporada 2026/2027, sus días, franjas y la nota de «+30 min fuera de pista».
- Cuatro tarjetas con matrícula, entrenamiento, competición y forma de pago (IBAN y pago con tarjeta).
- En móvil la tabla se convierte en fichas por grupo, sin scroll horizontal.

Los datos se han copiado de los carteles oficiales publicados por el club; no se ha inventado ninguna cifra.

## Escudo y paleta

El escudo es un SVG vectorial dibujado de nuevo a partir del emblema histórico del club. No es una reinterpretación libre: se ha medido el original píxel a píxel para respetar su silueta, sus colores, su dibujo y sus textos.

- Silueta de escudo con la parte superior plana, los hombros abombados y una punta inferior larga.
- Triple borde: filo casi negro, franja dorada y filo interior oscuro; campo interior blanco.
- Dos paneles superiores inclinados con marco dorado y filo oscuro: balón blanco a la izquierda y monograma `CV` / `MF` a la derecha, en blanco con contorno oscuro.
- Gran `V` azul con cuatro franjas blancas inclinadas y filo dorado.
- Cinta azul con `BRENES` rematada en dorado cerca de la base.

El dibujo vive una sola vez en `index.html` como `<symbol id="club-crest">` y se reutiliza con `<use>` en la cabecera, el pie y el héroe. El favicon (`assets/favicon.svg`) es una versión simplificada del mismo escudo, sin los textos pequeños, para que se lea a tamaño de pestaña.

La portada es **crest-first**: el escudo es el elemento dominante del héroe, con un halo azul y dorado y el sello del 50 aniversario anclado a su hombro superior derecho. Debajo, la temporada `2026/2027` ocupa una franja compacta (temporada, equipos y enlace a inscripciones) en lugar de una tarjeta grande. En móvil y tableta el escudo pasa delante del texto, de modo que lo primero que se ve al abrir la web es el emblema.

Colores del escudo:

| Color | Uso |
| --- | --- |
| Azul eléctrico `#001ff3` | Paneles, `V` y cinta |
| Dorado `#e3b154` | Bordes, marcos y filo de la `V` |
| Casi negro `#0d0000` | Filo exterior e interior, contornos de textos |
| Blanco `#ffffff` | Campo interior y balón |

Paleta de la web (azul, amarillo y blanco, en armonía con el escudo):

| Color | Uso |
| --- | --- |
| Azul marino `#0a2a66` / `#061a3d` | Fondos, cabecera, pie y bloques destacados |
| Azul `#123c8c` | Enlaces, cifras y botones principales |
| Amarillo `#f5c400` | Acentos, CTA y datos destacados |
| Blanco `#ffffff` | Superficies y texto sobre azul |

## Directo y resultados

### Actualización automática (sin tocar nada a mano)

`tools/actualizar-partidos.py` lee la web de la FAV, busca todos los partidos del Club Voleibol Manuel de Falla (todos los equipos y categorías), reescribe el bloque `#live-data` de `index.html` y regenera `ABRIR-WEB-CLUB-VOLEIBOL.html`:

- **Próximo partido de cada equipo**, con su fecha y hora cuando la FAV la publique (si no, «Por confirmar»).
- **Último resultado de cada equipo**, con el marcador por sets.
- Si la FAV no responde, no cambia nada.

Para ejecutarlo a mano: `python3 tools/actualizar-partidos.py`.

Para que se ejecute solo cada hora, `.github/workflows/actualizar-partidos.yml` hace lo siguiente en GitHub:

1. Sube la carpeta a un repositorio de GitHub (una sola vez).
2. Activa **Settings → Pages** desde la rama principal, carpeta raíz.
3. Activa **Settings → Actions → General → Workflow permissions → Read and write permissions**.

Desde ese momento, la web se actualiza sola cada hora. El cambio a «Directo» al empezar un partido también es automático.

Todo se alimenta de un único bloque de datos en `index.html` (`<script type="application/json" id="live-data">`), sin API, sin clave y sin dependencias externas:

- **Orden de la tira:** primero los directos, luego los próximos partidos y al final los resultados. Dentro de cada grupo:
  - **Con fecha:** por fecha (próximos de más cercano a más lejano; resultados del más reciente al más antiguo).
  - **Sin fecha («Por confirmar»):** por categoría, de mayor a menor (Sénior, Juvenil, Cadete, Infantil, Alevín, Benjamín, Escuela). Los partidos con fecha van antes que los que no la tienen.
- **Cambio automático a directo:** no hace falta editar nada al empezar el partido. Si `estado` es `next` y `fecha` tiene formato `DD/MM/AAAA · HH:MM`, la web pasa sola a «Directo» a esa hora y lo mantiene 3 horas. Después cambia a resultado. La página se refresca cada 30 segundos. Usa la hora del dispositivo de quien visita la web, que en Brenes es la de España.
- **Botón de YouTube:** `Próximo directo · Categoría` antes del partido, `Directo · Categoría` durante el partido (con el marcador por sets) y `Repetición` o `Resultado` después. La portada muestra el partido en juego si lo hay; si no, el próximo. Mientras no haya un ID de vídeo, el botón lleva al canal, donde aparece la emisión cuando está activa.
- **Tira de resultados:** aparece en el inicio, justo encima de la franja amarilla. Se mueve en bucle, se pausa al pasar el ratón o al enfocar y tiene botón de pausa. Con `prefers-reduced-motion` se queda quieta y se puede desplazar a mano. Si `eventos` está vacío, la tira desaparece y los botones vuelven a su texto genérico.
- **Botón de YouTube:** muestra el nombre del evento y `EN DIRECTO` cuando el primer evento tiene `estado: "live"`; con `next` muestra `PRÓXIMO`; con `final`, `REPETICIÓN` (o `RESULTADO` si no hay vídeo). El mismo dato actualiza la tarjeta de `#directo`.
- **Nivel 1 (sin vídeo incrustado):** enlace a `https://www.youtube.com/@cvmf_brenes/live` y a la página de directos de la FAV. La página no carga vídeo ni cookies de terceros.
- **Nivel 2 (prueba):** reproductor de YouTube que solo se carga al pulsar el botón, usando `youtube-nocookie.com`. Hasta ese clic no hay petición al vídeo. Si el evento no tiene `youtube`, el reproductor no se muestra.

### Cambiar el partido de la tira

Edita solo el bloque `#live-data` de `index.html`. Cada evento admite estos campos:

| Campo | Obligatorio | Contenido |
| --- | --- | --- |
| `evento` | Sí | Nombre del partido, por ejemplo `CV Manuel de Falla – CV Linares`. Es el texto del botón de YouTube y de la tira. |
| `categoria` | No | Categoría del equipo (`Sénior`, `Juvenil`, `Cadete`…). Sale en el botón y sirve para ordenar los partidos sin fecha. |
| `sede` | No | Pabellón del partido, tomado de la FAV. Si está vacío y el partido es próximo, se muestra «Sede por confirmar». |
| `competicion` | No | Competición que aparece junto al evento. |
| `fecha` | No | Fecha y hora en texto, por ejemplo `22/11/2026 · 12:30`. |
| `marcador` | No | Marcador si ya existe (`3–1`). Déjalo vacío mientras no haya resultado. |
| `estado` | Sí | `live` (en directo), `next` (próximo) o `final` (terminado). |
| `youtube` | No | Los 11 caracteres del ID del vídeo, no la URL completa. Se saca de `watch?v=ID` o de `youtu.be/ID`. |
| `fav` | No | Enlace de respaldo de la FAV para ese partido. |
| `ejemplo` | No | `true` muestra la etiqueta `EJEMPLO` y el aviso de prueba. Quítalo o pon `false` con datos reales. |

Ejemplo de un partido en directo:

```json
{
  "evento": "CV Manuel de Falla – CV Linares",
  "competicion": "Tercera División Andaluza Femenina",
  "fecha": "22/11/2026 · 12:30",
  "marcador": "",
  "estado": "live",
  "youtube": "y3Y2X_C9ka8",
  "fav": "https://www.favoley.net/publico/seccion.php?seccion=directos"
}
```

Para emitir otro partido hay que cambiar el `evento` y el `youtube` a mano. Una emisión nueva es un ID nuevo.

### Qué automatiza el nivel 2 y qué no

- **Por vídeo (lo implementado):** el embed usa el ID de cada emisión. Es fiable, no muestra un reproductor vacío y no carga nada hasta el clic, pero exige editar el ID en cada partido.
- **Por canal (alternativa):** `https://www.youtube.com/embed/live_stream?channel=UC…` sigue automáticamente lo que esté en directo en el canal, sin editar nada. Necesita el ID de canal (`UC…`), que no se pudo resolver desde el entorno de desarrollo porque YouTube no era accesible, y cuando no hay directo muestra un reproductor con el estado «sin conexión».
- **Recomendación:** mantener el ID por partido para los encuentros del club y, si más adelante se quiere automatizar, añadir el ID de canal como modo alternativo.

**Datos actuales (sacados de la FAV el 15/11/2026):**

- Próximos: Juvenil masculino J6 y Cadete masculino J7, ambos contra CV Alcores. La FAV los tiene **sin fecha** («Por confirmar»). Cuando la FAV publique día y hora, cambia `fecha` por `DD/MM/AAAA · HH:MM`.
- Resultados: Juvenil 3–0 Kairós Turquesa y Cadete 0–3 Kairós (07/11/2026). Son los dos últimos partidos del club.

Como ningún partido tiene vídeo en directo ahora, no hay reproductor de nivel 2 activo. Para probarlo, pon el ID de YouTube (`youtube`) en un evento con `estado: "live"`.

Estos datos no se editan a mano: los rellena `tools/actualizar-partidos.py` (ver «Actualización automática»).


### Regenerar la tarjeta para redes

`assets/og-image.jpg` se genera a partir de `tools/og-image.html` con Chrome en modo headless:

```bash
cd "/Users/ivanmartin/Documents/Club-Voleibol-Manuel-de-Falla"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1200,630 --force-device-scale-factor=1 \
  --virtual-time-budget=6000 \
  --screenshot=assets/og-image.jpg "file://$PWD/tools/og-image.html"
```

Chrome deduce el formato JPEG de la extensión del archivo, así que no hace falta convertir nada después. Comprueba el resultado con `file assets/og-image.jpg`: debe decir `JPEG image data … 1200x630`. Conviene repetirlo si cambia el escudo, el lema o los colores.

## Publicar

### Opción rápida: Netlify Drop

1. Entra en <https://app.netlify.com/drop>.
2. Arrastra la carpeta `Club-Voleibol-Manuel-de-Falla` completa.
3. Netlify te dará una URL provisional. Desde ahí puedes conectar un dominio propio.

### GitHub Pages

1. Sube el contenido de `Club-Voleibol-Manuel-de-Falla` a un repositorio.
2. En *Settings → Pages*, publica desde la rama principal (carpeta raíz).
3. Configura el dominio en *Custom domain*.

### Vercel

1. Importa el repositorio en <https://vercel.com/new>.
2. Framework preset: **Other**.
3. Sin build command ni output directory.

## Checklist antes de publicar

- [ ] Cambiar `canonical`, `og:url`, `og:image` y `twitter:image` en `index.html` por las URLs absolutas del dominio definitivo.
- [ ] Revisar que los enlaces de Google Forms y Google Drive siguen activos.
- [ ] Comprobar que `https://www.youtube.com/@cvmf_brenes/live` y la página de directos de la FAV responden.
- [ ] Comprobar que el flujo «Actualizar partidos» de GitHub Actions se ejecuta (pestaña Actions) y que el repositorio tiene Pages activado.
- [ ] Probar el reproductor de nivel 2 en un equipo con acceso a YouTube: debe cargar solo al pulsar y abrir `youtube-nocookie.com`.
- [ ] Confirmar cuotas, horarios y fechas de la temporada 2026/2027.
- [ ] Revisar aviso legal y política de privacidad (ahora enlazan a las páginas de Jimdo).
- [ ] Decidir si se mantiene el correo `cvmf_brenes@hotmail.com` como contacto público.
- [ ] Añadir analítica solo si se necesita (GA4, Plausible, etc.) y con consentimiento.
- [ ] (Más adelante) Sección «Equipos» con foto y nombre: hay 13 grupos, pero todavía no hay fotos de equipo en `assets/originales/`.
- [ ] Regenerar `ABRIR-WEB-CLUB-VOLEIBOL.html` con `python3 tools/build-preview.py` después de cualquier cambio.
- [ ] Regenerar `assets/og-image.jpg` con las instrucciones de «Escudo y paleta» si cambia el escudo o el lema.

## Notas

- Los horarios y las cuotas están tomados de los carteles oficiales 2026/2027 del club.
- El archivo de temporadas enlaza a las páginas originales de Jimdo para no perder el histórico.
- Los enlaces legales siguen apuntando a Jimdo hasta que se redacten páginas propias.
- El texto de autorización de imagen se ha mantenido literalmente.
- La web no usa imágenes para precios ni horarios: todo el contenido clave es texto real, indexable y accesible.
- La tabla de horarios ya contiene los **13 grupos** reales. Una sección «Equipos» puede generarse desde esa misma lista (nombre + foto), pero en `assets/originales/` no hay fotos de equipo; hasta que las haya, se pueden usar miniaturas con monograma.
- El entorno de desarrollo no tiene acceso a YouTube, así que el ID de canal y la reproducción del vídeo deben confirmarse en un equipo con acceso antes de publicar.
- Los carteles originales se conservan en `assets/originales/` solo como referencia; no se cargan en la página.

## Si se sigue usando Jimdo

Jimdo Creator (plan gratuito) no permite aplicar este diseño tal cual. Si no se quiere cambiar de plataforma, en `MEJORAS.md` hay una lista de cambios que sí se pueden aplicar desde el editor de Jimdo para mejorar la web actual.
