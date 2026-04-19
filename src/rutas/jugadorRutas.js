import express from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { 
    crearJugador, 
    obtenerJugadores, 
    actualizarJugador, 
    eliminarJugador 
} from '../controlador/jugadorControlador.js';

const router = express.Router();

router.get('/', obtenerJugadores);

router.post('/', verificarToken, crearJugador);
router.put('/:id', verificarToken, actualizarJugador);
router.delete('/:id', verificarToken, eliminarJugador);

export default router;