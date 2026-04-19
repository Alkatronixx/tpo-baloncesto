import { partidoEsquema } from '../esquemas/partidoEsquema.js';
import { partidoModelo } from '../modelo/partidoModelo.js';
import { pool } from '../config/db.js';

// HELPERS PRIVADOS

const calcularPuntos = (tantosLocal, tantosVisitante) => {
    if (tantosLocal > tantosVisitante) return { ptsLocal: 3, ptsVisitante: 0 };
    if (tantosLocal < tantosVisitante) return { ptsLocal: 0, ptsVisitante: 3 };
    return { ptsLocal: 1, ptsVisitante: 1 };
};

const actualizarEstadisticas = async (client, partido, multiplicador) => {
    const { id_local, id_visitante, tantos_local, tantos_visitante } = partido;
    const { ptsLocal, ptsVisitante } = calcularPuntos(tantos_local, tantos_visitante);

    const updateQuery = `
        UPDATE equipos 
        SET puntos_totales = puntos_totales + $1, 
            tantos_favor = tantos_favor + $2, 
            tantos_contra = tantos_contra + $3, 
            tantos_diferencia = tantos_diferencia + $4,
            partidos_jugados = partidos_jugados + $5
        WHERE id_equipo = $6
    `;

    await client.query(updateQuery, [
        ptsLocal * multiplicador,
        tantos_local * multiplicador,
        tantos_visitante * multiplicador,
        (tantos_local - tantos_visitante) * multiplicador,
        1 * multiplicador,
        id_local
    ]);

    await client.query(updateQuery, [
        ptsVisitante * multiplicador,
        tantos_visitante * multiplicador,
        tantos_local * multiplicador,
        (tantos_visitante - tantos_local) * multiplicador,
        1 * multiplicador,
        id_visitante
    ]);
};

// CONTROLADORES

export const registrarPartido = async (req, res) => {
    if (req.body.id_local === req.body.id_visitante) {
        return res.status(400).json({ error: "Un equipo no puede jugar contra sí mismo." });
    }

    const client = await pool.connect();
    try {
        const validacion = partidoEsquema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({ error: validacion.error.flatten().fieldErrors });
        }

        const { id_local, id_visitante, tantos_local, tantos_visitante, finalizado, fecha, horario } = validacion.data;

        await client.query('BEGIN');

        const infoLocal = await client.query('SELECT nombre_equipo, estadio FROM equipos WHERE id_equipo = $1', [id_local]);
        const infoVisitante = await client.query('SELECT nombre_equipo FROM equipos WHERE id_equipo = $1', [id_visitante]);

        if (infoLocal.rows.length === 0 || infoVisitante.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Uno de los equipos no existe." });
        }

        const nombreLocal = infoLocal.rows[0].nombre_equipo;
        const nombreVisitante = infoVisitante.rows[0].nombre_equipo;
        const lugarAutomatico = infoLocal.rows[0].estadio || 'Estadio no registrado';

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

        const duplicado = await client.query(`
            SELECT * FROM partidos 
            WHERE id_local = $1 AND id_visitante = $2 AND fecha = $3
        `, [id_local, id_visitante, fecha]);

        if (duplicado.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: "Este partido ya está registrado." });
        }

        const queryInsert = `
            INSERT INTO partidos (
                id_local, id_visitante, tantos_local, tantos_visitante, 
                finalizado, fecha, horario, lugar, equipo_local, equipo_visitante
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        
        const resultado = await client.query(queryInsert, [
            id_local, id_visitante, tantos_local, tantos_visitante, finalizado,
            fecha || new Date(), horario, lugarAutomatico, nombreLocal, nombreVisitante
        ]);

        const nuevoPartido = resultado.rows[0];

        if (finalizado === true) {
            await actualizarEstadisticas(client, nuevoPartido, 1);
        }

        await client.query('COMMIT');
        res.status(201).json({ 
            mensaje: '¡Partido registrado con éxito!', 
            estadio_asignado: lugarAutomatico, 
            partido: nuevoPartido 
        });

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
        console.error("Error al obtener partidos:", error);
        res.status(500).json({ error: "Error al obtener historial" });
    }
};

export const eliminarPartido = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const buscarPartido = await client.query('SELECT * FROM partidos WHERE id_partido = $1', [id]);
        if (buscarPartido.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Partido no encontrado" });
        }
        
        const p = buscarPartido.rows[0];

        if (p.finalizado) {
            await actualizarEstadisticas(client, p, -1);
        }

        await client.query('DELETE FROM partidos WHERE id_partido = $1', [id]);
        await client.query('COMMIT');
        res.json({ mensaje: "Partido eliminado y estadísticas actualizadas" });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al eliminar partido:", error);
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
        if (buscarAnterior.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Partido no encontrado" });
        }
        
        const pAntiguo = buscarAnterior.rows[0];

        if (pAntiguo.finalizado) {
            await actualizarEstadisticas(client, pAntiguo, -1);
        }

        const { tantos_local, tantos_visitante, finalizado, fecha, horario } = req.body;
        const queryUpdate = `
            UPDATE partidos 
            SET tantos_local = $1, tantos_visitante = $2, finalizado = $3, fecha = $4, horario = $5 
            WHERE id_partido = $6 
            RETURNING *
        `;
        const resultado = await client.query(queryUpdate, [
            tantos_local ?? pAntiguo.tantos_local, 
            tantos_visitante ?? pAntiguo.tantos_visitante, 
            finalizado ?? pAntiguo.finalizado, 
            fecha ?? pAntiguo.fecha, 
            horario ?? pAntiguo.horario, 
            id
        ]);
        
        const pNuevo = resultado.rows[0];

        if (pNuevo.finalizado) {
            await actualizarEstadisticas(client, pNuevo, 1);
        }

        await client.query('COMMIT');
        res.json({ mensaje: "Partido actualizado y tabla recalculada", partido: pNuevo });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al actualizar partido:", error);
        res.status(500).json({ error: "Error al actualizar" });
    } finally {
        client.release();
    }
};

export const obtenerCalendario = async (req, res) => {
    try {
        const sql = `
            SELECT 
                id_partido, fecha, horario, lugar,
                equipo_local, equipo_visitante, 
                tantos_local, tantos_visitante, finalizado
            FROM partidos
            ORDER BY fecha ASC, horario ASC
        `;
        
        const resultado = await pool.query(sql);

        const calendarioAgrupado = resultado.rows.reduce((acc, partido) => {
            const fechaKey = partido.fecha ? new Date(partido.fecha).toISOString().split('T')[0] : 'Sin fecha';
            if (!acc[fechaKey]) acc[fechaKey] = [];
            acc[fechaKey].push(partido);
            return acc;
        }, {});

        res.json(calendarioAgrupado);
    } catch (error) {
        console.error("Error en calendario:", error);
        res.status(500).json({ error: "Error al cargar el calendario" });
    }
};