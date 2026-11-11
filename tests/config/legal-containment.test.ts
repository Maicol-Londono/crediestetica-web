// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Etapa D4.2: contención documental (PDF de otra entidad fuera de public/), sin enlaces a la política de Planmed y textos legales coherentes.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const md5 = rel => createHash('md5').update(readFileSync(join(ROOT, rel))).digest('hex')
function walk(dir, out = []) {
  for (const n of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${n}`
    if (statSync(join(ROOT, rel)).isDirectory()) { if (!['node_modules', '.nuxt', '.output', '.data'].includes(n)) walk(rel, out) } else if (/\.(vue|ts)$/.test(n)) out.push(rel)
  }
  return out
}
const SRC = ['components', 'pages', 'layouts', 'shared', 'server', 'services', 'utils', 'composables', 'types', 'providers'].flatMap(d => walk(d))
const norm = s => s.replace(/<[^>]+>|\{\{[^}]*\}\}/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()

describe('PDF heredados', () => {
  const PDFS = { 'PAGARE-CLINIPLANES.pdf': '882eb44841de', '2.-AUTORIZACION-CENTRALES-CLINIPLANES.pdf': 'a68d3de83b18' }
  test('ya no están en public/ (no se sirven) y se conservan intactos fuera de la carpeta pública', () => {
    for (const [f, h] of Object.entries(PDFS)) {
      assert.equal(existsSync(join(ROOT, 'public/documents', f)), false, `${f} sigue público`)
      assert.ok(md5(`archivo-legal-heredado/${f}`).startsWith(h), `${f}: contenido alterado`)
    }
    assert.equal(existsSync(join(ROOT, 'public/documents')) ? readdirSync(join(ROOT, 'public/documents')).filter(n => /\.pdf$/i.test(n)).length : 0, 0)
  })
  test('ningún componente, página ni utilidad enlaza esos documentos', () => {
    for (const f of SRC) if (f !== 'shared/utils/legalDocuments.ts') assert.ok(!/CLINIPLANES|\/documents\/|archivo-legal-heredado/i.test(read(f)), f) // legalDocuments.ts solo contiene la lista de bloqueo
  })
})

describe('política de datos de Planmed', () => {
  test('no queda ninguna URL a la política alojada en el dominio heredado', () => {
    for (const f of SRC) {
      if (f === 'shared/utils/crmDestination.ts' || f === 'nuxt.config.ts' || f === 'shared/utils/legalDocuments.ts') continue // listas de bloqueo (CRM heredado y validación de enlaces)
      const s = read(f)
      assert.ok(!/pdtclientsolutions|Politica_Tratamiento|PRIVACY_POLICY_URL/i.test(s), f)
    }
  })
  test('los formularios obtienen el enlace de la política del registro central y usan el enlace configurado (o la leyenda de pendiente si no hay URL)', async () => {
    for (const f of ['components/forms/ValuationRequest.vue', 'components/prp/PrpLeadForm.vue']) {
      const t = read(f)
      assert.match(t, /<LegalDocLink doc="politicaDatos"/, f)
      assert.ok(!t.includes('/politica-datos-personales'), `${f}: ruta fija (debe salir del registro)`)
    }
    const lead = read('components/forms/LeadForm.vue')
    assert.match(lead, /legalDocLinkHtml\('politicaDatos'/)
    assert.ok(!/href=(&quot;|")\/recursos/.test(lead), 'LeadForm: enlace a /recursos (página sin documentos)')
    const docs = await import(pathToFileURL(join(ROOT, 'shared/utils/legalDocuments.ts')).href)
    const l = docs.legalDocLink('politicaDatos')
    assert.equal(l.external, true)
    assert.match(l.href, /^https:\/\/drive\.google\.com\//)
    assert.equal(l.pending, false)
  })
})

describe('ReferralForm: sin contrato inexistente y sin cambiar el payload', () => {
  test('el texto ya no habla de un contrato de remisión', () => {
    for (const f of ['components/referral/ReferralForm.vue', 'shared/utils/prpEnrollment.ts']) assert.ok(!/contrato de remisi/i.test(read(f)), f)
    assert.ok(read('components/referral/ReferralForm.vue').includes('condiciones del programa de referidos publicadas en esta página'))
  })
  test('la casilla, la validación y el payload a Hub siguen igual (accepted_contract obligatorio y enviado como true)', () => {
    const f = read('components/referral/ReferralForm.vue')
    assert.match(f, /v-model="values\.accepted_contract" type="checkbox"/)
    const s = read('shared/utils/prpEnrollment.ts')
    assert.match(s, /if \(!v\.accepted_contract\) e\.accepted_contract = /)
    assert.match(s, /!v\.accepted_contract\) throw new Error\('Formulario no validado\.'\)/)
    assert.match(s, /accepted_contract: true,/)
  })
})

describe('modal y página precontractual (fuente única)', () => {
  const modal = read('components/common/PrecontractualModal.vue')
  const page = read('pages/informacion-precontractual.vue')
  const content = read('shared/utils/precontractualContent.ts')
  const comp = read('components/legal/PrecontractualContent.vue')
  test('modal y página renderizan el mismo componente y no llevan texto propio', () => {
    assert.match(modal, /<PrecontractualContent \/>/)
    assert.match(page, /<PrecontractualContent \/>/)
    for (const t of [modal, page]) assert.ok(!/riguroso análisis|recursos propios|Datacrédito/.test(t), 'texto legal duplicado fuera de la fuente única')
  })
  test('sin la errata «mensería»', () => {
    assert.ok(!/mensería/.test(modal + page + content + comp))
    assert.ok(/mensajería/.test(content))
  })
  test('el texto de las cláusulas permanece idéntico al texto base (hash congelado: cualquier cambio debe ser validado por el responsable)', async () => {
    const m = await import(pathToFileURL(join(ROOT, 'shared/utils/precontractualContent.ts')).href)
    const text = m.precontractualSections('{{ISSUER}}').flatMap(s => s.paragraphs).join('\n')
    assert.equal(createHash('sha256').update(text).digest('hex'), 'f4d9fa405b747384c85710b4c56997ce8c02ef6df2368c4cb9d17a2cf5f6ad59')
    assert.equal(m.PRECONTRACTUAL_ACCEPTANCE_CLOSING, 'Si acepta continuar, manifiesta que conoce y acepta los términos, condiciones y advertencias aquí descritas.')
  })
  test('estructura temática del documento', async () => {
    const m = await import(pathToFileURL(join(ROOT, 'shared/utils/precontractualContent.ts')).href)
    const ids = m.precontractualSections('x').map(s => s.id)
    assert.deepEqual(ids, ['naturaleza-recursos', 'responsabilidad-procedimiento', 'analisis-solicitudes', 'prepago', 'condiciones-intereses-centrales', 'advertencias-publicidad', 'aceptacion'])
    assert.match(comp, /data-section="identificacion"/)
  })
  test('las afirmaciones sujetas a validación jurídica se conservan sin cambios', () => {
    for (const t of ['exclusivamente con recursos propios', 'no es la de una entidad financiera regulada', 'En ningún caso se impondrán penalidades, multas ni sanciones por concepto de pagos anticipados', 'tasa máxima legal establecida por la Superintendencia Financiera de Colombia', 'Datacrédito o CIFIN', 'documento oficial de advertencias']) {
      assert.ok(content.includes(t), t)
    }
  })
  test('sin razón social ni correo de PQRS inventados', () => {
    assert.ok(!/legamled|LEGALMED|901532790|pqrs\.[a-z]/i.test(modal + page + content + comp))
  })
})
