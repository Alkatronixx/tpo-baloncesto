import { equipoEsquema } from '../esquemas/equipoEsquema.js';
import { EquipoModelo } from '../modelo/equipoModelo.js';
import { pool } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';

export const obtenerEquipos = async (req, res) => {
    try {
        const equipos = await EquipoModelo.getAll();
        res.json(equipos);
    } catch (error) {
        console.error("Error al obtener equipos:", error);
        res.status(500).json({ error: 'Error al obtener equipos' });
    }
};

export const crearEquipo = async (req, res) => {
    try {
        const datosParaValidar = {
            nombre_equipo: req.body.nombre_equipo,
            entrenador: req.body.entrenador || null,
            estadio: req.body.estadio || 'Estadio Municipal', 
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

        const existe = await pool.query('SELECT * FROM equipos WHERE nombre_equipo = $1', [validacion.data.nombre_equipo]);
        if (existe.rowCount > 0){
            return res.status(400).json({ error: "Este equipo ya está registrado en la liga" });
        } 
        
        const nuevoEquipo = await EquipoModelo.create(validacion.data);
        res.status(201).json(nuevoEquipo);
        
    } catch (error) {
        console.error("Error en crearEquipo:", error);
        res.status(500).json({ error: 'Error interno al crear el equipo' });
    }
};

export const actualizarEquipo = async (req, res) => {
    const { id } = req.params;
    const { nombre_equipo, ciudad, estadio } = req.body;
    const nuevo_logo = req.file ? req.file.filename : null;

    try {
        if (nuevo_logo) {
            const logoActual = await pool.query('SELECT logo_url FROM equipos WHERE id_equipo = $1', [id]);
            
            if (logoActual.rows.length === 0) {
                return res.status(404).json({ error: "Equipo no encontrado" });
            }

            const logoViejo = logoActual.rows[0].logo_url;
            if (logoViejo && logoViejo !== 'default-logo.png') {
                try {
                    await fs.unlink(path.join(process.cwd(), 'public/uploads/logos', logoViejo));
                } catch (err) {
                    console.error("Error al borrar logo viejo (no crítico):", err);
                }
            }
        }

        const sql = `
            UPDATE equipos 
            SET nombre_equipo = COALESCE($1, nombre_equipo), 
                ciudad = COALESCE($2, ciudad), 
                estadio = COALESCE($3, estadio),
                logo_url = COALESCE($4, logo_url)
            WHERE id_equipo = $5
            RETURNING *;
        `;
        const resultado = await pool.query(sql, [nombre_equipo, ciudad, estadio, nuevo_logo, id]);

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

export const eliminarEquipo = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const infoEquipo = await client.query(
            'SELECT nombre_equipo, logo_url FROM equipos WHERE id_equipo = $1', 
            [id]
        );
        
        if (infoEquipo.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Equipo no encontrado" });
        }

        const { nombre_equipo, logo_url } = infoEquipo.rows[0];

        await client.query(`
            UPDATE partidos SET equipo_local = $1 WHERE id_local = $2
        `, [nombre_equipo, id]);

        await client.query(`
            UPDATE partidos SET equipo_visitante = $1 WHERE id_visitante = $2
        `, [nombre_equipo, id]);

        await client.query('DELETE FROM jugadores WHERE id_equipo = $1', [id]);

        await client.query('DELETE FROM equipos WHERE id_equipo = $1', [id]);

        if (logo_url && logo_url !== 'default-logo.png') {
            const rutaImagen = path.join(process.cwd(), 'public/uploads/logos', logo_url);
            try {
                await fs.unlink(rutaImagen);
                console.log(`Archivo ${logo_url} eliminado.`);
            } catch (err) {
                console.error("Error al borrar archivo físico (no crítico):", err);
            }
        }

        await client.query('COMMIT');
        res.json({ 
            mensaje: `El equipo '${nombre_equipo}' ha sido eliminado. Los partidos jugados conservarán su nombre en el historial.` 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al eliminar equipo:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        client.release();
    }
};

export const obtenerTabla = async (req, res) => {
    try {
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
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener tabla:", error);
        res.status(500).json({ error: "Error al generar la tabla de posiciones" });
    }
};