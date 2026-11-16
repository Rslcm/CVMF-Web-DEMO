# Mejoras aplicadas y recomendaciones

## 1. Diagnóstico de la web original

Revisando el HTML público de `cvmanueldefalla.jimdofree.com` se detectan estos puntos:

### Diseño y experiencia de usuario

- **No es responsive.** El propio HTML declara `"isTemplateResponsive": false` y el diseño está fijado a 850 px. En móvil se ve una versión de escritorio reducida.
- **Navegación sobrecargada.** Hay 18 enlaces de primer nivel: 13 temporadas (2013/14 a 2025/26), COVID, Diario de Arena, Certamen, Apadrina un balón… sin jerarquía ni temporada actual destacada.
- **La acción principal no destaca.** La preinscripción compite con carteles, avisos, botones repetidos y contenido de temporadas anteriores.
- **Información importante solo en imágenes.** Horarios y cuotas están dentro de carteles: no se pueden leer bien en móvil, no se indexan y no son accesibles.
- **Tipografía y estilos mezclados.** Textos con `MV Boli`, párrafos centrados, tamaños de 12 px, separadores y estilos en línea.
- **Contacto escondido al final.** El email está ofuscado con Cloudflare y el teléfono no es un enlace `tel:`.

### Accesibilidad

- La mayoría de imágenes no tienen `alt`.
- La información de horarios y precios depende de imágenes.
- No hay enlace para saltar al contenido ni estilos de foco visibles.
- Textos rojos pequeños sobre blanco y avisos legales a 12 px.
- Los iconos de redes son imágenes de 90 × 90 sin etiqueta textual.

### Rendimiento y SEO

- Plantilla antigua con jQuery, varios CSS/JS de Jimdo, control de cookies y analítica.
- **Google Analytics Universal** (`UA-46149594-3`): Universal Analytics dejó de procesar datos en 2023. Esa analítica ya no sirve.
- Imágenes muy pesadas (el cartel de preinscripción original pesa 789 KB) y sin `width`/`height`.
- Descripciones vacías en páginas interiores, título largo y repetitivo, sin datos estructurados.
- URL `og:url` en `http://`, aunque la canónica es `https://`.

### Contenido y legal

- La página **INFO COVID19** sigue en el menú principal años después.
- En el pie aparecen enlaces de tienda (`Garantía legal`, `Retirar contrato`) que no aportan en una web deportiva sin tienda.
- El aviso de autorización de imagen existe, pero está enterrado y en letra pequeña roja.
- La web vive en un subdominio `jimdofree.com` con publicidad de Jimdo en el pie.

---

## 2. Qué mejora el rediseño

| Área | Antes | Ahora |
| --- | --- | --- |
| Móvil | Diseño fijo de 850 px | Responsive real de 320 px a 1440 px, con menú móvil |
| Navegación | 18 enlaces planos | 6 secciones claras + CTA de preinscripción |
| Preinscripción | Repetida entre carteles | Sección propia con pasos, formulario, documento y baja |
| Horarios / cuotas | Solo imagen | Tabla HTML con los 13 grupos y tarjetas de cuotas, legibles y accesibles |
| Temporadas | 13 enlaces en el menú | Archivo agrupado, sin perder ninguna temporada |
| Tipografía | MV Boli + estilos inline | Barlow Condensed + Inter, escala coherente |
| Accesibilidad | Sin alt, foco ni skip link | Alt, foco visible, etiquetas ARIA, `prefers-reduced-motion` |
| SEO | Sin datos estructurados | `SportsClub` JSON-LD, title/description únicos, Open Graph |
| Rendimiento | jQuery, analítica muerta, imágenes grandes | HTML/CSS/JS estático, sin imágenes en la página y sin dependencias |
| Legal | Textos pequeños y enlaces de tienda | Autorización legible + enlaces legales en el pie |
| Dominio | Subdominio con publicidad | Listo para dominio propio en Netlify, Vercel o GitHub Pages |

### Detalles técnicos

- **HTML semántico**: `header`, `nav`, `main`, `section`, `footer`, encabezados jerárquicos y `lang="es"`.
- **CSS moderno**: variables, Grid/Flexbox, `clamp()`, `scroll-margin-top`, `scrollbar-gutter`, estilos de impresión.
- **JavaScript sin dependencias**: menú móvil, scrollspy, revelado progresivo y botón "volver arriba".
- **Red de seguridad**: si el observador de animaciones no responde, el contenido se muestra igualmente a los 3,5 s. Si `script.js` fallara, se retira la clase que oculta los bloques.
- **Sin imágenes de carteles**: horarios y cuotas se construyen con HTML y CSS. La tabla de horarios se convierte en fichas por grupo en móvil y las cuotas se reparten en cuatro tarjetas.
- **Escudo redibujado en SVG**: insignia circular inspirada en el avatar del club, con paleta azul marino, amarillo y blanco. Se usa en cabecera, pie y favicon sin cargar ningún archivo de imagen.
- **Enlaces reales**: formulario de preinscripción, documento de Drive, formulario de baja, redes sociales y archivo de temporadas.

---

## 3. Si se mantiene Jimdo

Jimdo Creator gratis no permite aplicar este diseño tal cual. Estos cambios sí se pueden hacer desde el editor:

1. **Cambiar a una plantilla responsive** y elegir una paleta azul, amarilla y blanca coherente con el escudo.
2. **Simplificar el menú**: Inicio · Preinscripción · Horarios · Cuotas · El club · Temporadas (submenú) · Contacto.
3. **Sacar la preinscripción arriba** y dejar un único botón claro al formulario.
4. **Pasar la información clave a texto**: horarios, categorías, cuotas y fechas. Los carteles pueden quedar como apoyo, no como única fuente.
5. **Hacer legible el aviso de imagen**: texto normal, párrafo desplegable o página propia.
6. **Añadir texto alternativo** a todas las imágenes y evitar frases como “PULSA PARA DESCARGAR” en mayúsculas.
7. **Optimizar imágenes** antes de subirlas (1200 px de ancho máximo, JPG/WebP de 150–250 KB).
8. **Poner el contacto en el pie** con enlaces `mailto:` y `tel:` y botones de redes con texto.
9. **Archivar COVID19** y las temporadas antiguas dentro de “Temporadas”.
10. **Quitar los enlaces de tienda** (`Garantía legal`, `Retirar contrato`) si no hay tienda.
11. **Sustituir Universal Analytics** por GA4 o eliminarlo. Si se usa analítica, mantener el consentimiento de cookies.
12. **Revisar el aviso legal y la privacidad** y actualizar el correo de contacto.
13. **Valorar un dominio propio** y una plataforma sin publicidad. La versión de esta carpeta se puede publicar gratis en Netlify, Vercel o GitHub Pages.

---

## 4. Contenido pendiente de confirmar

Antes de publicar, conviene validar con el club:

- Fechas exactas de la temporada 2026/2027 y días de entrenamiento.
- Cuotas de competición para otras categorías y competiciones no federadas (el cartel las deja «por determinar»).
- Dirección exacta del Pabellón Municipal y horario de oficina, si se quiere mostrar.
- Correo y teléfono definitivos.
- Enlaces de Forms/Drive vigentes.
- Fotos reales del club para dar vida a la portada y a la sección «El club».
- Textos legales propios (aviso legal y privacidad) si se abandona Jimdo.

---

## 5. Lo que no se ha inventado

- No se han añadido resultados deportivos, categorías ni cifras que no aparezcan en la web original.
- “50 años” se deduce de la fundación en 1976 y la temporada 2026/2027.
- “13 grupos y equipos” sale de las 13 filas del cartel de horarios 2026/2027.
- La matrícula de 20 € y su vigencia (septiembre 2026 – agosto 2027, voleibol y vóley playa) están tomadas del cartel de conceptos de pago.
- Las cuotas de entrenamiento (20 € / 22 € al mes) y de competición (50, 70, 100 y 120 €) se han copiado del cartel oficial, incluida la tabla de 1ª Andaluza.
- El IBAN, el concepto de pago y la opción de tarjeta en el pabellón están tomados literalmente del cartel.
- El escudo es una reinterpretación del avatar del club: se mantienen sus elementos (CVMF, voleibol, Brenes, 1976) y se añade el amarillo que pide la identidad visual.
- El texto de autorización de imagen se ha copiado literalmente.
