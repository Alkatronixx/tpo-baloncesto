import multer from 'multer';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

// Configuración de multer para almacenar archivos en memoria
const storage = multer.memoryStorage();

// Filtro para aceptar solo imágenes JPG, PNG o WEBP
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
    }
};

// Configuración de multer con límites de tamaño y filtro de archivos
export const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

// Función para crear el cliente de Supabase
const getSupabase = () => createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Función para procesar y subir la imagen a Supabase Storage
export const subirImagen = async (file, identificador) => {
    const supabase = getSupabase();
    
    const imagenProcesada = await sharp(file.buffer)
        .resize(300, 300, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png({ quality: 80 })
        .toBuffer();

    const nombreArchivo = `equipo-${identificador}.png`;

    // Subir la imagen procesada a Supabase Storage
    const { error } = await supabase.storage
        .from('logo')
        .upload(nombreArchivo, imagenProcesada, {
            contentType: 'image/png',
            upsert: true
        });

    // Manejar errores de subida
    if (error) throw new Error(`Error al subir imagen: ${error.message}`);

    // Obtener la URL pública de la imagen subida
    const { data } = supabase.storage
        .from('logo')
        .getPublicUrl(nombreArchivo);

    return data.publicUrl;
};

// Función para borrar una imagen de Supabase Storage
export const borrarImagen = async (logo_url) => {
    // Extraer el nombre del archivo de la URL
    const supabase = getSupabase();
    const nombreArchivo = logo_url.split('/').pop();

    // Borrar la imagen de Supabase Storage
    const { error } = await supabase.storage
        .from('logo')
        .remove([nombreArchivo]);

    // Manejar errores de borrado (no crítico)
    if (error) console.error("Error al borrar imagen de Supabase (no crítico):", error);
};