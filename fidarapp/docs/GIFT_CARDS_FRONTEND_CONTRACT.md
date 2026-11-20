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
  "locationId": "uuid",
  "amount": 125.50,
  "idempotencyKey": "redeem-uuid",
  "reference": "ticket-123",
  "notes": null
}
```

Devuelve `operationId`, saldos antes/después, `replayed` y `warnings`. `APPLE_WALLET_UPDATE_PENDING`/`GOOGLE_WALLET_UPDATE_PENDING` no invalidan el canje. Errores: `400 INVALID_AMOUNT`, `403 LOCATION_ACCESS_DENIED`, `404 GIFT_CARD_NOT_FOUND`, `409 INSUFFICIENT_BALANCE`, `GIFT_CARD_EXPIRED`, `CONCURRENT_REDEMPTION` o `IDEMPOTENCY_CONFLICT`. Ante conflicto, consultar y reutilizar la clave original; no crear otra automáticamente para el mismo intento.

`GET /api/gift-cards/{id}/movements` devuelve movimientos. `GET /api/gift-cards/{id}/share` recupera enlaces de forma autorizada.

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
- No hay un estado de entrega de WhatsApp. Abrir `wa.me` sigue siendo una acción manual, no una confirmación de envío, entrega o lectura.
