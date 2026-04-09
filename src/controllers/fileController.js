const { uploadsDir, clearDirectory, outputDir } = require("../services/fileService");
const { renomearArquivosDiretorio } = require("../services/renamingService");
const { gerarCBZ: gerarCBZZip } = require("../services/zipService");
const { isValidYear, isValidEdition } = require("../utils/numberHelper");
const { isValidName } = require("../utils/stringHelper");
const fs = require("fs");
const path = require("path");

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

        if (!isValidEdition(edition)) {
            return res.status(400).json({ error: "Edição deve ser entre 1 e 9999" });
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

        // Usar serviço de renomeação
        const totalRenomeados = renomearArquivosDiretorio(
            pastaOrigem,
            pastaDestino,
            title,
            parseInt(year),
            parseInt(edition)
        );

        return res.json({
            success: true,
            message: `${totalRenomeados} arquivo(s) renomeado(s)`,
            renamed: totalRenomeados,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const gerarCBZ = async (req, res) => {
    try {
        const { folderName } = req.body;

        if (!folderName) {
            return res.status(400).json({ error: "Nome da pasta não fornecido" });
        }

        const pastaFonte = path.join(outputDir, folderName);

        if (!fs.existsSync(pastaFonte)) {
            return res.status(404).json({ error: "Pasta no output não encontrada" });
        }

        // Usar serviço de ZIP
        const nomeArquivo = `${folderName}.cbz`;
        const caminhoZip = path.join(outputDir, nomeArquivo);

        await gerarCBZZip(pastaFonte, caminhoZip);

        // Download
        res.download(caminhoZip, nomeArquivo, (err) => {
            if (err) {
                console.error("Erro ao fazer download:", err);
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
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
};
