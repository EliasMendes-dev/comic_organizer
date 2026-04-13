// Formatar número com zero-padding
const padNumber = (num, length = 2) => {
    return String(num).padStart(length, "0");
};

// Validar ano
const isValidYear = (year) => {
    const yearNum = parseInt(year);
    return !isNaN(yearNum) && yearNum >= 1938 && yearNum <= new Date().getFullYear() + 10;
};

// Validar edição (00-9999, sendo 00 para prelúdio)
const isValidEdition = (edition) => {
    const edNum = parseInt(edition);
    return !isNaN(edNum) && edNum >= 0 && edNum <= 9999;
};

// Formatar número com zero-padding para página
const formatPageNumber = (pageNum) => {
    return padNumber(pageNum, 3);
};

// Formatar edição com zero-padding
const formatEdition = (edition) => {
    return padNumber(edition, 2);
};

module.exports = {
    padNumber,
    isValidYear,
    isValidEdition,
    formatPageNumber,
    formatEdition,
};
