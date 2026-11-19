// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Documentos descargables de /recursos (D5.4): registro central, enlaces y separación respecto de los documentos que usan modal y formularios.
// Pruebas UNITARIAS y ESTÁTICAS: no consultan Google Drive. La accesibilidad de los enlaces se verificó a mano en D5.4 (ver el informe).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const L = await import(pathToFileURL(join(ROOT, 'shared/utils/legalDocuments.ts')).href)
const R = await import(pathToFileURL(join(ROOT, 'data/resourceDocuments.ts')).href)
const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

const EXPECTED = [
  ['Política de tratamiento de datos personales', '1D_80Fi7LWygH2pYyyoC7i5QKywBMMsW_'],
  ['Aviso de privacidad', '1onGM7UH-CgaVgbCEpyKq38sL6t093wgS'],
  ['Formato de Autorización de Tratamiento de Datos Personales', '1k0T9Z8WB3OlpvORvdUgbbZwAElPATiRb'],
  ['Formato de Reclamación de Tratamiento de Datos Personales', '17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g'],
]

describe('registro central de documentos de /recursos', () => {
  const docs = L.publicResourceDocuments()

  test('los cuatro documentos, con su nombre completo y su archivo de Drive, en orden', () => {
    assert.equal(docs.length, 4)
    EXPECTED.forEach(([title, id], i) => {
      assert.equal(docs[i].title, title)
      assert.equal(docs[i].viewUrl, `https://drive.google.com/file/d/${id}/view?usp=sharing`)
    })
  })

  test('cada acción apunta al mismo archivo: descarga directa y visor comparten ID', () => {
    for (const [, id] of EXPECTED) {
      const d = docs.find(x => x.viewUrl.includes(id))
      assert.ok(d, id)
      assert.equal(d.downloadUrl, `https://drive.google.com/uc?export=download&id=${id}`)
      assert.equal(L.driveFileId(d.viewUrl), id)
    }
  })

  test('todos los enlaces pasan la validación de documentos legales y ninguno es de otra marca', () => {
    for (const d of docs) {
      assert.equal(L.isValidLegalDocumentUrl(d.viewUrl), true)
      assert.equal(L.isValidLegalDocumentUrl(d.downloadUrl), true)
      assert.doesNotMatch(d.viewUrl + d.downloadUrl, /planmed|cliniplanes|pdtclientsolutions/i)
    }
  })

  test('una URL inválida o de otro host no se publica', () => {
    const bad = [
      { id: 'a', title: 'A', viewUrl: 'http://drive.google.com/file/d/abc/view' },
      { id: 'b', title: 'B', viewUrl: 'https://example.com/file/d/abc/view' },
      { id: 'c', title: 'C', viewUrl: 'https://drive.google.com/drive/folders/abc' },
      { id: 'd', title: 'D', viewUrl: 'https://drive.google.com/file/d/abc/view?x=planmed' },
    ]
    assert.deepEqual(L.publicResourceDocuments(bad), [])
  })
})

describe('separación: /recursos no cambia los documentos de modal, formularios ni política de datos', () => {
  test('LEGAL_DOCUMENTS conserva sus enlaces de D4.4 y D4.5, registra `reclamaciones` (D5.5) y los otros pendientes siguen en null', () => {
    const d = L.LEGAL_DOCUMENTS
    assert.equal(d.politicaDatos.url, 'https://drive.google.com/file/d/1hUZk27N0B09zWoZV0VHdvDeCUB_BtiBw/view?usp=sharing')
    assert.equal(d.avisoPrivacidad.url, 'https://drive.google.com/file/d/19to35HZmCvXZn_WefVsUXpNdzqDjyU68/view?usp=sharing')
    assert.equal(d.autorizacionDatos.url, 'https://drive.google.com/file/d/1T8-tXO9EIiZZDg2UojmQZ_W5x7-sr29s/view?usp=sharing')
    assert.equal(d.reclamaciones.url, 'https://drive.google.com/file/d/17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g/view?usp=sharing')
    for (const k of ['pagare', 'autorizacionCentrales', 'advertencias']) assert.equal(d[k].url, null, k)
  })

  test('el documento de reclamaciones es el mismo archivo en la configuración documental y en /recursos (un solo enlace por archivo)', () => {
    const r = L.publicResourceDocuments().find(x => x.id === 'formato-reclamacion-datos')
    assert.equal(r.viewUrl, L.LEGAL_DOCUMENTS.reclamaciones.url)
    assert.equal(L.legalDocumentUrl('reclamaciones'), r.viewUrl)
    assert.equal(L.legalDocLink('reclamaciones').pending, false)
    // Los otros tres archivos de /recursos NO sustituyen a los de política, aviso y autorización de LEGAL_DOCUMENTS.
    for (const k of ['politicaDatos', 'avisoPrivacidad', 'autorizacionDatos']) assert.equal(L.publicResourceDocuments().some(x => x.viewUrl === L.LEGAL_DOCUMENTS[k].url), false, k)
  })

  test('los IDs de /recursos (salvo reclamaciones) no aparecen en LEGAL_DOCUMENTS ni en los consumidores (modal, formularios, política de datos)', () => {
    const ids = EXPECTED.map(([, id]) => id).filter(id => id !== '17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g')
    const legal = JSON.stringify(L.LEGAL_DOCUMENTS)
    for (const f of ['components/forms/LeadForm.vue', 'components/forms/ValuationRequest.vue', 'components/prp/PrpLeadForm.vue', 'components/referral/ReferralForm.vue', 'components/common/PrecontractualModal.vue', 'components/legal/PrecontractualContent.vue', 'pages/politica-datos-personales.vue', 'pages/informacion-precontractual.vue']) {
      for (const id of ids) assert.equal(src(f).includes(id), false, `${f} no debe usar ${id}`)
    }
    for (const id of ids) assert.equal(legal.includes(id), false, id)
  })
})

describe('página /recursos y vistas de documento', () => {
  const page = src('pages/recursos/index.vue')
  const detail = src('pages/recursos/[slug].vue')
  const data = src('data/resourceDocuments.ts')

  test('cuatro documentos con slug, PDF local existente y contenido', () => {
    assert.deepEqual(R.resourceDocuments.map(d => d.slug), ['politica-tratamiento-datos', 'aviso-privacidad', 'formato-autorizacion-datos', 'formato-reclamacion-datos'])
    for (const d of R.resourceDocuments) {
      assert.equal(d.file, `/images/web/pdf/${d.slug}.pdf`)
      assert.ok(existsSync(join(ROOT, 'public', d.file)), d.file)
      assert.ok(d.title && d.description && d.sections.length > 0, d.slug)
      assert.equal(R.resourceDocumentBySlug(d.slug), d)
    }
    assert.equal(R.resourceDocumentBySlug('no-existe'), null)
  })

  test('la lista conserva el aviso sin documentos y enlaza a la vista y a la descarga del PDF', () => {
    assert.match(page, /v-if="documents\.length === 0"/)
    assert.match(page, /Próximamente encontrarás aquí/)
    assert.match(page, /`\/recursos\/\$\{doc\.slug\}`/)
    assert.match(page, /:href="doc\.file"/)
    assert.match(page, /:download="`\$\{doc\.slug\}\.pdf`"/)
    assert.match(page, /Leer documento/)
    assert.match(page, /Descargar PDF/)
  })

  test('la vista de detalle: 404 si no existe, descarga del PDF, canonical y sin v-html', () => {
    assert.match(detail, /resourceDocumentBySlug\(slug\)/)
    assert.match(detail, /statusCode: 404/)
    assert.match(detail, /:href="doc\.file"/)
    assert.match(detail, /:download="`\$\{doc\.slug\}\.pdf`"/)
    assert.match(detail, /useCanonicalUrl\(\)/)
    assert.match(detail, /useSeoMeta/)
    assert.doesNotMatch(detail + page, /v-html/)
  })

  test('diseño adaptable (apila en móvil, texto largo con salto) y sin marca ajena', () => {
    assert.match(detail, /break-words/)
    assert.match(detail, /min-h-3rem|min-height: 3rem/)
    assert.doesNotMatch(page + detail + data, /planmed|#0C2619|#D3A76A/i)
  })
})
