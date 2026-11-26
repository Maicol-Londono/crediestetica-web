// Arranque de PRODUCCIÓN: no levanta el servidor si faltan las variables del CRM. PM2 debe ejecutar este archivo, no .output/ directamente.
// Local y pruebas usan `nuxt dev` o `node .output/server/index.mjs` (allí el CRM queda sin configurar a propósito).
import { reportCrmEnv } from './check-crm-env.mjs'

if (!reportCrmEnv(process.env)) process.exit(1)
await import(new URL('../.output/server/index.mjs', import.meta.url).href)
