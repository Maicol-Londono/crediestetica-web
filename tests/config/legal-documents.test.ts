// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Etapa D4.3: registro central de documentos legales, validación de enlaces, política provisional y consentimientos de los formularios.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const docs = await import(pathToFileURL(join(ROOT, 'shared/utils/legalDocuments.ts')).href)

const KEYS = ['precontractual', 'politicaDatos', 'avisoPrivacidad', 'autorizacionDatos', 'pagare', 'autorizacionCentrales', 'reclamaciones', 'advertencias']
const POLICY_URL = 'https://drive.google.com/file/d/1hUZk27N0B09zWoZV0VHdvDeCUB_BtiBw/view?usp=sharing'
const AVISO_URL = 'https://drive.google.com/file/d/19to35HZmCvXZn_WefVsUXpNdzqDjyU68/view?usp=sharing'
const AUTORIZACION_URL = 'https://drive.google.com/file/d/1T8-tXO9EIiZZDg2UojmQZ_W5x7-sr29s/view?usp=sharing'
const IDS = { politicaDatos: '1hUZk27N0B09zWoZV0VHdvDeCUB_BtiBw', avisoPrivacidad: '19to35HZmCvXZn_WefVsUXpNdzqDjyU68', autorizacionDatos: '1T8-tXO9EIiZZDg2UojmQZ_W5x7-sr29s' }
const DRIVE = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view'

describe('registro central de documentos', () => {
  test('contempla los ocho documentos requeridos', () => {
    assert.deepEqual(Object.keys(docs.LEGAL_DOCUMENTS).sort(), [...KEYS].sort())
    for (const k of KEYS) {
      const d = docs.LEGAL_DOCUMENTS[k]
      assert.equal(d.key, k)
      assert.ok(d.title && d.purpose)
    }
  })
  test('URL e ID oficiales de los cuatro documentos integrados (política, aviso, autorización y reclamaciones); los otros cuatro siguen pendientes de las URL de Drive del responsable', () => {
    const RECLAMACIONES_URL = 'https://drive.google.com/file/d/17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g/view?usp=sharing'
    const OFICIAL = { politicaDatos: POLICY_URL, avisoPrivacidad: AVISO_URL, autorizacionDatos: AUTORIZACION_URL, reclamaciones: RECLAMACIONES_URL }
    for (const k of KEYS) assert.equal(docs.LEGAL_DOCUMENTS[k].url, OFICIAL[k] ?? null, k)
    for (const [k, id] of Object.entries(IDS)) {
      assert.equal(docs.legalDocumentUrl(k), OFICIAL[k], k)
      assert.equal(docs.LEGAL_DOCUMENTS[k].url.split('/d/')[1].split('/')[0], id, `${k}: ID`)
      assert.ok(docs.isValidLegalDocumentUrl(OFICIAL[k]), `${k}: URL no válida`)
    }
    assert.deepEqual(KEYS.filter(k => docs.LEGAL_DOCUMENTS[k].url === null).sort(), ['advertencias', 'autorizacionCentrales', 'pagare', 'precontractual'])
    assert.equal(docs.LEGAL_DOCUMENTS.reclamaciones.url.split('/d/')[1].split('/')[0], '17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g')
  })
  test('el documento combinado conserva un título descriptivo y no se duplica en otra propiedad', () => {
    const d = docs.LEGAL_DOCUMENTS.autorizacionDatos
    assert.match(d.title, /aviso de privacidad y autorización expresa/i)
    assert.equal(Object.values(docs.LEGAL_DOCUMENTS).filter(x => x.url === AUTORIZACION_URL).length, 1)
    assert.equal(Object.values(docs.LEGAL_DOCUMENTS).filter(x => x.url === AVISO_URL).length, 1)
    assert.notEqual(docs.LEGAL_DOCUMENTS.avisoPrivacidad.url, d.url)
  })
  test('toda URL configurada es válida (si alguien pega un enlace incorrecto, esta prueba falla)', () => {
    for (const k of KEYS) {
      const u = docs.LEGAL_DOCUMENTS[k].url
      if (u !== null) assert.ok(docs.isValidLegalDocumentUrl(u), `${k}: URL no válida`)
    }
  })
})

describe('validación de enlaces', () => {
  test('acepta enlaces https de Google Drive/Docs', () => {
    assert.ok(docs.isValidLegalDocumentUrl(DRIVE))
    assert.ok(docs.isValidLegalDocumentUrl('https://docs.google.com/document/d/abc123/edit'))
  })
  test('rechaza vacíos, no-https, otros hosts, credenciales y dominios heredados', () => {
    for (const bad of [null, undefined, '', '   ', ' ' + DRIVE, 'http://drive.google.com/file/d/x/view', 'https://example.com/a.pdf', 'https://drive.google.com', 'https://drive.google.com/',
      'https://user:pw@drive.google.com/file/d/x', 'javascript:alert(1)', 'drive.google.com/file/d/x', 'https://drive.google.com.evil.com/file/d/x',
      'https://planmed.com.co/documents/politica.pdf', 'https://pdtclientsolutions.com/Politica_Tratamiento.pdf', '/documents/PAGARE-CLINIPLANES.pdf', 'https://drive.google.com/file/d/cliniplanes/view']) {
      assert.equal(docs.isValidLegalDocumentUrl(bad), false, String(bad))
    }
  })
  test('un enlace inválido se trata como no configurado', () => {
    const fake = { ...docs.LEGAL_DOCUMENTS, pagare: { ...docs.LEGAL_DOCUMENTS.pagare, url: 'https://example.com/x.pdf' } }
    assert.equal(docs.legalDocumentUrl('pagare', fake), null)
    assert.equal(docs.legalDocLink('pagare', fake).pending, true)
  })
})

describe('enlace por consentimiento', () => {
  test('pendiente: leyenda «documento en actualización» hacia la página provisional (no simula un documento)', () => {
    const l = docs.legalDocLink('pagare')
    assert.deepEqual(l, { href: '/politica-datos-personales', label: '(documento en actualización)', external: false, pending: true })
    assert.match(docs.legalDocLinkHtml('pagare', 'x'), /^<a href="\/politica-datos-personales" target="_blank" class="x">\(documento en actualización\)<\/a>$/)
  })
  test('politicaDatos: enlace real a Drive (válido) en lugar de «documento en actualización»', () => {
    assert.ok(docs.isValidLegalDocumentUrl(POLICY_URL))
    const l = docs.legalDocLink('politicaDatos')
    assert.deepEqual(l, { href: POLICY_URL, label: '(ver documento)', external: true, pending: false })
    assert.match(docs.legalDocLinkHtml('politicaDatos', 'x'), /href="https:\/\/drive\.google\.com\/file\/d\/1hUZk27N0B09zWoZV0VHdvDeCUB_BtiBw\/view\?usp=sharing".*rel="noopener noreferrer"/)
  })
  test('configurado: un solo cambio en el registro habilita el enlace externo en todos los consumidores', () => {
    const cfg = { ...docs.LEGAL_DOCUMENTS, pagare: { ...docs.LEGAL_DOCUMENTS.pagare, url: DRIVE } }
    const l = docs.legalDocLink('pagare', cfg)
    assert.equal(l.href, DRIVE)
    assert.equal(l.external, true)
    assert.equal(l.pending, false)
    assert.match(docs.legalDocLinkHtml('pagare', 'x', cfg), /rel="noopener noreferrer"/)
  })
  test('la información precontractual apunta a su página propia, no a la provisional', () => {
    assert.equal(docs.legalDocLink('precontractual').href, '/informacion-precontractual')
  })
})

describe('política de datos provisional', () => {
  const page = read('pages/politica-datos-personales.vue')
  test('declara que no es la política oficial y marca las secciones como pendientes', () => {
    assert.match(page, /no es la política de tratamiento de datos personales de Crediestética/)
    for (const id of ['responsable', 'finalidades', 'derechos', 'consultas-reclamos', 'datos-sensibles', 'autorizaciones']) assert.ok(page.includes(`id: '${id}'`), id)
    assert.ok(page.includes('canales-contacto') && page.includes('documentos-descargables'))
    assert.ok((page.match(/Pendiente de publicación/g) ?? []).length >= 2)
  })
  test('no incluye texto legal inventado (sin artículos ni plazos ni finalidades concretas)', () => {
    assert.ok(!/artículo|días hábiles|Ley 1581|Decreto 1377|finalidades son/i.test(page))
  })
  test('los documentos salen del registro central', () => {
    assert.match(page, /LEGAL_DOCUMENTS/)
    assert.match(page, /legalDocumentUrl/)
  })
})

describe('consentimientos y payloads', () => {
  test('cada formulario con consentimiento de datos lo asocia al documento politicaDatos', () => {
    assert.match(read('components/forms/ValuationRequest.vue'), /<LegalDocLink doc="politicaDatos"/)
    assert.match(read('components/prp/PrpLeadForm.vue'), /<LegalDocLink doc="politicaDatos"/)
    assert.match(read('components/forms/LeadForm.vue'), /legalDocLinkHtml\('politicaDatos'/)
  })
  test('ReferralForm no se asocia a ningún documento ni cambia accepted_contract', () => {
    const f = read('components/referral/ReferralForm.vue')
    assert.ok(!/LegalDocLink|legalDoc/.test(f))
    assert.match(f, /v-model="values\.accepted_contract" type="checkbox"/)
    assert.match(read('shared/utils/prpEnrollment.ts'), /accepted_contract: true,/)
  })
  test('los consentimientos conservan los campos del payload (habeas/accept/accepted siguen en el estado de cada formulario)', () => {
    assert.match(read('components/forms/LeadForm.vue'), /v-model="form\.accepted_habeas_data"/)
    assert.match(read('components/forms/ValuationRequest.vue'), /v-model="values\.accept"/)
    assert.match(read('components/prp/PrpLeadForm.vue'), /v-model="form\.accepted"/)
  })
  test('ningún componente fuera del registro escribe URL de Drive ni rutas a PDF', () => {
    for (const f of ['components/legal/PrecontractualContent.vue', 'components/legal/LegalDocLink.vue', 'pages/politica-datos-personales.vue', 'pages/informacion-precontractual.vue', 'components/common/PrecontractualModal.vue']) {
      assert.ok(!/drive\.google\.com|docs\.google\.com|\.pdf/i.test(read(f)), f)
    }
  })
})

describe('la URL no se duplica fuera del registro', () => {
  test('los ID de los documentos solo aparecen en legalDocuments.ts (y en estas pruebas)', async () => {
    const { readdirSync, statSync } = await import('node:fs')
    const out = []
    const walk = d => { for (const n of readdirSync(join(ROOT, d))) { const r = `${d}/${n}`; if (statSync(join(ROOT, r)).isDirectory()) { if (!['node_modules', '.nuxt', '.output', '.data'].includes(n)) walk(r) } else if (/\.(vue|ts)$/.test(n)) out.push(r) } }
    for (const d of ['components', 'pages', 'layouts', 'shared', 'server', 'composables']) walk(d)
    for (const f of out) if (f !== 'shared/utils/legalDocuments.ts') for (const id of Object.values(IDS)) assert.ok(!read(f).includes(id), `${f}: ${id}`)
  })
})
