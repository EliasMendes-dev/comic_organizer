const { uploadsDir, clearDirectory, outputDir } = require("../services/fileService");
const { renomearArquivosDiretorio } = require("../services/renamingService");
const { gerarCBZ: gerarCBZZip } = require("../services/zipService");
const { converterCBRParaCBZ } = require("../services/cbrService");
const { isValidYear, isValidEdition } = require("../utils/numberHelper");
const { isValidName } = require("../utils/stringHelper");
const Unrar = require("unrar");
const fs = require("fs");
const path = require("path");

// Função para desaninhar pastas aninhadas desnecessárias
// Se há apenas uma subpasta com arquivos, move tudo para a raiz
const desaninharPasta = (caminhoBase) => {
    try {
        const itens = fs.readdirSync(caminhoBase);
        
        // Se há apenas 1 item e é uma pasta
        if (itens.length === 1) {
            const itemPath = path.join(caminhoBase, itens[0]);
            const stat = fs.lstatSync(itemPath);
            
            if (stat.isDirectory()) {
                // Mover todos os arquivos da subpasta para a raiz
                const arquivosSubpasta = fs.readdirSync(itemPath);
                
                for (const arquivo of arquivosSubpasta) {
                    const caminhoOrigem = path.join(itemPath, arquivo);
                    const caminhoDestino = path.join(caminhoBase, arquivo);
                    fs.renameSync(caminhoOrigem, caminhoDestino);
                }
                
                // Deletar subpasta vazia
                fs.rmdirSync(itemPath);
                console.log(`✓ Pasta desaninhada: ${itens[0]}`);
            }
        }
    } catch (error) {
        console.error("Erro ao desaninhar pasta:", error.message);
    }
};

const uploadPasta = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
        }

        return res.json({
            success: true,
            message: `${req.files.length} arquivo(s) enviado(s) com sucesso`,
            files: req.files.map((f) => f.originalname),
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const clearUploads = (req, res) => {
    try {
        clearDirectory(uploadsDir);
        return res.json({ success: true, message: "Pasta uploads foi limpa" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const clearOutput = (req, res) => {
    try {
        clearDirectory(outputDir);
        return res.json({ success: true, message: "Pasta output foi limpa" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const listarPastas = (req, res) => {
    try {
        if (!fs.existsSync(uploadsDir)) {
            return res.json({ folders: [] });
        }

        const items = fs.readdirSync(uploadsDir);
        const folders = [];

        for (const item of items) {
            const itemPath = path.join(uploadsDir, item);
            const stat = fs.lstatSync(itemPath);

            if (stat.isDirectory()) {
                const files = listarArquivosRecursivo(itemPath);
                folders.push({
                    name: item,
                    files: files,
                });
            }
        }

        return res.json({ folders });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const listarArquivosRecursivo = (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.lstatSync(itemPath);

        if (stat.isDirectory()) {
            files.push(...listarArquivosRecursivo(itemPath));
        } else {
            const relativePath = path.relative(uploadsDir, itemPath);
            files.push(relativePath);
        }
    }

    return files;
};

const deletarPasta = (req, res) => {
    try {
        const { folderName } = req.params;

        if (!folderName) {
            return res.status(400).json({ error: "Nome da pasta não fornecido" });
        }

        const folderPath = path.join(uploadsDir, folderName);

        // Validar que o caminho está dentro de uploads
        if (!folderPath.startsWith(uploadsDir)) {
            return res.status(400).json({ error: "Caminho inválido" });
        }

        if (fs.existsSync(folderPath)) {
            clearDirectory(folderPath);
            fs.rmdirSync(folderPath);
            return res.json({ success: true, message: `Pasta ${folderName} deletada` });
        } else {
            return res.status(404).json({ error: "Pasta não encontrada" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const renomearArquivos = (req, res) => {
    try {
        const { folderName, title, year, edition } = req.body;

        // Validações
        if (!folderName || !isValidName(title)) {
            return res.status(400).json({ error: "Nome obrigatório e válido" });
        }

        if (!isValidYear(year)) {
            return res.status(400).json({ error: "Ano deve ser >= 1938" });
        }

        if (edition === undefined || edition === null || edition === "") {
            return res.status(400).json({ error: "Edição é obrigatória" });
        }

        if (!isValidEdition(edition)) {
            return res.status(400).json({ error: "Edição deve ser entre 00 e 9999 (00 = prelúdio)" });
        }

        const pastaOrigem = path.join(uploadsDir, folderName);
        const pastaDestino = path.join(outputDir, folderName);

        if (!fs.existsSync(pastaOrigem)) {
            return res.status(404).json({ error: "Pasta de origem não encontrada" });
        }

        // Limpar pasta destino se existir
        if (fs.existsSync(pastaDestino)) {
            clearDirectory(pastaDestino);
            fs.rmdirSync(pastaDestino);
        }

        // Converter edição para número (0 deve permanecer 0, não virar 1)
        const editionNum = parseInt(edition);

        // Usar serviço de renomeação
        const totalRenomeados = renomearArquivosDiretorio(
            pastaOrigem,
            pastaDestino,
            title,
            parseInt(year),
            editionNum
        );

        // Desaninhar pasta se houver aninhamento
        desaninharPasta(pastaDestino);

        return res.json({
            success: true,
            message: `${totalRenomeados} arquivo(s) renomeado(s) com edição ${String(editionNum).padStart(2, "0")}`,
            renamed: totalRenomeados,
            edition: editionNum,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const gerarCBZ = async (req, res) => {
    try {
        const { folderName, title, year, edition } = req.body;

        if (!folderName) {
            return res.status(400).json({ error: "Nome da pasta nao fornecido" });
        }

        if (!title || !year || edition === undefined || edition === null || edition === "") {
            return res.status(400).json({ error: "Titulo, ano e edicao sao obrigatorios" });
        }

        if (!isValidYear(year)) {
            return res.status(400).json({ error: "Ano deve ser >= 1938" });
        }

        if (!isValidEdition(edition)) {
            return res.status(400).json({ error: "Edicao deve ser entre 00 e 9999 (00 = preludio)" });
        }

        // Tentar primeiro o outputDir (pasta renomeada)
        let pastaFonte = path.join(outputDir, folderName);
        
        // Se não existir no output, tentar no uploads (pasta original)
        if (!fs.existsSync(pastaFonte)) {
            pastaFonte = path.join(uploadsDir, folderName);
            
            if (!fs.existsSync(pastaFonte)) {
                return res.status(404).json({ error: "Pasta não encontrada (renomear e tentar novamente)" });
            }
        }

        // Montar nome do arquivo CBZ
        const yearNum = parseInt(year);
        const editionNum = parseInt(edition);
        const edicaoFormatada = String(editionNum).padStart(2, "0");
        const nomeArquivo = `${title} (${yearNum}) #${edicaoFormatada}.cbz`;
        
        const caminhoZip = path.join(outputDir, nomeArquivo);

        await gerarCBZZip(pastaFonte, caminhoZip);

        // Verificar se o arquivo foi criado
        if (!fs.existsSync(caminhoZip)) {
            return res.status(500).json({ error: "Falha ao criar arquivo CBZ" });
        }

        // Determinar se a pasta está em output ou uploads para cleanup
        const pastaParaLimpar = pastaFonte.startsWith(outputDir) ? pastaFonte : null;

        // Download e limpeza pós-download
        res.download(caminhoZip, nomeArquivo, async (err) => {
            if (err) {
                console.error("Erro ao fazer download:", err);
            }
            
            // Aguardar um pouco para garantir que o download foi concluído
            setTimeout(() => {
                try {
                    // Limpar arquivo ZIP após download
                    if (fs.existsSync(caminhoZip)) {
                        fs.unlinkSync(caminhoZip);
                        console.log("✓ Arquivo CBZ removido após download");
                    }

                    // Limpar pasta de origem se estava em output
                    if (pastaParaLimpar && fs.existsSync(pastaParaLimpar)) {
                        clearDirectory(pastaParaLimpar);
                        fs.rmdirSync(pastaParaLimpar);
                        console.log("✓ Pasta de origem removida após download");
                    }

                    // Limpar TODO o output se estiver vazio (sem pastas e arquivos)
                    if (fs.existsSync(outputDir)) {
                        const itensOutput = fs.readdirSync(outputDir);
                        if (itensOutput.length === 0) {
                            console.log("✓ Output vazio e limpo");
                        }
                    }
                } catch (cleanupError) {
                    console.error("Erro ao limpar após download:", cleanupError.message);
                }
            }, 500); // Aguardar 500ms para garantir conclusão do download
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const converterCBR = async (req, res) => {
    const { execSync } = require("child_process");
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo CBR foi enviado" });
        }

        const caminhoArquivoCBR = req.file.path;
        
        // Extrair nome do arquivo (sem extensão) para usar como nome da pasta
        const nomeCBRSemExt = path.basename(req.file.originalname, ".cbr");
        const caminhoExtracao = path.join(uploadsDir, nomeCBRSemExt);

        // Validar arquivo
        if (!fs.existsSync(caminhoArquivoCBR)) {
            return res.status(400).json({ error: "Arquivo CBR não encontrado no servidor" });
        }

        const extensao = path.extname(caminhoArquivoCBR).toLowerCase();
        if (extensao !== ".cbr") {
            return res.status(400).json({ error: "Arquivo deve ser um .cbr válido" });
        }

        // Criar diretório de extração se não existir
        if (!fs.existsSync(caminhoExtracao)) {
            fs.mkdirSync(caminhoExtracao, { recursive: true });
        }

        // Extrair arquivo CBR usando o unrar com o binário do WinRAR
        try {
            // Usar UnRAR.exe do WinRAR para extrair
            const archive = new Unrar({
                path: caminhoArquivoCBR,
                bin: "C:\\Program Files\\WinRAR\\UnRAR.exe"
            });

            // Obter lista de arquivos
            await new Promise((resolve, reject) => {
                archive.list((err, entries) => {
                    if (err) reject(err);
                    else resolve(entries);
                });
            });

            // Usar execSync para extrair via linha de comando (mais direto)
            const comando = `"C:\\Program Files\\WinRAR\\UnRAR.exe" x -o+ "${caminhoArquivoCBR}" "${caminhoExtracao}\\"`;
            execSync(comando, { stdio: "pipe" });

            // Validar extração - verificar se há imagens
            const EXTENSOES_IMAGEM = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
            const arquivosExtraidos = [];
            
            const listarArquivosRecursivoLocal = (dir) => {
                const itens = fs.readdirSync(dir);
                for (const item of itens) {
                    const itemPath = path.join(dir, item);
                    const stat = fs.lstatSync(itemPath);
                    if (stat.isDirectory()) {
                        listarArquivosRecursivoLocal(itemPath);
                    } else {
                        const ext = path.extname(item).toLowerCase();
                        if (EXTENSOES_IMAGEM.includes(ext)) {
                            arquivosExtraidos.push(item);
                        }
                    }
                }
            };

            listarArquivosRecursivoLocal(caminhoExtracao);

            if (arquivosExtraidos.length === 0) {
                throw new Error("Nenhuma imagem encontrada no arquivo CBR");
            }

            // Desaninhar pasta se houver aninhamento
            desaninharPasta(caminhoExtracao);

            // Deletar arquivo CBR após extração bem-sucedida
            try {
                fs.unlinkSync(caminhoArquivoCBR);
            } catch (e) {
                console.error("Erro ao deletar CBR original:", e);
            }

            return res.json({
                success: true,
                message: `CBR extraído com sucesso: ${nomeCBRSemExt} (${arquivosExtraidos.length} imagens)`,
                folderName: nomeCBRSemExt,
                imageCount: arquivosExtraidos.length,
            });
        } catch (extractError) {
            // Limpar diretório em caso de erro na extração
            try {
                if (fs.existsSync(caminhoExtracao)) {
                    fs.rmSync(caminhoExtracao, { recursive: true, force: true });
                }
            } catch (e) {
                console.error("Erro ao limpar diretório:", e);
            }
            
            console.error("Erro ao extrair CBR:", extractError);
            return res.status(500).json({ 
                error: `Erro ao extrair CBR: ${extractError.message}` 
            });
        }
    } catch (error) {
        console.error("Erro no converterCBR:", error);
        return res.status(500).json({ error: `Erro: ${error.message}` });
    }
};

module.exports = {
    uploadPasta,
    clearUploads,
    clearOutput,
    listarPastas,
    deletarPasta,
    renomearArquivos,
    gerarCBZ,
    converterCBR,
};
