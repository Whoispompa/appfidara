# Identidad visual de Fidara

Guía basada en la implementación actual. La fuente activa de estilos es `app/globals.css`, complementada por utilidades Tailwind y CSS Modules; `app/globals.backup.css` no es normativa.

## Logotipo y recursos oficiales

| Recurso | Dimensiones | Uso observado |
|---|---:|---|
| `public/Fidara-logo.png` | 256 × 256 | Isotipo, incluido el sidebar compacto |
| `public/Fidara-logo-horizontal.png` | 300 × 100 | Wordmark sobre fondos claros, selector de sucursal |
| `public/Fidara-logo-blanco.png` | 300 × 100 | Wordmark sobre fondos oscuros, autenticación y sidebar |
| `app/favicon.ico` | — | Icono del sitio |

- No redibujar, recolorear, deformar, recortar ni sustituir estos archivos.
- Conservar proporción y espacio visual. Usar la variante blanca únicamente sobre fondos con contraste suficiente.
- `components/fidara-logo.tsx` es el componente compartido del wordmark en autenticación; navegación usa los archivos oficiales directamente.
- Logos de organizaciones/programas son contenido configurable y no sustituyen la marca Fidara.

## Paleta actual

| Rol | Valor principal | Uso |
|---|---|---|
| Marca/acción | `#E11D48` | CTA, selección, foco, iconos y datos destacados |
| Hover de acción nuevo | `#BE123C` | Hover de botones primarios en módulos recientes |
| Tinta | `#000000` / `#111827` | Texto y superficies oscuras |
| Texto secundario | `#716C67` / `#6B7280` | Ayuda, metadatos y etiquetas |
| Fondo cálido | `#FBFAF7` | Base global (`--paper`) |
| Fondo neutro | `#F3F4F6` | Dashboard, controles y estados neutros |
| Superficie | `#FFFFFF` | Tarjetas, formularios, menús y diálogos |
| Bordes | `#E7E2DC` / `#E5E7EB` | Separadores y contornos |
| Acentos | `#FFB9A8`, `#B8EADB` | Decoración cálida y estados positivos puntuales |

Tokens raíz relevantes en `app/globals.css`: `--fidara`, `--ink`, `--paper`, `--muted`, `--line`, `--primary`, `--background`, `--foreground`, `--border` y `--ring`.

La hoja global conserva una familia visual anterior (`#EF4F59`, `#D83D48`, `#171514`) en autenticación, navegación y flujos Wallet, mientras módulos recientes usan `#E11D48`, `#111827` y `#6B7280`. Esta coexistencia es real: reutilizar el lenguaje del componente afectado y no hacer reemplazos globales sin una tarea de migración explícita.

El tema implementado es claro. No hay `ThemeProvider` ni tema oscuro activo; las variantes `dark` aisladas de primitivas o del respaldo CSS no constituyen soporte de dark mode.

## Tipografía

- `app/layout.tsx` carga Geist con `next/font` y la asigna a `--font-sans`.
- `app/globals.css` declara en ese mismo token la pila `"Avenir Next", Avenir, "Segoe UI", Helvetica, Arial, sans-serif` como base/fallback de la interfaz.
- Poppins no está instalada ni cargada. No introducirla sin una decisión explícita de marca.
- Predominan pesos `700–900` en títulos, métricas, CTA y etiquetas; cuerpo y ayuda usan pesos medios con jerarquía por tamaño/color.
- Mantener `font-sans` y los estilos del módulo en vez de fijar otra familia localmente. Monoespaciada se reserva para tokens/códigos puntuales.

## Lenguaje visual

- Interfaz cálida y de alto contraste: fondos claros, tinta oscura y rosa Fidara como acento, no como fondo dominante de lectura extensa.
- Tarjetas y controles usan radios generosos (aprox. `10–24px`), pills para estados/filtros y sombras suaves; evitar mezclar radios o sombras nuevas sin necesidad.
- Iconografía: `lucide-react`. Mantener tamaños, grosor y significado consistentes; no usar iconos como único indicador cuando el contexto no sea evidente.
- Gráficas: rosa para la serie principal, negro/oscuro para comparación y grises para ejes/etiquetas.
- Las tarjetas Wallet aceptan colores configurables del programa; esos valores pertenecen al contenido del negocio, no a la paleta de la aplicación.
- Los layouts existentes responden principalmente en `1150`, `1100`, `960`, `760/720/680`, `600/560/520/480/430` y `400/390px`. Seguir los breakpoints del componente afectado.

## Voz y mensajes

- Metadata actual: “Fidara | Lealtad que se siente”.
- Autenticación usa “Lealtad que sí regresa” y “Convierte cada visita en una razón para volver”.
- “Cada visita cuenta” no aparece actualmente en la interfaz; tratarlo como referencia histórica, no como lema activo confirmado.
- Tono: directo, cercano y orientado a acciones/beneficios. Los errores deben explicar qué ocurrió y cómo continuar; los CTA usan verbos claros.

## Accesibilidad e interacción

- Mantener contraste legible, navegación por teclado, `focus-visible`, estados `hover`, `active`, `disabled`, carga, error y éxito.
- Conservar labels visibles o `aria-label`, textos alternativos y roles/`aria-live` existentes. Los elementos decorativos deben permanecer ocultos a tecnologías de asistencia.
- No comunicar estado solo mediante color. Respetar áreas táctiles y composición móvil de los componentes existentes.
- Al añadir animación, contemplar `prefers-reduced-motion`; actualmente no existe una regla global que la cubra.

## Relación con `AGENTS.md`

- No hay una contradicción directa: la implementación usa Next.js, TypeScript y Tailwind como indica `AGENTS.md`.
- El detalle real amplía esa descripción: Tailwind convive con una hoja global extensa y CSS Modules. Una edición debe reutilizar la estrategia del módulo afectado.
- `AGENTS.md` no fija tipografía, lema ni tokens de color. Las antiguas referencias a Poppins y “Cada visita cuenta” no deben prevalecer sobre el código verificado.
- Como `AGENTS.md` exige cambios mínimos y conservar convenciones, unificar las dos familias cromáticas o sustituir la tipografía requiere alcance y aprobación específicos; no debe ocurrir como efecto lateral de una tarea funcional.
