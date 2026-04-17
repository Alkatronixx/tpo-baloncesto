import { jugadorEsquema } from '../esquemas/jugadorEsquema.js';
import { JugadorModelo } from '../modelo/jugadorModelo.js';
import { pool } from '../config/db.js'; // IMPORTANTE: Agregá esta línea

export const obtenerJugadores = async (req, res) => {
    try {
        const jugadores = await JugadorModelo.getAll();
        res.json(jugadores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jugadores' });
    }
};

export const crearJugador = async (req, res) => {
    try {
        const validacion = jugadorEsquema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Datos del jugador inválidos', 
                detalles: validacion.error.flatten().fieldErrors 
            });
        }

        const nuevoJugador = await JugadorModelo.create(validacion.data);
        res.status(201).json(nuevoJugador);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar el jugador' });
    }
};

export const eliminarJugador = async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await pool.query(
            'DELETE FROM jugadores WHERE id_jugador = $1 RETURNING *', 
            [id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ error: "Jugador no encontrado" });
        }

        res.json({ mensaje: "Jugador eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar jugador" });
    }
};

export const actualizarJugador = async (req, res) => {
    const { id } = req.params;
    // Ajustamos los campos a los de un jugador: nombre, posición e id_equipo
    const { nombre_jugador, posicion, id_equipo } = req.body;

    try {
        const query = `
            UPDATE jugadores 
            SET nombre_jugador = COALESCE($1, nombre_jugador), 
                posicion = COALESCE($2, posicion), 
                id_equipo = COALESCE($3, id_equipo) 
            WHERE id_jugador = $4 
            RETURNING *;
        `;
        
        const resultado = await pool.query(query, [nombre_jugador, posicion, id_equipo, id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ error: "Jugador no encontrado" });
        }

        res.json({ 
            mensaje: "Jugador actualizado correctamente", 
            jugador: resultado.rows // Usamos para devolver el objeto, no un array
        });

    } catch (error) {
        console.error("Error al actualizar jugador:", error);
        res.status(500).json({ error: "Error interno al intentar actualizar el jugador" });
    }
};