import { Router } from 'express';
import { equipoControlador } from '../controlador/equipoControlador.js';
import { upload } from '../middlewares/uploadMiddleware.js'; 

const router = Router();

router.get('/', equipoControlador.obtenerEquipos);

router.post('/', upload.single('logo'), equipoControlador.crearEquipo);

export default router;