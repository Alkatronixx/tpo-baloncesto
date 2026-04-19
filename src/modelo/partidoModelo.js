import { query } from '../config/db.js';

export const partidoModelo = {
    getAll: async () => {
        const query = `
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
        const { rows } = await query(query);
        return rows;
    }
};