# Arquitectura del frontend de Fidara

## Alcance

Aplicación administrativa web de Fidara construida con Next.js App Router. El frontend presenta el dashboard y expone un BFF en `app/api/`; la API .NET 8 separada conserva la lógica de negocio, autorización, saldos, recompensas y movimientos. El inventario de páginas, handlers y archivos está en `docs/PROJECT_MAP.md`.

## Tecnologías

Versiones declaradas en `package.json`:

- Next.js `16.3.4`, React/React DOM `19.2.8` y TypeScript `^5` en modo `strict`.
- Tailwind CSS `^4` mediante `@tailwindcss/postcss`; CSS global y CSS Modules conviven con utilidades Tailwind.
- Base UI `^1.8.0` y shadcn `^4.21.0` (`base-nova`) para primitivas.
- Recharts `^3.10.1`, Lucide React `^1.41.0`, Sonner `^2.0.8`, QR Scanner `^2.6.0` y QRCode React `^4.2.0`.

`next.config.ts` genera salida `standalone`. Los scripts disponibles son `dev`, `build`, `start` y `lint`; no hay un runner de pruebas configurado.

## Organización

```text
app/             rutas App Router, layouts, páginas y BFF (`app/api`)
components/      shell, componentes de dominio y primitivas `ui`
components/lib/  helpers compartidos de presentación
lib/             utilidades generales
public/          logos y recursos estáticos
vendor/          referencia CSS de shadcn
docs/            arquitectura, mapa del proyecto y marca
```

- `app/layout.tsx` define la raíz; `app/dashboard/layout.tsx` compone el panel.
- Los contratos TypeScript están colocados junto a sus consumidores; no hay carpetas globales `types/` o `services/`.
- `tsconfig.json` usa `strict`, resolución `bundler`, `noEmit` y el alias `@/*` hacia la raíz.

## Comunicación con la API

```text
Página/componente → fetch a `/api/*` → route handler BFF → API Fidara
                                      ↘ cookie de sesión/sucursal
```

- Las vistas llaman rutas relativas `/api/*`; cada handler valida contexto, construye la solicitud upstream y conserva el código y payload de respuesta.
- La URL privada del backend se obtiene de configuración del servidor. La configuración pública se usa solo cuando el navegador necesita URLs de recursos o integraciones; sus valores no se documentan.
- Los handlers agregan el JWT como `Authorization: Bearer ...`. Las operaciones Wallet también obtienen la sucursal activa del servidor, sin confiar en un identificador aportado por el cliente.
- La API es autoridad sobre permisos, aislamiento entre organizaciones/sucursales y reglas de negocio. Antes de cambiar métricas o contratos, verificar handler, tipo local, filtros, unidades y semántica del movimiento.
- El inventario de endpoints y consumidores está en `docs/PROJECT_MAP.md`.

## Sesión, autenticación y permisos

- Login, registro, recuperación y logout pasan por `app/api/auth/*`.
- Login guarda el JWT en `fidara_token`, cookie `httpOnly`, `sameSite=lax` y `secure` en producción. El token se elimina del payload enviado al navegador.
- La sucursal activa se conserva en `fidara_location_id`, también `httpOnly`. Una sucursal se selecciona automáticamente; varias llevan al selector. Propietarios/administradores sin sucursal son dirigidos a su administración.
- `sessionStorage.fidara_session` contiene metadatos de interfaz (usuario, organización, rol, preferencias y ubicaciones), nunca el JWT. El encabezado valida esta sesión visual; logout la elimina y expira la cookie.
- `localStorage` se limita a preferencias de UI, como el sidebar colapsado.
- No existe `middleware.ts` ni filtrado del menú por rol. Los handlers rechazan sesiones ausentes y el backend aplica la autorización efectiva.

## Datos y estado

- El estado es local por página/componente mediante hooks de React (`useState`, `useEffect`, `useMemo`, `useCallback`); no hay store global ni librería de fetching.
- Cada módulo conserva tipos de request/response y validaciones junto a su consumidor. Carga, error, vacío, confirmación y guardado forman parte de los flujos y deben preservarse.
- Después de mutaciones, las vistas actualizan estado local o vuelven a solicitar el recurso. Toasts, diálogos y mensajes inline comunican resultados.
- `components/lib/date-time.ts` lee locale/zona horaria de la sesión, normaliza fechas de backend como UTC y evita convertir fechas civiles.
- El escáner QR y el selector de Google Maps se cargan dinámicamente porque dependen del navegador. Imágenes/branding y programas usan `FormData` cuando hay archivos.

## Componentes reutilizables

- `components/dashboard/`: shell responsive, navegación, encabezado y vista previa Wallet.
- `components/ui/`: primitivas compartidas de formulario, tarjetas, overlays, feedback y navegación móvil.
- `components/auth-shell.tsx`, `brand-panel.tsx` y `fidara-logo.tsx`: composición de autenticación y marca.
- `components/locations/google-place-picker.tsx`: selección normalizada de direcciones.
- `components/marketing/geo-push-panel.tsx` y `subscription-plan-section.tsx`: módulos de dominio del dashboard.
- `components/lib/date-time.ts` y `lib/utils.ts`: formateo temporal y composición de clases.

Consultar `docs/PROJECT_MAP.md` para ubicaciones y consumidores exactos; evitar crear componentes equivalentes.

## Integraciones

- API Fidara: autenticación, perfil, organizaciones, sucursales, clientes, programas, Wallet, estadísticas, campañas, branding y suscripción mediante el BFF.
- Google Maps Places: selector de ubicaciones; requiere clave pública configurada, sin registrar su valor.
- Wallet/QR: lectura de tarjetas y operaciones de sellos, cashback, cupones y recompensas; emisión y reglas dependen del backend.
- GeoPush: configuración por programa y sucursales desde notificaciones.
- Recursos públicos: URLs de imágenes/material y enlace externo para obtener la app, controlados por configuración pública.

## Convenciones de desarrollo

- Usar App Router: `page.tsx` para vistas, `layout.tsx` para composición y `route.ts` para métodos HTTP.
- Mantener límites cliente/servidor explícitos con `"use client"`; secretos y JWT nunca deben llegar a componentes cliente.
- Consumir la API mediante el BFF existente y respetar contratos reales. No inventar endpoints, campos, roles ni identificadores.
- Mantener tipos cerca del módulo; exportarlos solo si existe reutilización real. Usar `@/` para imports desde la raíz.
- Reutilizar `components/ui` y componentes de dominio. Preservar accesibilidad, responsive, estados de carga/error y confirmaciones sensibles.
- Usar `app/globals.css` para estilos globales/compartidos y CSS Modules donde ya existen; `app/globals.backup.css` no es la fuente activa.
- Validar cambios de código con la comprobación mínima pertinente (`npm run lint`). Revisar el diff y no compilar/desplegar salvo que la tarea lo requiera.
