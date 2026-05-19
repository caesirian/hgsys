# Transporte Colaborativo PWA

## Requisito clave para evitar fallos de login
Google Login **no funciona** si abrís `login.html` con `file://`.

Usá uno de estos modos:
- `https://<tu-dominio>`
- `http://localhost:<puerto>`

## Configuración Firebase
Editá `js/firebase.js` y reemplazá todos los `REEMPLAZAR_*` con tu configuración real de Firebase.

Además, en Firebase Console:
1. Authentication → habilitar proveedor Google.
2. Authentication → Authorized domains: agregar tu dominio y/o `localhost`.
3. Firestore Database → crear base en modo producción y aplicar `firestore.rules`.

## Ejecución local rápida
Desde `transporte-pwa/` podés levantar un servidor estático:

```bash
python -m http.server 5500
```

Luego abrí:
`http://localhost:5500/login.html`

## Sobre conflictos de fusión
Para reducir conflictos, este módulo vive aislado en `transporte-pwa/` y no requiere cambios adicionales fuera de:
- `firestore.rules` (regla de colección `eventos`)
- `.gitignore` (evita subir dependencias locales)
