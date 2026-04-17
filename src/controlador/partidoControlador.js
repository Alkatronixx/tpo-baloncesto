import { partidoEsquema } from '../esquemas/partidoEsquema.js';
import { partidoModelo } from '../modelo/partidoModelo.js';
import { pool } from '../config/db.js';

export const registrarPartido = async (req, res) => {
    const client = await pool.connect();
    try {
        const validacion = partidoEsquema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({ error: validacion.error.flatten().fieldErrors });
        }

        const { id_local, id_visitante, tantos_local, tantos_visitante, finalizado, fecha, horario } = validacion.data;

        if (id_local === id_visitante) {
            return res.status(400).json({ error: "Un equipo no puede jugar contra sí mismo." });
        }

        await client.query('BEGIN');

        const conflicto = await client.query(`
            SELECT * FROM partidos 
            WHERE fecha = $1 AND horario = $2 
            AND (id_local = $3 OR id_visitante = $3 OR id_local = $4 OR id_visitante = $4)
        `, [fecha, horario, id_local, id_visitante]);

        if (conflicto.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ 
                error: "Conflicto de horario", 
                mensaje: "Uno de los equipos ya tiene un partido programado en esta fecha y hora." 
            });
        }

        const localInfo = await client.query('SELECT estadio FROM equipos WHERE id_equipo = $1', [id_local]);
        let lugarAutomatico = 'Estadio no registrado';

        if (localInfo.rows.length > 0 && localInfo.rows.estadio) {
            lugarAutomatico = localInfo.rows.estadio;
        }

        const queryInsert = `
            INSERT INTO partidos (id_local, id_visitante, tantos_local, tantos_visitante, finalizado, fecha, horario, lugar)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const resultado = await client.query(queryInsert, [
            id_local, id_visitante, tantos_local, tantos_visitante, finalizado,
            fecha || new Date(), horario, lugarAutomatico
        ]);

        const nuevoPartido = resultado.rows;

        if (finalizado === true) {
            let ptsLocal = 0, ptsVisitante = 0;
            if (tantos_local > tantos_visitante) ptsLocal = 3;
            else if (tantos_local < tantos_visitante) ptsVisitante = 3;
            else { ptsLocal = 1; ptsVisitante = 1; }

            const difLocal = tantos_local - tantos_visitante;
            const difVisitante = tantos_visitante - tantos_local;

            const updateQuery = `
                UPDATE equipos 
                SET puntos_totales = puntos_totales + $1, tantos_favor = tantos_favor + $2, 
                    tantos_contra = tantos_contra + $3, tantos_diferencia = tantos_diferencia + $4 
                WHERE id_equipo = $5
            `;

            await client.query(updateQuery, [ptsLocal, tantos_local, tantos_visitante, difLocal, id_local]);
            await client.query(updateQuery, [ptsVisitante, tantos_visitante, tantos_local, difVisitante, id_visitante]);
        }

        await client.query('COMMIT');
        res.status(201).json({ mensaje: '¡Partido registrado con éxito!', estadio_asignado: lugarAutomatico, partido: nuevoPartido });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("ERROR CRÍTICO:", error);
        res.status(500).json({ error: "Error interno en el servidor" });
    } finally {
        client.release();
    }
};

export const obtenerPartidos = async (req, res) => {
    try {
        const partidos = await partidoModelo.getAll();
        res.json(partidos);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener historial" });
    }
};

export const eliminarPartido = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const buscarPartido = await client.query('SELECT * FROM partidos WHERE id_partido = $1', [id]);
        if (buscarPartido.rows.length === 0) return res.status(404).json({ error: "Partido no encontrado" });
        
        const p = buscarPartido.rows;

        if (p.finalizado) {
            let ptsL = 0, ptsV = 0;
            if (p.tantos_local > p.tantos_visitante) ptsL = 3;
            else if (p.tantos_local < p.tantos_visitante) ptsV = 3;
            else { ptsL = 1; ptsV = 1; }

            const revertirQuery = `UPDATE equipos SET puntos_totales = puntos_totales - $1, tantos_favor = tantos_favor - $2, tantos_contra = tantos_contra - $3, tantos_diferencia = tantos_diferencia - $4 WHERE id_equipo = $5`;
            await client.query(revertirQuery, [ptsL, p.tantos_local, p.tantos_visitante, p.tantos_local - p.tantos_visitante, p.id_local]);
            await client.query(revertirQuery, [ptsV, p.tantos_visitante, p.tantos_local, p.tantos_visitante - p.tantos_local, p.id_visitante]);
        }

        await client.query('DELETE FROM partidos WHERE id_partido = $1', [id]);
        await client.query('COMMIT');
        res.json({ mensaje: "Partido eliminado y estadísticas actualizadas" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Error al eliminar" });
    } finally {
        client.release();
    }
};

export const actualizarPartido = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const buscarAnterior = await client.query('SELECT * FROM partidos WHERE id_partido = $1', [id]);
        if (buscarAnterior.rows.length === 0) return res.status(404).json({ error: "Partido no encontrado" });
        
        const pAntiguo = buscarAnterior.rows;

        if (pAntiguo.finalizado) {
            let ptsOldL = 0, ptsOldV = 0;
            if (pAntiguo.tantos_local > pAntiguo.tantos_visitante) ptsOldL = 3;
            else if (pAntiguo.tantos_local < pAntiguo.tantos_visitante) ptsOldV = 3;
            else { ptsOldL = 1; ptsOldV = 1; }

            const revertirQuery = `UPDATE equipos SET puntos_totales = puntos_totales - $1, tantos_favor = tantos_favor - $2, tantos_contra = tantos_contra - $3, tantos_diferencia = tantos_diferencia - $4 WHERE id_equipo = $5`;
            await client.query(revertirQuery, [ptsOldL, pAntiguo.tantos_local, pAntiguo.tantos_visitante, pAntiguo.tantos_local - pAntiguo.tantos_visitante, pAntiguo.id_local]);
            await client.query(revertirQuery, [ptsOldV, pAntiguo.tantos_visitante, pAntiguo.tantos_local, pAntiguo.tantos_visitante - pAntiguo.tantos_local, pAntiguo.id_visitante]);
        }

        const { tantos_local, tantos_visitante, finalizado, fecha, horario } = req.body;
        const queryUpdate = `UPDATE partidos SET tantos_local = $1, tantos_visitante = $2, finalizado = $3, fecha = $4, horario = $5 WHERE id_partido = $6 RETURNING *`;
        const resultado = await client.query(queryUpdate, [
            tantos_local ?? pAntiguo.tantos_local, tantos_visitante ?? pAntiguo.tantos_visitante, 
            finalizado ?? pAntiguo.finalizado, fecha ?? pAntiguo.fecha, horario ?? pAntiguo.horario, id
        ]);
        
        const pNuevo = resultado.rows;

        if (pNuevo.finalizado) {
            let ptsNewL = 0, ptsNewV = 0;
            if (pNuevo.tantos_local > pNuevo.tantos_visitante) ptsNewL = 3;
            else if (pNuevo.tantos_local < pNuevo.tantos_visitante) ptsNewV = 3;
            else { ptsNewL = 1; ptsNewV = 1; }

            const sumarQuery = `UPDATE equipos SET puntos_totales = puntos_totales + $1, tantos_favor = tantos_favor + $2, tantos_contra = tantos_contra + $3, tantos_diferencia = tantos_diferencia + $4 WHERE id_equipo = $5`;
            await client.query(sumarQuery, [ptsNewL, pNuevo.tantos_local, pNuevo.tantos_visitante, pNuevo.tantos_local - pNuevo.tantos_visitante, pNuevo.id_local]);
            await client.query(sumarQuery, [ptsNewV, pNuevo.tantos_visitante, pNuevo.tantos_local, pNuevo.tantos_visitante - pNuevo.tantos_local, pNuevo.id_visitante]);
        }

        await client.query('COMMIT');
        res.json({ mensaje: "Partido actualizado y tabla recalculada", partido: pNuevo });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Error al actualizar" });
    } finally {
        client.release();
    }
};

// En partidoControlador.js

export const obtenerCalendario = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id_partido,
                p.fecha,
                p.hora,
                p.goles_local,
                p.goles_visitante,
                p.estado,
                e1.nombre_equipo AS equipo_local,
                e1.logo_url AS logo_local,
                e2.nombre_equipo AS equipo_visitante,
                e2.logo_url AS logo_visitante
            FROM partidos p
            INNER JOIN equipos e1 ON p.id_local = e1.id_equipo
            INNER JOIN equipos e2 ON p.id_visitante = e2.id_equipo
            ORDER BY p.fecha ASC, p.hora ASC;
        `;
        
        const resultado = await pool.query(query);

        // Opcional: Agrupar por fecha en el backend para facilitar el trabajo al Frontend
        const calendarioAgrupado = resultado.rows.reduce((acc, partido) => {
            const fecha = partido.fecha.toISOString().split('T'); // Formato YYYY-MM-DD
            if (!acc[fecha]) acc[fecha] = [];
            acc[fecha].push(partido);
            return acc;
        }, {});

        res.json(calendarioAgrupado);
    } catch (error) {
        console.error("Error al obtener calendario:", error);
        res.status(500).json({ error: "Error interno al obtener el calendario" });
    }
};