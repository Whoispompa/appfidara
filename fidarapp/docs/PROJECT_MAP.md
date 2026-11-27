# Mapa del proyecto

Referencia compacta de la estructura real del frontend Next.js (App Router). Las páginas consumen `/api/*`; los route handlers actúan como BFF/proxy hacia Fidara API.

## Entrada y rutas de interfaz

| Ruta | Función | Archivo principal |
|---|---|---|
| `/` | Redirección a login | `app/page.tsx` |
| `/login` | Inicio de sesión | `app/login/page.tsx` |
| `/registro` | Alta de negocio | `app/registro/page.tsx` |
| `/recuperar` | Solicitud de recuperación | `app/recuperar/page.tsx` |
| `/restablecer` | Nueva contraseña mediante token | `app/restablecer/page.tsx` |
| `/seleccionar-sucursal` | Selección de sucursal activa | `app/seleccionar-sucursal/page.tsx` |
| `/material/[programId]` | Material público de un programa | `app/material/[programId]/page.tsx` |
| `/dashboard` | Resumen, métricas, actividad y movimientos | `app/dashboard/page.tsx` |
| `/dashboard/escanear` | Escaneo/búsqueda y operación de tarjetas Wallet | `app/dashboard/escanear/page.tsx` |
| `/dashboard/clientes` | Listado, filtros y estado de clientes | `app/dashboard/clientes/page.tsx` |
| `/dashboard/clientes/[customerId]` | Detalle y tarjetas de un cliente | `app/dashboard/clientes/[customerId]/page.tsx` |
| `/dashboard/tarjeta` | Listado y eliminación de programas | `app/dashboard/tarjeta/page.tsx` |
| `/dashboard/tarjeta/[programId]` | Alta (`programId = new`) y edición de programa/tarjeta | `app/dashboard/tarjeta/[programId]/page.tsx` |
| `/dashboard/tarjeta/[programId]/vender` | Compatibilidad: redirige a la venta integrada en el editor | `app/dashboard/tarjeta/[programId]/vender/page.tsx` |
| `/dashboard/gift-cards` | Compatibilidad: redirige la ruta anterior a Mi tarjeta | `app/dashboard/gift-cards/page.tsx` |
| `/dashboard/equipo` | Integrantes, roles y sucursales asignadas | `app/dashboard/equipo/page.tsx` |
| `/dashboard/ubicaciones` | CRUD y estado de sucursales | `app/dashboard/ubicaciones/page.tsx` |
| `/dashboard/estadisticas` | Métricas por periodo, programa, empleado y sucursal | `app/dashboard/estadisticas/page.tsx` |
| `/dashboard/notificaciones` | Campañas y configuración GeoPush | `app/dashboard/notificaciones/page.tsx` |
| `/dashboard/perfil` | Perfil, contraseña y suscripción | `app/dashboard/perfil/page.tsx` |
| `/dashboard/configuracion` | Identidad del negocio y consulta de logos Wallet | `app/dashboard/configuracion/page.tsx` |

Estructura raíz: `app/layout.tsx` carga fuente, `app/globals.css` y `Toaster`; `app/dashboard/layout.tsx` envuelve todo el panel con `DashboardShell`.

## Componentes compartidos

| Área | Archivos | Uso |
|---|---|---|
| Dashboard | `components/dashboard/dashboard-shell.tsx`, `app-sidebar.tsx`, `app-header.tsx` | Layout responsive, navegación, sesión visible, branding y logout |
| Wallet | `components/dashboard/wallet-card-preview.tsx` | Vista previa reutilizada en listado/editor de programas |
| Autenticación/marca | `components/auth-shell.tsx`, `brand-panel.tsx`, `fidara-logo.tsx` | Estructura visual de login, registro y recuperación |
| Suscripción | `components/subscription-plan-section.tsx` | Resumen de plan dentro del perfil |
| Marketing | `components/marketing/geo-push-panel.tsx` | Lectura y edición GeoPush por programa |
| Ubicaciones | `components/locations/google-place-picker.tsx` | Selector de Google Maps cargado dinámicamente |
| UI | `components/ui/{alert,alert-dialog,avatar,button,card,dropdown-menu,input,label,sheet,sonner,tooltip}.tsx` | Primitivas compartidas (Base UI/shadcn y Sonner) |
| Confirmaciones | `components/ui/fidara-confirm-dialog.tsx` | Modal oficial para decisiones destructivas, financieras o bloqueantes |

La navegación del panel está declarada en `components/dashboard/app-sidebar.tsx`; encabezado, perfil, branding y cierre de sesión están en `components/dashboard/app-header.tsx`. Las páginas y componentes con datos mantienen estados locales de carga/error; no hay una capa global de estado.

## API y servicios

No existe un directorio `services/`: las llamadas cliente están colocadas en páginas/componentes y apuntan a route handlers de `app/api/`. Estos usan `FIDARA_API_URL` (por defecto `https://api.fidara.mx`) y reenvían estado/cuerpo del upstream.

| Grupo BFF | Métodos existentes | Consumidores principales |
|---|---|---|
| `api/auth/{login,logout,register,forgot-password,reset-password}` | `POST` | Login, registro y recuperación |
| `api/session/location` | `POST` | Selector de sucursal |
| `api/dashboard/summary` | `GET` | Dashboard |
| `api/customers`, `api/customers/[customerId]`, `.../status` | `GET`, `PATCH` | Clientes y detalle |
| `api/locations`, `api/locations/[locationId]`, `.../status` | `GET`, `POST`, `PUT`, `PATCH` | Ubicaciones, equipo y notificaciones |
| `api/programs`, `api/programs/current`, `api/programs/[programId]` | `GET`, `POST`, `PUT`, `DELETE` | Tarjetas, editor, material, marketing y consulta de logos Wallet |
| `api/programs/[programId]/geo-push` | `GET`, `PUT` | `GeoPushPanel` |
| `api/team`, `api/team/[organizationUserId]`, `.../status`, `api/team/me/locations` | `GET`, `POST`, `PUT`, `PATCH` | Equipo y sucursales permitidas |
| `api/statistics/overview` | `GET` | Estadísticas |
| `api/notifications`, `api/notifications/[campaignId]` | `GET`, `POST` | Campañas/notificaciones |
| `api/profile`, `api/profile/password` | `GET`, `PUT` | Perfil y contraseña |
| `api/settings/branding` | `GET`, `PUT` | Lectura del logo corporativo en Configuración y el encabezado. `PUT` legado |
| `api/organizations/me/logo` | `PUT` | Guarda el logo corporativo desde Configuración |
| `api/subscription/overview` | `GET` | `SubscriptionPlanSection` |
| `api/wallet/cards/lookup` | `POST` | Búsqueda/escaneo de tarjeta |
| `api/wallet/cards/{earn,stamps,cashback-sale,redeem,redeem-cashback}` | `POST` | Acumulación y canjes Wallet |
| `api/wallet/cards/coupons/redeem` | `POST` | Canje de cupón |
| `api/gift-cards/{sales,lookup,redeem}` | `POST` | Venta y consulta/canje de Gift Cards |
| `api/gift-cards/[giftCardId]/{confirm-payment,movements,share}` | `POST`, `GET` | Confirmación de pago, historial y recuperación de enlaces |
| `api/gift-cards/{statistics,expiration-reminders}` | `GET` | Métricas separadas y recordatorios manuales |
| `api/auth/wallet/cards/{lookup,stamps}` | `POST` | Proxies autenticados alternos existentes |

Conexiones adicionales:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps Places en `components/locations/google-place-picker.tsx`.
- `NEXT_PUBLIC_FIDARA_API_URL`: URLs públicas de imágenes/material en encabezado, programas, material y escáner.
- `NEXT_PUBLIC_GET_APP_URL`: enlace de obtención de la app desde el detalle del cliente.

## Autenticación, sesión y permisos

- `app/api/auth/login/route.ts` autentica contra el backend, elimina el token de la respuesta y guarda `fidara_token` como cookie `httpOnly`, `sameSite=lax` y `secure` en producción.
- La sucursal activa se guarda en `fidara_location_id` (`httpOnly`). Login la asigna si hay una sola; con varias dirige a `/seleccionar-sucursal`, que valida mediante `POST /api/session/location`.
- Las operaciones Wallet leen `fidara_token` y `fidara_location_id`; la cookie de sucursal prevalece sobre datos enviados por el cliente.
- Los route handlers protegidos devuelven no autorizado si falta `fidara_token` y envían `Authorization: Bearer ...` al backend. La autorización fina queda en el backend/upstream.
- El navegador conserva metadatos no sensibles en `sessionStorage.fidara_session`; `AppHeader` redirige a `/login` si faltan o son inválidos. El JWT no se expone al cliente.
- Roles observados: `1 Propietario/Owner`, `2 Administrador`, `3 Encargado/Manager`, `4 Empleado/Employee`. Roles 1–2 sin sucursales son enviados a `/dashboard/ubicaciones`; el propietario no se edita ni desactiva desde la UI de equipo.
- No existe `middleware.ts` ni filtrado de navegación por rol. `AppSidebar` muestra las rutas declaradas; los permisos efectivos dependen de la API.
- Logout (`app/api/auth/logout/route.ts`) expira `fidara_token`; el encabezado limpia `fidara_session` y vuelve a login.

## Tipos y contratos

No existe una carpeta global de tipos. Los contratos están colocados junto a cada consumidor:

- Dashboard: `DashboardSummary`, métricas, actividad y transacciones en `app/dashboard/page.tsx`.
- Estadísticas: `StatisticsData`, series y filtros en `app/dashboard/estadisticas/page.tsx`.
- Wallet/programas: contratos de tarjeta, recompensas, formulario e imágenes en `app/dashboard/escanear/page.tsx` y `app/dashboard/tarjeta/**/page.tsx`.
- Clientes, ubicaciones, equipo, perfil, branding y notificaciones: tipos locales en sus respectivos `page.tsx`.
- Contratos compartidos exportados: `DateTimePreferences` en `components/lib/date-time.ts` y `GooglePlaceSelection` en `components/locations/google-place-picker.tsx`.
- Gift Cards: tipo de programa 5. Configuración y venta en `app/dashboard/tarjeta/`; consulta, historial y canje de tarjetas existentes en `app/dashboard/escanear/page.tsx`; métricas y vencimientos en `app/dashboard/estadisticas/page.tsx`. El proxy autenticado compartido está en `lib/gift-card-bff.ts`.
- Los route handlers dinámicos declaran `RouteContext` localmente. Las respuestas cliente suelen envolverse en tipos locales `ApiResponse<T>` o `ApiEnvelope<T>`.

Antes de cambiar un contrato, verificar el tipo local y el handler `/api/*` correspondiente; no hay un cliente API ni esquemas generados centralizados.

## Funciones auxiliares

- `lib/utils.ts`: reexporta `cn` para composición de clases.
- `components/lib/date-time.ts`: `formatDateTime`, `formatShortDateTime`, `formatDate`, `formatTime` y `formatDateOnly`; toma locale/zona horaria de preferencias o `fidara_session` y normaliza fechas UTC.
- Helpers específicos permanecen junto a su vista: formato de moneda/fechas en suscripción, URL/logo/rol en encabezado, carga y normalización de Google Maps, y validaciones/formateo de cada página.

## Estilos y recursos visuales

- Globales y mayor parte del dashboard/auth: `app/globals.css` (cargado por `app/layout.tsx`).
- CSS Modules: `app/password-recovery.module.css`, `app/seleccionar-sucursal/location-selection.module.css`, `app/dashboard/{clientes,clientes/[customerId],equipo,ubicaciones}/*.module.css` y `components/locations/google-place-picker.module.css`.
- Referencia/vendor: `vendor/shadcn-tailwind-4.13.0.css`; respaldo no importado: `app/globals.backup.css`.
- Marca e iconos: `public/Fidara-logo.png`, `public/Fidara-logo-horizontal.png`, `public/Fidara-logo-blanco.png` y `app/favicon.ico`.
- Iconografía de interfaz: `lucide-react`; gráficos: `recharts`; QR: `qrcode.react` y `@yudiel/react-qr-scanner`.

## Ruta rápida por funcionalidad

Para una tarea, empezar por `app/**/page.tsx`, seguir sus `fetch("/api/...")` al handler homónimo y revisar sólo los componentes/tipos importados. Para navegación/layout usar `components/dashboard/`; para operaciones Wallet, `app/dashboard/escanear/page.tsx` + `app/api/wallet/cards/`; para programas, `app/dashboard/tarjeta/` + `app/api/programs/`.

Gift Cards no dispone de un endpoint administrativo paginado para listar todas las tarjetas. La interfaz utiliza exclusivamente consulta por QR, recuperación por ID conocido, estadísticas y recordatorios; no debe agregarse un listado basado en datos ficticios.
