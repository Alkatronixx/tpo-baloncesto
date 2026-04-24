import express from 'express';
import { login } from '../controlador/authControlador.js'; 

// RUTA DE AUTENTICACIÓN
const router = express.Router();

router.post('/login', login);

export default router;