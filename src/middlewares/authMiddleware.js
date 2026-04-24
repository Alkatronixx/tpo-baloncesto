import jwt from 'jsonwebtoken';

// middleware para verificar el token JWT en las solicitudes protegidas
export const verificarToken = (req, res, next) => {
    // obtenemos la cabecera de autorización y verificamos que tenga el formato correcto
    const authHeader = req.headers['authorization'];
    
    // si no se proporciona una cabecera de autorización o no tiene el formato "Bearer, respondemos con un error de acceso denegado
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ mensaje: 'Acceso denegado: Cabecera de autorización inválida' });
    }

    // extraemos el token de la cabecera de autorización eliminando el prefijo "Bearer " y espacios
    const token = authHeader.replace('Bearer ', '').trim();

    try {
        // verificamos el token utilizando la clave secreta definida en las variables de entorno
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        // si el token es inválido o ha expirado, respondemos con un error de autenticación
        return res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
};