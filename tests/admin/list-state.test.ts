// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// D9.7-C: un 403/401/5xx de Hub nunca se presenta como lista vacía en Noticias y Procedimientos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { adminListState, errorStatus, MSG_LIST_FORBIDDEN } from '../../shared/utils/adminListState.ts'

const err = (statusCode?: number) => Object.assign(new Error('x'), statusCode ? { statusCode } : {})

test('200 con registros → lista', () => assert.equal(adminListState({ loading: false, error: null, count: 3 }), 'list'))
test('200 sin registros → estado vacío', () => assert.equal(adminListState({ loading: false, error: null, count: 0 }), 'empty'))
test('mientras carga → loading', () => assert.equal(adminListState({ loading: true, error: null, count: 0 }), 'loading'))
test('401 → sesión vencida (no vacío)', () => assert.equal(adminListState({ loading: false, error: err(401), count: 0 }), 'unauthorized'))
test('403 → sin permiso; nunca vacío ni lista', () => {
  assert.equal(adminListState({ loading: false, error: err(403), count: 0 }), 'forbidden')
  assert.equal(adminListState({ loading: false, error: err(403), count: 5 }), 'forbidden')
})
test('5xx y fallo de conexión → error de carga (no vacío)', () => {
  for (const e of [err(500), err(503), err(), new TypeError('fetch failed')]) assert.equal(adminListState({ loading: false, error: e, count: 0 }), 'error')
})
test('errorStatus lee statusCode, status y response.status', () => {
  assert.equal(errorStatus({ statusCode: 403 }), 403)
  assert.equal(errorStatus({ status: 401 }), 401)
  assert.equal(errorStatus({ response: { status: 500 } }), 500)
  assert.equal(errorStatus(null), undefined)
})
test('mensaje de 403 acordado', () => assert.equal(MSG_LIST_FORBIDDEN, 'No tienes permisos para consultar este módulo'))

for (const [name, file, emptyText] of [['Noticias', 'pages/admin/noticias/index.vue', 'No se encontraron noticias.'], ['Procedimientos', 'pages/admin/procedimientos/index.vue', 'No se encontraron procedimientos.']] as const) {
  test(`${name}: el texto de vacío solo se muestra con listState === 'empty'`, () => {
    const src = readFileSync(file, 'utf8')
    const i = src.indexOf(emptyText)
    assert.ok(i > 0)
    assert.match(src.slice(Math.max(0, i - 160), i), /v-else-if="listState === 'empty'"/)
    assert.match(src, /<AdminListNotice[^>]*:state="listState"/)
    assert.match(src, /adminListState\(/)
  })
}
test('Procedimientos ya no relanza sin capturar errores al montar', () => {
  assert.doesNotMatch(readFileSync('pages/admin/procedimientos/index.vue', 'utf8'), /procedures\.value = await procedureService\.getProcedures\(\)/)
})

// D9.7-D: con server:false `pending` difiere entre servidor e hidratación; el «cargando» no debe depender solo de él.
for (const file of ['pages/admin/micrositios/index.vue', 'pages/admin/noticias/index.vue']) {
  test(`${file}: «cargando» no depende solo de pending (desajuste de hidratación)`, () => {
    const src = readFileSync(file, 'utf8')
    assert.match(src, /server: false/)
    assert.match(src, /mounted\.value = true/)
    assert.match(src, /!mounted\.value \|\| pending\.value/)
    assert.doesNotMatch(src, /v-if="pending"/)
  })
}
