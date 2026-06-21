
# SYSTEM_ARCHITECTURE.md

# CoopDigital

Arquitectura Oficial del Sistema

Versión: 1.0

---

# Objetivo

Definir la arquitectura técnica oficial de CoopDigital.

Toda implementación deberá respetar este documento.

Ningún desarrollador ni agente IA podrá modificar la arquitectura sin actualizar previamente este archivo.

---

# Filosofía de Arquitectura

CoopDigital se basa en los siguientes principios:

- Modularidad
- Escalabilidad
- Mantenibilidad
- Seguridad
- Reutilización
- Separación de responsabilidades

---

# Arquitectura General

Patrón:

UI → Services → Firebase

Permitido:

Página
 ↓
Servicio
 ↓
Firestore

NO permitido:

Página
 ↓
Firestore

---

# Stack Tecnológico

Frontend

- HTML5
- CSS3
- JavaScript ES2023

Backend

- Firebase Authentication
- Cloud Firestore
- Firebase Storage

Hosting

- Firebase Hosting

Repositorio

- GitHub

---

# Arquitectura SaaS

Modelo:

Multi-Tenant

Estructura lógica:

Federación
 └── Cooperativa
      └── Usuarios
      └── Datos

Toda operación requiere:

cooperativaId

Ninguna consulta podrá devolver datos de otra cooperativa.

---

# Resolución de cooperativaId (plan Spark / gratuito)

El proyecto opera en plan Spark (sin Cloud Functions ni Firebase Storage,
ambos de pago desde feb/2026). Por lo tanto el cooperativaId de cada
usuario NO se resuelve con Custom Claims (que requieren una Cloud Function
para asignarse tras el alta), sino con dos lecturas de Firestore:

1. usuariosIndex/{uid} (colección global) → { cooperativaId }

2. cooperativas/{cooperativaId}/usuarios/{uid} → perfil completo (rol, activo)

Ver DATA_MODEL.md (sección USUARIOS INDEX) para el detalle del modelo y
FIRESTORE_SECURITY_RULES.md para las reglas de acceso.

Si el proyecto migra a plan Blaze, este mecanismo puede reemplazarse por
Custom Claims sin afectar la estructura de cooperativas/usuarios/datos.

---

# Estructura de Carpetas

src/

├── assets/
├── components/
├── config/
├── layouts/
├── modules/
├── pages/
├── services/
├── stores/
├── styles/
├── utils/
├── validators/
└── firebase/

---

# Assets

Recursos estáticos.

assets/

├── images/
├── icons/
├── logos/
└── fonts/

---

# Components

Componentes reutilizables.

components/

├── button/
├── card/
├── modal/
├── table/
├── input/
├── select/
├── badge/
├── alert/
├── loader/
└── pagination/

---

# Layouts

layouts/

├── main-layout/
├── auth-layout/
└── public-layout/

---

# Main Layout

Contiene:

- Sidebar
- Navbar
- Content Area

---

# Pages

pages/

login/
dashboard/

configuracion/

error403/

error404/

---

# Modules

Cada módulo contiene toda su lógica.

modules/

├── asociados/
├── usuarios/
├── consejo/
├── sindicatura/
├── asambleas/
├── actas/
├── documentos/
├── biblioteca/
├── certificados/
├── comunicaciones/
├── vencimientos/
├── eventos/
├── mesa-entradas/
├── plantillas/
├── notificaciones/

---

# Estructura Interna de un Módulo

Ejemplo:

modules/asociados/

├── components/
├── views/
├── services/
├── validators/
├── routes.js
└── index.js

---

# Services

Único acceso autorizado a Firebase.

services/

auth.service.js

cooperativa.service.js

usuario.service.js

asociado.service.js

documento.service.js

acta.service.js

asamblea.service.js

vencimiento.service.js

evento.service.js

certificado.service.js

notificacion.service.js

---

# Regla Obligatoria

Jamás acceder a Firestore desde:

- páginas
- componentes
- layouts

Solo desde services.

---

# Stores

Estado global.

stores/

auth.store.js

app.store.js

user.store.js

permission.store.js

notification.store.js

---

# Utils

Funciones auxiliares.

utils/

date.js

formatters.js

validators.js

permissions.js

pdf.js

excel.js

storage.js

audit.js

---

# Validators

Validaciones centralizadas.

validators/

asociado.validator.js

usuario.validator.js

acta.validator.js

documento.validator.js

---

# Config

config/

app.config.js

routes.config.js

permissions.config.js

plans.config.js

firebase.config.js

---

# Firebase

firebase/

auth.js

firestore.js

storage.js

---

# Sistema de Permisos

Roles:

admin

consejero

sindico

operador

consulta

---

# Permission Matrix

Implementar:

permissionMatrix

Ejemplo:

permissionMatrix = {

usuarios: {
admin: true,
consejero: false
}

}

---

# Helper Global

Implementar:

hasPermission()

Uso:

hasPermission(
usuario,
"usuarios",
"create"
)

---

# Route Guards

Implementar:

requireAuth()

requireRole()

requirePermission()

---

# Navegación

Rutas:

/login

/dashboard

/cooperativa

/usuarios

/asociados

/libro-asociados

/consejo

/sindicatura

/asambleas

/actas

/documentos

/biblioteca

/certificados

/comunicaciones

/mesa-entradas

/vencimientos

/eventos

/plantillas

/notificaciones

/padron-electoral

/configuracion

---

# Auditoría

Toda operación:

create

update

delete

debe registrar evento.

---

# Audit Service

Implementar:

audit.service.js

Funciones:

registerEvent()

updateAuditFields()

---

# Campos de Auditoría

Todos los documentos:

{
creadoPor,
fechaCreacion,
modificadoPor,
fechaModificacion
}

---

# Eventos Auditables

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

# Firebase Storage

Estructura:

cooperativas/

{cooperativaId}/

documentos/

actas/

certificados/

logos/

biblioteca/

---

# Upload Service

Implementar:

uploadFile()

deleteFile()

getDownloadUrl()

---

# Exportaciones

Implementar:

PDF

Excel

CSV

---

# Generación PDF

Servicios:

pdf.service.js

Capacidades:

- Actas
- Certificados
- Libro de Asociados
- Reportes

---

# Generación Excel

excel.service.js

Capacidades:

- Asociados
- Vencimientos
- Usuarios
- Eventos

---

# Notificaciones

Arquitectura preparada para:

Internas

Email

WhatsApp

Push

---

# IA Institucional

Módulo reservado:

modules/ai/

Servicios:

ai-actas.service.js

ai-convocatorias.service.js

ai-certificados.service.js

ai-normativa.service.js

ai-documentos.service.js

---

# Feature Flags

Implementar:

system/features

Ejemplos:

ia_enabled

api_enabled

whatsapp_enabled

portal_asociados_enabled

---

# Planes

Implementar:

system/plans

Planes:

free

premium

enterprise

Cada módulo debe poder activarse o desactivarse por plan.

---

# Testing

tests/

unit/

integration/

e2e/

---

# Entornos

development

staging

production

Cada entorno utilizará:

Firebase Project independiente.

---

# Convenciones

Variables

camelCase

Funciones

camelCase

Clases

PascalCase

Archivos

kebab-case

Constantes

UPPER_CASE

---

# Reglas de Código

Aplicar:

SOLID

DRY

KISS

Clean Architecture

---

# Regla de Gobierno

Si se modifica:

- estructura Firestore
- permisos
- módulos
- arquitectura

deben actualizarse previamente:

PROJECT_SPEC.md

DATA_MODEL.md

SYSTEM_ARCHITECTURE.md

antes de realizar cambios en el código.
