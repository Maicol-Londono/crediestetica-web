<template>
  <div class="bg-white font-sans text-[#111111] selection:bg-[#111111] selection:text-white">

    <!-- 1. HERO: editorial, texto sobre negro y fotografía a sangre con degradado (el menú transparente se superpone) -->
    <section class="relative bg-[#111111] overflow-hidden" aria-labelledby="srv-hero-title">
      <div class="absolute inset-y-0 right-0 w-full lg:w-[62%]">
        <img :src="img('hero')" alt="Profesional de la salud conversando con una paciente en una sala de estética moderna" width="1098" height="619" fetchpriority="high" class="w-full h-full object-cover object-[70%_center]" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/70 to-[#111111]/40 lg:bg-gradient-to-r lg:from-[#111111] lg:via-[#111111]/40 lg:to-transparent" aria-hidden="true"></div>
        <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" aria-hidden="true"></div>
      </div>
      <div class="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 pt-36 pb-20 md:pt-44 md:pb-28 lg:min-h-[720px] flex items-center">
        <div class="max-w-[620px]">
          <p class="inline-block bg-[#CBA36B] text-[#111111] px-4 py-1.5 rounded-full font-bold text-[11px] md:text-xs tracking-[0.15em] mb-6">CREDIESTÉTICA · SERVICIOS</p>
          <h1 id="srv-hero-title" class="font-serif text-4xl md:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">Bienestar, estética y nuevas posibilidades para ti.</h1>
          <p class="mt-6 text-base md:text-lg text-white/80 font-light leading-relaxed">Conoce las diferentes alternativas de procedimientos médicos y estéticos disponibles a través de Crediestética. Te orientamos para encontrar opciones acordes con tus objetivos y te acompañamos en el proceso de acceder a ellas.</p>
          <div class="mt-9 flex flex-col sm:flex-row gap-4">
            <a href="#categorias" class="btn btn-gold" @click.prevent="goTo('categorias')">Explorar procedimientos</a>
            <NuxtLink to="/financiacion#calculadora" class="btn btn-outline-light">Simular financiación</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. INTRODUCCIÓN + navegación interna -->
    <section id="categorias" class="scroll-mt-24 bg-[#F7F3EE]" aria-labelledby="srv-intro-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div class="lg:col-span-6">
          <h2 id="srv-intro-title" class="h2">Cada objetivo es diferente. Tu camino también.</h2>
          <div class="prose-p mt-6">
            <p>Sabemos que cada persona tiene motivaciones, necesidades y expectativas diferentes. Por eso, en Crediestética encontrarás alternativas en diferentes áreas de la medicina, la estética y el bienestar.</p>
            <p>Desde procedimientos quirúrgicos hasta tratamientos estéticos y cuidado personal, te brindamos orientación para conocer las opciones disponibles y encontrar el camino que mejor se adapte a tus objetivos.</p>
          </div>
          <nav class="mt-8" aria-label="Categorías de servicios">
            <ul class="flex flex-wrap gap-2.5">
              <li v-for="c in categories" :key="c.id">
                <a :href="`#${c.id}`" class="chip" @click.prevent="goTo(c.id)">{{ c.label }}</a>
              </li>
            </ul>
          </nav>
        </div>
        <div class="lg:col-span-6 relative pb-10 md:pb-14">
          <img :src="img('hero_3')" alt="Especialista realizando una valoración facial a una paciente en un consultorio luminoso" width="1449" height="603" loading="lazy" class="w-full aspect-[4/3] object-cover rounded-2xl shadow-xl" />
          <img :src="img('hero_2')" alt="Detalle de la piel y el contorno corporal" width="1133" height="620" loading="lazy" class="absolute -bottom-0 left-4 md:-left-8 w-[48%] aspect-square object-cover rounded-2xl border-[6px] border-[#F7F3EE] shadow-xl" />
        </div>
      </div>
    </section>

    <!-- 3. PROCEDIMIENTOS QUIRÚRGICOS -->
    <section id="quirurgicos" class="scroll-mt-24 bg-white" aria-labelledby="srv-quirurgicos-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div class="lg:col-span-6 relative pb-10">
          <img :src="img('procedimientos_quirurgicos')" alt="Cirujano plástico explicando una valoración a una paciente en consulta" width="1098" height="616" loading="lazy" class="w-full aspect-[4/3] object-cover rounded-2xl shadow-xl" />
          <img :src="img('procedimientos_quirurgicos_2')" alt="Consulta médica de orientación previa a un procedimiento" width="1091" height="591" loading="lazy" class="hidden md:block absolute -bottom-0 -right-6 w-[42%] aspect-[4/3] object-cover rounded-2xl border-[6px] border-white shadow-xl" />
        </div>
        <div class="lg:col-span-6">
          <p class="eyebrow">Cirugía plástica y estética</p>
          <h2 id="srv-quirurgicos-title" class="h2 mt-3">Procedimientos quirúrgicos</h2>
          <p class="lead">Transforma tus objetivos en un proyecto de bienestar.</p>
          <div class="prose-p mt-5">
            <p>Accede a un amplio catálogo de procedimientos de cirugía plástica y estética realizados por profesionales médicos en clínicas e instituciones especializadas.</p>
            <p>Te acompañamos en la búsqueda de alternativas, la orientación inicial y el proceso de financiación, para que puedas conocer las opciones disponibles y tomar decisiones informadas sobre tu procedimiento.</p>
          </div>
          <h3 class="h3 mt-8">Algunas áreas</h3>
          <ul class="mt-3 grid sm:grid-cols-2 gap-x-8">
            <li v-for="a in surgeryAreas" :key="a" class="area-item">{{ a }}</li>
          </ul>
          <p class="note mt-6">Los procedimientos, su indicación y su realización están sujetos a valoración médica, disponibilidad y criterios de cada institución o profesional.</p>
          <div class="mt-8"><NuxtLink to="/procedimientos" class="btn btn-dark">Explorar cirugías</NuxtLink></div>
        </div>
      </div>
    </section>

    <!-- 4. MÍNIMAMENTE INVASIVOS -->
    <section id="minimamente-invasivos" class="scroll-mt-24 bg-[#EFE7DC]" aria-labelledby="srv-mi-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div class="lg:col-span-6 order-2 lg:order-1">
          <p class="eyebrow">Tratamientos estéticos</p>
          <h2 id="srv-mi-title" class="h2 mt-3">Procedimientos mínimamente invasivos</h2>
          <p class="lead">Pequeños cambios, acompañamiento profesional.</p>
          <div class="prose-p mt-5">
            <p>Conoce diferentes alternativas de tratamientos estéticos que buscan mejorar la apariencia, el cuidado facial y determinadas características de la piel, sin recurrir necesariamente a procedimientos quirúrgicos.</p>
            <p>Te orientamos sobre las opciones disponibles para que puedas conocer sus características y recibir la valoración correspondiente de un profesional.</p>
          </div>
          <blockquote class="mt-8 border-l-2 border-[#CBA36B] pl-5 text-[#43474d] font-light leading-relaxed">Entre las alternativas pueden encontrarse tratamientos estéticos faciales, procedimientos dermatológicos estéticos y otros servicios de acuerdo con nuestro catálogo disponible.</blockquote>
          <div class="mt-8"><NuxtLink to="/procedimientos" class="btn btn-dark">Conocer tratamientos</NuxtLink></div>
        </div>
        <div class="lg:col-span-6 order-1 lg:order-2 relative pb-10">
          <img :src="img('procedimientos_minimamente_invasivos')" alt="Especialista aplicando un tratamiento estético facial" width="1137" height="616" loading="lazy" class="w-full aspect-[4/3] object-cover rounded-2xl shadow-xl" />
          <img :src="img('procedimientos_minimamente_invasivos_2')" alt="Cuidado facial y de la piel" width="617" height="617" loading="lazy" class="hidden md:block absolute -bottom-0 -left-8 w-[34%] aspect-square object-cover rounded-2xl border-[6px] border-[#EFE7DC] shadow-xl" />
        </div>
      </div>
    </section>

    <!-- 5. DEPILACIÓN -->
    <section id="depilacion" class="scroll-mt-24 bg-[#111111] text-white" aria-labelledby="srv-depi-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div class="lg:col-span-6">
          <p class="eyebrow !text-[#CBA36B]">Cuidado de la piel</p>
          <h2 id="srv-depi-title" class="h2 !text-white mt-3">Depilación y cuidado de tu piel</h2>
          <p class="lead !text-[#CBA36B]">Una experiencia de cuidado para sentirte cómoda contigo.</p>
          <div class="prose-p !text-white/75 mt-5">
            <p>Descubre alternativas de depilación para diferentes zonas del cuerpo, con tratamientos orientados al cuidado de la piel y a la reducción progresiva del vello.</p>
            <p>Puedes consultar opciones para diferentes áreas, de acuerdo con tus necesidades y la disponibilidad de los tratamientos.</p>
          </div>
          <h3 class="sr-only">Zonas del cuerpo</h3>
          <ul class="mt-8 flex flex-wrap gap-2.5" aria-label="Zonas del cuerpo">
            <li v-for="z in depilationZones" :key="z" class="px-4 py-2 rounded-full border border-[#CBA36B]/50 text-sm text-white/90">{{ z }}</li>
          </ul>
          <div class="mt-9"><a :href="advisory('Hola, quiero consultar las opciones de depilación disponibles.')" target="_blank" rel="noopener noreferrer" class="btn btn-gold">Consultar opciones de depilación</a></div>
        </div>
        <div class="lg:col-span-6">
          <img :src="img('depilacion_corporal')" alt="Cuidado de la piel y depilación corporal" width="1030" height="581" loading="lazy" class="w-full aspect-[4/3] object-cover rounded-2xl shadow-2xl ring-1 ring-[#CBA36B]/30" />
        </div>
      </div>
    </section>

    <!-- 6. ALIANZAS COMERCIALES: propuesta B2B (reemplaza a «Estética corporal»). Sin cifras ni porcentajes: las condiciones se pactan con cada aliado. -->
    <section id="alianzas-comerciales" class="scroll-mt-24 bg-white border-t-4 border-[#CBA36B]" aria-labelledby="srv-alianzas-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-16 md:pb-20">
        <div class="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div class="lg:col-span-6">
            <p class="eyebrow">Alianzas comerciales</p>
            <h2 id="srv-alianzas-title" class="h2 mt-3">Crece con nosotros. Conecta oportunidades y genera ingresos.</h2>
            <div class="prose-p mt-6">
              <p>En Crediestética creemos en el poder de las alianzas. Por eso, invitamos a spas, centros de estética, profesionales y empresas relacionadas con el bienestar y la belleza a formar parte de nuestra red de aliados.</p>
              <p>Si tienes clientes o usuarios interesados en realizarse procedimientos médicos y estéticos, puedes conectarlos con Crediestética y convertir esas recomendaciones en nuevas oportunidades de negocio.</p>
            </div>
            <div class="mt-9"><a :href="allyHref" target="_blank" rel="noopener noreferrer" class="btn btn-dark" data-testid="ally-cta-top">Conviértete en aliado de Crediestética</a></div>
          </div>
          <div class="lg:col-span-6">
            <div class="relative">
              <img :src="img('convenio_comercial')" alt="Dos profesionales del sector de la belleza y el bienestar conversan sobre una colaboración comercial en un espacio elegante" width="1672" height="941" loading="lazy" class="w-full aspect-[4/3] object-cover rounded-2xl shadow-xl" />
              <span class="hidden md:block absolute -bottom-4 -left-4 w-24 h-24 border-l-2 border-b-2 border-[#CBA36B] rounded-bl-2xl" aria-hidden="true"></span>
            </div>
          </div>
        </div>

        <div class="mt-16 md:mt-20">
          <h3 class="font-serif text-2xl md:text-3xl font-bold text-[#111111]">¿Cómo funciona?</h3>
          <ol class="mt-8 grid md:grid-cols-3 gap-0 md:gap-0 border-t border-[#CBA36B]/60" aria-label="Pasos para ser aliado">
            <li v-for="(s, i) in allySteps" :key="s.title" class="relative py-8 md:py-10 md:px-8 first:md:pl-0 last:md:pr-0 border-b md:border-b-0 md:border-r last:md:border-r-0 border-[#E7DDD1]">
              <span class="font-serif text-5xl text-[#CBA36B] leading-none" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <h4 class="mt-4 font-serif text-xl font-bold text-[#111111]"><span class="sr-only">Paso {{ i + 1 }}: </span>{{ s.title }}</h4>
              <p class="prose-p mt-3">{{ s.text }}</p>
            </li>
          </ol>
          <p class="note mt-2">La compensación económica es parte de un acuerdo comercial entre empresas, depende de las condiciones pactadas con cada aliado y de su cumplimiento, y está sujeta a la revisión de cumplimiento normativo y ético que corresponda. El aliado conecta a las personas interesadas con Crediestética: no diagnostica, no recomienda tratamientos ni interviene en decisiones médicas, y no debe solicitar ni compartir información clínica o datos sensibles sin la autorización correspondiente.</p>
        </div>

      </div>
      <div class="relative overflow-hidden bg-[#111111]">
        <img :src="img('convenio_comercial_2')" alt="Dos profesionales se dan la mano para cerrar una alianza comercial" width="1774" height="887" loading="lazy" class="absolute inset-0 w-full h-full object-cover object-right" />
        <div class="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/90 to-[#111111]/55" aria-hidden="true"></div>
        <div class="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 py-14 md:py-20 grid lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-8">
            <h3 class="font-serif text-2xl md:text-3xl font-bold text-white leading-snug">¿Tienes un spa, centro de estética o negocio relacionado con el bienestar?</h3>
            <p class="mt-4 text-white/75 font-light leading-relaxed">Hagamos equipo y exploremos nuevas oportunidades de crecimiento. En Crediestética queremos construir alianzas que generen valor para ambas partes.</p>
          </div>
          <div class="lg:col-span-4 lg:text-right">
            <a :href="allyHref" target="_blank" rel="noopener noreferrer" class="btn btn-gold" data-testid="ally-cta-bottom">Conviértete en aliado de Crediestética</a>
          </div>
        </div>
      </div>
    </section>

    <!-- 7. MICROIMPLANTE CAPILAR -->
    <section id="microimplante-capilar" class="scroll-mt-24 bg-[#F7F3EE]" aria-labelledby="srv-capilar-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div class="lg:col-span-5 grid grid-cols-2 gap-3 md:gap-4">
          <img :src="img('microimplante_capilar')" alt="Especialista marcando la línea capilar de un paciente durante una valoración" width="928" height="617" loading="lazy" class="col-span-2 w-full aspect-[4/3] object-cover rounded-2xl shadow-lg" />
          <img :src="img('microimplante_capilar_2')" alt="Valoración capilar individual" width="928" height="616" loading="lazy" class="col-span-2 w-full aspect-[16/9] object-cover rounded-2xl shadow-lg" />
        </div>
        <div class="lg:col-span-7">
          <p class="eyebrow">Valoración individual</p>
          <h2 id="srv-capilar-title" class="h2 mt-3">Microimplante capilar</h2>
          <p class="lead">Recupera la confianza en cada detalle.</p>
          <div class="prose-p mt-5">
            <p>Conoce las alternativas de microimplante capilar orientadas a restaurar o mejorar la densidad del cabello en diferentes zonas, mediante procedimientos especializados y valoración individual.</p>
          </div>
          <ol class="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-6">
            <li v-for="(z, i) in hairAreas" :key="z.title" class="border-t border-[#CBA36B]/60 pt-4">
              <span class="font-serif text-[#9a7a45] text-lg">{{ String(i + 1).padStart(2, '0') }}</span>
              <h3 class="h3 !mt-1">{{ z.title }}</h3>
              <p class="prose-p !text-[15px] mt-2">{{ z.text }}</p>
            </li>
          </ol>
          <p class="note mt-8">La viabilidad del procedimiento depende de la valoración médica, las condiciones de la zona y las características de cada paciente.</p>
          <div class="mt-8"><a :href="advisory('Hola, quiero consultar sobre microimplante capilar.')" target="_blank" rel="noopener noreferrer" class="btn btn-dark">Consultar microimplante capilar</a></div>
        </div>
      </div>
    </section>

    <!-- 9. ACOMPAÑAMIENTO -->
    <section class="bg-[#EFE7DC]" aria-labelledby="srv-acomp-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-16 md:py-24">
        <div class="max-w-3xl">
          <h2 id="srv-acomp-title" class="h2">Más que un procedimiento, una experiencia de acompañamiento.</h2>
          <p class="prose-p mt-5">En Crediestética buscamos facilitar el acceso a diferentes alternativas a través de un modelo de atención que integra orientación, acompañamiento y soluciones de financiación.</p>
        </div>
        <ul class="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 lg:divide-x divide-[#CBA36B]/40">
          <li v-for="a in attributes" :key="a.title" class="py-6 lg:py-2 lg:px-8 first:lg:pl-0 last:lg:pr-0">
            <span class="flex w-12 h-12 items-center justify-center rounded-full border border-[#CBA36B] text-[#755A26]" aria-hidden="true">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path v-for="d in a.icon" :key="d" :d="d" /></svg>
            </span>
            <h3 class="font-serif text-xl text-[#111111] mt-5">{{ a.title }}</h3>
            <p class="prose-p !text-[15px] mt-2">{{ a.text }}</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- 10. CTA FINAL -->
    <section class="relative bg-[#111111] overflow-hidden" aria-labelledby="srv-cta-title">
      <img :src="img('cierre_pagina')" alt="" aria-hidden="true" width="932" height="525" loading="lazy" class="absolute inset-0 w-full h-full object-cover object-[70%_center]" />
      <div class="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/85 to-[#111111]/30" aria-hidden="true"></div>
      <div class="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 py-20 md:py-32">
        <div class="max-w-[620px]">
          <h2 id="srv-cta-title" class="font-serif text-3xl md:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">El primer paso comienza con una decisión.</h2>
          <p class="mt-6 text-base md:text-lg text-white/80 font-light leading-relaxed">Conoce tus opciones, resuelve tus dudas y recibe orientación para encontrar alternativas que se adapten a tus objetivos.</p>
          <p class="mt-3 text-base md:text-lg text-white/80 font-light leading-relaxed">Estamos aquí para ayudarte a comenzar.</p>
          <div class="mt-9 flex flex-col sm:flex-row gap-4">
            <a :href="advisory('Hola, quiero recibir asesoría sobre los servicios de Crediestética.')" target="_blank" rel="noopener noreferrer" class="btn btn-gold">Recibir asesoría</a>
            <NuxtLink to="/financiacion#calculadora" class="btn btn-outline-light">Simular financiación</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Página «Servicios»: contenido estático gestionado desde el código (sin administración). Las fotografías viven en
// /public/images/web/servicios. Enlaces: catálogo (/procedimientos), simulador (/financiacion#calculadora) y WhatsApp oficial
// (shared/utils/contact.ts) para solicitar asesoría; no se crean rutas nuevas.
import { useSeoMeta, useHead, useSiteConfig } from '#imports'
import { whatsappUrlWithText } from '#shared/utils/contact'

const img = (name: string) => `/images/web/servicios/${name}.png`
const advisory = (text: string) => whatsappUrlWithText(text)

const categories = [
  { id: 'quirurgicos', label: 'Procedimientos quirúrgicos' },
  { id: 'minimamente-invasivos', label: 'Mínimamente invasivos' },
  { id: 'depilacion', label: 'Depilación' },
  { id: 'microimplante-capilar', label: 'Microimplante capilar' }
]

const surgeryAreas = [
  'Cirugía mamaria',
  'Cirugía abdominal y corporal',
  'Procedimientos de contorno corporal',
  'Cirugía facial',
  'Cirugía reconstructiva',
  'Otros procedimientos disponibles en nuestro catálogo'
]

const allyHref = advisory('Hola, estoy interesado(a) en conocer cómo puedo convertirme en aliado comercial de Crediestética y generar ingresos mediante la referencia de pacientes. Me gustaría recibir información sobre los requisitos y las condiciones de colaboración.')
const allySteps = [
  { title: 'Conviértete en aliado', text: 'Establecemos una relación comercial con tu empresa o establecimiento para explorar oportunidades de colaboración.' },
  { title: 'Refiere pacientes', text: 'Recomienda nuestros servicios a personas interesadas en procedimientos médicos y estéticos. Nosotros nos encargamos de orientar al paciente durante su proceso.' },
  { title: 'Genera ingresos', text: 'Cuando un paciente referido concreta su procedimiento quirúrgico, podrás recibir una compensación económica de acuerdo con las condiciones comerciales previamente acordadas.' }
]

const depilationZones = ['Rostro', 'Axilas', 'Brazos', 'Piernas', 'Espalda', 'Zona de bikini', 'Otras zonas corporales']

const hairAreas = [
  { title: 'Zona frontal', text: 'Alternativas orientadas a la recuperación o definición de la línea capilar.' },
  { title: 'Coronilla', text: 'Opciones para áreas de menor densidad capilar.' },
  { title: 'Cejas', text: 'Procedimientos especializados para restauración o definición.' },
  { title: 'Barba', text: 'Alternativas para mejorar densidad y apariencia.' }
]

const attributes = [
  { title: 'Alternativas de financiación', text: 'Conoce las opciones disponibles para planificar económicamente tu procedimiento.', icon: ['M4.5 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M2.5 10h19', 'M6.5 15h4'] },
  { title: 'Orientación personalizada', text: 'Recibe asesoría para conocer las alternativas disponibles según tus objetivos.', icon: ['M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z'] },
  { title: 'Conexión con servicios especializados', text: 'Explora alternativas en diferentes ciudades y servicios disponibles.', icon: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', 'M12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'] },
  { title: 'Acompañamiento durante tu proceso', text: 'Te orientamos para avanzar de forma organizada desde tu consulta inicial.', icon: ['M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11z'] }
]

// Desplazamiento suave a la sección; sin animación si el usuario prefiere reducir el movimiento.
function goTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}

const description = 'Conoce los servicios de Crediestética: procedimientos quirúrgicos, tratamientos estéticos, depilación, microimplante capilar, alianzas comerciales y alternativas de financiación.'
useSeoMeta({ title: 'Servicios Médicos y Estéticos | Crediestética', ogTitle: 'Servicios Médicos y Estéticos | Crediestética', description, ogDescription: description, ogType: 'website', ogImage: '/images/web/servicios/hero.png' })
useHead({ link: [{ rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}/servicios` }] })
</script>

<style scoped>
.h2 { font-family: var(--font-serif, serif); font-size: clamp(1.875rem, 3.2vw, 2.75rem); line-height: 1.12; font-weight: 700; color: #111111; letter-spacing: -0.01em; }
.h3 { font-family: var(--font-serif, serif); font-size: 1.25rem; font-weight: 500; color: #9a7a45; }
.lead { font-family: var(--font-serif, serif); font-style: italic; font-size: 1.25rem; line-height: 1.4; color: #755A26; margin-top: 0.75rem; }
.eyebrow { font-size: 0.6875rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; color: #755A26; }
.prose-p { color: #4b5563; font-weight: 300; font-size: 1.0625rem; line-height: 1.75; }
.prose-p > * + * { margin-top: 1rem; }
.note { font-size: 0.8125rem; line-height: 1.6; color: #6b6259; font-style: italic; border-top: 1px solid rgba(203, 163, 107, 0.5); padding-top: 1rem; }
.area-item { position: relative; padding: 0.7rem 0 0.7rem 1.5rem; border-bottom: 1px solid #E7DDD1; color: #111111; font-weight: 400; }
.area-item::before { content: ''; position: absolute; left: 0; top: 1.2rem; width: 7px; height: 7px; border-radius: 9999px; background: #CBA36B; }
.chip { display: inline-block; padding: 0.55rem 1rem; border: 1px solid #CBA36B; border-radius: 9999px; font-size: 0.8125rem; font-weight: 600; color: #111111; background: transparent; transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
.chip:hover { background: #111111; color: #ffffff; border-color: #111111; }
.chip:active { transform: scale(0.97); }
.chip:focus-visible, .btn:focus-visible { outline: 2px solid #CBA36B; outline-offset: 3px; }
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 3.25rem; padding: 0.9rem 2rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 9999px; text-align: center; transition: background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.15s; }
.btn:active { transform: scale(0.97); }
.btn-gold { background: #CBA36B; color: #111111; }
.btn-gold:hover { background: #d9b37d; }
.btn-dark { background: #111111; color: #ffffff; }
.btn-dark:hover { background: #333333; }
.btn-outline-light { border: 1.5px solid rgba(255, 255, 255, 0.7); color: #ffffff; }
.btn-outline-light:hover { background: #ffffff; color: #111111; }
@media (prefers-reduced-motion: reduce) { .btn, .chip { transition: none; } .btn:active, .chip:active { transform: none; } }
</style>
