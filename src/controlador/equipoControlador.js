import { equipoEsquema } from '../esquemas/equipoEsquema.js';
import { EquipoModelo } from '../modelo/equipoModelo.js';
import { pool } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';

// obtenemos todos los equipos
export const obtenerEquipos = async (req, res) => {
    try {
        // consultamos la base de datos para obtener todos los equipos
        const equipos = await EquipoModelo.getAll();
        res.json(equipos);
    } catch (error) {
        // en caso de error, lo registramos y respondemos con un mensaje de error
        console.error("Error al obtener equipos:", error);
        res.status(500).json({ error: 'Error al obtener equipos' });
    }
};

// crear un nuevo equipo
export const crearEquipo = async (req, res) => {
    try {
        // preparamos los datos para validación
        const datosParaValidar = {
            nombre_equipo: req.body.nombre_equipo,
            entrenador: req.body.entrenador,
            estadio: req.body.estadio, 
            logo_url: req.file ? req.file.filename : 'default-logo.png',
            puntos_totales: 0,
            partidos_jugados: 0,
            tantos_favor: 0,
            tantos_contra: 0,
            tantos_diferencia: 0
        };

        // validamos los datos usando el esquema definido
        const validacion = equipoEsquema.safeParse(datosParaValidar);

        // si la validación falla, respondemos con los errores de validación
        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Datos inválidos', 
                detalles: validacion.error.flatten().fieldErrors 
            });
        }

        // verificamos si ya existe un equipo con el mismo nombre
        const existe = await pool.query('SELECT * FROM equipos WHERE nombre_equipo = $1', [validacion.data.nombre_equipo]);
        if (existe.rowCount > 0){
            if (req.file) {
            await fs.unlink(path.join(process.cwd(), 'public/uploads/logos', req.file.filename));
            }
            return res.status(400).json({ error: "Este equipo ya está registrado en la liga" });
        } 
        
        // si todo es correcto, creamos el nuevo equipo en la base de datos
        const nuevoEquipo = await EquipoModelo.create(validacion.data);
        res.status(201).json(nuevoEquipo);
        
    } catch (error) {
        // en caso de error, lo registramos y respondemos con un mensaje de error
        console.error("Error en crearEquipo:", error);
        res.status(500).json({ error: 'Error interno al crear el equipo' });
    }
};

// actualizar un equipo existente
export const actualizarEquipo = async (req, res) => {
    // obtenemos el id del equipo a actualizar y los nuevos datos del cuerpo de la solicitud
    const { id } = req.params;
    const { nombre_equipo, ciudad, estadio } = req.body;
    const nuevo_logo = req.file ? req.file.filename : null;

    try {
        // si se ha subido un nuevo logo, borramos el logo anterior para evitar acumular archivos innecesarios
        if (nuevo_logo) {
            const logoActual = await pool.query('SELECT logo_url FROM equipos WHERE id_equipo = $1', [id]);
            
            // si el equipo no existe, respondemos con un error
            if (logoActual.rows.length === 0) {
                return res.status(404).json({ error: "Equipo no encontrado" });
            }

            // si el logo actual no es el logo por defecto, intentamos borrarlo del sistema de archivos
            const logoViejo = logoActual.rows[0].logo_url;
            if (logoViejo && logoViejo !== 'default-logo.png') {
                try {
                    await fs.unlink(path.join(process.cwd(), 'public/uploads/logos', logoViejo));
                } catch (err) {
                    // aunque el error al borrar el logo viejo no es crítico, lo registramos para su revisión
                    console.error("Error al borrar logo viejo (no crítico):", err);
                }
            }
        }

        // actualizamos el equipo en la base de datos con los nuevos datos proporcionados
        const sql = `
            UPDATE equipos 
            SET nombre_equipo = COALESCE($1, nombre_equipo), 
                ciudad = COALESCE($2, ciudad), 
                estadio = COALESCE($3, estadio),
                logo_url = COALESCE($4, logo_url)
            WHERE id_equipo = $5
            RETURNING *;
        `;
        // ejecutamos la consulta de actualización y obtenemos el resultado
        const resultado = await pool.query(sql, [nombre_equipo, ciudad, estadio, nuevo_logo, id]);

        // si no se actualizó ningún equipo, respondemos con un error de "Equipo no encontrado"
        if (resultado.rowCount === 0) {
            return res.status(404).json({ error: "Equipo no encontrado" });
        }

        // respondemos con un mensaje de éxito y los datos del equipo actualizado
        res.json({ 
            mensaje: "Equipo actualizado con éxito", 
            equipo: resultado.rows[0]
        });

    } catch (error) {
        // en caso de error, lo registramos y respondemos con un mensaje de error
        console.error("Error al actualizar equipo:", error);
        res.status(500).json({ error: "Error al actualizar el equipo" });
    }
};

// eliminar un equipo existente
export const eliminarEquipo = async (req, res) => {
    // obtenemos el id del equipo a eliminar
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // obtenemos el nombre del equipo
        const infoEquipo = await client.query(
            'SELECT nombre_equipo, logo_url FROM equipos WHERE id_equipo = $1', 
            [id]
        );
        
        // si el equipo no existe, respondemos con un error de "Equipo no encontrado"
        if (infoEquipo.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Equipo no encontrado" });
        }

        // obtenemos el nombre del equipo para actualizar los partidos relacionados antes de eliminar el equipo
        const { nombre_equipo, logo_url } = infoEquipo.rows[0];

        // actualizamos los partidos relacionados para conservar el nombre del equipo en el historial, aunque el equipo sea eliminado
        await client.query(`
            UPDATE partidos SET equipo_local = $1 WHERE id_local = $2
        `, [nombre_equipo, id]);

        await client.query(`
            UPDATE partidos SET equipo_visitante = $1 WHERE id_visitante = $2
        `, [nombre_equipo, id]);

        // eliminamos los jugadores relacionados con el equipo antes de eliminar el equipo
        await client.query('DELETE FROM jugadores WHERE id_equipo = $1', [id]);
        // finalmente, eliminamos el equipo de la base de datos
        await client.query('DELETE FROM equipos WHERE id_equipo = $1', [id]);

        // si el equipo tenía un logo personalizado, eliminamos el archivo del sistema de archivos
        if (logo_url && logo_url !== 'default-logo.png') {
            const rutaImagen = path.join(process.cwd(), 'public/uploads/logos', logo_url);
            try {
                await fs.unlink(rutaImagen);
                console.log(`Archivo ${logo_url} eliminado.`);
            } catch (err) {
                console.error("Error al borrar archivo físico (no crítico):", err);
            }
        }

        // confirmamos la transacción y respondemos con un mensaje de éxito
        await client.query('COMMIT');
        res.json({ 
            mensaje: `El equipo '${nombre_equipo}' ha sido eliminado. Los partidos jugados conservarán su nombre en el historial.` 
        });

    } catch (error) {
        // en caso de error, hacemos rollback de la transacción, lo registramos y respondemos con un mensaje de error
        await client.query('ROLLBACK');
        console.error("Error al eliminar equipo:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        // liberamos el cliente de la conexión
        client.release();
    }
};

// obtener la tabla de posiciones actualizada
export const obtenerTabla = async (req, res) => {
    try {
        // consultamos la base de datos para obtener la tabla de posiciones ordenada
        const query = `
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
        // ejecutamos la consulta y respondemos con los resultados
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (error) {
        // en caso de error, lo registramos y respondemos con un mensaje de error
        console.error("Error al obtener tabla:", error);
        res.status(500).json({ error: "Error al generar la tabla de posiciones" });
    }
};