// Mapeo de caracteres especiales a sus equivalentes ASCII.
const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
const p = new RegExp(a.split('').join('|'), 'g')

/**
 * Convierte una cadena en una versión "slug" (URL amigable), que es útil para la normalización.
 * Elimina diacríticos, caracteres especiales y convierte espacios en guiones.
 * @param str La cadena a convertir.
 * @returns La cadena en formato slug.
 */
const slugify = (str: string): string => {
  return str.toString().toLowerCase()
    .replace(/\s+/g, '-') // Reemplaza espacios con -
    .replace(p, c => b.charAt(a.indexOf(c))) // Reemplaza caracteres especiales con su equivalente
    .replace(/&/g, '-and-') // Reemplaza & con 'and'
    .replace(/[^\w\-]+/g, '') // Elimina todos los caracteres que no son palabras o guiones
    .replace(/\-\-+/g, '-') // Reemplaza múltiples -- con uno solo
    .replace(/^-+/, '') // Elimina guiones del inicio
    .replace(/-+$/, '') // Elimina guiones del final
}

/**
 * Prepara un título de anime/manga para ser utilizado en una búsqueda de proveedor.
 * Limpia el título eliminando información extra y normalizando caracteres.
 * @param title El título original del anime o manga.
 * @returns Un título sanitizado y listo para la búsqueda.
 */
export const sanitizeTitleForProvider = (title: string): string => {
    let sanitized = title.toLowerCase();
    
    // Elimina contenido entre paréntesis, que a menudo son años o temporadas que confunden a los scrapers.
    // Ej: "Hunter x Hunter (2011)" -> "Hunter x Hunter "
    sanitized = sanitized.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    
    // Reemplazos específicos para caracteres comunes en títulos de anime que no se manejan bien con slugify.
    const replacements: { [key: string]: string } = {
        '×': 'x', // Ej: Hunter x Hunter
        '☆': ' ', // Ej: Lucky ☆ Star
        '★': ' ',
        '†': ' ',
        '²': '2',
        '³': '3',
        '・': ' ', // Separador japonés
        '.': ' ', // Puntos que pueden interferir
    };

    for (const char in replacements) {
        // Usa una expresión regular para reemplazar todas las ocurrencias del carácter especial.
        sanitized = sanitized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacements[char]);
    }
    
    // Usa la función slugify para manejar diacríticos (ej. "Shingeki no Kyojin") y otros símbolos.
    // El resultado será algo como "shingeki-no-kyojin".
    sanitized = slugify(sanitized);

    // Finalmente, reemplaza los guiones con espacios, ya que la mayoría de los proveedores
    // funcionan mejor con búsquedas de texto separadas por espacios.
    // Ej: "shingeki-no-kyojin" -> "shingeki no kyojin"
    return sanitized.replace(/-/g, ' ');
};