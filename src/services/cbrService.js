const Unrar = require("unrar");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { gerarZip } = require("./zipService");

// Extrair CBR e converter para CBZ
const converterCBRParaCBZ = async (caminhoArquivoCBR, caminhoSaida, nomeCBZ = null) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Validar arquivo
            if (!fs.existsSync(caminhoArquivoCBR)) {
                throw new Error("Arquivo CBR não encontrado");
            }

            const extensao = path.extname(caminhoArquivoCBR).toLowerCase();
            if (extensao !== ".cbr") {
                throw new Error("Arquivo deve ser um .cbr");
            }

            // Criar diretório temporário para extração
            const nomeTemporario = `cbr_temp_${Date.now()}`;
            const dirExtracao = path.join(caminhoSaida, nomeTemporario);

            // Criar diretório de extração
            if (!fs.existsSync(dirExtracao)) {
                fs.mkdirSync(dirExtracao, { recursive: true });
            }

            try {
                // Extrair arquivo CBR usando UnRAR.exe
                const comando = `"C:\\Program Files\\WinRAR\\UnRAR.exe" x -o+ "${caminhoArquivoCBR}" "${dirExtracao}\\"`;
                execSync(comando, { stdio: "pipe" });

                // Listar arquivos extraídos
                const EXTENSOES_IMAGEM = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
                const imagensFiltradas = [];

                const listarArquivosRecursivo = (dir) => {
                    const itens = fs.readdirSync(dir);
                    for (const item of itens) {
                        const itemPath = path.join(dir, item);
                        const stat = fs.lstatSync(itemPath);
                        if (stat.isDirectory()) {
                            listarArquivosRecursivo(itemPath);
                        } else {
                            const ext = path.extname(item).toLowerCase();
                            if (EXTENSOES_IMAGEM.includes(ext)) {
                                imagensFiltradas.push(item);
                            }
                        }
                    }
                };

                listarArquivosRecursivo(dirExtracao);

                if (imagensFiltradas.length === 0) {
                    throw new Error("Nenhuma imagem encontrada no arquivo CBR");
                }

                // Determinar nome do CBZ
                let nomeCBZFinal = nomeCBZ || path.basename(caminhoArquivoCBR, ".cbr");
                if (!nomeCBZFinal.endsWith(".cbz")) {
                    nomeCBZFinal += ".cbz";
                }

                const caminhoZip = path.join(caminhoSaida, nomeCBZFinal);

                // Gerar arquivo CBZ
                await gerarZip(dirExtracao, caminhoZip, nomeCBZFinal);

                // Limpar diretório temporário
                try {
                    fs.rmSync(dirExtracao, { recursive: true, force: true });
                } catch (e) {
                    console.error("Erro ao limpar dir temporário:", e);
                }

                resolve({
                    success: true,
                    path: caminhoZip,
                    nome: nomeCBZFinal,
                    imageCount: imagensFiltradas.length,
                    message: `CBZ gerado com sucesso (${imagensFiltradas.length} imagens)`,
                });
            } catch (extractError) {
                // Limpar diretório temporário em caso de erro
                try {
                    if (fs.existsSync(dirExtracao)) {
                        fs.rmSync(dirExtracao, { recursive: true, force: true });
                    }
                } catch (e) {
                    console.error("Erro ao limpar dir temporário:", e);
                }
                throw extractError;
            }
        } catch (error) {
            reject({
                success: false,
                error: error.message || "Erro ao converter CBR para CBZ",
            });
        }
    });
};

module.exports = {
    converterCBRParaCBZ,
};
