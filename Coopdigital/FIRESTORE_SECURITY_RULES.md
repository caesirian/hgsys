# FIRESTORE_SECURITY_RULES.md

# CoopDigital

Política Oficial de Seguridad

Versión: 1.0

---

# Objetivo

Garantizar:

- aislamiento total entre cooperativas
- acceso basado en roles
- protección de documentos
- integridad de la información

---

# Principio Fundamental

Toda operación requiere:

1. Usuario autenticado
2. Usuario activo
3. Cooperativa activa
4. Permiso suficiente

Si cualquiera falla:

DENY

---

# Arquitectura de Seguridad — Modelo Objetivo (plan Blaze / Enterprise)

El esquema siguiente (Custom Claims) es el modelo objetivo para cuando el
proyecto migre a plan Blaze con Cloud Functions. Sirve como especificación
de esa migración futura.

Firebase Authentication

↓

Custom Claims

↓

Firestore Rules

↓

Storage Rules

---

# Claims Obligatorios — Modelo Objetivo

Una vez migrado a Custom Claims, todo usuario autenticado debe poseer:

{
  uid: string,

  cooperativaId: string,

  role: string,

  active: boolean
}

---

# Arquitectura de Seguridad — Implementación Actual (plan Spark)

Mientras el proyecto opera en plan Spark (sin Cloud Functions), no existen
Custom Claims. El cooperativaId y el rol se resuelven con dos lecturas de
Firestore en cada operación, usando get() dentro de las propias reglas.
Ver DATA_MODEL.md (sección USUARIOS INDEX) y SYSTEM_ARCHITECTURE.md
(sección Resolución de cooperativaId) para el flujo completo.

Funciones reales usadas en firestore.rules (equivalentes a las funciones
del modelo objetivo, pero sin depender de claims):

function perfil(cooperativaId)

Lee cooperativas/{cooperativaId}/usuarios/{uid} con get(). Reemplaza la
lectura de request.auth.token.

function isActive(cooperativaId)

Equivalente a isActive() del modelo objetivo, pero lee perfil(cooperativaId).activo
en vez de request.auth.token.active.

function role(cooperativaId)

Equivalente a leer request.auth.token.role; lee perfil(cooperativaId).rol.

function isAdmin(cooperativaId)

Equivalente a isAdmin() del modelo objetivo.

function puedeLeer(cooperativaId)

Cualquier rol activo. Usada como lectura general en la mayoría de las
entidades dentro de una cooperativa.

function puedeLeerUsuarios(cooperativaId)

Admin, consejero o síndico. Usada para lectura completa de la colección
usuarios y de eventos/auditoría.

function puedeEscribirGeneral(cooperativaId)

Admin, consejero u operador. Usada en entidades operativas (asociados,
documentos, vencimientos, movimientos contables).

function puedeEscribirGobernanza(cooperativaId)

Admin o consejero únicamente. Más estricta que puedeEscribirGeneral; usada
en entidades de gobernanza institucional (consejo, sindicatura, asambleas,
actas, padrones electorales), donde la carga operativa diaria no debe
poder dar de alta o modificar cargos, actas ni padrones.

---

# Roles Oficiales

admin

consejero

sindico

operador

consulta

---

# Jerarquía

admin

↓

consejero

↓

sindico

↓

operador

↓

consulta

---

# Funciones Base — Modelo Objetivo (plan Blaze / Custom Claims)

Las funciones de esta sección y la siguiente ("Roles") están escritas en
términos de request.auth.token.*, es decir, asumen Custom Claims. Son la
especificación del modelo objetivo (ver arriba). La implementación real
en plan Spark usa perfil(cooperativaId) con get(), documentada en la
sección "Arquitectura de Seguridad — Implementación Actual".

function isAuthenticated()

Retorna:

request.auth != null

---

function isActive()

Retorna:

request.auth.token.active == true

---

function hasCooperativa()

Retorna:

request.auth.token.cooperativaId != null

---

function sameCooperativa(cooperativaId)

Retorna:

request.auth.token.cooperativaId == cooperativaId

---

# Roles

function isAdmin()

return request.auth.token.role == "admin"

---

function isConsejero()

return request.auth.token.role == "consejero"

---

function isSindico()

return request.auth.token.role == "sindico"

---

function isOperador()

return request.auth.token.role == "operador"

---

function isConsulta()

return request.auth.token.role == "consulta"

---

# Permisos Globales

Lectura General:

admin
consejero
sindico
operador
consulta

---

Escritura General:

admin
consejero
operador

---

Eliminación:

admin

---

# Cooperativas

Ruta:

cooperativas/{cooperativaId}

Lectura:

sameCooperativa()

Escritura:

admin

---

# Usuarios

Ruta:

cooperativas/{cooperativaId}/usuarios/{usuarioId}

Lectura:

admin
consejero
sindico

Escritura:

admin

Eliminación:

admin

---

# Asociados

Ruta:

cooperativas/{cooperativaId}/asociados/{asociadoId}

Lectura:

todos los roles

Creación:

admin
consejero
operador

Actualización:

admin
consejero
operador

Eliminación:

admin

---

# Consejo de Administración

Ruta:

consejoAdministracion

Lectura:

todos

Escritura:

admin
consejero

---

# Sindicatura

Lectura:

todos

Escritura:

admin
consejero

---

# Asambleas

Lectura:

todos

Escritura:

admin
consejero

---

# Actas

Lectura:

todos

Creación:

admin
consejero

Modificación:

admin
consejero

Eliminación:

admin

---

# Padrones Electorales

Ruta:

padronesElectorales

Lectura:

todos

Generación (creación del padrón y su subcolección electores):

admin
consejero

Actualización (solo campos habilitado/voto de un elector):

admin
consejero
operador

Eliminación:

admin

Subcolección electores:

Hereda lectura y escritura del padrón contenedor. No se permite creación o
eliminación individual de electores desde el frontend fuera de la
generación en bloque del padrón.

---

# Documentos

Lectura:

todos

Carga:

admin
consejero
operador

Eliminación:

admin

---

# Biblioteca Institucional

Lectura:

todos

Escritura:

admin
consejero

---

# Biblioteca Normativa

Solo lectura.

Nunca editable por cooperativas.

---

# Certificados

Lectura:

todos

Emisión:

admin
consejero

---

# Comunicaciones

Lectura:

todos

Publicación:

admin
consejero

---

# Mesa de Entradas

Lectura:

todos

Alta:

admin
consejero
operador

---

# Vencimientos

Lectura:

todos

Alta:

admin
consejero
operador

Modificación:

admin
consejero
operador

---

# Plantillas

Lectura:

todos

Escritura:

admin
consejero

---

# Trámites

Lectura:

todos

Escritura:

admin
consejero
operador

---

# Eventos

Lectura:

admin
consejero
sindico

Creación:

sistema únicamente

Nunca desde frontend.

---

# Notificaciones

Lectura:

usuario propietario

Creación:

sistema

---

# Validaciones Obligatorias

Todo create debe validar:

fechaCreacion

creadoPor

---

Todo update debe validar:

fechaModificacion

modificadoPor

---

# Protección Contra Escalada

Prohibido modificar:

role

cooperativaId

uid

desde frontend.

Solo Cloud Functions.

---

# Protección Contra Acceso Cruzado

Toda consulta deberá validar:

sameCooperativa()

Ejemplo:

Permitido:

cooperativaId token
==
cooperativaId documento

Denegado:

cooperativaId token
!=
cooperativaId documento

---

# Storage

Estructura Oficial

cooperativas/

{cooperativaId}/

documentos/

actas/

certificados/

logos/

biblioteca/

---

# Storage Rules

Lectura:

sameCooperativa()

Escritura:

admin
consejero
operador

Eliminación:

admin

---

# Archivos Permitidos

pdf

doc

docx

xls

xlsx

jpg

jpeg

png

webp

---

# Tamaño Máximo

Free:

10 MB

Premium:

50 MB

Enterprise:

100 MB

---

# Eventos de Auditoría

Registrar automáticamente:

alta_asociado

baja_asociado

modificacion_asociado

alta_usuario

modificacion_usuario

carga_documento

eliminacion_documento

creacion_acta

modificacion_acta

inicio_sesion

cierre_sesion

---

# Reglas Firestore Base

match /cooperativas/{cooperativaId}/{document=**}

allow read:

if isAuthenticated()
&& isActive()
&& sameCooperativa(cooperativaId);

allow write:

if isAuthenticated()
&& isActive()
&& sameCooperativa(cooperativaId)
&& (
isAdmin()
||
isConsejero()
||
isOperador()
);

---

# Recomendación Enterprise

Implementar:

Firebase Custom Claims

Cloud Functions

Role Service

Audit Service

Permission Service

para evitar lógica crítica en frontend.

---

# Regla de Gobierno

Toda modificación de:

- roles
- permisos
- claims
- rules

requiere actualizar:

PROJECT_SPEC.md

DATA_MODEL.md

SYSTEM_ARCHITECTURE.md

FIRESTORE_SECURITY_RULES.md

antes de desplegar.
