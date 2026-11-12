# Estado visual y recuperación de identidad (D9)

D9.0 · 2026-11-10. Línea base para medir la recuperación de la identidad visual de Crediestética. Fuente de verdad: el proyecto original (`Cliniplanes/cliniplanes-web`, HEAD `8a7594e`, leído en modo solo lectura). La evidencia se tomó del código del original y de su build estático (`dist/`), servido en local sin modificarlo.

## 1. Sistema visual del proyecto original

| Elemento | Valor en el original |
|---|---|
| Tipografía de títulos | Libre Bodoni, `font-extrabold` (la fuente de Google se carga 400–700, por lo que se ve como 700) |
| Tipografía de cuerpo | Questrial |
| Colores en uso (frecuencia en sus componentes) | `#111111` (198), `#BBB2AA` (75), `#CBA36B` (68), `#F7F3EE` (44), `#E7DDD1` (28), `#755A26` (23), `#000000` (18), `#43474D` (10) |
| `theme.css` del original | `--color-primary: #755a26`, `--color-secondary: #000000`, `--color-background: #FFFFFF` |
| Fondo de páginas | Marfil `#F7F3EE` en secciones; separadores `border-b border-[#BBB2AA]/30` |
| Anchos | `max-w-[1200px]`, `px-4 md:px-12` |
| Espaciado vertical de secciones | `py-16 md:py-24` |
| Botones | Píldora (`rounded-full`), `font-bold`; primario negro con texto blanco que se invierte al pasar el cursor, `active:scale-95` |
| Tarjetas | `rounded-xl` y `rounded-[2rem]`, sombra suave (`shadow-sm`) |
| Navegación | Fija, transparente sobre el hero y `bg-white/70 backdrop-blur-md shadow-sm` al desplazarse; enlace activo con subrayado y color `#755a26`; CTA píldora |
| Pie de página | Fondo `#111111`; textos `#BBB2AA`, hover `#CBA36B`, títulos `#F7F3EE`, separador `border-[#BBB2AA]/20` |
| Hero | Imagen `home.png` a ancho completo, texto alineado a la izquierda, botones píldora |

## 2. Línea base de la aplicación actual (antes de D9)

La aplicación actual ya usaba la **paleta** y las **fuentes** de Crediestética (correcciones de D2–D3), y los recursos de marca son los originales (verificados por md5). La diferencia estaba en la **composición y la forma**, heredadas de la presentación editorial de Planmed:

- Titulares en mayúsculas de 52–84 px con peso 500–600.
- Botones y tarjetas con esquinas rectas (casi ningún `rounded-*` en las páginas internas).
- Alternancia de bandas blanco y negro con `py-24 md:py-32` y ancho de 1440 px en cabecera y hero.
- Hero dividido (mitad negra y mitad fotografía en escala de grises) con tarjeta flotante.
- Pie de página con todos los textos en dorado.

## 3. Matriz de comparación

La columna «Acción» indica el estado tras D9. «Aplicado» = cambiado en D9; «Pendiente» = brecha confirmada sin tocar; «Sin equivalente» = el original no tiene la página (no se inventó referencia).

| Página | Diseño original (evidencia) | Diseño actual | Diferencia | Acción |
|---|---|---|---|---|
| Home | Hero con imagen a ancho completo, secciones marfil `py-16 md:py-24`, botones píldora, títulos extrabold | Hero dividido, bandas blanco/negro `py-24 md:py-32`, botones rectos | Composición, forma y escala | **Aplicado** (hero a ancho completo, marfil, píldoras, escala 32–64 px). Copy y cifras sin cambios |
| Navegación | Píldora, enlace activo `#755a26`, transparente sobre el hero | Barra marfil sólida, botones rectos | Forma y desenfoque | **Aplicado (D9.0 + D9.1)**: fija y transparente sobre Inicio y Procedimientos con logo blanco, sólida marfil al desplazarse y en el resto de páginas. Sin selector de idioma (no existe la función) ni ocultamiento al desplazar |
| Pie de página | `#BBB2AA` con hover dorado | Todo en dorado | Color | **Aplicado** |
| Catálogo | Hero con imagen, rejilla de tarjetas sobre marfil | Cabecera clara, rejilla cuadrada | Hero y tarjetas | **Aplicado (D9.1)**: hero a ancho completo con `procedures.png`, buscador y filtros en píldora, imágenes `rounded-xl`, CTA `rounded-[2rem]` |
| Detalle de procedimiento | Hero partido en dos columnas sobre marfil, h1 extrabold | Cabecera oscura, tarjetas blancas superpuestas | Composición | **Aplicado parcial (D9.1)**: se elimina el verde de Planmed del degradado y el doble espaciado bajo el menú fijo. Se conserva la composición configurada en el Hub (orden y secciones); el hero partido del original no se replica |
| Noticias / Detalle | — (el original no tiene noticias) | Tarjetas editoriales | — | **Sin equivalente** |
| Recomendaciones | — (no existe en el original) | Cabecera oscura con tarjetas | — | **Sin equivalente** |
| Nuestros Pacientes | — (no existe en el original; solo un componente `BeforeAfterGallery`) | Rejilla antes/después | — | **Sin equivalente** |
| Nosotros | Hero con imagen y título `#F7F3EE`, secciones marfil | Contenido gestionado en el panel | Composición | **Aplicado (D9.1)**: hero y video `rounded-[2rem]`, tarjetas `rounded-xl`, títulos 700. Contenido y almacenamiento sin cambios; estado vacío neutro |
| Clínicas aliadas | Sección «Aliados» con logotipos en tarjetas blancas `rounded-xl` | Lista gestionada en el panel | Composición | **Aplicado (D9.1)**: tarjetas `rounded-[2rem]`, galería y documentos `rounded-xl`, etiquetas `#755A26`. Sin clínicas ni contactos de ejemplo |
| Recursos | Hero con imagen, tarjetas de documentos | Página con tarjetas | Hero y tarjetas | **Aplicado (D9.1)**: cabecera compartida redondeada, tarjetas `rounded-xl`, botones en píldora. Mismos documentos y URLs |
| Simulador | Hero con imagen y panel de controles | Panel dentro de `/financiacion` | Composición | **Aplicado (D9.1, solo presentación)**: tarjetas `rounded-[2rem]`, plazos y CTA en píldora, bandas marfil. Fórmula, límites, plazos y mensajes de no disponibilidad intactos; `simulador_hero.png` sin usar |
| Páginas legales | — (el original usa un modal) | Páginas propias | — | **Sin equivalente** |

## 4. Recursos de marca

| Recurso | Estado |
|---|---|
| `logo.jpg`, `logo_fondo_transparente.png`, `logo-ico.ico`, `home.png` | Ya son los originales (md5 verificado por prueba) |
| `logo.png` | Idéntico al del original |
| Fotografías de procedimientos, equipo y fondos del original (`public/images/procedures`, `team`, `web`) | Existen en el original; **no se copiaron** en D9. Cada una requiere verificar su uso y autorización antes de incorporarla |
| Fuentes | Libre Bodoni y Questrial desde Google Fonts, igual que el original (`app.vue`) |

## 5. Tokens y cambios globales de D9

Archivos: `assets/css/theme.css`, `assets/css/tailwind.css`, `layouts/default.vue`.

| Token / regla | Valor | Uso |
|---|---|---|
| `--cred-bronze` | `#755A26` | Acento del enlace activo (color primario del `theme.css` original) |
| `--cred-radius-pill` | `9999px` | Forma de botones |
| `--cred-radius-card` | `0.75rem` | Forma de tarjetas |
| `--cred-heading-weight` | `700` | Peso de `h1–h3.font-serif` |
| `.theme-crediestetica` | clase en el layout público | Limita las reglas globales al sitio público; el panel administrativo no cambia |
| `.theme-crediestetica :is(h1,h2,h3).font-serif` | peso 700 | Títulos como el original |
| `.theme-crediestetica ::selection` | fondo dorado | Selección de texto como el original |

## 6. Cambios aplicados en D9 (solo presentación)

- **Navbar** (`components/layout/Navbar.vue`): fondo marfil translúcido con desenfoque y sombra; enlace activo en `#755A26`; botones «Simular financiación» e «Iniciar sesión» en píldora; menús desplegables con esquinas redondeadas; anillo de foco dorado. Sin cambios de enlaces, `data-testid`, accesibilidad ni lógica de datos.
- **Footer** (`components/layout/Footer.vue`): textos en `#BBB2AA`, hover dorado, títulos `#F7F3EE`, separador y copyright en gris piedra. Mismos enlaces y datos.
- **Home** (`pages/index.vue` y `components/home/*`): hero a ancho completo con velo oscuro, tarjeta de ejemplo redondeada, botones en píldora, secciones sobre marfil con separador y `py-16 md:py-24`, escala de titulares 32–64 px, imágenes de procedimientos con esquinas redondeadas. Mismo texto, mismas cifras, mismos enlaces y `data-testid`.

## 7. Verificación de D9

- Medición de la Home a 1440, 1280, 768 y 375 px: sin desbordes horizontales; hero de 830, 830, 1068 y 891 px de alto; títulos de 64, 64, 52 y 40 px; pie en `#BBB2AA`.
- Los resultados de la suite, el typecheck y el build están en el informe de la etapa.
- **Limitación:** no se hicieron capturas de pantalla lado a lado. El modal precontractual cubre la página y aceptarlo equivale a aceptar condiciones en nombre del usuario; no se hizo. La comparación se basó en el código de ambos proyectos y en estilos calculados.

## 8. Contradicción documental pendiente de decisión

`documentacion/identidad_visual.md` define la identidad de **Planmed** (verde `#0C2619`, dorado `#D3A76A`, Playfair Display e Inter) y dice que la de Crediestética es «legacy». Eso contradice el proyecto original y las pruebas actuales (`tests/config/visual-identity.test.ts`). No se modificó el documento.

## 9. D9.1 · Recuperación visual integral (2026-11-10)

**Auditoría complementaria.** Residuos de Planmed hallados y corregidos: degradado verde `#12392a` en las cabeceras de detalle de procedimiento, noticia y recomendación; barra dorada y círculos decorativos en `CommonPageHero`; botones y tarjetas rectos en Recursos, Clínicas, Nosotros y simulador; etiquetas `#9a7a45` (sustituidas por el bronce `#755A26`); bordes `#cfc4c5` en el simulador. Diferencia **funcional** (no tocada): el original tiene selector de idioma (i18n); aquí no existe y no se simula.

**Cambios.** `components/layout/Navbar.vue` (transparente/sólido por ruta y scroll, logo blanco, variables `--nav-*`), `layouts/default.vue` (`pt-[88px]` fuera de hero), `shared/utils/heroRoutes.ts` (nuevo), `pages/index.vue` (hero bajo el menú), `pages/procedimientos/index.vue` (hero a ancho completo), `components/common/PageHero.vue`, `pages/recursos.vue`, `components/site/ClinicsList.vue`, `pages/nosotros.vue`, `pages/financiacion.vue`, `components/simulator/SimulatorPanel.vue` (solo clases), cabeceras de `[slug]` de procedimientos y noticias y `RecommendationShell.vue`. Documento de identidad reescrito: `documentacion/identidad_visual.md`.

**Pendiente.** Hero partido de dos columnas en el detalle; uso de `nosotros.png` y `simulador_hero.png`; capturas lado a lado (el modal precontractual cubre la página y no se acepta en nombre del usuario).

## 10. D9.2 · Inspección con Chrome y réplica de estilos (2026-11-10)

Fuente de verdad visual: el original servido en `localhost:3002`. Reconstrucción: `localhost:3000`. Valores medidos con `getComputedStyle` en Chrome (viewport real de 1600 px; el navegador no permitió fijar anchos menores, por lo que 1280, 768 y 375 px se midieron con un `iframe` del ancho indicado).

| Elemento | Original (3002) | Reconstrucción antes de D9.2 | Corrección |
|---|---|---|---|
| Barra | fija, 80 px, `max-w-[1200px]`, sin borde | 88 px, marfil `#F7F3EE/90`, borde | 80 px, `bg-white/70 backdrop-blur-md shadow-sm`, sin borde |
| Enlaces | 14 px `font-bold`, sentence case, `gap-8`, blancos sobre hero, `#000` en sólido | 11 px mayúsculas con tracking 0,1 em | 14 px bold, mayúscula inicial, `gap-6` |
| Activo | `border-b-2 #755A26 pb-1` | solo «Inicio», dorado | por ruta (`router-link-active`), `#755A26` |
| CTA / login | negro `rounded-full px-6 py-2.5` / borde `px-5 py-2.5` | 10–11 px mayúsculas | 14 px bold, mismas proporciones |
| Logo | `logo.png` `h-12 md:h-16`, blanco con `brightness-0 invert` sobre hero | `logo.jpg` a color al desplazar | `logo.png` en ambos estados |
| Scroll | transparente → blanco/70 tras 30 px; se oculta al bajar >100 px (md+) | solo cambio de color | réplica, sin ocultar con menú abierto/foco |
| Hero Inicio | `min-h-[870px]`, `pt-32`, sin velo, h1 56 px extrabold -1,4 px | velo 70–90 %, h1 64 px | réplica; texto de la Home sin cambios |
| Hero Procedimientos | 700 px, imagen al 50 % sobre `#111` | sin imagen | réplica con `procedures.png` |
| Recursos / Nosotros | imagen 80vh + tarjeta oscura solapada | bloque oscuro contenido | réplica (contenido propio) |
| Simulador | cabecera dividida con imagen `rounded-3xl` | `PageHero` oscuro | réplica con `simulador_hero.png`; panel y lógica intactos |
| Pie | `py-16 md:py-24`, `#BBB2AA`, títulos `#F7F3EE` | ya coincidía | sin cambios |

**Recursos.** Todas las imágenes del original (`public/images/web`) ya existen idénticas en la reconstrucción (comparadas byte a byte); `confianza.png` y `simulador_hero.png` ahora se usan. `public/images/team/equipo-crediestetica.png` (portada de Nosotros del original) no se copió: el contenido de Nosotros se gestiona en el panel.

**Limitaciones.** El original no tiene datos de procedimientos en local, por lo que no se pudo medir la tarjeta del catálogo ni el detalle; Nosotros y las clínicas en la reconstrucción muestran su estado vacío, así que la portada de Nosotros se verificó por código y no por captura. El selector de idioma del original no se replica (no hay i18n).
