import { jugadorEsquema } from '../esquemas/jugadorEsquema.js';
import { JugadorModelo } from '../modelo/jugadorModelo.js';
import { pool } from '../config/db.js';

// obtenemos todos los jugadores
export const obtenerJugadores = async (req, res) => {
    try {
        const jugadores = await JugadorModelo.getAll();
        res.json(jugadores);
    } catch (error) {
        // en caso de error, logueamos el error y respondemos con un mensaje genérico
        console.error("Error en obtenerJugadores:", error);
        res.status(500).json({ error: 'Error al obtener jugadores' });
    }
};

// creamos un nuevo jugador
export const crearJugador = async (req, res) => {
    try {
        // validamos los datos de entrada usando el esquema definido
        const validacion = jugadorEsquema.safeParse(req.body);

        // si la validación falla, respondemos con un error detallado
        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Datos del jugador inválidos', 
                detalles: validacion.error.flatten().fieldErrors 
            });
        }

        // verificamos que el equipo al que se asignará el jugador exista
        const equipoExiste = await pool.query('SELECT id_equipo FROM equipos WHERE id_equipo = $1', [validacion.data.id_equipo]);
        if (equipoExiste.rowCount === 0) {
            return res.status(404).json({ error: "El equipo especificado no existe" });
        }

        // verificamos que no exista un jugador con el mismo nombre, apellido y equipo para evitar duplicados
        const existe = await pool.query(
            'SELECT * FROM jugadores WHERE nombre = $1 AND apellido = $2 AND id_equipo = $3', 
            [validacion.data.nombre, validacion.data.apellido, validacion.data.id_equipo]
        );
        if (existe.rowCount > 0) {
            return res.status(400).json({ error: "Este jugador ya está registrado en el equipo" });
        }

        // si todo es correcto, creamos el nuevo jugador usando el modelo
        const nuevoJugador = await JugadorModelo.create(validacion.data);
        res.status(201).json(nuevoJugador);
        
    } catch (error) {
        // en caso de error, logueamos el error y respondemos con un mensaje genérico
        console.error("Error en crearJugador:", error);
        res.status(500).json({ error: 'Error al registrar el jugador' });
    }
};

// eliminamos un jugador por su ID
export const eliminarJugador = async (req, res) => {
    // obtenemos el ID del jugador a eliminar desde los parámetros
    const { id } = req.params;
    try {
        // ejecutamos la consulta para eliminar el jugador y retornamos el jugador eliminado
        const resultado = await pool.query(
            'DELETE FROM jugadores WHERE id_jugador = $1 RETURNING *', 
            [id]
        );

        // si no se eliminó ningún jugador, respondemos con un error de "Jugador no encontrado"
        if (resultado.rowCount === 0) {
            return res.status(404).json({ error: "Jugador no encontrado" });
        }

        // si se eliminó correctamente, respondemos con un mensaje de éxito
        res.json({ mensaje: "Jugador eliminado correctamente" });
    } catch (error) {
        // en caso de error, logueamos el error y respondemos con un mensaje genérico
        console.error("Error al eliminar jugador:", error);
        res.status(500).json({ error: "Error al eliminar jugador" });
    }
};

// actualizamos un jugador por su ID
export const actualizarJugador = async (req, res) => {
    // obtenemos el ID del jugador a actualizar desde los parámetros y los datos a actualizar desde el cuerpo de la solicitud
    const { id } = req.params;
    const { nombre_jugador, posicion, id_equipo } = req.body;

    try {
        // verificamos que el jugador exista antes de intentar actualizarlo
        const query = `
            UPDATE jugadores 
            SET nombre_jugador = COALESCE($1, nombre_jugador), 
                posicion = COALESCE($2, posicion), 
                id_equipo = COALESCE($3, id_equipo) 
            WHERE id_jugador = $4 
            RETURNING *;
        `;
        
        // ejecutamos la consulta de actualización y obtenemos el jugador actualizado
        const resultado = await pool.query(query, [nombre_jugador, posicion, id_equipo, id]);

        // si no se actualizó ningún jugador, respondemos con un error de "Jugador no encontrado"
        if (resultado.rowCount === 0) {
            return res.status(404).json({ error: "Jugador no encontrado" });
        }

        // si se actualizó correctamente, respondemos con un mensaje de éxito y el jugador actualizado
        res.json({ 
            mensaje: "Jugador actualizado correctamente", 
            jugador: resultado.rows[0]
        });

    } catch (error) {
        // en caso de error, logueamos el error y respondemos con un mensaje genérico
        console.error("Error al actualizar jugador:", error);
        res.status(500).json({ error: "Error interno al intentar actualizar el jugador" });
    }
};