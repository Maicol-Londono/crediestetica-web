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
