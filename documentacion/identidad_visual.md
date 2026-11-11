# Identidad Visual - Crediestética

Guía de estilos de **Crediestética**, recuperada del proyecto original (`Cliniplanes/cliniplanes-web`) en D9.0 y D9.1. Sustituye como referencia vigente a la guía de Planmed, que se conserva al final como **registro histórico** de la base de la que se partió. Las pruebas `tests/config/visual-identity.test.ts` y `tests/navigation/menus.test.ts` fijan la paleta y los recursos de marca.

## 1. Paleta

| Color | Hex | Uso |
| :--- | :--- | :--- |
| Obsidiana | `#111111` | Texto principal, fondos oscuros (pie, bandas, cabeceras), botón primario |
| Marfil | `#F7F3EE` | Fondo de secciones y páginas; panel del menú al desplazarse |
| Beige | `#E7DDD1` | Bordes de tarjetas, separadores suaves |
| Piedra | `#BBB2AA` | Texto secundario sobre oscuro, bordes de campos, separadores (`/30`) |
| Dorado | `#CBA36B` | Acento: eyebrow, palabra destacada del titular, foco, hover sobre oscuro |
| Bronce | `#755A26` | Enlace activo del menú, etiquetas sobre claro (color primario del `theme.css` original) |
| Gris cálido | `#4c4546` | Texto de apoyo y enlaces del menú sólido |

Variables en `assets/css/theme.css`: `--cred-obsidian`, `--cred-ivory`, `--cred-beige`, `--cred-gold`, `--cred-stone`, `--cred-bronze`, `--cred-radius-pill`, `--cred-radius-card`, `--cred-heading-weight`. No se usan el verde `#0C2619`, el dorado `#D3A76A` ni el blanco `#FCF9F8` de Planmed.

## 2. Tipografía

- **Títulos:** Libre Bodoni (serif). `h1–h3.font-serif` pesan 700 dentro de `.theme-crediestetica` (el original usa extrabold, que Google Fonts sirve como 700). Mayúsculas en titulares de página.
- **Cuerpo e interfaz:** Questrial.
- **Jerarquía:** h1 de hero 36 / 48 / 56 px en Inicio y 36 / 60 / 64 px en Procedimientos (móvil / tablet / escritorio; extrabold, `leading-tight`, `tracking-tight`, medidos en el original: 56 px/64,4 px con -1,4 px y 64 px/80 px con -1,6 px); h2 de sección 32 / 44 px; etiquetas (eyebrow, botones) 11–12 px, negrita, `tracking-[0.1em–0.2em]`, mayúsculas; cuerpo 16–18 px.

## 3. Forma y espaciado

- **Botones:** píldora (`rounded-full`), negrita, `active:scale-95`. Primario obsidiana con texto blanco (invierte al pasar el cursor); dorado sobre fondos oscuros; secundario con borde de 2 px.
- **Tarjetas:** `rounded-xl` (0,75 rem) en tarjetas de contenido; `rounded-[2rem]` en bloques grandes (cabeceras, simulador, clínicas, CTA). Borde `#E7DDD1`, sombra suave.
- **Secciones:** `py-16 md:py-24`, contenedor `max-w-[1200px]` con `px-4 md:px-12`, separador `border-b border-[#BBB2AA]/30`, fondo marfil.
- **Foco:** anillo/contorno dorado `#CBA36B` en todo control interactivo.

## 4. Menú superior (valores medidos en el original, localhost:3002, D9.2)

- Barra **fija** de **80 px** (`h-20`), contenedor `max-w-[1200px] px-4 md:px-12` en el original (en la reconstrucción `max-w-[1280px]` porque tiene más entradas). Logo `logo.png` de `h-12 md:h-16`.
- **Sobre el hero** (Inicio y Procedimientos; `shared/utils/heroRoutes.ts`): fondo transparente, sin blur ni sombra, logo blanco (`brightness-0 invert`), enlaces blancos `text-sm font-bold` (14 px, sin mayúsculas ni espaciado), hover `opacity-80`.
- **Tras desplazar más de 30 px** (y en las demás páginas desde el inicio): `bg-white/70 backdrop-blur-md shadow-sm`, logo a color, enlaces `#000000` con hover `#755A26`.
- **Enlace activo:** `border-b-2 border-[#755A26] pb-1 text-[#755A26]` en ambos estados.
- **Botones:** CTA `bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold border-2`, hover blanco con borde negro; «Iniciar sesión» `px-5 py-2.5 rounded-full border-2` (borde `white/60` sobre el hero, `black/20` en sólido), icono de usuario de 16 px.
- **Ocultamiento:** en escritorio (`md+`) el menú se oculta (`-translate-y-full`) al bajar pasados 100 px y reaparece al subir, con `transition-all duration-300`. En la reconstrucción no se oculta con el menú móvil abierto, con un desplegable abierto ni con el foco dentro del menú (accesibilidad por teclado).
- **Menú móvil:** panel `bg-white/95 backdrop-blur-xl border-t border-gray-100` bajo la barra (`top-20`), enlaces `text-lg font-bold`, en la reconstrucción con `<details>` para submenús.
- **Diferencias deliberadas:** sin selector de idioma (el original tiene i18n; aquí no existe y no se simula); entradas adicionales (Noticias, Conócenos, Nuestros pacientes, Recomendaciones) con el mismo estilo; el menú de escritorio aparece desde 1280 px (el original desde 768 px con 4 entradas); los textos en mayúsculas del código se muestran con mayúscula inicial.
- Colores por variables CSS (`--nav-fg`, `--nav-fg-hover`, `--nav-login-*`) definidas según el estado.

## 5. Pie de página

Fondo `#111111`; texto `#BBB2AA`; enlaces con hover `#CBA36B`; títulos `#F7F3EE`; separador `#BBB2AA/20`; copyright `#BBB2AA/60`. Datos de contacto desde `shared/utils/contact.ts`.

## 6. Cabeceras de página

- **Hero a ancho completo** (Inicio, Procedimientos): `min-h-[600px] md:min-h-[870px]` (Inicio) y `md:min-h-[700px]` (Procedimientos), `pt-24 md:pt-32`, imagen `object-cover` sin velo en Inicio (`home.png`) y con `opacity-50` sobre `#111111` en Procedimientos (`procedures.png`); contenido a la izquierda en un contenedor `max-w-[1200px] px-4 md:px-12`.
- **Cabecera con tarjeta solapada** (Recursos, Nosotros): imagen `h-[60vh] md:h-[70vh] lg:h-[80vh]` con degradado `#111111` (a la derecha en escritorio) y tarjeta `#111111 rounded-2xl p-8 md:p-12 lg:p-16 lg:max-w-[800px] border-[#BBB2AA]/20 shadow-2xl` con `-mt-24 md:-mt-32`; título `text-3xl md:text-4xl lg:text-5xl font-extrabold #F7F3EE`.
- **Cabecera dividida** (Simulador/Financiación): insignia `bg-[#CBA36B]/20`, h1 `text-5xl font-bold`, imagen `rounded-3xl shadow-xl h-[300px]` (`simulador_hero.png`).
- **Tarjeta de cierre** (Procedimientos): `max-w-4xl bg-[#111111] rounded-[2.5rem] p-10 md:p-16 shadow-2xl` con resplandor dorado `bg-[#CBA36B]/20 blur-[100px]`.
- **Cabecera de vista principal** (`CommonPageHero`, usada por Recursos, Clínicas aliadas, Financiación, Noticias, Recomendaciones y páginas institucionales): bloque `#111111` con `rounded-[2rem]`, eyebrow dorado, título serif, sin barra ni círculos decorativos.
- **Cabecera de detalle** (procedimiento, noticia, recomendación): degradado obsidiana → tonos cálidos oscuros (sin verde), tarjetas blancas `rounded-2xl` superpuestas.

## 7. Componentes y estados

- Estado vacío: tarjeta blanca redondeada, borde `#E7DDD1` (discontinuo `#BBB2AA` en Clínicas), texto neutro; no se heredan textos, imágenes ni contactos de otra marca.
- Simulador: solo presentación (tarjetas `rounded-[2rem]`, plazos en píldora, CTA dorado). La fórmula, los límites, los plazos y los mensajes de no disponibilidad no cambian; sin tasa configurada se muestra «Simulación no disponible».

## 8. Responsive

Verificado a 1440, 1280, 768 y 375 px sin desbordes horizontales. Menú de escritorio desde 1280 px (`min-[1280px]`); por debajo, menú móvil.

## 9. Recursos de marca

`public/images/branding/logo.jpg`, `logo.png`, `logo_fondo_transparente.png`, `logo-ico.ico` y `public/images/web/home.png`, `procedures.png`, `nosotros.png`, `simulador_hero.png` son los del proyecto original (`nosotros.png` y `simulador_hero.png` aún sin usar).

---

## Anexo histórico — guía de Planmed (reemplazada)

Se conserva sin cambios el contenido anterior de este archivo, que describía la identidad de **Planmed**. **No aplica a Crediestética.**

Este documento define la guía oficial de estilos, colores, tipografías y baseline estructural de Planmed. 

*Nota:* Cualquier documento de identidad de Crediestética/Cliniplanes es considerado legacy y se encuentra archivado. Los colores y tipografías heredados (como Libre Bodoni, Questrial, #111111, #F7F3EE, #E7DDD1 y #CBA36B) no deben usarse ni presentarse como actuales.

## 1. PALETA DE COLORES

| Color | Hexadecimal | Uso Principal |
| :--- | :--- | :--- |
| **Verde Institucional** | #0C2619 | Fondos de secciones (Hero, Value Prop), botones principales, contrastes dominantes. |
| **Dorado** | #D3A76A | Textos de acento (ej. la palabra "PLAN."), botones secundarios, separadores visuales. |
| **Blanco Base** | #FCF9F8 | Fondos claros para secciones de descanso visual y navegación. |

## 2. SISTEMA TIPOGRÁFICO

- **Tipografía Editorial:** Playfair Display (Utilizada para H1, títulos dominantes y branding editorial).
- **Tipografía de Interfaz / Cuerpo:** Inter (Utilizada para párrafos, botones, UI y calculadoras).

## 3. BASELINE VISUAL INAMOVIBLE

Las siguientes secciones del Home (pages/index.vue y components/home/ValueProposition.vue) han sido aprobadas y fijadas como baseline congelado.

**ESTAS SECCIONES SON BASELINE VISUAL APROBADO — NO MODIFICAR SIN DECISIÓN EXPLÍCITA POSTERIOR.**

### HOME — HERO
- **Titular:**
  TU
  PRÓXIMA
  ETAPA
  EMPIEZA
  CON UN
  PLAN.
- La palabra **PLAN.** utiliza el dorado #D3A76A.
- El fondo principal utiliza verde #0C2619.
- **Copy de Apoyo Aprobado:** "Financia tu procedimiento estético con opciones pensadas para adaptarse a tus posibilidades, sin comprometer tu estilo de vida."
- **CTA:** "SIMULAR FINANCIACIÓN"
- **Composición:** La composición visual dividida, la fotografía (home.png), jerarquía, espaciado y la tarjeta flotante de ejemplo corresponden al baseline aprobado.

### HOME — SEGUNDA SECCIÓN (VALUE PROPOSITION)
- **Titular Aprobado:**
  FINANCIA TU
  PROCEDIMIENTO
  DIRECTAMENTE.
- **Fondo:** Verde institucional (#0C2619).
- **Composición:** Tratamiento editorial y composición actualmente aprobados con separación vertical.
- **Copy Lateral Actualmente Aprobado:** "Nuestro equipo está aquí para ayudarte a explorar diferentes planes de pago, encontrar la mejor opción para ti y garantizar que puedas realizar tu transformación sin preocupaciones financieras."
- **Etiqueta:** "SIN INTERMEDIARIOS INNECESARIOS"
