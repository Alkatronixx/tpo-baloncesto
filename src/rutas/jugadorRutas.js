import express from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { 
    crearJugador, 
    obtenerJugadores, 
    actualizarJugador, 
    eliminarJugador 
} from '../controlador/jugadorControlador.js';

// RUTAS PARA JUGADORES
const router = express.Router();

// RUTAS PÚBLICAS
router.get('/', obtenerJugadores);

// RUTAS PROTEGIDAS
router.post('/', verificarToken, crearJugador);
router.put('/:id', verificarToken, actualizarJugador);
router.delete('/:id', verificarToken, eliminarJugador);

export default router;