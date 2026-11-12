// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Imágenes de cabecera de Testimonios: WebP + <picture>. Un <img> dentro de un bloque `hidden md:block` (display:none) se descarga igual en móvil,
// así que la fuente móvil es un GIF transparente en data URI y la imagen real solo se elige desde 768 px (breakpoint md de Tailwind).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../recommendations/harness.ts'

const VIEWS = [
  { page: 'pages/testimonios/index.vue', name: 'nuestros_pacientes' },
  { page: 'pages/testimonios/antes-y-despues.vue', name: 'antes_y_despues' },
  { page: 'pages/testimonios/programa-de-referidos.vue', name: 'prp' }
]
const read = rel => readFileSync(join(ROOT, rel), 'utf8')

/** Ancho y alto de un WebP (cabecera VP8X de Chrome o VP8 simple), sin dependencias. */
function webpSize(file) {
  const b = readFileSync(file)
  assert.equal(b.toString('ascii', 0, 4), 'RIFF')
  assert.equal(b.toString('ascii', 8, 12), 'WEBP')
  const kind = b.toString('ascii', 12, 16)
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }
  assert.equal(kind, 'VP8 ', 'WebP con pérdida')
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
}
function pngSize(file) { const b = readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }

describe('archivos de imagen', () => {
  for (const { name } of VIEWS) {
    test(`${name}: el WebP existe, mantiene las dimensiones del PNG y pesa menos (el PNG original se conserva)`, () => {
      const png = join(ROOT, 'public/images/web', `${name}.png`)
      const webp = join(ROOT, 'public/images/web', `${name}.webp`)
      assert.ok(existsSync(png), 'el PNG original se conserva (respaldo)')
      assert.ok(existsSync(webp))
      assert.deepEqual(webpSize(webp), pngSize(png))
      assert.deepEqual(pngSize(png), { w: 1920, h: 819 })
      assert.ok(statSync(webp).size < statSync(png).size * 0.25, 'reducción de peso significativa')
      assert.ok(statSync(webp).size > 50_000, 'sin compresión agresiva')
    })
  }
})

describe('<picture> responsive en las tres vistas', () => {
  for (const { page, name } of VIEWS) {
    test(`${page}: móvil sin descarga, escritorio WebP, PNG de respaldo, sin saltos de diseño`, () => {
      const src = read(page)
      const pic = src.match(/<picture>[\s\S]*?<\/picture>/)?.[0]
      assert.ok(pic, 'tiene <picture>')
      // 1) Móvil: fuente con data URI (sin red), declarada ANTES que la de escritorio.
      const mobile = pic.indexOf('media="(max-width: 767.98px)"')
      const desktop = pic.indexOf('media="(min-width: 768px)"')
      assert.ok(mobile >= 0 && desktop > mobile)
      assert.match(pic, /media="\(max-width: 767\.98px\)" srcset="data:image\/gif;base64,/)
      // 2) Escritorio: el WebP, con su tipo.
      assert.match(pic, new RegExp(`media="\\(min-width: 768px\\)" srcset="/images/web/${name}\\.webp" type="image/webp"`))
      // 3) Respaldo: el PNG original en el <img>; ninguna otra imagen real referenciada.
      assert.match(pic, new RegExp(`<img\\s+src="/images/web/${name}\\.png"`))
      assert.equal((pic.match(/\/images\//g) ?? []).length, 2) // solo el WebP y el PNG: el GIF móvil no hace ninguna petición
      // 4) Accesibilidad y CLS: alt, dimensiones explícitas, proporción reservada, prioridad y decodificación.
      assert.match(pic, /alt="[^"]{20,}"/)
      assert.match(pic, /width="1920"/)
      assert.match(pic, /height="819"/)
      assert.match(pic, /class="w-full h-auto /)
      assert.match(pic, /decoding="async"/)
      assert.match(pic, /fetchpriority="high"/)
      assert.doesNotMatch(pic, /loading="lazy"/, 'es la imagen de cabecera (LCP): no se difiere')
      // 5) El breakpoint coincide con el del bloque contenedor (hidden md:block) y la cabecera de texto móvil (md:hidden).
      assert.match(src, /<div class="hidden md:block mb-10 md:mb-14">/)
      assert.match(src, /class="md:hidden"/)
      assert.match(src, /<h1 class="sr-only">/)
    })
  }

  test('ya no queda ningún <img> suelto del PNG fuera de <picture>', () => {
    for (const { page, name } of VIEWS) {
      const outside = read(page).replace(/<picture>[\s\S]*?<\/picture>/, '')
      assert.doesNotMatch(outside, new RegExp(`${name}\\.(png|webp)`), page)
    }
  })
})
