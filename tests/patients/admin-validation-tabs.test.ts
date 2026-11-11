// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Validación del formulario «Nuestros Pacientes»: un error en otra pestaña abre esa pestaña (antes el aviso aparecía sin mostrar la fila
// vacía de «Videos» mientras se editaba «Antes y después») y el enlace de Instagram con parámetros de seguimiento es válido.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const page = readFileSync(join(ROOT, 'pages/admin/testimonios/index.vue'), 'utf8')
const { parseEmbedUrl } = await import(pathToFileURL(join(ROOT, 'shared/utils/embedUrl.ts')).href)
const LINK = 'https://www.instagram.com/reel/DfiZWUNtqQd/?utm_source=ig_web_copy_link&obrf=MzRlODBiNWFlZA==&srtk=MzRlODBiNWFlZA=='

test('el enlace de Instagram copiado con parámetros de seguimiento es válido', () => {
  const re = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\//i
  assert.equal(re.test(LINK), true)
  assert.deepEqual(parseEmbedUrl(LINK), { platform: 'instagram', id: 'DfiZWUNtqQd', url: 'https://www.instagram.com/reel/DfiZWUNtqQd/' })
})

test('cada validación abre la pestaña donde está el problema', () => {
  assert.match(page, /function invalid\(target: 'videos' \| 'beforeAfter'[\s\S]*?tab\.value = target/)
  assert.match(page, /\.videos\.some\(v => !v\.url\.trim\(\)\)\) return invalid\('videos'/)
  assert.match(page, /\.instagram\.some\(p => !p\.url\.trim\(\)\)\) return invalid\('beforeAfter'/)
  const save = page.slice(page.indexOf('async function save()'), page.indexOf('isSaving.value = true'))
  assert.equal((save.match(/return notify\.error\(/g) ?? []).length, 0, 'las validaciones de save() usan invalid()')
  assert.equal((save.match(/return invalid\(/g) ?? []).length, 6)
})

test('el mensaje de video vacío dice que es de YouTube y en qué pestaña está', () => {
  assert.match(page, /video de YouTube sin enlace \(pestaña Videos\)/)
})
