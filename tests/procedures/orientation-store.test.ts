// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Persistencia de la orientación de imágenes (server/utils/procedureOrientation.ts): escritura atómica, respaldo y lectura estricta.
// Se ejecuta el código REAL del servidor sobre un directorio temporal.
import { test, describe, before, beforeEach, afterEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const FILE = 'procedure-image-orientation.json'
const PREV = 'procedure-image-orientation.prev.json'

let base, dir, store
const ev = {}
const read = name => readFileSync(join(dir, name), 'utf8')
const run = async fn => { try { return { value: await fn() } } catch (error) { return { error } } }

before(async () => {
  base = mkdtempSync(join(tmpdir(), 'orientation-'))
  const g = globalThis
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.aboutContentDir = () => dir
  store = await import(pathToFileURL(join(ROOT, 'server/utils/procedureOrientation.ts')).href)
})
beforeEach(() => { dir = mkdtempSync(join(base, 'c-')) })
afterEach(() => { mock.restoreAll(); syncBuiltinESMExports() })
after(() => rmSync(base, { recursive: true, force: true }))

// Sustituye una función de node:fs/promises que usa el módulo (los imports con nombre se actualizan con syncBuiltinESMExports).
function failOn(name, makeError = () => Object.assign(new Error('fallo simulado'), { code: 'EIO' })) {
  const original = fsp[name]
  const calls = []
  mock.method(fsp, name, async (...args) => { calls.push(args); throw makeError() })
  syncBuiltinESMExports()
  return { calls, original }
}

describe('lectura', () => {
  test('lectura normal: devuelve el mapa slug → orientación', async () => {
    writeFileSync(join(dir, FILE), JSON.stringify({ 'rinoplastia': 'horizontal', 'mamoplastia': 'vertical' }))
    assert.deepEqual(await store.readOrientations(ev), { rinoplastia: 'horizontal', mamoplastia: 'vertical' })
  })

  test('archivo inexistente: mapa vacío (todavía no se guardó ninguna orientación) y no se crea ningún archivo', async () => {
    assert.deepEqual(await store.readOrientations(ev), {})
    assert.deepEqual(readdirSync(dir), [])
  })

  test('conserva la compatibilidad: valores desconocidos se leen como vertical y los slugs inválidos se ignoran', async () => {
    writeFileSync(join(dir, FILE), JSON.stringify({ a: 'horizontal', b: 'diagonal', 'Slug Malo': 'horizontal', 'x_y': 'horizontal' }))
    assert.deepEqual(await store.readOrientations(ev), { a: 'horizontal', b: 'vertical' })
  })

  test('JSON corrupto o que no es un objeto: la lectura FALLA de forma explícita (nunca devuelve {})', async () => {
    for (const content of ['{ "a": "horizontal"', 'no es json', '', '   ', '[]', 'null', '42', '"texto"', '["a"]']) {
      writeFileSync(join(dir, FILE), content)
      const r = await run(() => store.readOrientations(ev))
      assert.equal(r.error?.statusCode, 500, JSON.stringify(content))
      assert.equal(r.error.data.code, 'orientation_corrupt')
      assert.equal(r.value, undefined, `no debe devolver un valor para ${JSON.stringify(content)}`)
    }
  })

  test('un error de lectura distinto de «no existe» también falla (la ruta es un directorio)', async () => {
    await fsp.mkdir(join(dir, FILE))
    assert.equal((await run(() => store.readOrientations(ev))).error?.statusCode, 500)
  })
})

describe('escritura', () => {
  test('escritura normal: crea el archivo con el formato existente (JSON con sangría de 2 espacios) y no deja temporales', async () => {
    await store.saveOrientation(ev, 'rinoplastia', 'horizontal')
    assert.equal(read(FILE), JSON.stringify({ rinoplastia: 'horizontal' }, null, 2))
    assert.deepEqual(readdirSync(dir), [FILE], 'sin .prev (no había versión anterior) ni .tmp')
    assert.deepEqual(await store.readOrientations(ev), { rinoplastia: 'horizontal' })
  })

  test('conserva las orientaciones existentes y agrega la nueva', async () => {
    writeFileSync(join(dir, FILE), JSON.stringify({ a: 'horizontal', b: 'vertical' }, null, 2))
    await store.saveOrientation(ev, 'c', 'horizontal')
    assert.deepEqual(JSON.parse(read(FILE)), { a: 'horizontal', b: 'vertical', c: 'horizontal' })
  })

  test('actualizar un valor existente lo cambia sin duplicar', async () => {
    await store.saveOrientation(ev, 'a', 'horizontal')
    await store.saveOrientation(ev, 'a', 'vertical')
    assert.deepEqual(JSON.parse(read(FILE)), { a: 'vertical' })
  })

  test('valor o slug inválidos: no escribe nada', async () => {
    for (const [slug, value] of [['a', 'diagonal'], ['a', undefined], ['a', null], ['A B', 'horizontal'], ['', 'horizontal'], ['../x', 'vertical']]) {
      await store.saveOrientation(ev, slug, value)
    }
    assert.deepEqual(readdirSync(dir), [])
  })

  test('sin cambios: no reescribe el archivo ni toca el respaldo', async () => {
    await store.saveOrientation(ev, 'a', 'horizontal')
    const before = read(FILE)
    await store.saveOrientation(ev, 'a', 'horizontal')
    assert.equal(read(FILE), before)
    assert.equal(existsSync(join(dir, PREV)), false)
  })

  test('crea el directorio de contenido si todavía no existe', async () => {
    dir = join(dir, 'nuevo', 'anidado')
    await store.saveOrientation(ev, 'a', 'horizontal')
    assert.deepEqual(JSON.parse(read(FILE)), { a: 'horizontal' })
  })
})

describe('respaldo .prev', () => {
  test('antes de reemplazar el archivo copia la versión anterior', async () => {
    await store.saveOrientation(ev, 'a', 'horizontal')
    const v1 = read(FILE)
    await store.saveOrientation(ev, 'b', 'horizontal')
    assert.equal(read(PREV), v1, 'el respaldo es exactamente la versión anterior')
    assert.deepEqual(JSON.parse(read(FILE)), { a: 'horizontal', b: 'horizontal' })
    const v2 = read(FILE)
    await store.saveOrientation(ev, 'c', 'vertical')
    assert.equal(read(PREV), v2, 'el respaldo se actualiza en cada reemplazo')
    assert.deepEqual(readdirSync(dir).sort(), [FILE, PREV])
  })
})

describe('archivo corrupto', () => {
  test('guardar NO sobrescribe un archivo corrupto ni toca el respaldo: falla de forma explícita', async () => {
    const broken = '{ "a": "horizontal", "b": '
    writeFileSync(join(dir, FILE), broken)
    writeFileSync(join(dir, PREV), JSON.stringify({ a: 'horizontal' }))
    const r = await run(() => store.saveOrientation(ev, 'nuevo', 'horizontal'))
    assert.equal(r.error.statusCode, 500)
    assert.equal(r.error.data.code, 'orientation_corrupt')
    assert.equal(read(FILE), broken, 'el archivo queda intacto')
    assert.equal(read(PREV), JSON.stringify({ a: 'horizontal' }), 'el respaldo válido no se pisa con la copia del archivo dañado')
    assert.deepEqual(readdirSync(dir).sort(), [FILE, PREV], 'sin temporales')
  })

  test('con el archivo corrupto, la visualización no se cae: usa la orientación por defecto y lo registra', async () => {
    writeFileSync(join(dir, FILE), 'no es json')
    const errors = []
    mock.method(console, 'error', (...a) => errors.push(a.join(' ')))
    const rows = await store.withOrientation(ev, [{ slug: 'a' }, { slug: 'b' }])
    assert.deepEqual(rows.map(r => r.imageOrientation), ['vertical', 'vertical'])
    assert.ok(errors.some(m => m.includes('orientación')), 'el fallo se registra, no es silencioso')
  })

  test('tras restaurar un archivo válido, guardar vuelve a funcionar', async () => {
    writeFileSync(join(dir, FILE), 'roto')
    assert.equal((await run(() => store.saveOrientation(ev, 'a', 'horizontal'))).error?.statusCode, 500)
    writeFileSync(join(dir, FILE), JSON.stringify({ z: 'horizontal' }))
    await store.saveOrientation(ev, 'a', 'horizontal')
    assert.deepEqual(JSON.parse(read(FILE)), { z: 'horizontal', a: 'horizontal' })
  })
})

describe('fallos durante la escritura', () => {
  const seed = { a: 'horizontal', b: 'vertical' }
  const original = () => JSON.stringify(seed, null, 2)
  beforeEach(() => writeFileSync(join(dir, FILE), original()))

  test('falla al escribir el temporal: 500, contenido válido anterior intacto y sin temporales', async () => {
    failOn('writeFile')
    const r = await run(() => store.saveOrientation(ev, 'nuevo', 'horizontal'))
    mock.restoreAll(); syncBuiltinESMExports()
    assert.equal(r.error.statusCode, 500)
    assert.equal(read(FILE), original())
    assert.deepEqual(readdirSync(dir).filter(n => n.endsWith('.tmp')), [])
  })

  test('falla el rename: 500, contenido anterior intacto y el temporal se elimina', async () => {
    failOn('rename')
    const r = await run(() => store.saveOrientation(ev, 'nuevo', 'horizontal'))
    mock.restoreAll(); syncBuiltinESMExports()
    assert.equal(r.error.statusCode, 500)
    assert.equal(read(FILE), original())
    assert.deepEqual(readdirSync(dir).filter(n => n.endsWith('.tmp')), [], 'no queda un .tmp huérfano')
  })

  test('falla la copia del respaldo: no se reemplaza el archivo', async () => {
    failOn('copyFile')
    const r = await run(() => store.saveOrientation(ev, 'nuevo', 'horizontal'))
    mock.restoreAll(); syncBuiltinESMExports()
    assert.equal(r.error.statusCode, 500)
    assert.equal(read(FILE), original())
    assert.deepEqual(readdirSync(dir).filter(n => n.endsWith('.tmp')), [])
  })

  test('el mensaje de error no filtra rutas del servidor', async () => {
    failOn('writeFile', () => Object.assign(new Error(`EACCES: permission denied, open '${dir}'`), { code: 'EACCES' }))
    const r = await run(() => store.saveOrientation(ev, 'nuevo', 'horizontal'))
    mock.restoreAll(); syncBuiltinESMExports()
    assert.ok(!r.error.message.includes(dir))
  })

  test('después de un fallo, un guardado correcto funciona con normalidad', async () => {
    failOn('rename')
    await run(() => store.saveOrientation(ev, 'nuevo', 'horizontal'))
    mock.restoreAll(); syncBuiltinESMExports()
    await store.saveOrientation(ev, 'nuevo', 'horizontal')
    assert.deepEqual(JSON.parse(read(FILE)), { ...seed, nuevo: 'horizontal' })
  })
})

describe('temporales', () => {
  test('el temporal tiene nombre aleatorio en el mismo directorio y nunca el nombre fijo con el pid', async () => {
    const names = []
    const realWrite = fsp.writeFile
    mock.method(fsp, 'writeFile', async (path, ...rest) => { names.push(String(path)); return realWrite(path, ...rest) })
    syncBuiltinESMExports()
    await store.saveOrientation(ev, 'a', 'horizontal')
    await store.saveOrientation(ev, 'b', 'horizontal')
    mock.restoreAll(); syncBuiltinESMExports()
    assert.equal(names.length, 2)
    for (const n of names) {
      assert.ok(n.startsWith(join(dir, FILE + '.')), 'mismo directorio que el destino')
      assert.match(n.slice(join(dir, FILE + '.').length), /^[0-9a-f]{12}\.tmp$/)
      assert.ok(!n.includes(`.${process.pid}.tmp`), 'sin el nombre fijo basado en el pid')
    }
    assert.notEqual(names[0], names[1], 'cada guardado usa un temporal distinto')
  })

  test('el código fuente ya no usa un temporal con nombre fijo', () => {
    const src = readFileSync(join(ROOT, 'server/utils/procedureOrientation.ts'), 'utf8')
    assert.ok(!/process\.pid/.test(src))
    assert.match(src, /randomBytes\(6\)/)
  })
})

describe('concurrencia dentro del proceso', () => {
  test('veinte guardados simultáneos de procedimientos distintos: no se pierde ninguno y el JSON queda válido', async () => {
    const slugs = Array.from({ length: 20 }, (_, i) => `procedimiento-${i}`)
    await Promise.all(slugs.map(s => store.saveOrientation(ev, s, 'horizontal')))
    const saved = JSON.parse(read(FILE))
    assert.deepEqual(Object.keys(saved).sort(), [...slugs].sort())
    assert.ok(Object.values(saved).every(v => v === 'horizontal'))
    assert.deepEqual(readdirSync(dir).filter(n => n.endsWith('.tmp')), [])
  })

  test('un guardado fallido no bloquea la cola: los siguientes se ejecutan', async () => {
    failOn('rename')
    const first = run(() => store.saveOrientation(ev, 'a', 'horizontal'))
    const r1 = await first
    mock.restoreAll(); syncBuiltinESMExports()
    assert.equal(r1.error.statusCode, 500)
    await store.saveOrientation(ev, 'b', 'horizontal')
    assert.deepEqual(JSON.parse(read(FILE)), { b: 'horizontal' })
  })

  test('la exclusión es local al proceso (documentado): el módulo declara que se requiere una sola instancia', () => {
    const src = readFileSync(join(ROOT, 'server/utils/procedureOrientation.ts'), 'utf8')
    assert.match(src, /una sola instancia de Node/)
  })
})
