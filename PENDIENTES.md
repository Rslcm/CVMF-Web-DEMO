# Pendientes del proyecto

Resumen de lo que queda abierto, para no perderlo entre cambios. Actualizado el 16/11/2026.

## Datos del club que faltan (bloquean las páginas legales)

Estos datos aparecen hoy como **«pendiente de confirmar»** en la web y hay que sustituirlos antes de publicar en el dominio definitivo:

| Dato | Dónde va | Estado |
| --- | --- | --- |
| **CIF** del club | `aviso-legal.html` («Datos del titular») y `privacidad.html` («Responsable del tratamiento») | Pendiente |
| **Domicilio social** completo (calle, número, código postal, Brenes, Sevilla) | `aviso-legal.html` y `privacidad.html` | Pendiente |
| **Número de registro** en el Registro Andaluz de Entidades Deportivas | `aviso-legal.html` («Datos del titular») | Pendiente |

Ya confirmados y en uso:

- **Titular:** Club Voleibol Manuel de Falla.
- **Correo:** `cvmf_brenes@hotmail.com`.
- **Teléfono:** `684 32 36 65`.

Al completar los tres datos, quitar también el aviso amarillo «Documento provisional» de ambas páginas.

## Contenido pendiente o aplazado

- **Torneo de vóley playa:** la página `torneo-voley-playa-2026.html` recoge las bases de la edición 2026 (ya disputada). Actualizar fechas, precios y formulario cuando el club publique la próxima edición.
- **Apadrina un balón:** tarjeta **oculta** en `index.html` (comentada, con nota) hasta nuevo aviso. Se conserva el enlace a la página antigua de Jimdo dentro del comentario.
- **Temporadas:** sección **retirada pero conservada** (comentada) en `index.html`. No se ha borrado.
- **Certamen de relato corto:** solo se han recuperado las bases de la tercera edición (2019/2020). Si el club facilita el palmarés o el ejemplar recopilatorio, añadirlos a `iii-certamen-relato-corto.html`.
- **Diario de Arena:** las 15 entregas están íntegras en `diario-de-arena.html`, sin las imágenes-cabecera originales.

## Antes del dominio definitivo

- Cambiar `canonical`, `og:url`, `og:image` y `twitter:image` de todas las páginas, y las URLs de `sitemap.xml`, por las del dominio real.
- Revisar que los formularios de Google (preinscripción, baja) y el documento de inscripción de Drive siguen activos.
- Revisar el texto legal con el club.
- Comprobar el flujo de GitHub Actions «Actualizar partidos» y el cron de Cloudflare.

## Aplazado a propósito

- **APK Android real** (sideload) y botón de descarga: sigue como «Próximamente».
- **Dominio propio** y analítica (solo con consentimiento).
