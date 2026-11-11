<!-- Contenido único de la información precontractual (modal global y página /informacion-precontractual). Texto en shared/utils/precontractualContent.ts -->
<script setup lang="ts">
import { computed } from 'vue'
import { LEGAL_ISSUER_LABEL, LEGAL_IDENTITY_CONFIRMED, LEGAL_NIT, PQRS_EMAIL } from '#shared/utils/legalIdentity'
import { CONTACT_EMAIL, CONTACT_MAILTO } from '#shared/utils/contact'
import { precontractualSections, PRECONTRACTUAL_ACCEPTANCE_CLOSING } from '#shared/utils/precontractualContent'
import { LEGAL_DOCUMENTS, legalDocumentUrl, type LegalDocumentKey } from '#shared/utils/legalDocuments'

const sections = precontractualSections(LEGAL_ISSUER_LABEL)

// Solo se listan los documentos que ya tienen un enlace oficial válido; mientras estén pendientes no se muestra nada.
const RELATED: LegalDocumentKey[] = ['politicaDatos', 'avisoPrivacidad', 'autorizacionDatos', 'advertencias', 'pagare', 'autorizacionCentrales']
const related = computed(() => RELATED.map(k => ({ key: k, title: LEGAL_DOCUMENTS[k].title, url: legalDocumentUrl(k) })).filter(d => d.url))
</script>

<template>
  <div class="space-y-6" data-testid="precontractual-content">
    <section data-section="identificacion">
      <h3 class="text-xs font-bold uppercase tracking-wider text-[#9a7a45] mb-2">Identificación de la sociedad</h3>
      <p>
        El presente documento es suministrado por <strong>{{ LEGAL_ISSUER_LABEL }}</strong><template v-if="LEGAL_IDENTITY_CONFIRMED">, sociedad identificada con <strong>NIT. {{ LEGAL_NIT }}</strong></template><template v-if="PQRS_EMAIL"> y cuyos canales oficiales para la atención de Peticiones, Quejas y Reclamos se encuentran disponibles en el correo electrónico institucional: <a :href="`mailto:${PQRS_EMAIL}`" class="font-semibold text-[#111111] underline underline-offset-4 hover:text-[#9a7a45]">{{ PQRS_EMAIL }}</a></template>.
        Para consultas generales puede escribir a <a :href="CONTACT_MAILTO" class="font-semibold text-[#111111] underline underline-offset-4 hover:text-[#9a7a45]">{{ CONTACT_EMAIL }}</a>.
      </p>
    </section>

    <section v-if="related.length" data-section="documentos-relacionados">
      <h3 class="text-xs font-bold uppercase tracking-wider text-[#9a7a45] mb-2">Documentos relacionados</h3>
      <ul class="list-disc pl-5">
        <li v-for="d in related" :key="d.key">
          <a :href="d.url!" target="_blank" rel="noopener noreferrer" class="inline-flex items-center min-h-[44px] py-1 font-semibold text-[#111111] underline underline-offset-4 hover:text-[#9a7a45]">{{ d.title }}</a>
        </li>
      </ul>
    </section>

    <section v-for="s in sections" :key="s.id" :data-section="s.id">
      <h3 class="text-xs font-bold uppercase tracking-wider text-[#9a7a45] mb-2">{{ s.heading }}</h3>
      <p v-for="(p, i) in s.paragraphs" :key="i">{{ p }}</p>
    </section>

    <p class="font-semibold text-[#111111] border-t border-[#E7DDD1] pt-6">{{ PRECONTRACTUAL_ACCEPTANCE_CLOSING }}</p>
  </div>
</template>
