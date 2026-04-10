import pool from '../config/db.js';

const Usuario = {
    buscarPorNombre: async (nombre_usuario) => {
        const query = 'SELECT * FROM usuarios WHERE nombre_usuario = $1'; 
        const { rows } = await pool.query(query, [nombre_usuario]); 
        
        return rows.length > 0 ? rows[0] : null; 
    }
};

export default Usuario;