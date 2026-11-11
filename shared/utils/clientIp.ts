// IP del cliente para los límites de peticiones. Módulo PURO (sin imports): lo usa la ruta de Nitro y las pruebas.
//
// `X-Forwarded-For` lo escribe cualquiera: el navegador puede enviarlo con valores inventados y un proxy bien configurado SOLO AÑADE al final
// la dirección que él vio (Nginx Proxy Manager / Nginx: `$proxy_add_x_forwarded_for`). Por eso nunca se usa la primera entrada. Con
// `trustedProxyHops` = N proxies de confianza delante de la aplicación, la IP del cliente es la N-ésima entrada CONTANDO DESDE EL FINAL
// (las anteriores las controla el cliente). Con 0 (valor por defecto, seguro) la cabecera se IGNORA y se usa la dirección del socket.
//
// Supuesto NO verificado desde el código: cuántos proxies hay realmente delante y si el servidor Node solo es alcanzable a través de ellos
// (si fuera alcanzable directamente, cualquiera podría forjar la última entrada). Confirmar la infraestructura antes de subir el valor.

const IPV4_OCTET_RE = /^(?:0|[1-9]\d{0,2})$/
const IPV6_GROUP_RE = /^[0-9a-f]{1,4}$/i

/** IPv4 en notación decimal con puntos: cuatro octetos de 0 a 255, sin ceros a la izquierda ni espacios. */
export function isIPv4(value: string): boolean {
  const parts = value.split('.')
  return parts.length === 4 && parts.every(p => IPV4_OCTET_RE.test(p) && Number(p) <= 255)
}

/**
 * IPv6 textual (RFC 4291 §2.2): grupos de 1 a 4 dígitos hexadecimales, un único «::» como máximo y, opcionalmente, un IPv4 al final
 * (`::ffff:192.0.2.1`). No admite identificador de zona (`%eth0`), corchetes ni puerto.
 */
export function isIPv6(value: string): boolean {
  if (value.length < 2 || value.length > 45 || !value.includes(':')) return false
  const halves = value.split('::')
  if (halves.length > 2) return false
  const parse = (part: string): string[] | null => (part === '' ? [] : part.split(':'))
  const head = parse(halves[0]!)!
  const tail = halves.length === 2 ? parse(halves[1]!)! : []
  let groups = head.length + tail.length
  // Un IPv4 solo puede ir en el último segmento de todo el texto y ocupa dos grupos.
  const endSegment = halves.length === 2 ? tail : head
  const last = endSegment[endSegment.length - 1]
  if (last !== undefined && last.includes('.')) {
    if (!isIPv4(last)) return false
    endSegment.pop()
    groups += 1
  }
  if (![...head, ...tail].every(g => IPV6_GROUP_RE.test(g))) return false
  return halves.length === 2 ? groups <= 7 : groups === 8
}

export const isIp = (value: string): boolean => isIPv4(value) || isIPv6(value)

export function resolveClientIp(peer: string | undefined | null, forwardedFor: string | undefined | null, trustedProxyHops: number): string {
  const socket = peer && isIp(peer) ? peer : 'unknown'
  const hops = Number.isInteger(trustedProxyHops) && trustedProxyHops > 0 ? Math.min(trustedProxyHops, 5) : 0
  if (!hops || typeof forwardedFor !== 'string' || forwardedFor.length === 0 || forwardedFor.length > 512) return socket

  const chain = forwardedFor.split(',').map(p => p.trim()).filter(Boolean)
  if (chain.length < hops) return socket
  const candidate = chain[chain.length - hops]!
  return isIp(candidate) ? candidate : socket
}
