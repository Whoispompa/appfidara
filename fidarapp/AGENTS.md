# Fidara - Development Instructions

## 1. Objetivo

Mantener y desarrollar app.fidara.mx de forma segura,
eficiente y con el menor consumo de contexto posible.

Estas instrucciones aplican al proyecto frontend fidarapp.

## 2. Optimización de tokens

- Buscar símbolos y funciones antes de leer archivos completos.
- Leer únicamente las secciones relevantes para la tarea.
- Evitar exploraciones completas del repositorio.
- No repetir lecturas innecesarias.
- No devolver archivos completos en las respuestas.
- Ampliar el contexto únicamente cuando sea necesario.
- Evitar búsquedas redundantes.
- No cargar documentación que no corresponda a la tarea.
- No omitir dependencias necesarias para una corrección segura.

## 3. Directorios excluidos

No explorar salvo necesidad justificada:

- node_modules/
- .next/
- out/
- dist/
- bin/
- obj/
- publish/
- fidarapublish/
- fidaranewpublish/
- .git/
- coverage/

Utilizar comandos específicos de Git para consultar cambios,
sin explorar directamente su directorio interno.

## 4. Edición de código

- Revisar el estado de Git antes de editar.
- Realizar cambios pequeños y específicos.
- Preservar comentarios y documentación existente.
- No eliminar funcionalidades que ya funcionan.
- No realizar refactorizaciones no solicitadas.
- No reformatear archivos completos innecesariamente.
- Reutilizar componentes y funciones existentes.
- Respetar los cambios previos del usuario.
- Mantener compatibilidad con Next.js y TypeScript.
- No modificar archivos ajenos a la tarea.
- No revertir cambios del usuario sin autorización.
- Mantener las convenciones actuales del proyecto.

## 5. Arquitectura

- Frontend: Next.js, TypeScript y Tailwind CSS.
- Backend: API .NET 8 en https://api.fidara.mx.
- Aplicación administrativa: https://app.fidara.mx.
- Respetar los contratos de la API existente.
- Preservar autenticación, permisos y aislamiento entre negocios.
- No inventar endpoints ni propiedades de la API.
- Verificar contratos existentes antes de realizar modificaciones.
- No duplicar lógica de negocio innecesariamente.

## 6. Identidad visual

- Primario: #E11D48
- Oscuro: #111827
- Secundario: #6B7280
- Fondo: #F3F4F6
- Tipografía: Poppins.
- Utilizar los logos oficiales existentes en public/.
- Mantener diseño profesional y responsive.
- No modificar la interfaz si la tarea es funcional.
- Reutilizar componentes visuales existentes.
- Preservar la consistencia visual entre módulos.

Consultar docs/BRAND.md únicamente para tareas visuales.

## 7. Seguridad

- No leer ni mostrar secretos o credenciales.
- No leer certificados privados.
- No leer valores sensibles de archivos .env.
- No modificar archivos .env sin autorización.
- No instalar dependencias sin autorización.
- No ejecutar git commit, push ni despliegues sin permiso.
- No realizar pruebas que modifiquen datos reales de producción.
- Utilizar datos simulados o entornos locales para pruebas.
- Preservar las validaciones de seguridad existentes.

## 8. Documentación y contexto

Consultar exclusivamente los documentos necesarios:

- docs/PROJECT_MAP.md:
  Localización de módulos y archivos.

- docs/ARCHITECTURE.md:
  Arquitectura, servicios e integraciones.

- docs/BRAND.md:
  Identidad visual y diseño.

No cargar todos los documentos automáticamente.

Actualizar la documentación correspondiente cuando un cambio
modifique significativamente la arquitectura o estructura.

## 9. Skills disponibles

Utilizar las skills de .agents/skills según la tarea:

- fidara-frontend:
  Next.js, TypeScript, rutas, componentes y dashboard.

- fidara-wallet:
  Apple Wallet, Google Wallet, sellos, cashback y recompensas.

- fidara-ui:
  Diseño, identidad visual y componentes responsive.

- fidara-deploy:
  Compilación, publicación y despliegue.

Utilizar únicamente las skills relevantes para la tarea.
No leer todas las skills por defecto.

## 10. Validación

- Revisar git diff antes de finalizar.
- Ejecutar comprobaciones relacionadas con el cambio.
- Utilizar la comprobación más pequeña que sea suficiente.
- No compilar todo el proyecto si basta una prueba específica.
- No corregir errores no relacionados sin autorización.
- Nunca afirmar que una función funciona sin verificarla.
- Informar si existen errores previos o pruebas pendientes.

## 11. Respuestas

- Responder siempre en español.
- Ser conciso y directo.
- Indicar los archivos modificados.
- Explicar brevemente los cambios.
- Informar las validaciones realizadas.
- Informar errores pendientes.
- No imprimir código completo innecesariamente.
- Evitar explicaciones repetitivas.
- No sugerir cambios fuera del alcance solicitado.

## 12. Prioridad de desarrollo

1. Seguridad e integridad de los datos.
2. Preservar funcionalidades existentes.
3. Cumplir la tarea solicitada.
4. Mantener calidad y consistencia del código.
5. Optimizar el consumo de tokens.

## 13. Notificaciones y confirmaciones

- Utilizar Sonner como sistema estándar de notificaciones.
- No utilizar alert(), confirm() ni prompt() nativos.
- Reutilizar el Toaster existente.
- No duplicar sistemas de notificaciones.
- Utilizar AlertDialog para confirmaciones.
- Utilizar Dialog para solicitar datos al usuario.
- Mantener validaciones de campos dentro de los formularios.
- Mostrar mensajes claros, concisos y en español.
- Evitar notificaciones duplicadas.
- No mostrar mensajes de éxito antes de confirmar
  que la operación se completó correctamente.
- Mantener consistencia visual en todos los módulos.

