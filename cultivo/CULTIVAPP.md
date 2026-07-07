# CultivApp — Estado del proyecto y análisis técnico

**Última actualización:** julio 2026
**Repos:** `Caesirian/hgsys` (`cultivo/` — frontend) + `Caesirian/cultivapp-tuya--proxy` (backend)
**Hosting:** GitHub Pages (frontend) + Render (proxy) + Firebase `cultivapp-c9672` (Firestore)

---

## 1. Arquitectura general

```
┌─────────────────────┐      ┌──────────────────────────┐      ┌─────────────────┐
│  cultivo/index.html │ ───▶ │ cultivapp-tuya--proxy     │ ───▶ │ Tuya OpenAPI     │
│  (GitHub Pages)      │      │ (Render, Node/Express)    │      │ (Western America)│
│  ~2330 líneas        │ ◀─── │ ~610 líneas               │ ◀─── │                  │
└─────────┬────────────┘      └──────────┬───────────────┘      └─────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────────┐      ┌──────────────────────────┐
│ Firestore             │      │ Firestore (mismo proyecto)│
│ lugares, plantas +     │      │ lecturasSensores           │
│ subcolecciones         │      │ (snapshot cada 15 min via  │
│ (CRUD directo desde    │      │  GitHub Actions cron)      │
│  el navegador)         │      │                            │
└──────────────────────┘      └──────────────────────────┘
```

Todo corre sobre el proyecto Firebase **`cultivapp-c9672`** (Spark, gratuito). El frontend habla directo con Firestore (SDK modular v12.14.0) para todo lo que es gestión (lugares/plantas/mediciones), y habla con el proxy solo para todo lo que es Tuya (sensores/switches) e histórico.

No hay backend propio para la lógica de negocio — es un sitio estático + un proxy delgado. Sin build step, sin framework, sin bundler.

---

## 2. Modelo de datos (Firestore)

### Colección `lugares`
Espacio físico de cultivo (ej. "Carpa", "Estructura 3×1×2").

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | string | |
| `dimensiones` | string | texto libre, ej. "1×1×2 m" |
| `sensoresTuya` | array\<string\> | alias de `DISPOSITIVOS_TUYA` (ej. `sensor_carpa`) |
| `switchLuces` | array\<string\> | alias de switch de luces |
| `switchTurbinas` | array\<string\> | alias de switch de turbinas |
| `luces` | array\<{cantidad,tipo}\> | info física, no vinculada a Tuya |
| `intractor`, `extractor` | boolean | |
| `creadoEn` | timestamp | |

Subcolección `lugares/{id}/areas/{areaId}`: subdivisiones dentro de un lugar (mismo patrón de luces/dimensiones).

### Colección `plantas`
Individuo o esqueje. **No tiene subcolección propia de "lugar"** — referencia por ID plano.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `genetica`, `tipoOrigen` | string | tipoOrigen = semilla/esqueje |
| `fechaInicio` | timestamp | usado para calcular "día de ciclo" |
| `fase` | string | `germinacion\|vegetativa\|floracion\|cosecha` |
| `substrato`, `tamMaceta`, `sistemaRiego`, `alturaPlantin` | string | |
| `lugarId`, `areaId`, `areaNombre` | string | vínculo al lugar (sin integridad referencial) |
| `notas` | string | |

Subcolecciones, todas con patrón `plantas/{id}/{sub}/{subId}` + `creadoEn`:
- `mediciones` — tempAmb, tempMaceta, humedad, ph, ec, tdsAgua, luz, co2, vpd, notas
- `eventos` — bitácora libre
- `nutricion` — semana, fase, productos[], phAgua, ecObjetivo
- `inase` — trazabilidad regulatoria (nº registro, etc.)

**No hay ninguna operación de `update` sobre `plantas`** — solo `addDoc`. Corregir un typo (ej. "Polarks" → "Polaris") requiere editar a mano en la consola de Firebase.

### Colección `lecturasSensores` (escrita por el proxy, no por el frontend)
`lecturasSensores/{alias}/lecturas/{timestamp}` → `{ts, online, sensores}`. Poblada cada 15 min por un GitHub Action que golpea `/tuya/snapshot`. Pensada para tener histórico propio más allá del límite gratuito de 7 días de Tuya — **hoy no se lee desde ningún lado del frontend todavía** (ver pendientes).

### Registro de dispositivos Tuya
Antes duplicado en frontend y proxy; ahora unificado: el proxy expone `GET /tuya/devices` con `{id, tipo, nombre, lugar}` por alias, y el frontend lo consume al arrancar (con fallback local si el proxy no responde a tiempo, ej. Render "dormido").

---

## 3. Backend (proxy Tuya)

`cultivapp-tuya--proxy/index.js`, ~610 líneas, Express + Node `https` nativo (sin SDK de Tuya, firma HMAC-SHA256 manual).

**Endpoints:**

| Endpoint | Uso |
|---|---|
| `GET /tuya?device=` | Estado actual (temp/humedad/switch) + `online` |
| `GET /tuya/all` | Estado de todos los dispositivos conocidos, en paralelo |
| `GET /tuya/history?device=&range=24h\|7d\|fecha=` | Histórico crudo + estadísticas (min/max/avg) |
| `GET /tuya/history/resumen?device=` | Actual + histórico 24h/7d en una sola llamada |
| `GET /tuya/fotoperiodo?device=` | Horas de luz de un día completo + sesión actual en curso |
| `GET /tuya/cultivo/resumen` | Todos los sensores agrupados por lugar (no usado por el frontend actualmente) |
| `GET /tuya/devices` | Catálogo id+metadata |
| `POST /tuya/switch` | Encender/apagar (protegido con clave, no usado desde el frontend todavía) |
| `GET /tuya/snapshot?key=` | Disparado por GitHub Actions cada 15 min |

**Decisiones técnicas correctas ya tomadas:**
- Token de Tuya cacheado en memoria (no se pide uno nuevo por request)
- Valores de query string **sin URL-encodear** en la firma (Tuya firma con el literal, no con el %-encoded — bug real que costó tiempo depurar)
- `online` viene de `GET /v1.0/devices/{id}` (no de `/status`), en la misma llamada que el estado
- Cálculo de fotoperíodo integra eventos reales de encendido/apagado (no asume que el estado no cambió entre lecturas)

**Deuda técnica conocida:**
- Sin persistencia de estado entre reinicios de Render (el cache de token se pierde en cada cold start — aceptable, es barato de recuperar)
- `/tuya/cultivo/resumen` quedó implementado pero sin consumidor — evaluar si se elimina o se usa

---

## 4. Frontend (`cultivo/index.html`)

Un solo archivo, ~2330 líneas: HTML + CSS + JS (`type="module"`) en el mismo documento. Sin build step.

**Vistas:** Dashboard (visual, SVG animado) · Lugares (gestión + clima + VPD + fotoperíodo + gráficos) · Plantas (detalle por lugar: áreas, individuos, mediciones, eventos, nutrición, INASE) · Sensores Tuya (panel técnico crudo).

**Patrones establecidos:**
- Refresco liviano (`/tuya?device=`) cada 1 min para valores en vivo; refresco pesado (histórico, `report-logs`) solo al entrar a la vista, con botón manual de "minimizar" que evita la llamada si no se abre
- Reordenamiento de cards por prioridad (luces encendidas primero, fuera de línea al final) recalculado en cada refresco de 1 min, moviendo nodos del DOM en vez de recrearlos (preserva gráficos ya dibujados)
- Todas las funciones invocadas desde atributos `onclick`/`onchange` inline están expuestas explícitamente en `window.*` (necesario porque viven dentro de un `<script type="module">`, que no expone nada al scope global por sí solo)

**Deuda técnica encontrada en este análisis:**
1. **`cargarPlantasLugar` trae TODA la colección `plantas`** y filtra client-side por `lugarId`, mientras que la función más nueva (`obtenerPlantasResumenLugar`) sí usa `where("lugarId","==",...)`. Inconsistente; con pocas plantas no importa, pero no escala y son dos formas de hacer lo mismo.
2. **El checklist de sensores/switches del modal "+ Nuevo lugar" es HTML estático**, no se genera desde el catálogo dinámico (`DISPOSITIVOS_TUYA`). Si se agrega un dispositivo nuevo en el proxy, hay que agregar el checkbox a mano acá también.
3. **No hay `updateDoc` para `plantas`** — ningún campo es editable después de creado desde la UI.
4. **`lecturasSensores`** (histórico propio en Firestore, sin límite de 7 días) se escribe pero nunca se lee desde el frontend.

---

## 5. Seguridad — punto abierto sin verificar

El repo tiene un `firestore.rules` en la raíz, pero **es de otro proyecto** (una app de foros/artículos con colecciones `articulos`, `foros`, `usuarios`, `eventos` de "transporte colaborativo" — nada que ver con `lugares`/`plantas`).

**No hay evidencia en el repo de qué reglas de seguridad están activas en el proyecto Firebase `cultivapp-c9672`.** Dado que se creó reciente y de cero, es razonable sospechar que están en modo prueba (`allow read, write: if true` hasta una fecha de expiración) o directamente sin configurar. Esto significa que, potencialmente, **cualquiera con la URL del sitio podría leer o escribir en la base de datos completa** (lugares, plantas, mediciones, notas) sin autenticación.

**Acción pendiente:** confirmar en la consola de Firebase (`cultivapp-c9672` → Firestore → Reglas) qué hay activo hoy, y escribir reglas explícitas — aunque sea de un solo usuario sin login, conviene como mínimo restringir por dominio de origen o cerrar escritura pública.

---

## 6. Roadmap propuesto (análisis agronómico + técnico)

### 🔴 Crítico
- [x] **Fotoperíodo** — horas reales de luz vs objetivo por etapa, alerta en floración (implementado)
- [ ] **Alertas activas** (push/Telegram) cuando VPD, fotoperíodo o sensor offline se salen de rango — hoy todo es pasivo (hay que abrir la app)
- [ ] **Revisar reglas de seguridad de Firestore** (sección 5)

### 🟠 Importante
- [ ] **Usar `lecturasSensores` para histórico >7 días** — ya se guarda, falta el gráfico que lo lea
- [ ] **pH/EC con rango objetivo por etapa**, mismo patrón que VPD
- [ ] **Volumen de riego + % drenaje** (runoff) — hoy no hay forma de calcular sobre/sub-riego

### 🟡 Deseable
- [ ] **Editar planta** (hoy no existe `update`, solo `create`) — resolvería a futuro errores de tipeo como "Polarks"
- [ ] Unificar `cargarPlantasLugar` para usar `where` en vez de traer toda la colección
- [ ] Generar el checklist de sensores del modal "+ Nuevo lugar" desde el catálogo dinámico
- [ ] Sanidad vegetal con seguimiento plaga→tratamiento→reevaluación
- [ ] Etapa de secado/curado con rango objetivo propio (18-21°C, 45-55%HR)
- [ ] Rendimiento por planta/watt (peso húmedo/seco)

### 🟢 Cumplimiento normativo
- [ ] Trazabilidad INASE encadenada semilla/madre → esqueje → cosecha (las piezas existen sueltas, falta el hilo conductor exportable)

---

## 7. Contexto para retomar

CultivApp es el sistema de monitoreo del cultivo indoor personal de Coco (Hernán Garbarino), con dos espacios físicos: **Carpa** (1×1×2, sensor+luces+turbinas) y **Estructura 3×1×2** (sensor+luces). Integra sensores/switches Tuya vía un proxy propio (necesario porque Tuya no permite llamar su API directo desde el browser por CORS/firma), con Firestore como base de gestión de plantas/mediciones y Firebase project dedicado (`cultivapp-c9672`, separado de CoopDigital a propósito).

Para retomar trabajo en el proxy o el frontend, generar un PAT de GitHub fine-grained con permisos **Contents: Read/Write** (y **Workflows: Read/Write** si se toca `.github/workflows/`) sobre el repo correspondiente — los tokens de sesiones anteriores ya fueron revocados.
