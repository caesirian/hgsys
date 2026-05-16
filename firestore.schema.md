# Firestore Schema (Root Collections)

## `articulos`
Documentos para contenido editorial:
- `tipo`: `noticia | paper | tutorial`
- `categoria`: `REPROCANN | Ciencia | Cultivo`
- `titulo`: string
- `resumen`: string
- `fechaPublicacion`: timestamp
- `autorId`: string
- `estado`: `borrador | publicado`

### Query de baja latencia para noticias
```js
query(
  collection(db, 'articulos'),
  where('tipo', '==', 'noticia'),
  where('categoria', '==', 'REPROCANN'),
  orderBy('fechaPublicacion', 'desc'),
  limit(20)
)
```

## `foros`
Documentos raíz de hilos/espacios.
- `categoria`: string
- `titulo`: string
- `ultimaActividad`: timestamp
- `creadoPor`: string

### Subcolección `mensajes`
Ruta: `foros/{foroId}/mensajes/{mensajeId}`
- `foroId`: string
- `autorId`: string
- `contenido`: string
- `fecha`: timestamp

## `usuarios`
Perfil de usuario.
- `displayName`: string
- `email`: string
- `rol`: `paciente | cultivador | medico | admin`
- `creadoEn`: timestamp
- `actualizadoEn`: timestamp
