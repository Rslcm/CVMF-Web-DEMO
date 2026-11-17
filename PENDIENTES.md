# Pendientes del proyecto

Resumen de lo que queda abierto. Actualizado el 16/11/2026.

## 1. Datos del club que faltan (bloquean las páginas legales)

Aparecen hoy como **«pendiente de confirmar»** en la web:

| Dato | Dónde se pone | Estado |
| --- | --- | --- |
| **CIF** del club | `aviso-legal.html` («Datos del titular») y `privacidad.html` («Responsable del tratamiento») | Pendiente |
| **Domicilio social** completo (calle, número, código postal, Brenes, Sevilla) | `aviso-legal.html` y `privacidad.html` | Pendiente |
| **Número de registro** en el Registro Andaluz de Entidades Deportivas | `aviso-legal.html` («Datos del titular») | Pendiente |

Ya confirmados y en uso: **Club Voleibol Manuel de Falla**, `cvmf_brenes@hotmail.com` y `684 32 36 65`.

Al completar los tres datos, quitar también el aviso amarillo «Documento provisional» de las dos páginas.

## 2. Cambio al dominio definitivo

Ahora mismo todas las direcciones internas apuntan a la demo: `https://iawebdemos.github.io/CVMF-Web-DEMO/`. Cuando el club tenga dominio propio hay que cambiar tres cosas en **todas** las páginas:

- **`canonical`**: la dirección «oficial» de cada página. Es la que Google toma como buena; si sigue apuntando a la demo, el dominio nuevo tarda más en posicionarse y puede duplicar contenido.
- **`og:url`, `og:image` y `twitter:image`**: la dirección y la imagen que enseñan WhatsApp, Facebook o X al compartir un enlace. Si no se cambian, las tarjetas seguirán saliendo con la demo (y si la demo se borra, la imagen dejará de cargar).
- **`sitemap.xml`**: la lista de páginas que se entrega a Google. Debe llevar las direcciones nuevas.

Es un buscar y reemplazar en los 7 archivos HTML y en `sitemap.xml`; se hace en un momento cuando exista el dominio.

## 3. Contenido pendiente o aplazado

- **Torneo de vóley playa:** la página recoge las bases de 2026. Se retoma cuando llegue la fecha de la próxima edición, para actualizar fechas, precios y formulario.
- **Apadrina un balón:** tarjeta **oculta** en `index.html` (comentada, con nota) hasta nuevo aviso.
- **Temporadas:** sección **retirada pero conservada** (comentada) en `index.html`. No se ha borrado.
- **Certamen de relato corto:** solo están las bases de la tercera edición (2019/2020). Si el club facilita el palmarés o el ejemplar recopilatorio, se añaden a `iii-certamen-relato-corto.html`.

## 4. Seguridad

Revisión completa el 16/11/2026. El detalle está en **`SEGURIDAD.md`**.

- **Urgente — Worker en producción:** la versión publicada todavía permite lanzar `/run` sin autenticación. El código nuevo (con `RUN_KEY`) está en `cloudflare/worker.js`, pero **hay que volver a pegarlo en el panel de Cloudflare y añadir el secreto `RUN_KEY`**. Mientras tanto, cualquiera puede pedir actualizaciones a GitHub.
- **Hecho:** CSP y `Referrer-Policy` en las 7 páginas y en el archivo único, escape de `</script>` en los datos de la FAV, `/partido` con cabeceras seguras en el código, concurrencia del flujo, `.well-known/security.txt` y `.nojekyll`.
- **Token de Cloudflare:** el que se usó para desplegar el Worker **ya no es válido** («Invalid API Token»). Si existe otro token con caducidad de un año, revísalo en Cloudflare → Mi perfil → Tokens de API.
- **`GH_TOKEN`:** token de GitHub guardado como secreto del Worker. Rótalo cuando toque y mantenlo limitado al repositorio y a Actions.
- **Cuentas:** activar 2FA en GitHub y Cloudflare; revisar quién tiene acceso al repositorio y al Worker.
- **Rama `main`:** valorar protegerla. El flujo automático necesita poder hacer push; si se activa protección, hay que permitir ese bypass.
- **Cabeceras que GitHub Pages no deja poner** (`frame-ancestors`, `X-Content-Type-Options`, `Permissions-Policy`): se resuelven poniendo Cloudflare delante del dominio definitivo.

## 5. Aplazado a propósito

- **APK Android real** (sideload) y botón de descarga: sigue como «Próximamente».
- **Dominio propio** y analítica (solo con consentimiento).
