import multer from 'multer';
import path from 'path';

// middleware para subir archivos
const storage = multer.diskStorage({
  // configuramos el destino de los archivos subidos a la carpeta "public/uploads/logos"
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/logos'); 
  },
  // configuramos el nombre del archivo subido utilizando el nombre del equipo y la fecha actual para evitar colisiones
  filename: (req, file, cb) => {
    const nombreEquipo = req.body.nombre_equipo 
      ? req.body.nombre_equipo.toLowerCase().split(' ').join('-') 
      : 'equipo-sin-nombre';

    // obtenemos la extensión del archivo original para mantenerla en el nombre del archivo subido
    const extension = path.extname(file.originalname); 
    
    // generamos el nombre del archivo subido combinando el nombre del equipo, la fecha actual y la extensión del archivo original  
    cb(null, `${nombreEquipo}-${Date.now()}${extension}`);
  }
});

// solo permitimos subir archivos con extensiones de imagen válidas (jpg, jpeg, png)
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
      if (tiposPermitidos.includes(file.mimetype)) {
          cb(null, true);
      } else {
          cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
      }
};

// exportamos el middleware de multer configurado para manejar la subida de archivos utilizando el almacenamiento definido
export const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});