// Comprobante de pago en PDF, generado sin dependencias: una sola página A4 con texto (Helvetica estándar, codificación WinAnsi). Solo servidor.
// Es un comprobante informativo con los datos que confirmó Wellezy Hub tras verificar el pago con Wompi; no es una factura.

export interface ReceiptRow { label: string, value: string }
export interface ReceiptInput { brand: string, title: string, intro?: string, rows: ReceiptRow[], footer?: string }

/** Texto seguro para una cadena literal de PDF en WinAnsi (Latin-1): sin saltos de línea y con los paréntesis y la barra escapados. */
function pdfText(s: string): string {
  // eslint-disable-next-line no-control-regex
  const flat = s.replace(/[\u0000-\u001f\u007f]/g, ' ')
  let out = ''
  for (const ch of flat) {
    const code = ch.codePointAt(0)!
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`
    else if (code <= 0xff) out += ch
    else out += '?'
  }
  return out
}

/** Parte un texto largo en líneas de hasta `max` caracteres (por palabras). */
function wrap(s: string, max: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const word of s.split(/\s+/).filter(Boolean)) {
    if ((cur + ' ' + word).trim().length > max) { if (cur) lines.push(cur); cur = word } else cur = (cur + ' ' + word).trim()
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

export function buildReceiptPdf(input: ReceiptInput): Uint8Array {
  const ops: string[] = []
  let y = 790
  const text = (font: 'F1' | 'F2', size: number, x: number, line: string) => { ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(line)}) Tj ET`) }

  // Cabecera negra con la marca.
  ops.push('0.067 0.067 0.067 rg 0 770 595 72 re f')
  ops.push('0.796 0.639 0.42 rg')
  y = 815; text('F2', 11, 50, input.brand.toUpperCase())
  ops.push('1 1 1 rg')
  y = 790; text('F2', 18, 50, input.title)
  ops.push('0.11 0.106 0.106 rg')

  y = 735
  if (input.intro) for (const l of wrap(input.intro, 90)) { text('F1', 11, 50, l); y -= 16 }
  y -= 12

  for (const row of input.rows) {
    ops.push('0.4 0.4 0.4 rg'); text('F1', 9, 50, row.label.toUpperCase())
    y -= 15
    ops.push('0.11 0.106 0.106 rg')
    for (const l of wrap(row.value, 80)) { text('F2', 12, 50, l); y -= 16 }
    ops.push('0.89 0.866 0.827 RG 50 ' + (y + 6) + ' m 545 ' + (y + 6) + ' l S')
    y -= 14
  }

  if (input.footer) {
    y = 70
    ops.push('0.4 0.4 0.4 rg')
    for (const l of wrap(input.footer, 100)) { text('F1', 8, 50, l); y -= 11 }
  }

  const content = ops.join('\n')
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`
  ]

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')]
  const offsets: number[] = []
  let position = parts[0]!.length
  objects.forEach((body, i) => {
    offsets.push(position)
    const chunk = Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, 'latin1')
    parts.push(chunk)
    position += chunk.length
  })
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`)].join('')
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`, 'latin1'))
  return new Uint8Array(Buffer.concat(parts))
}
