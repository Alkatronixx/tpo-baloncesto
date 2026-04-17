import { z } from 'zod';

export const equipoEsquema = z.object({
    nombre_equipo: z.string()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100),
    entrenador: z.string()
        .max(100)
        .optional()
        .nullable(),
    logo_url: z.string()
        .max(255)
        .optional()
        .default('default-logo.png'),
    puntos_totales: z.number().int().min(0).default(0),
    partidos_jugados: z.number().int().min(0).default(0),
    tantos_favor: z.number().int().min(0).default(0),
    tantos_contra: z.number().int().min(0).default(0),
    tantos_diferencia: z.number().int().default(0),
    estadio: z.string().min(3, "El nombre del estadio es muy corto").optional()
});