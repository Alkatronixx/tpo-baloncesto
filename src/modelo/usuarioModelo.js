import { query } from '../config/db.js';

const Usuario = {
    buscarPorNombre: async (nombre_usuario) => {
        const sql = 'SELECT * FROM usuarios WHERE nombre_usuario = $1'; 
        const { rows } = await query(sql, [nombre_usuario]); 
        return rows[0] ?? null;
    }
};

export default Usuario;