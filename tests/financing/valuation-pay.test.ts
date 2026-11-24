// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const v = await import(pathToFileURL(join(ROOT, 'shared/utils/valuationPay.ts')).href)
const ok = { name: 'Ana María Pérez', document: '1.020.434.966', phone: '300 123 4567', email: 'ana@example.com', accept: true }

describe('formulario de pago de la valoración', () => {
  test('datos válidos no producen errores', () => assert.deepEqual(v.validateValuationPay(v.normalizeValuationPay(ok)), {}))
  test('exige nombre, celular, correo válidos y la aceptación de datos', () => {
    const e = v.validateValuationPay(v.normalizeValuationPay({}))
    assert.deepEqual(Object.keys(e).sort(), ['accept', 'document', 'email', 'name', 'phone'])
    assert.ok(v.validateValuationPay({ ...ok, email: 'no-es-correo' }).email)
    for (const bad of ['abc', '123', '12345678901234', '1234 abc']) assert.ok(v.validateValuationPay(v.normalizeValuationPay({ ...ok, document: bad })).document, bad)
    assert.ok(v.validateValuationPay({ ...ok, phone: 'abc' }).phone)
    assert.ok(v.validateValuationPay({ ...ok, accept: false }).accept)
  })
  test('normaliza espacios y solo acepta accept === true', () => {
    assert.equal(v.normalizeValuationPay({ ...ok, name: '  Ana   Pérez ' }).name, 'Ana Pérez')
    assert.equal(v.normalizeValuationPay({ ...ok, accept: 'true' }).accept, false)
    assert.equal(v.normalizeValuationPay(ok).document, '1020434966')
  })
})

describe('clave de envío (attempt) del checkout', () => {
  const NOW = 1_800_000_000_000
  const KEY = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const fp = v.valuationAttemptFingerprint({ name: 'Ana  Pérez', email: 'ANA@example.com', phone: '300 123 4567' })
  let n = 0
  const make = () => `nueva-clave-numero-${++n}-000000`

  test('la huella ignora mayúsculas, espacios y formato del celular, y cambia si cambian los datos', () => {
    assert.equal(fp, v.valuationAttemptFingerprint({ name: 'ana pérez', email: 'ana@example.com', phone: '3001234567' }))
    assert.notEqual(fp, v.valuationAttemptFingerprint({ name: 'Ana Pérez', email: 'otra@example.com', phone: '3001234567' }))
    assert.notEqual(fp, v.valuationAttemptFingerprint({ name: 'Ana Pérez', email: 'ana@example.com', phone: '3009999999' }))
  })
  test('un reintento, un doble clic o una recarga con los mismos datos conservan la clave', () => {
    const first = v.pickAttempt(null, fp, NOW, () => KEY)
    assert.deepEqual(first, { key: KEY, fp, at: NOW })
    const again = v.pickAttempt(JSON.parse(JSON.stringify(first)), fp, NOW + 5 * 60_000, make)
    assert.equal(again.key, KEY)
    assert.equal(again.at, NOW)
  })
  test('editar los datos genera una clave nueva (evita el 409 por la misma clave con otros datos)', () => {
    const other = v.valuationAttemptFingerprint({ name: 'Ana Pérez', email: 'ana@example.com', phone: '3009999999' })
    const next = v.pickAttempt({ key: KEY, fp, at: NOW }, other, NOW + 1000, make)
    assert.notEqual(next.key, KEY)
    assert.equal(next.fp, other)
  })
  test('la clave caduca (no se reutiliza indefinidamente) y una clave guardada inválida o futura se descarta', () => {
    assert.notEqual(v.pickAttempt({ key: KEY, fp, at: NOW }, fp, NOW + v.VALUATION_ATTEMPT_TTL_MS, make).key, KEY)
    assert.equal(v.pickAttempt({ key: KEY, fp, at: NOW }, fp, NOW + v.VALUATION_ATTEMPT_TTL_MS - 1, make).key, KEY)
    for (const bad of [undefined, 'x', 7, {}, { key: 'corta', fp, at: NOW }, { key: 'con espacios y ; raros 123456', fp, at: NOW }, { key: KEY, fp, at: NOW + 10_000 }, { key: KEY, fp, at: 'ayer' }]) {
      assert.notEqual(v.pickAttempt(bad, fp, NOW, make).key, KEY, JSON.stringify(bad))
    }
  })
  test('toda clave generada cumple el formato que exige el servidor de la web', () => {
    const ATTEMPT_RE = /^[A-Za-z0-9-]{16,64}$/
    assert.ok(ATTEMPT_RE.test(v.pickAttempt(null, fp, NOW, () => crypto.randomUUID()).key))
    assert.ok(ATTEMPT_RE.test(v.pickAttempt(null, fp, NOW, make).key))
  })
  test('el modal usa la clave persistida y solo la descarta con un pago aprobado', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(join(ROOT, 'components/forms/ValuationPayModal.vue'), 'utf8')
    assert.match(src, /pickAttempt\(attemptStore\.get\(\)/)
    assert.equal(/attempt = ''/.test(src), false, 'ya no se reinicia la clave al cerrar el widget')
    assert.equal((src.match(/attemptStore\.clear\(\)/g) ?? []).length, 1, 'solo se descarta en el pago aprobado')
  })
})
