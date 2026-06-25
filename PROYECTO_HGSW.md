# HG Soluciones Web — Estado del proyecto
**Última actualización:** junio 2026  
**Repo:** `Caesirian/Hgsys` (GitHub Pages → hgsolucionesweb.com.ar)  
**Contacto:** hernan.garbarino@gmail.com · WhatsApp +5491125333769

---

## Archivos en producción

| Archivo | URL | Descripción |
|---|---|---|
| `index_prueba.html` | caesirian.github.io/Hgsys/index_prueba.html | Landing servicios web — público emprendedor/comercio |
| `index_test.html` | caesirian.github.io/Hgsys/index_test.html | Landing servicios profesionales — PyMEs/cooperativas |
| `erp-salud-demo.html` | caesirian.github.io/Hgsys/erp-salud-demo.html | Demo ERP salud — Pacientes, Agenda, Stock |
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

---

## Proyectos reales que aparecen en el portfolio

| Proyecto | URL | Aparece en |
|---|---|---|
| Trensarmientoenlinea.com.ar | trensarmientoenlinea.com.ar | index_prueba + index_test |
| Cocoquerandi.com.ar | cocoquerandi.com.ar | index_prueba |
| CoopDigital | Caesirian/Hgsys · Coopdigital/ | index_test |
| ERP Salud Demo | erp-salud-demo.html | index_test |

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

### Alto impacto
- [ ] **Foto de Hernán** en `index_prueba.html` — sección diferenciador. En servicios personales sube la conversión significativamente
- [ ] **Testimonio con nombre real** en cualquiera de las dos páginas — los actuales dicen "cliente confidencial"
- [ ] **Caso de portfolio de comercio/profesional independiente** en `index_prueba.html` — Cocoquerandí y el tren no generan identificación en ese público objetivo

### Medio impacto
- [ ] **Link al presupuestador** desde las dos landings — hoy no hay ningún CTA que lleve a `presupuesto.html`
- [ ] **Google Analytics** o similar — sin medición no hay datos de visitas ni comportamiento
- [ ] **Métricas de impacto** en los casos de `index_test.html` ("redujo X horas", "procesa Y operaciones")

### Pendiente estratégico
- [ ] Decidir si `index_prueba.html` e `index_test.html` **reemplazan o complementan** el sitio principal `hgsolucionesweb.com.ar`
- [ ] Crear un `index.html` de entrada en el repo que redirija según perfil del visitante o presente las dos opciones
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
