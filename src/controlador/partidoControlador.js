import { partidoEsquema } from '../esquemas/partidoEsquema.js';
import { partidoModelo } from '../modelo/partidoModelo.js';
import { pool } from '../config/db.js';

// FUNCIONES AUXILIARES
// función para calcular los puntos obtenidos por cada equipo según el resultado del partido
const calcularPuntos = (tantosLocal, tantosVisitante) => {
    if (tantosLocal > tantosVisitante) return { ptsLocal: 3, ptsVisitante: 0 };
    if (tantosLocal < tantosVisitante) return { ptsLocal: 0, ptsVisitante: 3 };
    return { ptsLocal: 1, ptsVisitante: 1 };
};

// función para actualizar las estadísticas de los equipos
const actualizarEstadisticas = async (client, partido, multiplicador) => {
    // obtenemos los datos del partido
    const { id_local, id_visitante, tantos_local, tantos_visitante } = partido;
    const { ptsLocal, ptsVisitante } = calcularPuntos(tantos_local, tantos_visitante);

    // actualizamos las estadísticas del equipo local y visitante
    const updateQuery = `
        UPDATE equipos 
        SET puntos_totales = puntos_totales + $1, 
            tantos_favor = tantos_favor + $2, 
            tantos_contra = tantos_contra + $3, 
            tantos_diferencia = tantos_diferencia + $4,
            partidos_jugados = partidos_jugados + $5
        WHERE id_equipo = $6
    `;

    // multiplicamos por el multiplicador para sumar o restar según sea necesario
    await client.query(updateQuery, [
        ptsLocal * multiplicador,
        tantos_local * multiplicador,
        tantos_visitante * multiplicador,
        (tantos_local - tantos_visitante) * multiplicador,
        1 * multiplicador,
        id_local
    ]);

    // actualizamos las estadísticas del equipo visitante
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
// registramos un nuevo partido
export const registrarPartido = async (req, res) => {
    // validamos que los equipos local y visitante no sean el mismo
    if (req.body.id_local === req.body.id_visitante) {
        return res.status(400).json({ error: "Un equipo no puede jugar contra sí mismo." });
    }

    // obtenemos una conexión del pool para manejar la transacción
    const client = await pool.connect();
    try {
        // validamos los datos de entrada utilizando el esquema definido
        const validacion = partidoEsquema.safeParse(req.body);
        // si la validación falla, respondemos con un error detallado
        if (!validacion.success) {
            return res.status(400).json({ error: validacion.error.flatten().fieldErrors });
        }

        // extraemos los datos validados para su uso posterior
        const { id_local, id_visitante, tantos_local, tantos_visitante, finalizado, fecha, horario } = validacion.data;

        await client.query('BEGIN');

        // obtenemos el nombre del equipo local y visitante para asignar el lugar automáticamente
        const infoLocal = await client.query('SELECT nombre_equipo, estadio FROM equipos WHERE id_equipo = $1', [id_local]);
        const infoVisitante = await client.query('SELECT nombre_equipo FROM equipos WHERE id_equipo = $1', [id_visitante]);

        // si alguno de los equipos no existe, hacemos rollback y respondemos con un error
        if (infoLocal.rows.length === 0 || infoVisitante.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Uno de los equipos no existe." });
        }

        // asignamos el nombre del equipo local y visitante, y el lugar automáticamente según el estadio del equipo local   
        const nombreLocal = infoLocal.rows[0].nombre_equipo;
        const nombreVisitante = infoVisitante.rows[0].nombre_equipo;
        const lugarAutomatico = infoLocal.rows[0].estadio || 'Estadio no registrado';

        // verificamos que no haya un conflicto de horario para ninguno de los equipos en la misma fecha y horario
        const conflicto = await client.query(`
            SELECT * FROM partidos 
            WHERE fecha = $1 AND horario = $2 
            AND (id_local = $3 OR id_visitante = $3 OR id_local = $4 OR id_visitante = $4)
        `, [fecha, horario, id_local, id_visitante]);

        // si hay un conflicto, hacemos rollback y respondemos con un error de conflicto de horario
        if (conflicto.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ 
                error: "Conflicto de horario", 
                mensaje: "Uno de los equipos ya tiene un partido programado en esta fecha y hora." 
            });
        }

        // verificamos que no exista un partido idéntico para evitar duplicados
        const duplicado = await client.query(`
            SELECT * FROM partidos 
            WHERE id_local = $1 AND id_visitante = $2 AND fecha = $3
        `, [id_local, id_visitante, fecha]);

        // si existe un partido idéntico, hacemos rollback y respondemos con un error de conflicto de duplicado
        if (duplicado.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: "Este partido ya está registrado." });
        }

        // si todo es correcto, insertamos el nuevo partido en la base de datos
        const queryInsert = `
            INSERT INTO partidos (
                id_local, id_visitante, tantos_local, tantos_visitante, 
                finalizado, fecha, horario, lugar, equipo_local, equipo_visitante
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        
        // ejecutamos la consulta de inserción y obtenemos el partido recién creado
        const resultado = await client.query(queryInsert, [
            id_local, id_visitante, tantos_local, tantos_visitante, finalizado,
            fecha || new Date(), horario, lugarAutomatico, nombreLocal, nombreVisitante
        ]);

        // obtenemos el partido recién creado
        const nuevoPartido = resultado.rows[0];

        // si el partido se registró como finalizado, actualizamos las estadísticas de los equipos
        if (finalizado === true) {
            await actualizarEstadisticas(client, nuevoPartido, 1);
        }

        // si todo se hizo correctamente, hacemos commit de la transacción y respondemos con el partido registrado
        await client.query('COMMIT');
        res.status(201).json({ 
            mensaje: '¡Partido registrado con éxito!', 
            estadio_asignado: lugarAutomatico, 
            partido: nuevoPartido 
        });

    } catch (error) {
        // en caso de error, hacemos rollback de la transacción, logueamos el error y respondemos con un mensaje genérico
        await client.query('ROLLBACK');
        console.error("ERROR CRÍTICO:", error);
        res.status(500).json({ error: "Error interno en el servidor" });
    } finally {
        // liberamos la conexión del pool para evitar fugas de conexiones
        client.release();
    }
};

// obtenemos el historial de partidos
export const obtenerPartidos = async (req, res) => {
    try {
        // obtenemos todos los partidos utilizando el modelo y respondemos con el historial completo
        const partidos = await partidoModelo.getAll();
        res.json(partidos);
    } catch (error) {
        // en caso de error, logueamos el error y respondemos con un mensaje genérico
        console.error("Error al obtener partidos:", error);
        res.status(500).json({ error: "Error al obtener historial" });
    }
};

// registramos un nuevo partido
export const eliminarPartido = async (req, res) => {
    // obtenemos el ID del partido a eliminar desde los parámetros
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // verificamos que el partido exista antes de intentar eliminarlo
        const buscarPartido = await client.query('SELECT * FROM partidos WHERE id_partido = $1', [id]);
        if (buscarPartido.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Partido no encontrado" });
        }
        
        // eliminamos el partido de la base de datos
        await client.query('DELETE FROM partidos WHERE id_partido = $1', [id]);
        await client.query('COMMIT');
        res.json({ mensaje: "Partido eliminado y estadísticas actualizadas" });

    } catch (error) {
        // en caso de error, hacemos rollback de la transacción, logueamos el error y respondemos con un mensaje genérico
        await client.query('ROLLBACK');
        console.error("Error al eliminar partido:", error);
        res.status(500).json({ error: "Error al eliminar" });
    } finally {
        // liberamos la conexión del pool para evitar fugas de conexiones
        client.release();
    }
};

// actualizamos un partido
export const actualizarPartido = async (req, res) => {
    // obtenemos el ID del partido a actualizar desde los parámetros
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // verificamos que el partido exista antes de intentar actualizarlo
        const buscarAnterior = await client.query('SELECT * FROM partidos WHERE id_partido = $1', [id]);
        if (buscarAnterior.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Partido no encontrado" });
        }
        
        // obtenemos el partido antiguo
        const pAntiguo = buscarAnterior.rows[0];

        // si el partido estaba finalizado, restamos las estadísticas de ese resultado antes de actualizarlo
        if (pAntiguo.finalizado) {
            await actualizarEstadisticas(client, pAntiguo, -1);
        }

        // actualizamos el partido con los nuevos datos proporcionados en el cuerpo de la solicitud, manteniendo los valores antiguos si no se proporcionan nuevos
        const { tantos_local, tantos_visitante, finalizado, fecha, horario } = req.body;
        const queryUpdate = `
            UPDATE partidos 
            SET tantos_local = $1, tantos_visitante = $2, finalizado = $3, fecha = $4, horario = $5 
            WHERE id_partido = $6 
            RETURNING *
        `;
        // ejecutamos la consulta de actualización y obtenemos el partido actualizado
        const resultado = await client.query(queryUpdate, [
            tantos_local ?? pAntiguo.tantos_local, 
            tantos_visitante ?? pAntiguo.tantos_visitante, 
            finalizado ?? pAntiguo.finalizado, 
            fecha ?? pAntiguo.fecha, 
            horario ?? pAntiguo.horario, 
            id
        ]);
        
        // obtenemos el partido actualizado
        const pNuevo = resultado.rows[0];

        // si el partido actualizado está finalizado, sumamos las estadísticas de ese resultado
        if (pNuevo.finalizado) {
            await actualizarEstadisticas(client, pNuevo, 1);
        }

        // si todo se hizo correctamente, hacemos commit de la transacción y respondemos con el partido actualizado
        await client.query('COMMIT');
        res.json({ mensaje: "Partido actualizado y tabla recalculada", partido: pNuevo });

    } catch (error) {
        // en caso de error, hacemos rollback de la transacción, logueamos el error y respondemos con un mensaje genérico
        await client.query('ROLLBACK');
        console.error("Error al actualizar partido:", error);
        res.status(500).json({ error: "Error al actualizar" });
    } finally {
        // liberamos la conexión del pool para evitar fugas de conexiones
        client.release();
    }
};

// obtenemos el calendario de partidos agrupado por fecha
export const obtenerCalendario = async (req, res) => {
    try {
        // obtenemos todos los partidos ordenados por fecha y horario para construir el calendario
        const sql = `
            SELECT 
                id_partido, fecha, horario, lugar,
                equipo_local, equipo_visitante, 
                tantos_local, tantos_visitante, finalizado
            FROM partidos
            ORDER BY fecha ASC, horario ASC
        `;
        
        // ejecutamos la consulta y obtenemos el resultado con todos los partidos ordenados por fecha y horario
        const resultado = await pool.query(sql);

        // agrupamos los partidos por fecha para construir un calendario organizado
        const calendarioAgrupado = resultado.rows.reduce((acc, partido) => {
            const fechaKey = partido.fecha ? new Date(partido.fecha).toISOString().split('T')[0] : 'Sin fecha';
            if (!acc[fechaKey]) acc[fechaKey] = [];
            acc[fechaKey].push(partido);
            return acc;
        }, {});

        // respondemos con el calendario agrupado por fecha
        res.json(calendarioAgrupado);
    } catch (error) {
        // en caso de error, logueamos el error y respondemos con un mensaje genérico
        console.error("Error en calendario:", error);
        res.status(500).json({ error: "Error al cargar el calendario" });
    }
};