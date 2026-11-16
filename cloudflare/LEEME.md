# Refresco cada 5 minutos con Cloudflare

GitHub no garantiza los `schedule`: el flujo puede tardar horas o no dispararse.
Este Worker lo llama desde fuera cada 5 minutos, así que la actualización deja de
depender del cron de GitHub.

## 1. Token de GitHub (una sola vez)

1. GitHub → foto de perfil → **Settings**.
2. Menú izquierdo, al final: **Developer settings**.
3. **Personal access tokens → Fine-grained tokens → Generate new token**.
4. Nombre: `cron-cloudflare`. Caducidad: 1 año.
5. **Repository access**: *Only select repositories* → `CVMF-Web-DEMO`.
6. **Permissions → Repository permissions → Actions**: *Read and write*.
7. **Generate token** y copia el valor (`github_pat_...`). Solo se muestra una vez.

## 2. Worker en Cloudflare

1. `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Workers** →
   **Create Worker** (plantilla «Hello World»).
2. Nombre: `cvmf-cron` → **Deploy**.
3. **Edit code**: borra todo y pega el contenido de `cloudflare/worker.js` → **Deploy**.
4. **Settings → Variables and Secrets**, añade:

   | Nombre        | Tipo   | Valor                     |
   |---------------|--------|---------------------------|
   | `GH_TOKEN`    | Secret | `github_pat_...`          |
   | `GH_REPO`     | Text   | `iAWebDemos/CVMF-Web-DEMO`|
   | `GH_WORKFLOW` | Text   | `actualizar-partidos.yml` |

   Vuelve a **Deploy** para que se apliquen.

5. **Settings → Trigger Events → Cron Triggers → Add**:
   `*/5 * * * *` (cada 5 minutos, hora UTC).

## 3. Comprobar

- Abre `https://cvmf-cron.<tu-subdominio>.workers.dev/` → debe responder «worker activo».
- Abre `/run` → debe devolver `{"ok":true,"status":204}` y aparecer una ejecución
  nueva en la pestaña **Actions** del repositorio.
- El marcador en vivo queda disponible en `/partido?id=1234` con CORS abierto.
