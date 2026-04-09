import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import equipoRutas from './rutas/equipoRutas.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));
app.use('/api/equipos', equipoRutas);

app.get('/', (req, res) => {
  res.send('API de Baloncesto funcionando correctamente');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
