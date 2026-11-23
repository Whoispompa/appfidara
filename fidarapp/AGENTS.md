# Fidara API — Instrucciones de desarrollo

## Objetivo

Mantener la API .NET 10 de Fidara con cambios seguros, específicos y eficientes. Responder siempre en español, minimizando el consumo de tokens.

## Contexto y navegación

- Buscar símbolos y rutas antes de abrir archivos.
- Leer únicamente fragmentos relevantes.
- Evitar lecturas repetidas y archivos generados.
- Consultar documentación y skills solo cuando aporten información necesaria.
- No realizar auditorías generales ni análisis ya documentados.
- No explorar módulos ajenos a la solicitud.

## Edición

- Realizar exclusivamente los cambios solicitados.
- Preservar código, comentarios y modificaciones existentes.
- No refactorizar ni reformatear código fuera del alcance.
- Reutilizar servicios, DTO, validaciones y convenciones existentes.
- No inventar contratos, columnas, tablas, rutas ni enumeradores.
- Verificar compatibilidad con app.fidara.mx y get.fidara.mx.
- Utilizar Git únicamente cuando exista un repositorio válido.

## Seguridad e infraestructura

- No leer ni mostrar secretos, certificados privados ni tokens.
- No conectarse a producción ni modificar datos reales sin autorización.
- No ejecutar SQL, migraciones o despliegues automáticamente.
- No instalar dependencias, modificar configuración sensible ni hacer commits sin autorización.
- No modificar Program.cs, Data Protection ni configuración de alojamiento fuera del alcance explícito.
- Preservar JWT, permisos, aislamiento por negocio y validaciones del servidor.

## Reglas financieras

- Utilizar decimal con precisión explícita.
- Mantener transacciones, idempotencia y control de concurrencia.
- No confiar en importes calculados por el frontend.
- Preservar los saldos existentes.
- No duplicar ingresos al canjear Gift Cards.
- Mantener registros auditables de movimientos.
- No modificar enumeradores existentes ni sus valores numéricos.
- Gift Cards corresponde a la modalidad 5.

## Apple Wallet y Google Wallet

- Mantener compatibilidad con pases, seriales, registros y protocolos actuales.
- No modificar Wallet si la tarea no lo requiere.
- Ejecutar pruebas específicas de Wallet cuando cambie su lógica.
- No ejecutar pruebas de Wallet por modificaciones que no lo afecten.

## Gift Cards

- Mantener separados los importes de emisión, saldo disponible, canjes y cobros complementarios.
- Preservar transacciones e idempotencia.
- Ejecutar pruebas específicas cuando se modifique lógica financiera crítica.
- No ejecutar suites completas por cambios únicamente visuales, documentales o independientes de Gift Cards.

## Documentación

Referencias principales:

- docs/PROJECT_MAP.md
- docs/ARCHITECTURE.md
- docs/DATABASE.md
- docs/API_CONTRACTS.md

Utilizar únicamente los documentos relevantes para cada tarea.

Actualizar documentación solo cuando cambien contratos, arquitectura o reglas importantes.

## Estructura

- Raíz de solución: Fidara.Api/
- Código principal: Fidara.Api/
- Documentación: docs/
- Skills: .agents/skills/

## Validaciones eficientes

- Para cambios de documentación, no compilar.
- Para cambios pequeños, ejecutar la comprobación mínima necesaria.
- Para cambios de código, realizar una compilación final cuando corresponda.
- Para operaciones financieras críticas, ejecutar las pruebas específicas afectadas.
- Evitar repetir suites completas si no existen cambios relacionados.
- No iniciar servicios contra conexiones desconocidas.
- No eliminar validaciones funcionales ni de seguridad para ahorrar tokens.

## Respuesta de Codex

Entregar un reporte de máximo 10 líneas con:

- Archivos modificados.
- Resultado de compilación o prueba, si se ejecutó.
- Errores o riesgos relevantes.

No generar explicaciones extensas, recomendaciones no solicitadas ni reportes repetitivos.

El usuario realizará pruebas funcionales manuales y reportará los errores encontrados.

## Restricciones

- No publicar automáticamente.
- No modificar datos de producción.
- No corregir problemas ajenos a la solicitud.
- No agregar funcionalidades no solicitadas.

## Directorios excluidos

- .vs/
- TestResults/
- bin/
- obj/
- publish/
- fidarapublish/
- logs/
