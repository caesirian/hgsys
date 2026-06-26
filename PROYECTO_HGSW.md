# HG Soluciones Web — Estado del proyecto
**Última actualización:** junio 2026 (sesión: refactor index_pro sin scroll)  
**Repo:** `Caesirian/Hgsys` (GitHub Pages → hgsolucionesweb.com.ar)  
**Contacto:** hernan.garbarino@gmail.com · WhatsApp +5491125333769

---

## Archivos en producción

| Archivo | URL | Descripción |
|---|---|---|
| `index_pro.html` | caesirian.github.io/Hgsys/index_pro.html | Página de entrada — presenta las 3 líneas (web / sistemas / demos) |
| `index_prueba.html` | caesirian.github.io/Hgsys/index_prueba.html | Landing servicios web — público emprendedor/comercio |
| `index_test.html` | caesirian.github.io/Hgsys/index_test.html | Landing servicios profesionales — PyMEs/cooperativas |
| `herramientas.html` | caesirian.github.io/Hgsys/herramientas.html | Contenedor de los 3 demos de herramientas, con cards |
| `erp-salud-demo.html` | caesirian.github.io/Hgsys/erp-salud-demo.html | Demo ERP salud — Pacientes, Agenda, Stock |
| `catalogo-stock-demo.html` | caesirian.github.io/Hgsys/catalogo-stock-demo.html | Demo catálogo de indumentaria — stock/precio/agotado por talle en vivo |
| `dashboard-turnos-demo.html` | caesirian.github.io/Hgsys/dashboard-turnos-demo.html | Demo dashboard de turnos — barbería, KPIs animados, simulación de día |
| `bot-whatsapp-demo.html` | caesirian.github.io/Hgsys/bot-whatsapp-demo.html | Demo bot de WhatsApp — stock, horarios, envíos, handoff a humano |
| `presupuesto.html` | hgsolucionesweb.com.ar/presupuesto.html | Cotizador actualizado junio 2026 |

---

## Decisiones de diseño tomadas

### index_prueba.html (servicios web)
- Fondo negro profundo `#07080f` · acento celeste eléctrico `#38bdf8`
- Tipografías: **Syne** (títulos) + **Inter** (cuerpo)
- Sin emojis — íconos SVG lineales propios
- Imágenes Unsplash con overlay oscuro
- Estructura: Problema → Diferenciador → Prueba social → Trabajos → Proceso → Precios → FAQ → CTA

### index_test.html (servicios profesionales)
- Fondo blanco roto `#f7f8fc` · acento azul profundo `#1e3a5f`
- Tipografías: **Instrument Serif** (títulos) + **Inter** (cuerpo)
- Mismo criterio: sin emojis, SVGs propios
- Estructura: Hero con mock de panel → Problema → Diferenciador navy → Servicios → Metodología → Casos → Stack → Testimonios → CTA

### Criterios compartidos
- Nunca usar emojis como íconos
- Imágenes reales de Unsplash (con filtro saturate para coherencia oscura/clara)
- Meta OG en ambas páginas
- Footer con link cruzado entre las dos landings
- Todo el código debe poder abrirse como archivo HTML estático sin servidor

### Demos de herramientas (catálogo, dashboard, bot)
Tres demos interactivos, pensados como sección transversal — no pertenecen a una sola landing, sino que se linkean desde ambas como "esto es lo que sé construir, tocalo vos mismo".

- **Negocio ficticio compartido:** "Ropa Urbana", tienda de indumentaria. Los tres demos comparten el mismo catálogo de productos (remera oversize, buzo canguro, pantalón cargo, camisa de lino, short deportivo) para que cuenten una sola historia coherente en vez de ser islas sueltas.
- **Identidad visual propia pero coherente:** fondo oscuro `#0d0f17` (variación del negro de `index_prueba`), acento celeste `#38bdf8` heredado, tipografías Syne/Inter/**JetBrains Mono** (la mono es nueva — le da carácter de "panel de control real" a números de stock/precio/KPIs)
- **Sin backend:** todo el estado vive en memoria (JS), con botón de reset/reinicio en los tres
- **Orden de construcción:** catálogo → dashboard → bot (el bot se dejó para el final a pedido explícito)

**`catalogo-stock-demo.html`** — Grilla de productos que se expanden mostrando talles. Por talle: stock editable (+/-), precio editable inline, toggle "agotado manual" independiente del stock (para reservas). Stats agregados (unidades totales, talles con stock bajo, talles agotados) recalculados en cada cambio.

**`dashboard-turnos-demo.html`** — Barbería "Don Aldo" (clientes niños y adultos, servicios y precios distintos). 4 KPIs (turnos hoy, ocupación con barra, cancelaciones con alerta automática, ticket promedio + facturación estimada), mini-agenda con 4-5 turnos y estado, gráfico de barras por franja horaria. Animación count-up al cargar; botón "Simular otro día" regenera todo con datos aleatorios realistas.

**`bot-whatsapp-demo.html`** — Mockup fiel de WhatsApp (burbujas, checks, indicador de escribiendo) conectado al mismo catálogo de "Ropa Urbana". Combina botones de respuesta rápida + texto libre con matching por keywords (producto, horarios, envíos, pagos, saludo). Si no entiende, lo dice y ofrece derivar a un humano — nunca inventa una respuesta. Panel lateral con contador en vivo de "resueltas por el bot" vs "derivadas a humano".

### index_pro.html (página de entrada)
Resuelve el pendiente estratégico de tener un punto de entrada único al repo. Tres cards al mismo nivel (no dos): Presencia web (`index_prueba.html`), Sistemas y automatización (`index_test.html`), Demos en vivo (`herramientas.html`). Mismo lenguaje visual que `index_prueba` (Syne/Inter, fondo `#07080f`, acento celeste). SVGs decorativos con `aria-hidden="true"`.

**Refactor "sin scroll" (commit `a420469`):** se simplificó el layout para que todo entre en una sola pantalla, sin scroll. Efecto colateral intencional: se eliminó la fila de accesos directos secundarios que había debajo de las cards (links a `presupuesto.html` y `erp-salud-demo.html`). Decisión: **se dejan afuera** — el presupuesto ya es alcanzable vía las cards (`index_test.html` → CTA cotizador) y el demo ERP vive dentro del universo de `herramientas.html`. No recuperar esos dos links sueltos salvo que se decida lo contrario más adelante.

### herramientas.html (contenedor de demos)
Página puente entre `index_pro.html` y los tres demos. Cards con eyebrow, título, descripción, chips y CTA "Probar demo" — mismo patrón visual que las cards de `index_pro.html`, pero adaptado a 3 columnas fijas en desktop. Nota explícita al pie aclarando que el negocio ("Ropa Urbana" / "Don Aldo") es ficticio.

---

## Proyectos reales que aparecen en el portfolio

| Proyecto | URL | Aparece en |
|---|---|---|
| Trensarmientoenlinea.com.ar | trensarmientoenlinea.com.ar | index_prueba + index_test |
| Cocoquerandi.com.ar | cocoquerandi.com.ar | index_prueba |
| CoopDigital | Caesirian/Hgsys · Coopdigital/ | index_test |
| ERP Salud Demo | erp-salud-demo.html | index_test |

*Nota: los tres demos de herramientas ("Ropa Urbana") son ficticios y deben marcarse explícitamente como ejemplo/demo en cualquier landing donde se linkeen — no son un cliente real, a diferencia de los anteriores.*

---

## Precios del cotizador (junio 2026 · ARS)

| Ítem | Precio | Tipo |
|---|---|---|
| Landing page | $ 350.000 | Único |
| Sitio institucional completo | $ 680.000 | Único |
| Sistema de gestión a medida | $ 1.800.000 | Único |
| Login de usuarios | $ 130.000 | Adicional |
| Panel / Dashboard | $ 180.000 | Adicional |
| Integración Google | $ 200.000 | Adicional |
| Automatización de procesos | $ 260.000 | Adicional |
| Turnos / Reservas / Pedidos | $ 230.000 | Adicional |
| Mantenimiento técnico mensual | $ 60.000 | Mensual |
| Soporte WhatsApp mensual | $ 40.000 | Mensual |

---

## Pendientes — por impacto

### Completado en sesión junio 2026

- [x] **Foto de Hernán** en `index_pro.html` — entre marca y pregunta central. Grid 120px + texto con `perfil.jpg` del repo
- [x] **SEO técnico completo** — JSON-LD `Person` + `ProfessionalService` con `@id` compartido en index_pro/prueba/test; `<link rel="canonical">` en los 5 archivos; `robots: noindex,follow` en presupuesto y herramientas; `og:image` + Twitter card en todos; `rel="noopener"` en todos los `target="_blank"`
- [x] **Seguridad inputs** — `maxlength` y `autocomplete` en los 4 campos del presupuestador
- [x] **Links cruzados** entre todas las páginas — footers de index_prueba, index_test y herramientas actualizados con navegación completa; logos del footer apuntan a index_pro
- [x] **CTA al presupuestador** — botón secundario en cada card de precios y en el CTA final de ambas landings
- [x] **Botón de WhatsApp flotante** con tooltip y pulso animado, mensaje prearmado en el link
- [x] **Refactor `index_pro.html` sin scroll** — todo el contenido entra en una sola pantalla. Costo: se eliminaron los accesos directos secundarios a `presupuesto.html` y `erp-salud-demo.html` (decisión: se dejan afuera, ver sección de diseño arriba)

### Alto impacto
- [x] **Foto de Hernán** en `index_pro.html` — entre marca y pregunta central. Grid 120px + texto con `perfil.jpg` del repo
- [ ] **Testimonio con nombre real** en cualquiera de las dos páginas — los actuales dicen "cliente confidencial"
- [x] **Caso de portfolio de comercio/profesional independiente** en `index_prueba.html` — resuelto vía los tres demos de herramientas (catálogo, dashboard, bot), con negocio ficticio "Ropa Urbana" explícitamente marcado como ejemplo
- [x] **Página contenedora de demos** — resuelto: `herramientas.html`, con cards a los tres demos
- [ ] **Definir si `index_pro.html` reemplaza a `index.html`** como página servida por default — pendiente de decisión del titular, no urgente
- [x] **Links cruzados** entre `index_prueba.html`, `index_test.html` y `herramientas.html` — footers actualizados con navegación completa entre las 4 páginas (incluyendo presupuesto)

### Medio impacto
- [x] **Link al presupuestador** desde las dos landings — CTA secundario en cada card de precios ("Calculá el precio exacto →") y como segundo botón en el CTA final de ambas páginas
- [ ] **Google Analytics** o similar — sin medición no hay datos de visitas ni comportamiento
- [ ] **Métricas de impacto** en los casos de `index_test.html` ("redujo X horas", "procesa Y operaciones")

### Pendiente estratégico
- [ ] Decidir si `index_prueba.html` e `index_test.html` **reemplazan o complementan** el sitio principal `hgsolucionesweb.com.ar`
- [x] Crear un `index.html` de entrada en el repo que presente las opciones — resuelto vía `index_pro.html` (pendiente real: que sea efectivamente el que se sirve por default, ver arriba)
- [ ] Definir dominio/subdominio definitivo para cada landing si se decide mantener las dos

---

## Stack técnico del desarrollador

- Vanilla JS (ES Modules)
- Firebase Auth + Firestore
- Google Apps Script
- Cloudinary (imágenes)
- GitHub Pages (hosting)
- Python · Excel / VBA
- APIs REST

---

## Contexto para retomar

Este proyecto son dos landings de presentación de servicios para **HG Soluciones Web**, el emprendimiento freelance de **Hernán Garbarino**, desarrollador con 18 años de background en administración y finanzas (incluyendo ARSAT S.A.), radicado en Buenos Aires.

Las dos landings fueron construidas en esta sesión desde cero con criterio de ventas real, no solo diseño. El criterio central es: **el visitante tiene que reconocer su problema en los primeros 5 segundos**.

Para acceder al repo usar la API de GitHub con fine-grained PAT. El token de esta sesión puede haber expirado — generar uno nuevo con scope `repo` si es necesario.
