# Suscripciones en frontend

La modalidad 6 permanece desactivada hasta publicar SQL y Fidara.Api.

La activación requiere simultáneamente:

- `NEXT_PUBLIC_FIDARA_SUBSCRIPTIONS_ENABLED=true`: muestra Suscripciones en las vistas cliente.
- `FIDARA_SUBSCRIPTIONS_ENABLED=true`: habilita los Route Handlers; sin esta variable responden `404 SUBSCRIPTIONS_DISABLED` y nunca llaman a producción.

El registro administrativo de Nuevo socio mediante `POST /api/customers` utiliza estas mismas banderas; no requiere una activación adicional.

No activar una sola bandera de forma aislada. Primero publicar y verificar SQL/API, después activar ambas variables en `fidarapp` y reconstruir el frontend. Los endpoints, DTO y enumeradores implementados corresponden a `Fidara.Api/DTOs/Memberships`, `MembershipPlansController` y `MembershipsController`.

## Producción standalone en IIS

`NEXT_PUBLIC_FIDARA_SUBSCRIPTIONS_ENABLED=true` debe estar presente al ejecutar `npm run build`, porque Next.js incorpora las variables públicas al bundle del navegador. `FIDARA_SUBSCRIPTIONS_ENABLED=true` debe existir además en el entorno del proceso Node que inicia `server.js`.

El `server.js` generado con `output: "standalone"` utiliza `__NEXT_PRIVATE_STANDALONE_CONFIG`; por ello no se debe depender de copiar `.env.local` al directorio publicado. En IIS/iisnode, agregar la variable privada al elemento `environmentVariables` del Application Pool que ejecuta `app.fidara.mx`. IIS 10 guarda esta configuración en `%windir%\System32\inetsrv\config\applicationHost.config`, fuera del repositorio y del directorio público, y no ofrece interfaz gráfica para editarla. Puede agregarse desde una consola elevada, sustituyendo `<POOL_APP_FIDARA>` por el nombre real, sin reemplazar las demás variables:

```powershell
& "$env:windir\System32\inetsrv\AppCmd.exe" set config -section:system.applicationHost/applicationPools /+"[name='<POOL_APP_FIDARA>'].environmentVariables.[name='FIDARA_SUBSCRIPTIONS_ENABLED',value='true']" /commit:apphost
```

Reciclar ese Application Pool después del cambio para que el proceso Node herede la variable.

## Contrato pendiente

`docs/SUBSCRIPTIONS_DESIGN.md` documenta `GET /api/subscription-memberships/statistics`, pero el controlador local revisado no expone todavía esa acción ni un DTO de estadísticas. El frontend consulta únicamente ese contrato detrás de la bandera y muestra indisponibilidad si la API responde sin datos; no calcula ni inventa ventas, renovaciones, ingresos o usos.
