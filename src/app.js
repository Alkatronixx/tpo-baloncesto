import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRutas from './rutas/authRutas.js';
import equipoRutas from './rutas/equipoRutas.js';
import jugadorRutas from './rutas/jugadorRutas.js';
import partidoRutas from './rutas/partidoRutas.js';

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use('/api/auth', authRutas);
app.use('/api/equipos', equipoRutas);
app.use('/api/jugadores', jugadorRutas);
app.use('/api/partidos', partidoRutas);

app.get('/', (req, res) => {
  res.send('API de Baloncesto funcionando correctamente');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});