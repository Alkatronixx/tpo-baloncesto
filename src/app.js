import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRutas from './rutas/authRutas.js';
import equipoRutas from './rutas/equipoRutas.js';
import jugadorRutas from './rutas/jugadorRutas.js';
import partidoRutas from './rutas/partidoRutas.js';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Configuración de CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración para servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

//Definicion de rutas
app.use('/api/auth', authRutas);
app.use('/api/equipos', equipoRutas);
app.use('/api/jugadores', jugadorRutas);
app.use('/api/partidos', partidoRutas);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Baloncesto funcionando correctamente');
});

// Definir el puerto de escucha
const PORT = process.env.PORT || 3000;

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});