# Contrato backend Gift Cards

Base administrativa: `/api/gift-cards`, JWT requerido. Organización y `OrganizationUser` salen del token; las sucursales se validan en servidor. Base pública: `/api/public/gift-cards`, anónima y limitada por IP. Los importes admiten máximo dos decimales y la moneda procede de la organización.

## Configuración

`POST /api/programs` y `PUT /api/programs/{programId}` conservan `multipart/form-data`. Para `ProgramType=5`:

```json
{
  "giftCardAllowCustomAmount": true,
  "giftCardCustomMinAmount": 100,
  "giftCardCustomMaxAmount": 2000,
  "giftCardExpirationEnabled": false,
  "giftCardValidityDays": null,
  "giftCardPresetAmounts": [
    { "amount": 200, "isActive": true, "displayOrder": 0 }
  ]
}
```

En creación, lista vacía genera 200/500/1000. Edición debe reenviar la lista deseada. No se convierte tipo 5 a otra modalidad ni viceversa. Los GET de programas devuelven las cinco propiedades y presets. Errores: `400` configuración, precisión o duplicados; `409` conversión; se conservan límites de plan existentes.

## Venta y pago

`POST /api/gift-cards/sales`:

```json
{
  "loyaltyProgramId": "uuid",
  "locationId": "uuid",
  "amount": 500,
  "buyerName": "Luis",
  "recipientName": "Ana",
  "recipientWhatsApp": "+52 664 123 4567",
  "personalMessage": "Disfrútalo",
  "idempotencyKey": "sale-uuid"
}
```

Devuelve `id`, estados pendientes, importe, moneda, vencimiento fijado y `replayed`. Misma clave/contenido recupera resultado; contenido distinto: `409 IDEMPOTENCY_CONFLICT`. Pendiente no tiene saldo, QR ni acceso público.

`POST /api/gift-cards/{id}/confirm-payment`:

```json
{ "locationId": "uuid", "paymentMethod": 1, "paymentReference": null, "idempotencyKey": "payment-uuid" }
```

Métodos: `1 Cash`, `2 Card` externo, `3 Transfer`; 2/3 requieren referencia. Devuelve `loyaltyCardId` sólo al cliente administrativo, saldo, moneda, `publicUrl`, `whatsAppUrl` y `replayed`. Abrir `wa.me` no confirma envío ni lectura.

## Caja y canje

`POST /api/gift-cards/lookup` con `{ "qrToken": "..." }` consulta una tarjeta confirmada del negocio.

`POST /api/gift-cards/redeem`:

```json
{
  "qrToken": "token-qr",
  "purchaseAmount": 200.00,
  "locationId": "uuid",
  "amount": 125.50,
  "complementaryPaymentConfirmed": true,
  "complementaryPaymentMethod": 1,
  "complementaryPaymentReference": null,
  "idempotencyKey": "redeem-uuid",
  "reference": "ticket-123",
  "notes": null
}
```

`purchaseAmount` es el total de la compra y `amount` es el importe descontado
de la Gift Card. Debe cumplirse `purchaseAmount >= amount > 0`, `amount <=
currentBalance` y máximo dos decimales. La idempotencia incluye ambos importes.

Cuando `purchaseAmount > amount`, la API nueva exige confirmación explícita del
cobro complementario y método `1 Cash`, `2 Card` o `3 Transfer`; Card y Transfer
requieren referencia. Cuando ambos importes son iguales, esos tres campos deben
omitirse. El estado persistido es `0 LegacyUnverified`, `1 NotRequired` o
`2 Confirmed`.

Devuelve `operationId`, `purchaseAmount`, `amount`, `remainingToPay`, saldos,
estado/método/referencia complementarios, importes `Due`, `Collected`, `Pending`
y `Unverified`, `replayed` y `warnings`. `remainingToPay` conserva su semántica
aritmética; sólo `complementaryPaymentCollectedAmount` con estado `Confirmed`
prueba la declaración de cobro del empleado. `APPLE_WALLET_UPDATE_PENDING`/`GOOGLE_WALLET_UPDATE_PENDING` no invalidan el canje. Errores: `400 INVALID_AMOUNT`, `EXTERNAL_PAYMENT_CONFIRMATION_REQUIRED`, `INVALID_COMPLEMENTARY_PAYMENT_METHOD`, `COMPLEMENTARY_PAYMENT_REFERENCE_REQUIRED`, `403 LOCATION_ACCESS_DENIED`, `404 GIFT_CARD_NOT_FOUND`, `409 INSUFFICIENT_BALANCE`, `GIFT_CARD_EXPIRED`, `CONCURRENT_REDEMPTION` o `IDEMPOTENCY_CONFLICT`. Ante conflicto, consultar y reutilizar la clave original; no crear otra automáticamente para el mismo intento.

`GET /api/gift-cards/{id}/movements` devuelve movimientos; los canjes incluyen
`purchaseAmount` y los campos de cobro complementario. El despliegue requiere haber aplicado el DDL incremental
`GiftCards_AddPurchaseAmount.sql`; si falta, el error de esquema debe mostrarse
y el frontend debe bloquear nuevos canjes. `GET /api/gift-cards/{id}/share`
recupera enlaces de forma autorizada.

## Vista pública y Wallet

`GET /api/public/gift-cards/{token}` devuelve negocio, programa, comprador, destinatario, mensaje, importe original, saldo, moneda, estado, vencimiento, `qrToken` y URLs tokenizadas Wallet. No devuelve teléfono ni UUID internos. Pendiente/token inválido responde `404` genérico.

- `GET /api/public/gift-cards/{token}/apple-wallet`: `.pkpass`.
- `POST /api/public/gift-cards/{token}/google-wallet`: `{ "saveUrl": "..." }`.

Mostrar QR sólo en la vista del regalo, nunca en el texto WhatsApp. `FirstViewedAtUtc` registra primera solicitud, no recepción humana.

## Reportes y vencimiento

`GET /api/gift-cards/statistics?fromUtc=...&toUtc=...` devuelve `sold`, `collectedAmount`, `outstandingBalance`, `redeemedAmount`, estados y agrupaciones por sucursal. Venta cobrada y canje son métricas distintas; no sumarlas como ingreso.

`GET /api/gift-cards/expiration-reminders?days=3` devuelve recordatorios y `wa.me` manual. Consultar/abrir no marca enviado.

Estados: Gift Card `1 PendingPayment`, `2 Active`, `3 Depleted`, `4 Expired`, `5 Cancelled`; pago `1 Pending`, `2 Confirmed`; movimiento `1 Issue`, `2 Redeem`.

## Flujo recomendado

1. Configurar programa y conservar presets.
2. Crear venta con clave estable de UI.
3. Confirmar sólo después de verificar pago.
4. Abrir/copiar `whatsAppUrl`.
5. Destinatario abre regalo, muestra QR e instala Wallet.
6. Caja consulta, canjea con clave estable y conserva `operationId`.

No hay recargas, transferencias de saldo, reembolsos automáticos, correo ni procesamiento bancario.

## Limitaciones conocidas para el frontend

- No existe un endpoint paginado para listar todas las Gift Cards administrativas. La UI no debe inventarlo: sólo puede consultar por QR o recuperar movimientos/enlaces con un ID conocido.
- El contrato no define propiedades de detalle para cada elemento de movimientos ni series temporales para estadísticas. La UI puede mostrar el conteo real y las métricas/agregaciones documentadas, pero no debe asumir campos o construir series ficticias.
- El contrato no incluye una matriz de permisos por rol para cada operación Gift Card. El BFF exige sesión y el backend conserva la autorización efectiva; la UI no oculta acciones basándose en reglas inventadas.

## Integración administrativa

- Gift Card se presenta como programa tipo 5. No tiene entrada propia de navegación.
- Configuración y venta se integran en Mi tarjeta. La ruta de venta recibe el
  `programId` seleccionado y reutiliza un único componente de venta.
- `/dashboard/escanear` únicamente consulta, muestra historial y canjea Gift
  Cards existentes.
- La vista ilustrativa de un programa usa el primer preset activo devuelto por
  la API; si no existe, muestra cero y no inventa saldo. Una Gift Card vendida
  muestra exclusivamente `purchasedAmount` y `currentBalance` de la consulta.
- Estadísticas y recordatorios manuales se integran en `/dashboard/estadisticas`.
- La entrega sólo se habilita después de confirmar el pago. El QR de entrega
  contiene `publicUrl`; nunca el token financiero de canje.
- La sucursal procede de las ubicaciones autorizadas de la sesión y se confirma
  mediante `/api/session/location`; el BFF vuelve a imponer la cookie de
  sucursal en ventas y canjes.

### Limitación detectada en presets vacíos

El frontend envía los presets editados como
`GiftCardPresetAmounts[i].Amount`, `.IsActive` y `.DisplayOrder`, y al recargar
usa literalmente `giftCardPresetAmounts` de `GET /api/programs/{id}`. La
implementación actual del backend aplica los presets iniciales cuando una
actualización llega con la colección vacía (`useInitialPresetsWhenEmpty: true`),
mientras que la creación usa `false`. Por ello una solicitud de actualización
sin entradas puede responder nuevamente con 200/500/1000. El frontend no
simula persistencia ni agrega un fallback de 500; corregir esa inversión requiere
un cambio de backend fuera del alcance de este repositorio.
- No hay un estado de entrega de WhatsApp. Abrir `wa.me` sigue siendo una acción manual, no una confirmación de envío, entrega o lectura.

### Cobro complementario en el canje

Cuando existe diferencia, el mismo modal exige confirmación y método antes de
enviar el canje, y el BFF conserva los tres campos complementarios al reenviar la
solicitud. Cuando la Gift Card cubre toda la compra, la UI omite esos campos. El
canje continúa creando un solo movimiento y conserva la misma clave idempotente.

El saldo Gift Card aplicado no se suma como ingreso nuevo porque ya fue cobrado
en la emisión.
