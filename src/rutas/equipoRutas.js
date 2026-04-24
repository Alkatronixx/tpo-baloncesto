import express from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { 
    crearEquipo, 
    obtenerEquipos, 
    actualizarEquipo, 
    eliminarEquipo, 
    obtenerTabla
} from '../controlador/equipoControlador.js';
import { upload } from '../middlewares/uploadMiddleware.js';

// RUTAS PARA GESTIONAR LOS EQUIPOS

const router = express.Router();

// RUTAS PÚBLICAS
router.get('/', obtenerEquipos);
router.get('/tabla', obtenerTabla);

// RUTAS PROTEGIDAS
router.post('/', verificarToken, upload.single('logo_url'), crearEquipo);
router.put('/:id', verificarToken, upload.single('logo_url'), actualizarEquipo);
router.delete('/:id', verificarToken, eliminarEquipo);

export default router;