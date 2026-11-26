// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Comprobación previa al despliegue de las variables del CRM. Solo procesos locales: ninguna petición de red.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../recommendations/harness.ts'
import { CRM_PRODUCTION_URL, crmEnvProblems } from '../../scripts/check-crm-env.mjs'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const OK = { NUXT_CRM_FORM_URL: CRM_PRODUCTION_URL, NUXT_CRM_FORM_USER_ID: '73', NUXT_CRM_FORM_ADVISOR_ID: '73', NUXT_CRM_FORM_LINE_ID: '30' }
const clean = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('NUXT_')))
const run = (script, env) => spawnSync(process.execPath, [join(ROOT, script)], { env: { ...clean(), ...env }, encoding: 'utf8', timeout: 20_000 })

describe('variables del CRM antes del despliegue', () => {
  test('la configuración acordada pasa, con o sin la línea explícita', () => {
    assert.deepEqual(crmEnvProblems(OK), [])
    const { NUXT_CRM_FORM_LINE_ID, ...withoutLine } = OK
    assert.deepEqual(crmEnvProblems(withoutLine), [])
  })

  test('cada variable obligatoria ausente o vacía bloquea', () => {
    for (const name of ['NUXT_CRM_FORM_URL', 'NUXT_CRM_FORM_USER_ID', 'NUXT_CRM_FORM_ADVISOR_ID']) {
      for (const bad of [undefined, '', '  ']) {
        const problems = crmEnvProblems({ ...OK, [name]: bad })
        assert.equal(problems.length, 1, `${name}=${bad}`)
        assert.ok(problems[0].startsWith(name))
      }
    }
  })

  test('destino distinto, ids inválidos y línea vacía o ajena bloquean', () => {
    const bad = [
      { NUXT_CRM_FORM_URL: 'http://localhost/crm-public/api/clients/forms' }, { NUXT_CRM_FORM_URL: 'https://crm.example.test/crm-public/api/clients/forms' },
      { NUXT_CRM_FORM_USER_ID: 'abc' }, { NUXT_CRM_FORM_ADVISOR_ID: '0' }, { NUXT_CRM_FORM_LINE_ID: '' }, { NUXT_CRM_FORM_LINE_ID: '16' }
    ]
    for (const override of bad) assert.equal(crmEnvProblems({ ...OK, ...override }).length, 1, JSON.stringify(override))
  })

  test('ciudad y clínica se pueden omitir o fijar en 3 y 6; otro valor bloquea', () => {
    assert.deepEqual(crmEnvProblems({ ...OK, NUXT_CRM_FORM_CITY_ID: '3', NUXT_CRM_FORM_CLINIC_ID: '6' }), [])
    for (const override of [{ NUXT_CRM_FORM_CITY_ID: '' }, { NUXT_CRM_FORM_CITY_ID: '5' }, { NUXT_CRM_FORM_CLINIC_ID: '' }, { NUXT_CRM_FORM_CLINIC_ID: '7' }]) {
      assert.equal(crmEnvProblems({ ...OK, ...override }).length, 1, JSON.stringify(override))
    }
    for (const [name, id] of [['crmFormCityId', '3'], ['crmFormClinicId', '6']]) assert.match(read('nuxt.config.ts'), new RegExp(`^    ${name}: '${id}',\r?$`, 'm'))
  })

  test('el correo de la asesora se puede omitir; si se define debe ser el acordado', () => {
    assert.deepEqual(crmEnvProblems({ ...OK, NUXT_CRM_FORM_ADVISOR_EMAIL: 'convenioscrediestetica@gmail.com' }), [])
    for (const bad of ['', 'otra@example.test']) assert.equal(crmEnvProblems({ ...OK, NUXT_CRM_FORM_ADVISOR_EMAIL: bad }).length, 1)
  })

  test('el comando termina con error y sin mostrar valores', () => {
    const r = run('scripts/check-crm-env.mjs', { NUXT_CRM_FORM_USER_ID: 'valor-secreto' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /NUXT_CRM_FORM_URL: falta/)
    assert.match(r.stderr, /NUXT_CRM_FORM_ADVISOR_ID: falta/)
    assert.doesNotMatch(r.stdout + r.stderr, /valor-secreto/)
    assert.equal(run('scripts/check-crm-env.mjs', OK).status, 0)
  })

  test('el arranque de producción no levanta el servidor sin configuración', () => {
    const r = run('scripts/start-production.mjs', {})
    assert.equal(r.status, 1)
    assert.match(r.stderr, /No se puede desplegar/)
    assert.doesNotMatch(r.stdout, /Listening/)
  })

  test('coincide con el destino documentado y con la línea por defecto, y la guía usa el arranque protegido', () => {
    assert.ok(read('.env.production.example').includes(CRM_PRODUCTION_URL))
    assert.match(read('nuxt.config.ts'), /^    crmFormLineId: '30',\r?$/m)
    // `-if-exists`: en local carga .env; en el servidor, sin ese archivo, usa las variables del proceso (que además tienen prioridad).
    assert.match(read('package.json'), /"check:deploy": "node --env-file-if-exists=\.env scripts\/check-crm-env\.mjs"/)
    assert.match(read('package.json'), /"start:production": "node scripts\/start-production\.mjs"/)
    const guide = read('docs/despliegue/guia-despliegue-crediestetica.md')
    assert.match(guide, /script: 'scripts\/start-production\.mjs'/)
    assert.match(guide, /npm run check:deploy/)
  })
})
