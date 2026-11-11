// Clínicas aliadas (contenido completo) para el administrador. Persistencia local: server/utils/clinics.ts.
export default defineEventHandler(async (event) => {
  await requireAboutEditor(event)
  return await readClinics(event)
})
