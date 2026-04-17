import express from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { 
    registrarPartido, 
    obtenerPartidos, 
    eliminarPartido, 
    actualizarPartido,
    obtenerCalendario
} from '../controlador/partidoControlador.js';

const router = express.Router();

// --- RUTAS PÚBLICAS ---
router.get('/', obtenerPartidos);
router.get('/calendario', obtenerCalendario); 

// --- RUTAS PROTEGIDAS ---
router.post('/', verificarToken, registrarPartido);
router.put('/:id', verificarToken, actualizarPartido);
router.delete('/:id', verificarToken, eliminarPartido);

export default router;