# Revisión de seguridad

Fecha: 16/11/2026. Ámbito: web publicada en `https://iawebdemos.github.io/CVMF-Web-DEMO/`, archivo único `ABRIR-WEB-CLUB-VOLEIBOL.html`, Worker de Cloudflare y flujo de GitHub Actions.

## Resumen

La web es **estática**: no hay formularios propios, ni base de datos, ni usuarios, ni cookies. Eso deja muy poca superficie de ataque. Los formularios de preinscripción y baja son de Google, y no se recibe nada en el servidor del club.

La revisión ha encontrado **un punto serio** (el Worker publicado permite lanzar actualizaciones sin autenticación) y **un punto de integridad** (los textos que llegan de la FAV podían romper el bloque de datos e inyectar código). El resto son mejoras de defensa en profundidad.

## Lo que se ha corregido

1. **Inyección en los datos de la FAV (XSS almacenado potencial).**
   El generador copia nombres de equipos, sedes y competiciones desde `favoley.net` dentro de `index.html`. Si uno de esos textos llegaba con `</script>` (incluso camuflado como `&lt;/script&gt;`), podía cerrar el bloque JSON y colar HTML o JavaScript. Ahora se escapa `<` como `\u003c` antes de escribir el bloque, así que el JSON sigue siendo válido pero no puede cerrar la etiqueta. También se escapan los separadores Unicode `U+2028` y `U+2029`.

2. **Política de seguridad de contenido (CSP).**
   Añadida en las 7 páginas y adaptada al archivo único. Solo permite:
   - scripts propios (el pequeño script inicial va autorizado por su hash exacto),
   - estilos propios y Google Fonts,
   - tipografías de `fonts.gstatic.com`,
   - imágenes propias y `data:`,
   - el reproductor `youtube-nocookie.com`,
   - conexiones al propio sitio y a Google Fonts.
   Todo lo demás (scripts de terceros, `eval`, plugins, formularios externos, `base` manipulada) queda bloqueado. `object-src 'none'`, `base-uri 'self'` y `form-action 'none'`.

3. **Política de referrer.**
   `strict-origin-when-cross-origin` en todas las páginas: al salir a otro sitio no se envía la ruta completa visitada.

4. **Worker: `/run` cerrado con clave.**
   Antes cualquiera podía llamar a `/run` y hacer que el Worker lanzase el flujo de GitHub. Ahora exige `POST` y la cabecera `Authorization: Bearer <RUN_KEY>`; si no existe `RUN_KEY`, responde `401`. La comparación es en tiempo constante. El cron interno no cambia.

5. **Worker: cabeceras en `/partido`.**
   Añadidos `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y una CSP de bloqueo (`default-src 'none'; sandbox`) a la respuesta del proxy. También se rechazan métodos distintos de `GET` y se mantiene la validación del `id` (solo dígitos, máximo 9).

6. **Flujo de GitHub.**
   Añadidos `concurrency` (evita dos ejecuciones solapadas) y `timeout-minutes: 20`. Los permisos siguen siendo los mínimos necesarios: `contents: write`.

7. **`security.txt`.**
   Publicado en `/.well-known/security.txt` con el correo del club para avisos de seguridad. Se ha añadido `.nojekyll` para que GitHub Pages sirva esa carpeta.

## Lo que ya estaba bien

- No hay `target="_blank"` sin `rel="noopener"`.
- No hay enlaces `http://` ni contenido mixto.
- No hay `eval`, `new Function`, `document.write` ni manejadores `onclick="..."`.
- Los datos de `datos.json` se pintan con `textContent`, nunca con `innerHTML`. El único `innerHTML` es la silueta SVG, que es una constante del propio código.
- Las direcciones que vienen de datos se validan: solo `https://` y el identificador de YouTube con formato estricto.
- El reproductor de YouTube solo se carga al pulsar y usa `youtube-nocookie.com`.
- No hay cookies, ni analítica, ni píxeles de seguimiento.
- El repositorio es público, pero **no contiene tokens ni claves** en el código ni en el historial de Git.
- GitHub Pages sirve siempre por HTTPS y envía HSTS de un año; `http://` redirige con 301.
- Los formularios son enlaces a Google Forms: la web no recibe ni almacena datos personales.

## Riesgos que quedan

1. **Worker publicado sin el cambio (prioridad alta).**
   El código del repositorio ya está cerrado, pero la versión que corre en Cloudflare es la anterior: `/run` responde sin pedir clave. Hay que volver a pegar `cloudflare/worker.js` en el panel y añadir el secreto `RUN_KEY`. Mientras no se haga, alguien podría pedir actualizaciones repetidas (no podría cambiar el contenido, pero sí gastar recursos y llenar el historial de ejecuciones).

2. **Clickjacking.**
   GitHub Pages no permite enviar `X-Frame-Options` ni `frame-ancestors` desde una metaetiqueta. La web podría incrustarse en otro sitio. El riesgo es bajo (no hay acciones sensibles), pero se corrige del todo poniendo Cloudflare delante del dominio.

3. **Cabeceras de servidor.**
   `X-Content-Type-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` y `frame-ancestors` necesitan servidor propio o Cloudflare. No se pueden poner solo con HTML.

4. **Dependencias de GitHub Actions.**
   `actions/checkout@v4` y `actions/setup-python@v5` van por etiqueta, no por SHA. Es lo habitual, pero fijarlas por SHA elimina el riesgo de que una etiqueta se mueva.

5. **Google Fonts.**
   Cada visita pide las tipografías a Google, que recibe la IP. Está explicado en la política de privacidad. Si se quiere eliminar esa dependencia, se pueden descargar las fuentes y servirlas desde el propio sitio.

6. **La FAV como fuente externa.**
   Si la web de la federación se compromete, lo máximo que puede hacer es cambiar textos y resultados (ya escapados). No puede ejecutar código.

7. **Cuentas y accesos.**
   La seguridad real depende de GitHub y Cloudflare: 2FA, colaboradores y tokens. No se puede comprobar desde el código.

## Cómo desplegar el Worker actualizado

1. Cloudflare → **Workers & Pages** → `cvmf-cron` → **Edit code**.
2. Borrar todo y pegar el contenido actual de `cloudflare/worker.js` → **Deploy**.
3. **Settings → Variables and Secrets** → añadir `RUN_KEY` como **Secret** con una clave larga (`openssl rand -hex 32`).
4. Volver a **Deploy**.
5. Comprobar:
   - `curl -X POST https://cvmf-cron.ivan-martin-martinez.workers.dev/run` → debe dar `401`.
   - `curl -X POST -H "Authorization: Bearer LA_CLAVE" .../run` → debe dar `{"ok":true,"status":204}`.
   - El cron debe seguir actualizando cada 5 minutos.

## Recomendaciones

- Activar 2FA en GitHub y Cloudflare y revisar quién tiene acceso.
- Proteger la rama `main` permitiendo el push del flujo automático.
- Rotar `GH_TOKEN` y `RUN_KEY` una vez al año.
- Poner Cloudflare delante del dominio definitivo para añadir HSTS, `frame-ancestors`, `nosniff` y limitación de peticiones.
- Guardar una copia del repositorio fuera de GitHub (el historial de Git ya sirve como copia, pero conviene un clon periódico).
- Revisar las dependencias de Actions de vez en cuando.
