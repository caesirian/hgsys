# PROJECT_SPEC.md

# CoopDigital v1.0

## Visión

CoopDigital es una plataforma SaaS multi-tenant diseñada para la gestión institucional, documental y administrativa de cooperativas argentinas regidas por la Ley 20.337.

Su propósito es impulsar la transformación digital del sector cooperativo mediante herramientas modernas, seguras, escalables y accesibles.

CoopDigital no se concibe como un ERP ni como un sistema contable tradicional. Se define como una Plataforma Integral de Gestión Institucional Cooperativa.

---

# Objetivos Estratégicos

## Objetivos Funcionales

- Centralizar la información institucional.
- Gestionar asociados y órganos sociales.
- Gestionar documentación institucional.
- Controlar vencimientos y obligaciones.
- Mejorar la trazabilidad administrativa.
- Facilitar la gobernanza cooperativa.
- Digitalizar procesos internos.

## Objetivos Técnicos

- Arquitectura SaaS multi-tenant.
- Escalabilidad horizontal.
- Seguridad basada en roles.
- Mobile First.
- Modularidad.
- Preparación para IA e integraciones futuras.

---

# Alcance

La plataforma está orientada a:

- Cooperativas de Trabajo
- Cooperativas de Servicios Públicos
- Cooperativas Agropecuarias
- Cooperativas de Vivienda
- Cooperativas de Consumo
- Cooperativas de Provisión
- Cooperativas de Crédito
- Otras cooperativas alcanzadas por la Ley 20.337

---

# Stack Tecnológico

Frontend:
- HTML5
- CSS3
- JavaScript ES6+

Backend:
- Firebase Authentication
- Cloud Firestore
- Firebase Storage

Hosting:
- Firebase Hosting

Control de versiones:
- GitHub

---

# Arquitectura General

Modelo SaaS Multi-Tenant.

Cada cooperativa tendrá:

- Usuarios propios
- Configuración propia
- Documentación propia
- Datos propios

Ningún usuario podrá acceder a información de otra cooperativa.

---

# Entidades Principales

## Federaciones

Preparar soporte futuro para:

federaciones/{federacionId}

Una federación podrá administrar múltiples cooperativas.

## Alta de Cooperativas

El alta de una cooperativa nueva (cliente) no se hace desde la app web:
requiere crear `usuariosIndex/{uid}`, que las Firestore Rules bloquean
por completo desde el cliente (ver FIRESTORE_SECURITY_RULES.md).

Se realiza con un script de Admin SDK: `Coopdigital/scripts/onboarding-cooperativa.js`.

Recibe: nombre, matrícula, CUIT, email del admin.

Crea: usuario en Firebase Auth (password temporal), `cooperativas/{id}`,
`cooperativas/{id}/usuarios/{uid}` (rol admin), `usuariosIndex/{uid}`.

## Cooperativas

Campos:

- id
- nombre
- matricula
- cuit
- domicilio
- telefono
- email
- logo
- colorPrincipal
- fechaAlta
- activa
- plan

Planes:

- free
- premium
- enterprise

## Usuarios

Campos:

- uid
- nombre
- apellido
- email
- rol
- activo

Roles:

- admin
- consejero
- sindico
- operador
- consulta

---

# Matriz de Permisos

Admin:
- Acceso total

Consejero:
- Lectura general
- Gestión institucional

Síndico:
- Lectura completa
- Sin eliminación

Operador:
- Operaciones diarias

Consulta:
- Solo lectura

---

# Módulos del Sistema

## Dashboard

Mostrar:

- Datos institucionales
- Próximos vencimientos
- Actividad reciente
- Indicadores principales
- Accesos rápidos

## Cooperativa

Gestión de datos institucionales.

## Usuarios

Alta, baja y modificación de usuarios.

## Asociados

Campos:

- numeroAsociado
- apellido
- nombre
- dni
- cuit
- fechaIngreso
- fechaEgreso
- telefono
- email
- estado

Estados:

- activo
- suspendido
- dadoDeBaja

## Libro de Asociados

Generado automáticamente.

Funciones:

- Consulta
- PDF
- Excel

## Consejo de Administración

Campos:

- cargo
- asociadoId
- inicioMandato
- finMandato
- vigente

## Sindicatura

Gestión de síndicos titulares y suplentes.

## Asambleas

Campos:

- tipo
- fechaAsamblea
- fechaConvocatoria
- ordenDelDia
- estado
- actaId
- observaciones

## Actas

Tipos:

- Consejo
- Asamblea Ordinaria
- Asamblea Extraordinaria
- Comisión Interna

## Padrón Electoral

Generado a partir de Asociados activos a una fecha de corte, vinculado a una Asamblea.

Campos:

- asambleaId
- fechaCorte
- estado
- totalHabilitados

Subcolección de electores (copia histórica de datos del asociado al momento del corte):

- asociadoId
- numeroAsociado
- apellido
- nombre
- habilitado
- motivoInhabilitacion
- voto

## Documentos

Almacenamiento institucional.

Categorías:

- INAES
- ARCA
- AFIP
- Municipal
- Legal
- Contable
- Contratos
- Convenios
- Actas

## Biblioteca Institucional

Repositorio documental propio.

## Biblioteca Normativa

Colección global:

- Ley 20.337
- Resoluciones INAES
- Estatutos Modelo
- Reglamentos

## Mesa de Entradas y Salidas

Campos:

- fecha
- tipo
- origen
- destino
- asunto
- adjunto
- estado

## Certificados

Generación automática:

- Certificado de asociado
- Certificado de cargo
- Constancias institucionales

## Comunicaciones

- Circulares
- Comunicados
- Avisos

## Vencimientos

Campos:

- descripcion
- fechaVencimiento
- organismoId
- estado
- observaciones

## Eventos

Registro de actividad.

## Plantillas

- Actas
- Convocatorias
- Certificados
- Notas

## Organismos

Ejemplos:

- INAES
- ARCA
- AFIP
- Municipios
- Provincias
- Bancos
- Federaciones

## Trámites

Catálogo reutilizable.

## Notificaciones

Preparar:

- Internas
- Email
- WhatsApp

## Configuración

Preferencias institucionales.

---

# Auditoría

Todas las entidades deberán incluir:

- creadoPor
- fechaCreacion
- modificadoPor
- fechaModificacion

---

# Eventos del Sistema

Ejemplos:

- alta_asociado
- baja_asociado
- carga_documento
- modificacion_acta
- creacion_usuario

---

# Seguridad

- Firebase Authentication obligatorio.
- Firestore Security Rules obligatorias.
- Aislamiento por cooperativa.
- Validación por rol.
- Auditoría completa.

---

# Roadmap

## MVP

- Login
- Dashboard
- Cooperativa
- Usuarios
- Asociados
- Libro de Asociados
- Documentos
- Vencimientos
- Eventos
- Auditoría

## Fase 2

- Consejo
- Sindicatura
- Asambleas
- Actas
- Plantillas

## Fase 3

- Certificados
- Biblioteca Institucional
- Mesa de Entradas
- Comunicaciones

## Fase 4

- IA Institucional
- Generador de Actas
- Generador de Convocatorias
- Asistente Normativo

## Fase 5

- Portal de Asociados
- Firma Digital
- API Pública
- Integraciones Externas

---

# Criterios de Calidad

- Código modular
- Mobile First
- Responsive
- Escalable
- Seguro
- Preparado para producción
