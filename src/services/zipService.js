const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

// Gerar arquivo ZIP/CBZ
const gerarZip = (diretorioOrigem, caminhoDestino, nome = "arquivo") => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(caminhoDestino);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
            resolve({
                success: true,
                path: caminhoDestino,
                size: archive.pointer(),
                nome: path.basename(caminhoDestino),
            });
        });

        archive.on("error", (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(diretorioOrigem, false);
        archive.finalize();
    });
};

// Gerar arquivo CBZ especificamente
const gerarCBZ = (diretorioOrigem, caminhoDestino) => {
    const nomeArquivo = `${path.basename(diretorioOrigem)}.cbz`;
    const caminhoFinal = path.join(path.dirname(caminhoDestino), nomeArquivo);

    return gerarZip(diretorioOrigem, caminhoFinal, nomeArquivo);
};

// Obter informações do arquivo ZIP
const getZipInfo = (caminhoZip) => {
    if (!fs.existsSync(caminhoZip)) {
        return null;
    }

    const stat = fs.statSync(caminhoZip);
    return {
        nome: path.basename(caminhoZip),
        tamanho: stat.size,
        modificado: stat.mtime,
        caminho: caminhoZip,
    };
};

// Limpar arquivo ZIP antigo
const limparZipAntigo = (caminhoZip) => {
    try {
        if (fs.existsSync(caminhoZip)) {
            fs.unlinkSync(caminhoZip);
            return true;
        }
    } catch (error) {
        console.error("Erro ao limpar ZIP antigo:", error);
    }
    return false;
};

module.exports = {
    gerarZip,
    gerarCBZ,
    getZipInfo,
    limparZipAntigo,
};
