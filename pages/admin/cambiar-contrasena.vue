<template>
  <div class="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-6 font-sans selection:bg-[#111111] selection:text-white">
    <div class="w-full max-w-md">
      <div class="text-center mb-10">
        <h1 class="font-serif text-[40px] font-medium text-[#111111] tracking-tight uppercase">Crediestética.</h1>
        <p class="mt-3 text-[11px] font-bold tracking-[0.2em] text-[#CBA36B] uppercase">Panel Administrativo</p>
      </div>

      <div class="bg-white rounded-xl shadow-2xl shadow-black/5 p-8 md:p-10 border border-[#E7DDD1]">
        <h2 class="text-sm font-bold tracking-wider text-[#111111] uppercase mb-2">Define tu contraseña</h2>
        <p class="text-sm text-gray-600 mb-6">
          Ingresaste con una contraseña temporal. Para continuar debes elegir tu contraseña personal.
          Las reglas de seguridad las valida Wellezy Hub (mínimo 8 caracteres, con mayúsculas, minúsculas, números y símbolos).
        </p>

        <form class="space-y-5" novalidate data-testid="change-password-form" @submit.prevent="onSubmit">
          <div v-if="error" role="alert" class="p-4 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm" data-testid="change-error">{{ error }}</div>

          <div v-for="f in fields" :key="f.key">
            <label :for="`cp-${f.key}`" class="block text-xs font-bold tracking-wider text-gray-700 uppercase mb-2">{{ f.label }}</label>
            <div class="relative">
              <input
                :id="`cp-${f.key}`"
                v-model="form[f.key]"
                :type="visible[f.key] ? 'text' : 'password'"
                :autocomplete="f.auto"
                maxlength="1024"
                :aria-invalid="fieldErrors[f.key] ? 'true' : 'false'"
                :aria-describedby="fieldErrors[f.key] ? `cp-${f.key}-err` : undefined"
                class="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-[#111111] focus:outline-none focus-visible:text-[#111111]"
                :aria-label="visible[f.key] ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                :aria-pressed="visible[f.key]"
                :data-testid="`toggle-${f.key}`"
                @click="visible[f.key] = !visible[f.key]"
              >
                <svg v-if="!visible[f.key]" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
              </button>
            </div>
            <p v-if="fieldErrors[f.key]" :id="`cp-${f.key}-err`" class="mt-1 text-xs text-red-700">{{ fieldErrors[f.key] }}</p>
          </div>

          <button type="submit" :disabled="saving" class="w-full bg-[#111111] text-white font-bold text-xs tracking-[0.15em] uppercase py-4 px-6 rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-70 disabled:cursor-not-allowed" data-testid="change-submit">
            <span v-if="saving">Guardando…</span>
            <span v-else>Guardar contraseña</span>
          </button>
        </form>

        <button type="button" class="mt-6 w-full text-center text-sm text-gray-500 hover:text-red-600" :disabled="saving" data-testid="change-logout" @click="onLogout">Cerrar sesión</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onBeforeUnmount } from 'vue'
import { useHead, navigateTo } from '#imports'
import { authService } from '~/services/AuthService'

useHead({ title: 'Cambiar contraseña | Admin Crediestética' })
// Pantalla propia (sin el menú del panel): mientras el cambio sea obligatorio no hay otra navegación posible.
definePageMeta({ layout: false })

const fields = [
  { key: 'current_password', label: 'Contraseña actual (temporal)', auto: 'current-password' },
  { key: 'password', label: 'Nueva contraseña', auto: 'new-password' },
  { key: 'password_confirmation', label: 'Confirmar nueva contraseña', auto: 'new-password' }
] as const

// Las contraseñas viven solo en memoria de esta pantalla (nunca en almacenamiento, URL ni logs) y se borran al enviar y al salir.
const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const fieldErrors = reactive<Record<string, string>>({})
// Ver/ocultar cada campo (solo estado de esta pantalla; se restablece al borrar el formulario).
const visible = reactive<Record<string, boolean>>({ current_password: false, password: false, password_confirmation: false })
const error = ref('')
const saving = ref(false)

function clearForm() {
  form.current_password = ''
  form.password = ''
  form.password_confirmation = ''
  for (const k of Object.keys(visible)) visible[k] = false
}

async function onSubmit() {
  // Guarda contra el doble envío: mientras hay una petición en vuelo, no se emite otra.
  if (saving.value) return
  saving.value = true
  error.value = ''
  for (const k of Object.keys(fieldErrors)) delete fieldErrors[k]
  try {
    const user = await authService.changePassword(form.current_password, form.password, form.password_confirmation)
    clearForm()
    // Con sesión renovada se entra al panel; si no se pudo renovar, se pide ingresar de nuevo con la contraseña nueva.
    await navigateTo(user ? '/admin' : '/admin/login?changed=1')
  } catch (e: any) {
    if (e.statusCode === 401) { clearForm(); await navigateTo('/admin/login'); return }
    const errors: Record<string, string[]> = e.errors ?? {}
    for (const [k, v] of Object.entries(errors)) if (k !== '_form' && v?.length) fieldErrors[k] = v[0]!
    error.value = errors._form?.[0] ?? (Object.keys(fieldErrors).length ? 'Revisa los campos marcados.' : e.message)
  } finally {
    saving.value = false
  }
}

async function onLogout() {
  clearForm()
  await authService.logout()
  await navigateTo('/admin/login')
}

onBeforeUnmount(clearForm)
</script>
