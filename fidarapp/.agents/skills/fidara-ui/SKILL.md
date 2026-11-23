---
name: fidara-ui
description: Diseñar o ajustar interfaces y componentes visuales de Fidara.
---

# fidara-ui

Consulta docs/BRAND.md y el componente afectado. Reutiliza estilos y componentes existentes. Mantén diseño responsive, contraste, navegación por teclado y estados de interacción. No alteres lógica de negocio ni el logo oficial.

Para decisiones bloqueantes, destructivas o financieras usa el componente
`FidaraConfirmDialog`, basado en el modal oficial de Sucursales. Sonner se
reserva para avisos toast no bloqueantes y los formularios normales para la
captura de datos. Nunca uses `alert()`, `confirm()` o `prompt()` nativos para
operaciones de negocio. Al añadir una confirmación, conserva enfoque, cierre
con Escape, acción explícita y bloqueo mientras la solicitud esté en curso.
En los modales que ya tienen icono, colócalo a la izquierda del título y
alineado horizontalmente; nunca encima. Si el modal original no tiene icono,
no agregues uno ni introduzcas decoración innecesaria. Respeta el icono, tamaño,
color, espaciado, tipografía y bordes existentes. Mantén las acciones al pie,
con Cancelar neutro y Confirmar en rosa Fidara, salvo una variante funcional ya
establecida por el diseño original.
