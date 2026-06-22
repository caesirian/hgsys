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

# Arquitectura de Seguridad

Firebase Authentication

↓

Custom Claims

↓

Firestore Rules

↓

Storage Rules

---

# Claims Obligatorios

Todo usuario autenticado debe poseer:

{
  uid: string,

  cooperativaId: string,

  role: string,

  active: boolean
}

---

# Nota de Implementación: Custom Claims vs usuariosIndex

Custom Claims requiere Cloud Functions, no disponible en plan Spark
(gratuito). La implementación real sustituye esto con una colección
global usuariosIndex/{uid} -> { cooperativaId }, consultada con get()
desde las propias reglas en vez de leer request.auth.token.

usuariosIndex se escribe exclusivamente vía Admin SDK, nunca desde el
cliente (`allow list, write: if false`). La única vía de escritura es
Coopdigital/scripts/onboarding-cooperativa.js. Ver DATA_MODEL.md,
sección USUARIOS INDEX.

El resto de esta sección describe el modelo de Custom Claims como
referencia de diseño; en el código real, `role` y `active` se leen del
documento cooperativas/{cooperativaId}/usuarios/{uid} vía get(), no del
token.

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

# Funciones Base

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
