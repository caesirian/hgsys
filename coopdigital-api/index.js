import express from 'express';
import cors from 'cors';
import { apiKeyAuth } from './src/middleware/api-key-auth.js';
import { router as v1Router } from './src/routes/v1.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Healthcheck sin auth, para que Render pueda verificar que el servicio está vivo.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.json({
    service: 'CoopDigital API Pública',
    version: 'v1',
    docs: 'Enviar header x-api-key en cada request a /v1/*'
  });
});

app.use('/v1', apiKeyAuth, v1Router);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.listen(PORT, () => {
  console.log(`CoopDigital API escuchando en puerto ${PORT}`);
});
