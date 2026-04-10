import { equipoEsquema } from '../esquemas/equipoEsquema.js';
import { EquipoModelo } from '../modelo/equipoModelo.js';

export const obtenerEquipos = async (req, res) => {
    try {
        const equipos = await EquipoModelo.getAll();
        res.json(equipos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener equipos' });
    }
};

export const crearEquipo = async (req, res) => {
    try {
        const datosParaValidar = {
            nombre_equipo: req.body.nombre_equipo,
            entrenador: req.body.entrenador || null,
            logo_url: req.file ? req.file.filename : 'default-logo.png',
            puntos_totales: 0,
            partidos_jugados: 0,
            tantos_favor: 0,
            tantos_contra: 0,
            tantos_diferencia: 0
        };

        const validacion = equipoEsquema.safeParse(datosParaValidar);

        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Datos inválidos', 
                detalles: validacion.error.flatten().fieldErrors 
            });
        }

        const nuevoEquipo = await EquipoModelo.create(validacion.data);
        res.status(201).json(nuevoEquipo);
        
    } catch (error) {
        console.error("Error en crearEquipo:", error);
        res.status(500).json({ error: 'Error interno al crear el equipo' });
    }
};