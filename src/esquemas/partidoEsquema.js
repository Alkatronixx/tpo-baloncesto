import { z } from 'zod';

// Esquema de validación para el partido
export const partidoEsquema = z.object({
    id_local: z.number().int().positive("El ID del equipo local debe ser un número positivo"),
    id_visitante: z.number().int().positive("El ID del equipo visitante debe ser un número positivo"),
    tantos_local: z.number().int().min(0),
    tantos_visitante: z.number().int().min(0),
    finalizado: z.boolean().default(false),
    fecha: z.string().optional(),
    horario: z.string().optional(),
    lugar: z.string().optional()
});