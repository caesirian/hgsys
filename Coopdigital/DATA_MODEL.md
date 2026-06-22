# DATA_MODEL.md

# CoopDigital

Modelo de Datos Oficial

Versión: 1.0

---

# Principios

Todas las entidades:

- pertenecen a una cooperativa
- poseen auditoría
- son multi-tenant
- son compatibles con exportación
- son compatibles con API futura

---

# Estructura General Firestore

federaciones/

organismos/

normativa/

cooperativas/

---

############################################################
# FEDERACIONES
############################################################

federaciones/{federacionId}

{
  nombre: string,
  sigla: string,

  cuit: string,

  email: string,

  telefono: string,

  domicilio: string,

  logoUrl: string,

  activa: boolean,

  fechaCreacion: timestamp,

  creadoPor: string,

  fechaModificacion: timestamp,

  modificadoPor: string
}

---

############################################################
# ORGANISMOS
############################################################

organismos/{organismoId}

{
  nombre: string,

  sigla: string,

  jurisdiccion: string,

  sitioWeb: string,

  email: string,

  telefono: string,

  activo: boolean
}

Ejemplos:

INAES

ARCA

AFIP

Municipios

Bancos

Federaciones

---

############################################################
# NORMATIVA
############################################################

normativa/{normativaId}

{
  titulo: string,

  tipo: string,

  organismoId: string,

  numeroNorma: string,

  fechaPublicacion: timestamp,

  resumen: string,

  urlDocumento: string,

  vigente: boolean,

  etiquetas: array
}

Tipos:

Ley

Resolución

Disposición

Circular

Reglamento

---

############################################################
# USUARIOS INDEX
############################################################

usuariosIndex/{uid}

{
  cooperativaId: string
}

Colección global, un documento por usuario de Auth. Reemplaza a
Custom Claims (no disponibles sin Cloud Functions / plan Spark).

Lectura: únicamente el propio usuario (uid == auth.uid).
Escritura: bloqueada por completo desde el cliente. Solo Admin SDK,
vía Coopdigital/scripts/onboarding-cooperativa.js.

Ver SYSTEM_ARCHITECTURE.md y FIRESTORE_SECURITY_RULES.md para el
detalle de por qué este índice sustituye a Custom Claims.

---

############################################################
# COOPERATIVAS
############################################################

cooperativas/{cooperativaId}

Nota: este documento, junto con usuariosIndex/{uid} (ver sección
USUARIOS INDEX más arriba), se crea exclusivamente vía
Coopdigital/scripts/onboarding-cooperativa.js (Admin SDK). Nunca desde
el cliente. Ver PROJECT_SPEC.md → Alta de Cooperativas.

{
  nombre: string,

  matricula: string,

  cuit: string,

  email: string,

  telefono: string,

  domicilio: string,

  localidad: string,

  provincia: string,

  codigoPostal: string,

  sitioWeb: string,

  logoUrl: string,

  colorPrincipal: string,

  plan: string,

  activa: boolean,

  federacionId: string|null,

  fechaAlta: timestamp,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
}

Planes:

free

premium

enterprise

---

############################################################
# USUARIOS
############################################################

cooperativas/{cooperativaId}/usuarios/{usuarioId}

{
  uid: string,

  nombre: string,

  apellido: string,

  email: string,

  telefono: string,

  rol: string,

  activo: boolean,

  ultimoAcceso: timestamp,

  fechaInvitacion: timestamp,

  fechaAlta: timestamp,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
}

Roles:

admin

consejero

sindico

operador

consulta

---

############################################################
# ASOCIADOS
############################################################

cooperativas/{cooperativaId}/asociados/{asociadoId}

{
  numeroAsociado: string,

  apellido: string,

  nombre: string,

  dni: string,

  cuit: string,

  fechaNacimiento: timestamp,

  telefono: string,

  email: string,

  domicilio: string,

  localidad: string,

  provincia: string,

  codigoPostal: string,

  fechaIngreso: timestamp,

  fechaEgreso: timestamp|null,

  estado: string,

  observaciones: string,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
}

Estados:

activo

suspendido

dadoDeBaja

fallecido

---

############################################################
# LIBRO DE ASOCIADOS
############################################################

No requiere colección propia.

Se genera automáticamente desde:

asociados

---

############################################################
# CONSEJO DE ADMINISTRACION
############################################################

cooperativas/{cooperativaId}/consejoAdministracion/{cargoId}

{
  asociadoId: string,

  cargo: string,

  inicioMandato: timestamp,

  finMandato: timestamp,

  vigente: boolean
}

---

############################################################
# SINDICATURA
############################################################

cooperativas/{cooperativaId}/sindicatura/{sindicoId}

{
  asociadoId: string,

  tipo: string,

  inicioMandato: timestamp,

  finMandato: timestamp,

  vigente: boolean
}

Tipos:

titular

suplente

---

############################################################
# ASAMBLEAS
############################################################

cooperativas/{cooperativaId}/asambleas/{asambleaId}

{
  tipo: string,

  fechaAsamblea: timestamp,

  fechaConvocatoria: timestamp,

  ordenDelDia: array,

  estado: string,

  actaId: string|null,

  observaciones: string
}

Tipos:

ordinaria

extraordinaria

informativa

Estados:

planificada

realizada

cerrada

---

############################################################
# ACTAS
############################################################

cooperativas/{cooperativaId}/actas/{actaId}

{
  numeroActa: string,

  tipo: string,

  fecha: timestamp,

  titulo: string,

  contenido: string,

  archivoPdfUrl: string,

  firmada: boolean
}

---

############################################################
# DOCUMENTOS
############################################################

cooperativas/{cooperativaId}/documentos/{documentoId}

{
  nombre: string,

  categoria: string,

  descripcion: string,

  storagePath: string,

  url: string,

  fechaCarga: timestamp,

  visible: boolean
}

Categorias:

INAES

ARCA

AFIP

Municipal

Legal

Contable

Contratos

Convenios

Actas

---

############################################################
# BIBLIOTECA INSTITUCIONAL
############################################################

cooperativas/{cooperativaId}/biblioteca/{documentoId}

{
  titulo: string,

  categoria: string,

  descripcion: string,

  archivoUrl: string,

  etiquetas: array
}

---

############################################################
# CERTIFICADOS
############################################################

cooperativas/{cooperativaId}/certificados/{certificadoId}

{
  tipo: string,

  asociadoId: string,

  fechaEmision: timestamp,

  archivoUrl: string,

  emitidoPor: string
}

---

############################################################
# COMUNICACIONES
############################################################

cooperativas/{cooperativaId}/comunicaciones/{comunicacionId}

{
  titulo: string,

  contenido: string,

  fechaPublicacion: timestamp,

  visible: boolean,

  destinatarios: array
}

---

############################################################
# MESA DE ENTRADAS
############################################################

cooperativas/{cooperativaId}/mesaEntradas/{registroId}

{
  fecha: timestamp,

  tipo: string,

  origen: string,

  destino: string,

  asunto: string,

  observaciones: string,

  adjuntoUrl: string,

  estado: string
}

Estados:

pendiente

procesado

archivado

---

############################################################
# VENCIMIENTOS
############################################################

cooperativas/{cooperativaId}/vencimientos/{vencimientoId}

{
  descripcion: string,

  organismoId: string,

  fechaVencimiento: timestamp,

  estado: string,

  observaciones: string
}

Estados:

pendiente

cumplido

vencido

---

############################################################
# PLANTILLAS
############################################################

cooperativas/{cooperativaId}/plantillas/{plantillaId}

{
  nombre: string,

  tipo: string,

  contenido: string,

  activa: boolean
}

---

############################################################
# TRAMITES
############################################################

cooperativas/{cooperativaId}/tramites/{tramiteId}

{
  nombre: string,

  descripcion: string,

  organismoId: string,

  estado: string,

  fechaInicio: timestamp,

  fechaCierre: timestamp|null
}

---

############################################################
# NOTIFICACIONES
############################################################

cooperativas/{cooperativaId}/notificaciones/{notificacionId}

{
  titulo: string,

  mensaje: string,

  tipo: string,

  leida: boolean,

  fecha: timestamp
}

---

############################################################
# EVENTOS
############################################################

cooperativas/{cooperativaId}/eventos/{eventoId}

{
  tipo: string,

  descripcion: string,

  usuarioId: string,

  fecha: timestamp,

  metadata: object
}

Ejemplos:

alta_asociado

baja_asociado

modificacion_asociado

creacion_usuario

carga_documento

creacion_acta

modificacion_acta

inicio_sesion

cierre_sesion
