import { equipoEsquema } from '../esquemas/equipoEsquema.js';
import { EquipoModelo } from '../modelo/equipoModelo.js';
import { pool } from '../config/db.js';
import { subirImagen, borrarImagen } from '../middlewares/uploadMiddleware.js';

// obtenemos todos los equipos
export const obtenerEquipos = async (req, res) => {
    try {
        const equipos = await EquipoModelo.getAll();
        res.json(equipos);
    } catch (error) {
        console.error("Error al obtener equipos:", error);
        res.status(500).json({ error: 'Error al obtener equipos' });
    }
};

// crear un nuevo equipo
export const crearEquipo = async (req, res) => {
    try {
        const datosParaValidar = {
            nombre_equipo: req.body.nombre_equipo,
            entrenador: req.body.entrenador,
            estadio: req.body.estadio,
            logo_url: 'default-logo.png',
            puntos_totales: 0,
            partidos_jugados: 0,
            tantos_favor: 0,
            tantos_contra: 0,
            tantos_diferencia: 0
        };

        // Validar datos 
        const validacion = equipoEsquema.safeParse(datosParaValidar);
        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Datos inválidos', 
                detalles: validacion.error.flatten().fieldErrors 
            });
        }

        // Evitar duplicados por nombre de equipo
        const existe = await pool.query('SELECT * FROM equipos WHERE nombre_equipo = $1', [validacion.data.nombre_equipo]);
        if (existe.rowCount > 0) {
            return res.status(400).json({ error: "Este equipo ya está registrado en la liga" });
        }

        // Creamos el registro para obtener el ID generado
        const nuevoEquipo = await EquipoModelo.create(validacion.data);

        // 4. Si hay imagen, la subimos usando el id y actualizamos el registro
        if (req.file) {
            const logo_url = await subirImagen(req.file, nuevoEquipo.id_equipo);
            await pool.query(
                'UPDATE equipos SET logo_url = $1 WHERE id_equipo = $2',
                [logo_url, nuevoEquipo.id_equipo]
            );
            nuevoEquipo.logo_url = logo_url;
        }

        res.status(201).json(nuevoEquipo);

    } catch (error) {
        console.error("Error en crearEquipo:", error);
        res.status(500).json({ error: 'Error interno al crear el equipo' });
    }
};

// actualizar un equipo existente
export const actualizarEquipo = async (req, res) => {
    const { id } = req.params;
    const { nombre_equipo, estadio } = req.body;

    try {
        let nuevo_logo = null;

        if (req.file) {
            // Buscamos el logo actual
            const logoActual = await pool.query('SELECT logo_url FROM equipos WHERE id_equipo = $1', [id]);

            if (logoActual.rows.length === 0) {
                return res.status(404).json({ error: "Equipo no encontrado" });
            }

            const logoViejo = logoActual.rows[0].logo_url;

            // Si el logo viejo no es el default, lo borramos de Supabase
            if (logoViejo && logoViejo !== 'default-logo.png') {
                await borrarImagen(logoViejo);
            }

            // Subimos el nuevo logo a Supabase
            nuevo_logo = await subirImagen(req.file, id);
        }

        // Actualizamos el equipo con los nuevos datos (si se proporcionan)
        const sql = `
            UPDATE equipos 
            SET nombre_equipo = COALESCE($1, nombre_equipo), 
                estadio = COALESCE($2, estadio),
                logo_url = COALESCE($3, logo_url)
            WHERE id_equipo = $4
            RETURNING *;
        `;
        const resultado = await pool.query(sql, [nombre_equipo, estadio, nuevo_logo, id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ error: "Equipo no encontrado" });
        }

        res.json({ 
            mensaje: "Equipo actualizado con éxito", 
            equipo: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al actualizar equipo:", error);
        res.status(500).json({ error: "Error al actualizar el equipo" });
    }
};

// eliminar un equipo existente
export const eliminarEquipo = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Primero obtenemos el nombre del equipo y su logo para actualizar los partidos y borrar la imagen si es necesario
        const infoEquipo = await client.query(
            'SELECT nombre_equipo, logo_url FROM equipos WHERE id_equipo = $1', 
            [id]
        );

        if (infoEquipo.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Equipo no encontrado" });
        }

        const { nombre_equipo, logo_url } = infoEquipo.rows[0];

        // Mantenemos el nombre del equipo en los partidos para preservar el historial
        await client.query(`UPDATE partidos SET equipo_local = $1 WHERE id_local = $2`, [nombre_equipo, id]);
        await client.query(`UPDATE partidos SET equipo_visitante = $1 WHERE id_visitante = $2`, [nombre_equipo, id]);
        await client.query('DELETE FROM jugadores WHERE id_equipo = $1', [id]);
        await client.query('DELETE FROM equipos WHERE id_equipo = $1', [id]);

        if (logo_url && logo_url !== 'default-logo.png') {
            await borrarImagen(`equipo-${id}.png`);
        }

        
        await client.query('COMMIT');
        res.json({mensaje: `El equipo '${nombre_equipo}' ha sido eliminado. Los partidos jugados conservarán su nombre en el historial.` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al eliminar equipo:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        client.release();
    }
};

// obtener la tabla de posiciones
export const obtenerTabla = async (req, res) => {
    try {
        const sql = `
            SELECT 
                nombre_equipo, 
                puntos_totales, 
                partidos_jugados, 
                tantos_favor, 
                tantos_contra, 
                tantos_diferencia,
                logo_url
            FROM equipos
            ORDER BY puntos_totales DESC, tantos_diferencia DESC;
        `;
        const resultado = await pool.query(sql);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener tabla:", error);
        res.status(500).json({ error: "Error al generar la tabla de posiciones" });
    }
};