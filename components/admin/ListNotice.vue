<template>
  <div class="p-12 text-center" role="alert" :data-testid="`list-${state}`">
    <p v-if="state === 'forbidden'" class="text-gray-700 text-sm">{{ MSG_LIST_FORBIDDEN }}</p>
    <p v-else-if="state === 'unauthorized'" class="text-gray-700 text-sm mb-4">
      {{ MSG_LIST_UNAUTHORIZED }}
    </p>
    <p v-else class="text-red-600 text-sm mb-4">{{ MSG_LIST_ERROR }}</p>
    <NuxtLink v-if="state === 'unauthorized'" to="/admin/login" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Iniciar sesión</NuxtLink>
    <button v-else-if="state === 'error'" type="button" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" @click="emit('retry')">Reintentar</button>
  </div>
</template>

<script setup lang="ts">
import { MSG_LIST_FORBIDDEN, MSG_LIST_UNAUTHORIZED, MSG_LIST_ERROR } from '#shared/utils/adminListState'

defineProps<{ state: 'unauthorized' | 'forbidden' | 'error' }>()
const emit = defineEmits<{ retry: [] }>()
</script>
