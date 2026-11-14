// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Resolución de la IP del cliente (shared/utils/clientIp.ts): base de los límites de peticiones de Referidos y de la valoración.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { resolveClientIp, isIPv4, isIPv6, isIp } from '../../shared/utils/clientIp.ts'

const SOCKET = '203.0.113.9'
const CLIENT = '198.51.100.7'
const PROXY1 = '192.0.2.10'
const PROXY2 = '192.0.2.20'

describe('resolveClientIp', () => {
  test('cero saltos: IGNORA X-Forwarded-For y usa la IP del socket', () => {
    assert.equal(resolveClientIp(SOCKET, CLIENT, 0), SOCKET)
    assert.equal(resolveClientIp(SOCKET, `${CLIENT}, ${PROXY1}`, 0), SOCKET)
    assert.equal(resolveClientIp(SOCKET, '1.1.1.1', 0), SOCKET, 'una cabecera inventada no cambia la IP')
  })

  test('un salto: toma la ÚLTIMA entrada (la que añade el proxy de confianza), no la primera que escribe el cliente', () => {
    assert.equal(resolveClientIp(SOCKET, PROXY1, 1), PROXY1)
    assert.equal(resolveClientIp(SOCKET, `6.6.6.6, ${CLIENT}`, 1), CLIENT, 'la entrada inventada por el cliente al inicio no cuenta')
    assert.equal(resolveClientIp(SOCKET, `${CLIENT},${PROXY1}`, 1), PROXY1, 'sin espacios tras la coma')
  })

  test('dos saltos: toma la penúltima entrada', () => {
    assert.equal(resolveClientIp(SOCKET, `${CLIENT}, ${PROXY1}`, 2), CLIENT)
    assert.equal(resolveClientIp(SOCKET, `6.6.6.6, ${CLIENT}, ${PROXY1}`, 2), CLIENT)
    assert.equal(resolveClientIp(SOCKET, `${CLIENT}, ${PROXY1}, ${PROXY2}`, 2), PROXY1)
  })

  test('cadena más corta que los saltos configurados: vuelve a la IP del socket', () => {
    assert.equal(resolveClientIp(SOCKET, CLIENT, 2), SOCKET)
    assert.equal(resolveClientIp(SOCKET, `${CLIENT}, ${PROXY1}`, 3), SOCKET)
  })

  test('los saltos se limitan a 5', () => {
    const chain = ['10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4', '10.0.0.5', '10.0.0.6'].join(', ')
    assert.equal(resolveClientIp(SOCKET, chain, 9), '10.0.0.2', 'con 9 se usa 5 => la 5.ª desde el final')
  })

  test('saltos no válidos (negativos, decimales, NaN, texto) se tratan como cero', () => {
    for (const hops of [-1, 0, 1.5, Number.NaN, '1', undefined, null]) {
      assert.equal(resolveClientIp(SOCKET, `${CLIENT}, ${PROXY1}`, hops), SOCKET, String(hops))
    }
  })

  test('entrada con caracteres inválidos o con longitud fuera de rango: usa el socket', () => {
    for (const bad of ['not-an-ip', '<script>', "1.2.3.4'; drop", '1.2.3.4 5.6.7.8', '1', 'x'.repeat(46), '1'.repeat(46)]) {
      assert.equal(resolveClientIp(SOCKET, `${CLIENT}, ${bad}`, 1), SOCKET, bad)
    }
  })

  test('cabecera ausente, vacía o no textual: usa el socket', () => {
    for (const header of [undefined, null, '', ['1.1.1.1'], 42]) assert.equal(resolveClientIp(SOCKET, header, 1), SOCKET, String(header))
    assert.equal(resolveClientIp(SOCKET, ' , ,', 1), SOCKET, 'solo separadores')
  })

  test('cabecera de más de 512 caracteres: se descarta (512 exactos todavía se aceptan)', () => {
    const exact = ' '.repeat(512 - PROXY1.length) + PROXY1
    assert.equal(exact.length, 512)
    assert.equal(resolveClientIp(SOCKET, exact, 1), PROXY1)
    assert.equal(resolveClientIp(SOCKET, ' ' + exact, 1), SOCKET, '513 caracteres')
    assert.equal(resolveClientIp(SOCKET, `${'6.6.6.6, '.repeat(80)}${PROXY1}`, 1), SOCKET, 'cadena larga inventada')
  })

  test('IPv4 e IPv6, en el socket y en la cabecera', () => {
    assert.equal(resolveClientIp('2001:db8::1', undefined, 0), '2001:db8::1')
    assert.equal(resolveClientIp('::1', undefined, 0), '::1')
    assert.equal(resolveClientIp('::ffff:192.0.2.1', undefined, 0), '::ffff:192.0.2.1')
    assert.equal(resolveClientIp(SOCKET, '2001:db8::7', 1), '2001:db8::7')
    assert.equal(resolveClientIp(SOCKET, `${CLIENT}, 2001:DB8::AB`, 1), '2001:DB8::AB')
    assert.equal(resolveClientIp('2001:db8::1', `${CLIENT}, ${PROXY1}`, 2), CLIENT)
  })

  test('socket ausente o inválido: «unknown» (nunca se confía en la cabecera con cero saltos)', () => {
    for (const peer of [undefined, null, '', 'no-ip!', 'x']) assert.equal(resolveClientIp(peer, CLIENT, 0), 'unknown', String(peer))
    assert.equal(resolveClientIp(undefined, `${CLIENT}, ${PROXY1}`, 1), PROXY1, 'con saltos de confianza sí se usa la cabecera')
    assert.equal(resolveClientIp(undefined, CLIENT, 2), 'unknown')
  })
})

describe('validación de direcciones IP', () => {
  const V4 = ['0.0.0.0', '1.2.3.4', '10.0.0.1', '127.0.0.1', '192.0.2.255', '203.0.113.9', '255.255.255.255']
  const BAD4 = ['999.999.999.999', '256.1.1.1', '1.2.3.256', '1.2.3', '1.2.3.4.5', '01.2.3.4', '1.2.3.04', '1.2.3.4:80', 'a.b.c.d', '1.2.3.-4',
    ' 1.2.3.4', '1.2.3.4 ', '1..3.4', '1.2.3.', '.1.2.3', '1.2.3.4/24', '0x7f.0.0.1', '1e2.0.0.1', '']
  const V6 = ['::', '::1', '1::', '2001:db8::1', '2001:DB8::AB', 'fe80::1', '1:2:3:4:5:6:7:8', '2001:db8:0:0:0:0:0:1', '1::8', '::2:3:4:5:6:7',
    '1:2:3:4:5:6:7::', '::ffff:192.0.2.1', '::192.0.2.1', '1:2:3:4:5:6:1.2.3.4', '64:ff9b::192.0.2.33']
  const BAD6 = ['1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', ':::', '1::2::3', '12345::1', 'g::1', '::1%eth0', '[::1]', '[::1]:80', '::ffff:999.1.1.1',
    '::ffff:1.2.3', '1.2.3.4::', '::1.2.3.4:1', '1:2:3:4:5:6:7:1.2.3.4', ':1:2:3:4:5:6:7', ':1::', '1:2:3:4:5:6:7:', '1:2:3:4:5:6:7:8::', '::1::',
    'abc', ':', '2001:db8::1/64', '2001:db8::zz', '1:2:3:4:5:6:7:8:1.2.3.4', '0:0:0:0:0:0:0:0:0']

  test('IPv4 válidas', () => { for (const ip of V4) { assert.equal(isIPv4(ip), true, ip); assert.equal(isIp(ip), true, ip) } })
  test('IPv4 inválidas (octetos fuera de rango, ceros a la izquierda, puerto, texto)', () => {
    for (const ip of BAD4) { assert.equal(isIPv4(ip), false, `«${ip}»`); assert.equal(isIp(ip), false, `«${ip}»`) }
  })
  test('IPv6 válidas (comprimidas, completas, mayúsculas, IPv4 incrustado)', () => {
    for (const ip of V6) { assert.equal(isIPv6(ip), true, ip); assert.equal(isIp(ip), true, ip) }
  })
  test('IPv6 inválidas (grupos de más o de menos, «::» repetido, zona, corchetes, puerto, máscara)', () => {
    for (const ip of BAD6) { assert.equal(isIPv6(ip), false, `«${ip}»`); assert.equal(isIp(ip), false, `«${ip}»`) }
  })
  test('una IPv4 no es IPv6 y viceversa', () => {
    assert.equal(isIPv6('1.2.3.4'), false)
    assert.equal(isIPv4('::1'), false)
  })

  test('socket inválido (octetos fuera de rango, puerto, texto): «unknown»', () => {
    for (const peer of ['999.999.999.999', '1.2.3.4:80', 'abc', '1.2.3', '::1%eth0', '[::1]']) assert.equal(resolveClientIp(peer, CLIENT, 0), 'unknown', peer)
  })
  test('con saltos de confianza, una entrada inválida de la cadena cae al socket aunque «parezca» una IP', () => {
    for (const bad of ['999.999.999.999', '1.2.3.4:80', '256.0.0.1', '1:2:3:4:5:6:7', '::1%eth0', '[::1]', '01.2.3.4']) {
      assert.equal(resolveClientIp(SOCKET, `${CLIENT}, ${bad}`, 1), SOCKET, bad)
    }
    assert.equal(resolveClientIp(SOCKET, `999.999.999.999, ${PROXY1}`, 1), PROXY1, 'una entrada inválida que no es la elegida no importa')
  })
  test('los saltos siguen contando desde el final con IPv6 en la cadena', () => {
    assert.equal(resolveClientIp(SOCKET, `6.6.6.6, 2001:db8::7, ${PROXY1}`, 2), '2001:db8::7')
    assert.equal(resolveClientIp('::1', 'x, 2001:db8::7', 1), '2001:db8::7')
    assert.equal(resolveClientIp(SOCKET, '2001:db8::7', 0), SOCKET, 'con cero saltos la cabecera sigue ignorándose')
  })
})

describe('coherencia entre las rutas que limitan por IP', () => {
  // Las dos rutas deben usar el mismo resolvedor y la misma configuración, sin una segunda implementación.
  test('valoración y Referidos usan resolveClientIp con trustedProxyHops, y la valoración ya no usa xForwardedFor', async () => {
    const { readFileSync } = await import('node:fs')
    const read = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')
    for (const rel of ['server/utils/valuation.ts', 'server/utils/prpEnrollment.ts', 'server/utils/formMail.ts']) {
      const src = read(rel)
      assert.match(src, /resolveClientIp\(getRequestIP\(event\), getRequestHeader\(event, 'x-forwarded-for'\), Number\((?:config|runtime)\.trustedProxyHops\) \|\| 0\)/, rel)
      assert.doesNotMatch(src, /xForwardedFor\s*:\s*true/, rel)
    }
  })
})
