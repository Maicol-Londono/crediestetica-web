// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Etapa D2: contacto centralizado, sin redes/testimonios/cifras de Planmed y paleta/tipografías de Crediestética.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
function walk(dir, out = []) {
  for (const n of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${n}`
    if (statSync(join(ROOT, rel)).isDirectory()) { if (!['node_modules', '.nuxt', '.output', '.data'].includes(n)) walk(rel, out) } else if (/\.(vue|ts)$/.test(n)) out.push(rel)
  }
  return out
}
const SRC = ['components', 'pages', 'layouts', 'shared', 'server', 'services', 'utils', 'composables', 'types'].flatMap(d => walk(d)).concat(['app.vue', 'error.vue', 'nuxt.config.ts'])
// Excepciones documentadas: Navbar protegido y documentos legales (requieren verificación independiente).
const LEGAL_OR_PROTECTED = new Set([]) // Etapas D3/D4: Navbar y textos legales ya no tienen identidad de Planmed

describe('contacto', () => {
  test('el WhatsApp oficial está centralizado en shared/utils/contact.ts', () => {
    const c = read('shared/utils/contact.ts')
    assert.match(c, /WHATSAPP_NUMBER = '573011409597'/)
    assert.ok(!/MESSENGER_URL/.test(c), 'sin Messenger inventado')
    assert.match(c, /CONTACT_EMAIL = 'legalmedcartera@gmail\.com'/)
  })
  test('no queda el WhatsApp de Planmed en código ejecutable (fuera de legales)', () => {
    for (const f of SRC) if (!LEGAL_OR_PROTECTED.has(f)) assert.ok(!/573188043382|318 804 3382/.test(read(f)), f)
  })
  test('todo enlace wa.me público usa exclusivamente 573011409597 (o el de contact.ts)', () => {
    for (const f of SRC) for (const m of read(f).matchAll(/wa\.me\/(\d+)/g)) assert.equal(m[1], '573011409597', f)
  })
  test('sin enlaces a perfiles de redes de Planmed', () => {
    for (const f of SRC) if (!LEGAL_OR_PROTECTED.has(f)) assert.ok(!/planmed_financia|Financicioncirugiaplastica|@financiacioncirugia|planmedicoquirurgico/i.test(read(f)), f)
  })
})

describe('contenido comercial', () => {
  test('sin cifras, testimonios ni videos fijos de Planmed en páginas públicas', () => {
    for (const f of SRC.filter(x => /^(pages|components)\//.test(x) && !/admin/.test(x))) {
      if (LEGAL_OR_PROTECTED.has(f)) continue
      const s = read(f)
      assert.ok(!/\+7\.000|7,000 pacientes|Más de 15 años|miles de colombianos|Planmed fue mi soluci/i.test(s), f)
      assert.ok(!/(NnAkWAmmK4A|bw6HbinDnDI|sOT-IMu8sYM|rH1wWM51SGM|x9ZPOewX4vk|DXP9VsYAAMq)/.test(s), f)
    }
  })
  test('el panel y las páginas públicas no nombran a Planmed (excepto Navbar y legales)', () => {
    for (const f of SRC) {
      if (LEGAL_OR_PROTECTED.has(f) || f.startsWith('server/') || f === 'shared/utils/legalDocuments.ts') continue // legalDocuments.ts: lista de bloqueo de dominios heredados
      // El buzón de destino del estudio de crédito (definido por el negocio) contiene el texto «planmed» en la dirección: no es una mención de marca.
      const vis = read(f).replace(/disenadoraplanmed@gmail\.com/g, '').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|<!--)/.test(l) && !/\/\/.*planmed/i.test(l)).join('\n')
      assert.ok(!/planmed/i.test(vis.replace(/<!--.*?-->/gs, '')), f)
    }
  })
})

describe('identidad visual', () => {
  test('paleta y tipografías de Crediestética en el tema global', () => {
    const t = read('assets/css/theme.css')
    for (const c of ['#111111', '#F7F3EE', '#E7DDD1', '#CBA36B', '#BBB2AA']) assert.ok(t.includes(c), c)
    assert.match(t, /--font-serif: 'Libre Bodoni'/)
    assert.match(t, /--font-sans: 'Questrial'/)
    assert.match(read('app.vue'), /family=Libre\+Bodoni[^']*family=Questrial/)
  })
  test('el verde de Planmed ya no es color principal fuera de Navbar y legales', () => {
    for (const f of SRC.concat(['assets/css/tailwind.css', 'assets/css/theme.css'])) if (!LEGAL_OR_PROTECTED.has(f)) assert.ok(!/#0C2619/i.test(read(f)), relative(ROOT, join(ROOT, f)))
  })
})
