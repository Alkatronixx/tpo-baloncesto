import express from 'express';
const router = express.Router();

import { login } from '../controlador/authControlador.js'; 

router.post('/login', login);

export default router;