import { query } from '../config/db.js';

// modelo para manejar las operaciones relacionadas con los partidos
export const partidoModelo = {
    getAll: async () => {
        // obtenemos todos los partidos junto con el nombre de los equipos local y visitante
        const sql = `
            SELECT 
                p.id_partido, p.fecha, p.horario, p.lugar,
                el.nombre_equipo AS local, p.tantos_local,
                p.tantos_visitante, ev.nombre_equipo AS visitante,
                p.finalizado
            FROM partidos p
            JOIN equipos el ON p.id_local = el.id_equipo
            JOIN equipos ev ON p.id_visitante = ev.id_equipo
            ORDER BY p.fecha DESC, p.horario DESC;
        `;
        // ejecutamos la consulta y obtenemos el resultado
        const { rows } = await query(sql);
        return rows;
    }
};