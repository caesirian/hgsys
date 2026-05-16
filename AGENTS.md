# AGENTS

## Arquitectura
- **Domain-Driven Design (DDD)** con **capas rígidas** para facilitar la legibilidad por IA.
- Separar claramente dominios, casos de uso, infraestructura y presentación.
- Evitar acoplamientos entre capas: cada capa solo puede depender de su capa inmediatamente inferior según la arquitectura definida.

## Stack Tecnológico
- **Frontend:** React.
- **Estilos:** Tailwind CSS para reducir errores de sintaxis visual.
- **Backend:** FastAPI por su soporte asíncrono nativo.

## Base de Datos
- Usar **Cloud Firestore** organizada en colecciones raíz:
  - `articulos`
  - `usuarios`
  - `foros`
- Diseñar consultas orientadas a baja latencia y acceso directo por colección/documento.

## Seguridad
- Implementar un modelo **Zero Trust** en toda la aplicación.
- Sanitizar **todas las salidas** para prevenir:
  - Inyecciones de prompts.
  - Ataques XSS.
- Validar y normalizar entradas antes de cualquier procesamiento o persistencia.
