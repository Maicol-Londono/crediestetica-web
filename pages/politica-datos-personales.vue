<template>
  <SitePageShell title="Política y protección de datos personales" image="/images/web/proteccion_datos.png">
    <div class="space-y-8 text-base md:text-[17px] font-light text-gray-700 leading-relaxed">
      <div class="bg-[#F7F3EE] border border-[#E7DDD1] border-l-[3px] border-l-[#CBA36B] px-5 py-4" data-testid="policy-pending-notice">
        <p class="font-semibold text-[#111111]">Documento en actualización</p>
        <p>Esta página es una estructura provisional: <strong>no es la política de tratamiento de datos personales de Crediestética</strong>. La política oficial, el aviso de privacidad y los formatos se publicarán aquí cuando estén aprobados y la sociedad responsable confirme su identificación legal y sus canales oficiales.</p>
      </div>

      <section v-for="s in pendingSections" :key="s.id" :data-section="s.id" class="space-y-2">
        <h2 class="text-lg font-semibold text-[#111111]">{{ s.heading }}</h2>
        <p>{{ s.note }}</p>
        <p class="text-sm font-semibold text-[#9a7a45]">Pendiente de publicación</p>
      </section>

      <section data-section="canales-contacto" class="space-y-3">
        <h2 class="text-lg font-semibold text-[#111111]">Canales de contacto</h2>
        <p>Para consultas generales puedes comunicarte por los canales de contacto del sitio. El canal oficial para el ejercicio de derechos y reclamaciones está pendiente de confirmación.</p>
        <ul class="grid gap-3 pt-2" aria-label="Canales de contacto">
          <li class="bg-white border border-[#E7DDD1] border-l-[3px] border-l-[#CBA36B] px-5 py-4 text-[#111111] font-medium">
            Correo: <a :href="CONTACT_MAILTO" class="underline underline-offset-4 hover:text-[#9a7a45]">{{ CONTACT_EMAIL }}</a>
          </li>
          <li class="bg-white border border-[#E7DDD1] border-l-[3px] border-l-[#CBA36B] px-5 py-4 text-[#111111] font-medium">
            Celular: <a :href="PHONE_TEL" class="underline underline-offset-4 hover:text-[#9a7a45]">{{ PHONE_DISPLAY }}</a>
          </li>
          <li class="bg-white border border-[#E7DDD1] border-l-[3px] border-l-[#CBA36B] px-5 py-4 text-[#111111] font-medium">
            WhatsApp: <a :href="WHATSAPP_URL" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-[#9a7a45]">{{ WHATSAPP_DISPLAY }}</a>
          </li>
        </ul>
      </section>

      <section data-section="documentos-descargables" class="space-y-3">
        <h2 class="text-lg font-semibold text-[#111111]">Documentos relacionados</h2>
        <ul class="grid gap-3" aria-label="Documentos legales">
          <li v-for="d in documents" :key="d.key" :data-doc="d.key" class="bg-white border border-[#E7DDD1] px-5 py-4 text-[#111111]">
            <span class="font-medium">{{ d.title }}</span>
            <span class="block text-sm text-gray-600">{{ d.purpose }}</span>
            <a v-if="d.url" :href="d.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center min-h-[44px] text-sm font-semibold underline underline-offset-4 hover:text-[#9a7a45]">Ver documento</a>
            <NuxtLink v-else-if="d.route" :to="d.route" class="inline-flex items-center min-h-[44px] text-sm font-semibold underline underline-offset-4 hover:text-[#9a7a45]">Ver en el sitio</NuxtLink>
            <span v-else class="inline-block mt-1 text-sm font-semibold text-[#9a7a45]">Pendiente de publicación</span>
          </li>
        </ul>
      </section>
    </div>
  </SitePageShell>
</template>

<script setup lang="ts">
// Estructura provisional (sin administración) para incorporar la política oficial. NO contiene texto legal: cada sección queda como
// «pendiente de publicación» hasta que exista el documento aprobado. Los documentos y sus enlaces salen de shared/utils/legalDocuments.ts.
// Los PDF heredados de otra sociedad se retiraron del sitio. Pendiente del titular: razón social, correo de PQRS y documentos.
import { useSeoMeta } from '#imports'
import { CONTACT_EMAIL, CONTACT_MAILTO, PHONE_DISPLAY, PHONE_TEL, WHATSAPP_DISPLAY, WHATSAPP_URL } from '#shared/utils/contact'
import { LEGAL_DOCUMENTS, legalDocumentUrl, type LegalDocumentKey } from '#shared/utils/legalDocuments'
useCanonicalUrl()

const pendingSections = [
  { id: 'responsable', heading: 'Responsable del tratamiento', note: 'Razón social, identificación tributaria y datos de la sociedad responsable, pendientes de confirmación.' },
  { id: 'finalidades', heading: 'Finalidades del tratamiento', note: 'Se publicarán con la política oficial aprobada.' },
  { id: 'derechos', heading: 'Derechos de los titulares', note: 'Se publicarán con la política oficial aprobada.' },
  { id: 'consultas-reclamos', heading: 'Procedimientos de consulta y reclamación', note: 'Se publicarán con la política oficial aprobada y el canal oficial de reclamaciones.' },
  { id: 'datos-sensibles', heading: 'Tratamiento de datos sensibles', note: 'Se publicará con la política oficial aprobada.' },
  { id: 'autorizaciones', heading: 'Autorizaciones', note: 'El formato de autorización se publicará cuando esté aprobado.' },
]

const ORDER: LegalDocumentKey[] = ['politicaDatos', 'avisoPrivacidad', 'autorizacionDatos', 'reclamaciones', 'autorizacionCentrales', 'pagare', 'advertencias', 'precontractual']
const documents = ORDER.map(k => ({ ...LEGAL_DOCUMENTS[k], url: legalDocumentUrl(k) }))

useSeoMeta({ title: 'Política y protección de datos personales | Crediestética', ogTitle: 'Política y protección de datos personales | Crediestética', ogType: 'website' })
</script>
