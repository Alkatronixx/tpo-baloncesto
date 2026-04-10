import express from 'express';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { crearEquipo, obtenerEquipos } from '../controlador/equipoControlador.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.get('/', obtenerEquipos);
router.post('/', verificarToken, upload.single('logo_url'), crearEquipo);

export default router;