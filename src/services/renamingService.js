const fs = require("fs");
const path = require("path");
const { getExtension } = require("../utils/stringHelper");
const { formatPageNumber, formatEdition } = require("../utils/numberHelper");

const EXTENSOES_IMAGEM = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];

const ehImagem = (filename) => {
    const ext = getExtension(filename).toLowerCase();
    return EXTENSOES_IMAGEM.includes(ext);
};

// Renomear e copiar arquivos de um diretório
const renomearArquivosDiretorio = (dirOrigem, dirDestino, title, year, edition) => {
    let contadorPagina = 1;
    let totalRenomeados = 0;

    const processar = (origem, destino) => {
        const itens = fs.readdirSync(origem);

        for (const item of itens) {
            const caminhoOrigem = path.join(origem, item);
            const caminhoDestino = path.join(destino, item);
            const stat = fs.lstatSync(caminhoOrigem);

            if (stat.isDirectory()) {
                // Criar subpasta
                if (!fs.existsSync(caminhoDestino)) {
                    fs.mkdirSync(caminhoDestino, { recursive: true });
                }
                processar(caminhoOrigem, caminhoDestino);
            } else {
                // Se for imagem, renomear
                if (ehImagem(item)) {
                    const ext = getExtension(item);
                    const novoNome = `${title} (${year}) #${formatEdition(edition)} #${formatPageNumber(contadorPagina)}${ext}`;
                    const novoDestino = path.join(destino, novoNome);

                    fs.copyFileSync(caminhoOrigem, novoDestino);
                    contadorPagina++;
                    totalRenomeados++;
                } else {
                    // Copiar non-image files as-is
                    fs.copyFileSync(caminhoOrigem, caminhoDestino);
                }
            }
        }
    };

    // Criar diretório destino se não existir
    if (!fs.existsSync(dirDestino)) {
        fs.mkdirSync(dirDestino, { recursive: true });
    }

    processar(dirOrigem, dirDestino);

    return totalRenomeados;
};

// Gerar preview de renomeação
const gerarPreviewRenomeacao = (diretorio, title, year, edition) => {
    const previews = [];
    let contadorPagina = 1;

    const processar = (dir) => {
        const itens = fs.readdirSync(dir);

        for (const item of itens) {
            const caminhoItem = path.join(dir, item);
            const stat = fs.lstatSync(caminhoItem);

            if (stat.isDirectory()) {
                processar(caminhoItem);
            } else if (ehImagem(item)) {
                const ext = getExtension(item);
                const novoNome = `${title} (${year}) #${formatEdition(edition)} #${formatPageNumber(contadorPagina)}${ext}`;
                previews.push({
                    antiga: item,
                    nova: novoNome,
                });
                contadorPagina++;
            }
        }
    };

    processar(diretorio);
    return previews;
};

module.exports = {
    ehImagem,
    renomearArquivosDiretorio,
    gerarPreviewRenomeacao,
};
