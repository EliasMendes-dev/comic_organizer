// Sanitizar nome de arquivo
const sanitizeFileName = (name) => {
    return name
        .trim()
        .replace(/[<>:"|?*\\/]/g, "") // Remove caracteres inválidos
        .replace(/\s+/g, " ") // Normaliza espaços
        .substring(0, 255); // Limita tamanho
};

// Remover extensão de arquivo
const removeExtension = (filename) => {
    return filename.replace(/\.[^/.]+$/, "");
};

// Obter extensão de arquivo
const getExtension = (filename) => {
    const match = filename.match(/\.[^/.]+$/);
    return match ? match[0] : "";
};

// Validar se é nome válido
const isValidName = (name) => {
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= 255 && !/[<>:"|?*\\\/]/g.test(trimmed);
};

// Capitalizar primeira letra
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Formatar nome do comic
const formatComicName = (title, year, edition, page, ext) => {
    const editionPadded = String(edition).padStart(2, "0");
    const pagePadded = String(page).padStart(3, "0");
    return `${title} (${year}) #${editionPadded} - ${pagePadded}${ext}`;
};

module.exports = {
    sanitizeFileName,
    removeExtension,
    getExtension,
    isValidName,
    capitalize,
    formatComicName,
};
