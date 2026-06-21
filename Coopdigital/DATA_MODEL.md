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

Excepción única: usuariosIndex/{uid} (ver sección dedicada). Es una colección
global de infraestructura, no una entidad de negocio: existe para que el
cliente pueda resolver a qué cooperativa pertenece un usuario sin Custom
Claims ni Cloud Functions (plan Spark/gratuito). No posee auditoría porque
nunca se escribe desde el cliente.

---

# Estructura General Firestore

usuariosIndex/

federaciones/

organismos/

normativa/

cooperativas/

---

############################################################
# USUARIOS INDEX
############################################################

usuariosIndex/{uid}

{
  cooperativaId: string
}

Colección global de infraestructura, no de negocio. Permite resolver a qué
cooperativa pertenece un usuario autenticado sin Custom Claims ni Cloud
Functions (incompatibles con plan Spark/gratuito).

Flujo de uso (ver src/services/auth.service.js y firestore.rules):

1. El usuario se autentica con Firebase Authentication (uid).

2. El cliente lee usuariosIndex/{uid} para obtener su cooperativaId.

3. Con ese cooperativaId, el cliente lee
   cooperativas/{cooperativaId}/usuarios/{uid} para conocer su perfil
   completo (rol, activo, nombre, apellido).

Reglas de acceso:

- Lectura (get): únicamente el propio usuario autenticado sobre su propia
  entrada (uid del token == uid del documento). Nunca list.

- Escritura: prohibida desde el cliente en cualquier circunstancia. La
  entrada se crea exclusivamente mediante un script con Admin SDK al dar
  de alta un usuario, que bypassa las reglas de Firestore.

No posee campos de auditoría (creadoPor, fechaCreacion, etc.): no es una
entidad de negocio, no se edita desde el frontend en ningún caso, y un
único campo no justifica el set completo.

Si en el futuro se migra a un plan Blaze con Cloud Functions, esta
colección puede reemplazarse por Custom Claims sin afectar al resto del
modelo de datos.

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
# COOPERATIVAS
############################################################

cooperativas/{cooperativaId}

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

  vigente: boolean,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
}

Cargos:

presidente

secretario

tesorero

vocalTitular

vocalSuplente

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

  vigente: boolean,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
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

  observaciones: string,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
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

  firmada: boolean,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
}

Tipos:

consejo

asambleaOrdinaria

asambleaExtraordinaria

comisionInterna

---

############################################################
# PADRONES ELECTORALES
############################################################

cooperativas/{cooperativaId}/padronesElectorales/{padronId}

{
  asambleaId: string,

  fechaCorte: timestamp,

  fechaGeneracion: timestamp,

  generadoPor: string,

  estado: string,

  totalHabilitados: number,

  creadoPor: string,

  fechaCreacion: timestamp,

  modificadoPor: string,

  fechaModificacion: timestamp
}

Estados:

borrador

cerrado

Subcolección (generada en bloque, no editable campo a campo desde el frontend salvo habilitado/voto):

cooperativas/{cooperativaId}/padronesElectorales/{padronId}/electores/{asociadoId}

{
  asociadoId: string,

  numeroAsociado: string,

  apellido: string,

  nombre: string,

  habilitado: boolean,

  motivoInhabilitacion: string|null,

  voto: boolean
}

Un elector se genera a partir de una copia histórica de los datos del asociado al momento del corte
(numeroAsociado, apellido, nombre): el padrón no debe cambiar si el asociado modifica sus datos
después de generado, ni debe romperse si el asociado es eliminado más adelante.

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
