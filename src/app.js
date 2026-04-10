import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRutas from './rutas/authRutas.js';
import equipoRutas from './rutas/equipoRutas.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use('/api/auth', authRutas);
app.use('/api/equipos', equipoRutas);

app.get('/', (req, res) => {
  res.send('API de Baloncesto funcionando correctamente');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});