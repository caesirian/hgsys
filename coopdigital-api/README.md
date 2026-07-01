# CoopDigital API Pública

API REST de solo lectura para que sistemas externos consulten datos de una
cooperativa que usa CoopDigital (asociados activos, vencimientos, documentos
públicos, datos institucionales).

## Arquitectura

Repo independiente, deployado en Render como Web Service Node.js. Usa
Firebase Admin SDK para leer Firestore directamente, sin pasar por las
Firestore Rules del cliente (que están pensadas para el panel web, no para
integraciones externas).

No expone ningún endpoint de escritura por ahora. Solo GET.

## Autenticación

Cada request a `/v1/*` requiere el header:

```
x-api-key: <key de la cooperativa>
```

La key se valida contra `cooperativas/{cooperativaId}/apiKeys/{keyId}` en
Firestore (campo `key`, debe tener `activa: true`). La generación y rotación
de keys se gestiona desde el panel de CoopDigital (Configuración), no desde
esta API.

**Importante**: esto es autenticación simple por token estático, no OAuth.
Si una key se filtra, hay que desactivarla (`activa: false`) en Firestore.

## Variables de entorno (configurar en Render)

- `FIREBASE_SERVICE_ACCOUNT`: JSON completo del service account de Firebase
  (Project Settings → Service Accounts → Generate new private key), pegado
  como string de una sola línea.
- `PORT`: la asigna Render automáticamente.

## Deploy en Render

1. Conectar este repo en Render como "Web Service".
2. Start Command: `node index.js` (configurarlo explícito en Settings, Render
   no siempre lo infiere bien de `package.json`).
3. Agregar la variable de entorno `FIREBASE_SERVICE_ACCOUNT`.
4. Plan free: el cold start tarda 30-60s tras inactividad, igual que el
   proxy de Tuya de CultivApp.

## Endpoints

| Método | Ruta                       | Descripción                                  |
|--------|----------------------------|-----------------------------------------------|
| GET    | `/health`                  | Healthcheck, sin auth                         |
| GET    | `/v1/asociados`            | Asociados activos (datos mínimos)             |
| GET    | `/v1/vencimientos`         | Vencimientos, filtrable con `?estado=`        |
| GET    | `/v1/documentos-publicos`  | Documentos con `visible: true`                |
| GET    | `/v1/cooperativa`          | Datos institucionales básicos                 |

## Login biométrico del panel (/auth/webauthn)

Además de la API pública `/v1/*` (para integraciones externas), este mismo
servicio expone `/auth/webauthn/*` para el **login biométrico del propio
panel de CoopDigital** (passkeys — Face ID / Touch ID / huella / Windows
Hello). No usa `x-api-key`; el registro de passkey requiere un ID token de
Firebase vigente (`Authorization: Bearer <idToken>`), y el login en sí es
público (es el mecanismo para entrar sin contraseña).

| Método | Ruta                                | Auth                      |
|--------|--------------------------------------|----------------------------|
| POST   | `/auth/webauthn/register-options`   | Bearer idToken             |
| POST   | `/auth/webauthn/register-verify`    | Bearer idToken             |
| POST   | `/auth/webauthn/login-options`      | pública                    |
| POST   | `/auth/webauthn/login-verify`       | pública                    |

Las credenciales (claves públicas) y challenges se guardan en
`webauthnCredentials` / `webauthnChallenges` a nivel raíz de Firestore —
denegadas por `firestore.rules` para el cliente, solo Admin SDK. Ver
`Coopdigital/DATA_MODEL.md`.

El rpID está hardcodeado en `src/lib/webauthn-config.js` como
`hgsolucionesweb.com.ar` (dominio donde se sirve el panel). Si el panel
alguna vez se muda de dominio, hay que actualizar eso — y todas las
passkeys registradas antes del cambio dejan de funcionar (es una
limitación inherente a WebAuthn, no de esta implementación).

## Pendiente / requiere índice Firestore

El middleware de auth usa `collectionGroup('apiKeys')` con `where('key', '==', ...)`.
Hay que crear el índice compuesto correspondiente en Firestore (o Firebase
va a tirar el link para crearlo automáticamente la primera vez que falle).

## Generación de API keys

Por ahora no hay UI en el panel de CoopDigital para generarlas. Se crean
manualmente en Firestore Console: documento en
`cooperativas/{cooperativaId}/apiKeys/{autoId}` con:

```json
{
  "key": "<string random largo, ej. generado con crypto.randomUUID()>",
  "activa": true,
  "nombre": "Integración con sistema X",
  "creadoEn": "<timestamp>"
}
```
