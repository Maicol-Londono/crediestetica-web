// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Registro persistente de idempotencia del alta CRM (server/utils/crmClientStore.ts): exclusión REAL entre procesos Node (child_process), locks huérfanos y renovados,
// terminación inesperada, fichas sent/unknown, integridad y permisos. Solo disco temporal: sin red, sin CRM, sin pagos.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync, utimesSync, existsSync } from 'node:fs'
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const STORE_URL = pathToFileURL(join(ROOT, 'server/utils/crmClientStore.ts')).href
const S = await import(STORE_URL)
const UUID = (n) => `3f2b8c1e-5d4a-4e7b-9a10-${String(n).padStart(12, '0')}`

let root, child
before(() => {
  root = mkdtempSync(join(tmpdir(), 'crm-store-proc-'))
  child = join(root, 'child.mjs')
  writeFileSync(child, `
const [,, mode, storeUrl, dir, key, startAt] = process.argv
const S = await import(storeUrl)
if (mode === 'claim') {
  while (Date.now() < Number(startAt)) { /* barrera de arranque simultáneo */ }
  console.log(JSON.stringify(await S.claimCrm(dir, key)))
} else if (mode === 'hold-lock') {
  await S.withCrmLock(dir, key, async () => { console.log('LOCKED'); setInterval(() => {}, 1000); await new Promise(() => {}) })
} else if (mode === 'claim-hang') {
  console.log('CLAIMED ' + JSON.stringify(await S.claimCrm(dir, key)))
  setInterval(() => {}, 1000)
}
`)
})
after(() => rmSync(root, { recursive: true, force: true }))

const freshDir = () => join(mkdtempSync(join(root, 'd-')), 'crm-chat-clients')
const start = (mode, dir, key, startAt = 0) => {
  const p = spawn(process.execPath, [child, mode, STORE_URL, dir, key, String(startAt)], { stdio: ['ignore', 'pipe', 'pipe'] })
  let out = ''
  let err = ''
  p.stdout.on('data', d => { out += d })
  p.stderr.on('data', d => { err += d })
  const exited = new Promise(r => p.on('exit', (code, signal) => r({ code, signal })))
  const waitFor = async (text, ms = 15000) => { const t0 = Date.now(); while (!out.includes(text)) { if (Date.now() - t0 > ms) throw new Error(`no apareció "${text}": ${out} ${err}`); await new Promise(r => setTimeout(r, 20)) } }
  return { p, exited, waitFor, out: () => out, err: () => err }
}
const deadPid = async () => { const c = start('none', root, UUID(0)); const p = c.p.pid; await c.exited; return p }

describe('exclusión real entre procesos Node', () => {
  test('4 procesos reclaman a la vez el MISMO pago: solo uno puede iniciar el envío (6 rondas)', async () => {
    for (let round = 0; round < 6; round++) {
      const dir = freshDir()
      const key = UUID(100 + round)
      const startAt = Date.now() + 1500
      const kids = Array.from({ length: 4 }, () => start('claim', dir, key, startAt))
      await Promise.all(kids.map(k => k.exited))
      const results = kids.map(k => { assert.ok(k.out().trim(), `sin salida: ${k.err()}`); return JSON.parse(k.out().trim()) })
      assert.equal(results.filter(r => r.ok).length, 1, JSON.stringify(results))
      assert.ok(results.filter(r => !r.ok).every(r => r.reason === 'processing'), JSON.stringify(results))
      assert.equal(S.listCrmPending ? (await S.listCrmPending(dir)).length : 1, 1)
      assert.deepEqual(readdirSync(dir).filter(n => n.endsWith('.lock') || n.endsWith('.tmp') || n.endsWith('.take')), [], 'sin locks ni temporales residuales')
    }
  })

  test('terminación inesperada con el lock tomado (SIGKILL): lock huérfano recuperado, se puede reservar', async () => {
    const dir = freshDir(); const key = UUID(200)
    mkdirSync(dir, { recursive: true })
    const holder = start('hold-lock', dir, key)
    await holder.waitFor('LOCKED')
    assert.ok(existsSync(S.crmLockPath(dir, key)))
    // Mientras el dueño vive, otro proceso NO lo roba.
    assert.deepEqual(await S.claimCrm(dir, key, Date.now(), { lockWaitMs: 200 }), { ok: false, reason: 'lock_timeout' })
    holder.p.kill('SIGKILL')
    await holder.exited
    const claim = await S.claimCrm(dir, key)
    assert.equal(claim.ok, true)
    assert.equal(existsSync(S.crmLockPath(dir, key)), false)
  })

  test('terminación inesperada tras reservar (SIGKILL con processing): no se reenvía; a los 5 min pasa a unknown', async () => {
    const dir = freshDir(); const key = UUID(201)
    const c = start('claim-hang', dir, key)
    await c.waitFor('CLAIMED')
    c.p.kill('SIGKILL')
    await c.exited
    assert.deepEqual(await S.claimCrm(dir, key), { ok: false, reason: 'processing' })
    assert.deepEqual(await S.claimCrm(dir, key, Date.now() + S.CRM_PROCESSING_STALE_MS + 1000), { ok: false, reason: 'unknown', detail: 'stale_processing' })
    assert.equal((await S.claimCrm(dir, key, Date.now() + 2 * S.CRM_PROCESSING_STALE_MS)).reason, 'unknown')
  })

  test('fichas sent y unknown persisten y las respeta otro proceso', async () => {
    const dir = freshDir()
    const sent = UUID(300); const unknown = UUID(301)
    for (const [key, state] of [[sent, 'sent'], [unknown, 'unknown']]) {
      const c = await S.claimCrm(dir, key); assert.equal(c.ok, true)
      assert.equal(await S.finishCrm(dir, key, c.attempt, state, { reason: 'x' }), true)
    }
    for (const [key, reason] of [[sent, 'sent'], [unknown, 'unknown']]) {
      const k = start('claim', dir, key, 0)
      await k.exited
      assert.equal(JSON.parse(k.out().trim()).reason, reason)
    }
  })
})

describe('locks huérfanos, renovados y no demostrables', () => {
  const lockWith = (dir, key, info) => { mkdirSync(dir, { recursive: true }); writeFileSync(S.crmLockPath(dir, key), typeof info === 'string' ? info : JSON.stringify(info)) }

  test('lock con pid inexistente en este host: se demuestra huérfano y se recupera', async () => {
    const dir = freshDir(); const key = UUID(400)
    lockWith(dir, key, { token: 'viejo', pid: await deadPid(), host: hostname(), at: 1 })
    assert.equal((await S.claimCrm(dir, key)).ok, true)
  })

  test('lock RENOVADO por otro proceso entre la observación y la retirada: NO se elimina', async () => {
    const dir = freshDir(); const key = UUID(401)
    lockWith(dir, key, { token: 'T1', pid: await deadPid(), host: hostname(), at: 1 })
    const observed = await S.readLockInfo(S.crmLockPath(dir, key))
    assert.equal(observed.token, 'T1')
    // Otro proceso vivo lo reemplaza (mismo archivo, token distinto) antes de que actuemos.
    rmSync(S.crmLockPath(dir, key))
    lockWith(dir, key, { token: 'T2', pid: process.pid, host: hostname(), at: Date.now() })
    assert.equal(await S.takeoverOrphanLock(dir, key, observed), false)
    assert.equal(JSON.parse(readFileSync(S.crmLockPath(dir, key), 'utf8')).token, 'T2')
    assert.equal(existsSync(`${S.crmLockPath(dir, key)}.take`), false, 'la compuerta se libera')
  })

  test('misma observación pero dueño vivo o compuerta ocupada: no se retira', async () => {
    const dir = freshDir(); const key = UUID(402)
    lockWith(dir, key, { token: 'T1', pid: process.pid, host: hostname(), at: 1 })
    const observed = await S.readLockInfo(S.crmLockPath(dir, key))
    assert.equal(await S.takeoverOrphanLock(dir, key, observed), false)
    lockWith(dir, key, { token: 'T3', pid: await deadPid(), host: hostname(), at: 1 })
    const obs3 = await S.readLockInfo(S.crmLockPath(dir, key))
    writeFileSync(`${S.crmLockPath(dir, key)}.take`, JSON.stringify({ token: 'otro', pid: process.pid, host: hostname(), at: Date.now() }))
    assert.equal(await S.takeoverOrphanLock(dir, key, obs3), false)
    assert.equal(JSON.parse(readFileSync(S.crmLockPath(dir, key), 'utf8')).token, 'T3')
  })

  test('lock de otro host, ilegible o vacío: no demostrable, no se roba (lock_timeout)', async () => {
    for (const [n, info] of [[1, { token: 'x', pid: await deadPid(), host: 'otra-maquina', at: 1 }], [2, '{no es json'], [3, '']]) {
      const dir = freshDir(); const key = UUID(410 + n)
      lockWith(dir, key, info)
      assert.deepEqual(await S.claimCrm(dir, key, Date.now(), { lockWaitMs: 150 }), { ok: false, reason: 'lock_timeout' })
      assert.ok(existsSync(S.crmLockPath(dir, key)))
    }
  })
})

describe('fichas: integridad, permisos y limpieza', () => {
  test('ficha manipulada o truncada (suma/clave/estado inválidos) → unknown, nunca reenvía', async () => {
    const dir = freshDir(); const key = UUID(500)
    const c = await S.claimCrm(dir, key)
    await S.finishCrm(dir, key, c.attempt, 'failed', { retryable: true, reason: 'x' })
    const file = join(dir, `${key}.json`)
    const good = JSON.parse(readFileSync(file, 'utf8'))
    for (const mutate of [r => ({ ...r, retryable: false }), r => ({ ...r, state: 'sent' }), r => ({ ...r, key: UUID(501) }), r => ({ ...r, sum: 'x' }), r => { const { sum, ...rest } = r; return rest }]) {
      writeFileSync(file, JSON.stringify(mutate(good)))
      assert.deepEqual(await S.claimCrm(dir, key), { ok: false, reason: 'unknown', detail: 'corrupt_record' })
    }
    writeFileSync(file, JSON.stringify(good).slice(0, 20))
    assert.equal((await S.claimCrm(dir, key)).reason, 'unknown')
  })

  test('la ficha no contiene datos personales ni secretos: solo campos técnicos', async () => {
    const dir = freshDir(); const key = UUID(502)
    const c = await S.claimCrm(dir, key)
    await S.finishCrm(dir, key, c.attempt, 'unknown', { httpStatus: 502, reason: 'http_other' })
    const rec = JSON.parse(readFileSync(join(dir, `${key}.json`), 'utf8'))
    assert.deepEqual(Object.keys(rec).sort(), ['attempts', 'httpStatus', 'key', 'reason', 'state', 'sum', 'updatedAt', 'v'])
  })

  test('permisos 0700 directorio y 0600 fichas (en sistemas POSIX)', { skip: process.platform === 'win32' }, async () => {
    const dir = freshDir(); const key = UUID(503)
    await S.claimCrm(dir, key)
    assert.equal(statSync(dir).mode & 0o777, 0o700)
    assert.equal(statSync(join(dir, `${key}.json`)).mode & 0o777, 0o600)
  })

  test('limpieza de temporales huérfanos: borra los antiguos de la clave, conserva los recientes y los de otras claves', async () => {
    const dir = freshDir(); const key = UUID(504); const other = UUID(505)
    mkdirSync(dir, { recursive: true })
    const old = join(dir, `${key}.aaaa.tmp`); const fresh = join(dir, `${key}.bbbb.tmp`); const foreign = join(dir, `${other}.cccc.tmp`)
    for (const f of [old, fresh, foreign]) writeFileSync(f, 'x')
    const past = new Date(Date.now() - 60 * 60_000)
    utimesSync(old, past, past); utimesSync(foreign, past, past)
    await S.claimCrm(dir, key)
    assert.equal(existsSync(old), false)
    assert.equal(existsSync(fresh), true)
    assert.equal(existsSync(foreign), true)
  })

  test('clave con path traversal o no UUID: rechazada sin tocar el disco', async () => {
    const dir = freshDir()
    for (const key of ['../../etc/passwd', `${UUID(1)}/../x`, UUID(1).toUpperCase(), '', 'a'.repeat(300)]) {
      const r = await S.claimCrm(dir, key)
      assert.deepEqual(r, { ok: false, reason: 'store_error', detail: 'invalid_key' })
    }
    assert.equal(existsSync(dir), false)
  })
})
