<template>
  <SitePageShell title="Política y protección de datos personales" image="/images/web/proteccion_datos.png">
    <div class="space-y-6 text-base md:text-[17px] font-light text-gray-700 leading-relaxed">
      <p><strong class="font-semibold text-[#111111]">Crediestética</strong> es responsable del uso de la información de nuestro público, por lo anterior, en cumplimiento de la Ley 1581 de 2012, ponemos a su disposición las Políticas de Tratamiento de Datos Personales.</p>
      <p>Para Crediestética es de vital importancia el adecuado tratamiento de los datos personales de sus públicos de interés. Velamos por la confidencialidad de la información de nuestros públicos, gracias a que contamos con el apoyo de las herramientas idóneas tanto técnicas como humanas para el almacenamiento y buen uso de ésta en función de las actividades para las cuales esta información ha sido entregada.</p>
      <p>Usted puede ejercer su derecho a la protección y tratamiento de sus datos personales, tales como a conocerlos o suprimirlos diligenciando el formato de autorización o reclamo de tratamiento de datos personales.</p>

      <ul class="grid gap-3 pt-4" aria-label="Documentos de protección de datos personales" data-section="documentos-descargables">
        <li v-for="d in documents" :key="d.id" :data-doc="d.id">
          <a :href="d.viewUrl" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between gap-4 min-h-[44px] bg-white border border-[#E7DDD1] border-l-[3px] border-l-[#CBA36B] px-5 py-4 text-[#111111] font-medium hover:bg-[#111111] hover:text-white transition-colors">
            <span>{{ d.title }}</span>
            <svg class="w-4 h-4 shrink-0 text-[#CBA36B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            <span class="sr-only">(abre el documento en una pestaña nueva)</span>
          </a>
        </li>
      </ul>
    </div>
  </SitePageShell>
</template>

<script setup lang="ts">
// Página estática (sin administración), sintetizada: texto introductorio y los cuatro documentos
// oficiales. Los documentos salen de shared/utils/legalDocuments.ts (los mismos de /recursos); aquí no se escriben URL.
import { useSeoMeta } from '#imports'
import { publicResourceDocuments } from '#shared/utils/legalDocuments'
useCanonicalUrl()

const documents = publicResourceDocuments()

useSeoMeta({ title: 'Política y protección de datos personales | Crediestética', ogTitle: 'Política y protección de datos personales | Crediestética', ogType: 'website' })
</script>
