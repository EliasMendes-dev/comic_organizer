const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadsDir } = require("../services/fileService");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Obter o nome da pasta do query param
        // Para uploads de arquivo único (CBR), não criar pasta upload desnecessária
        const folderName = req.query.folderName || path.basename(file.originalname, path.extname(file.originalname));
        const folderPath = path.join(uploadsDir, folderName);

        // Extrair o diretório relativo do arquivo (se houver subcaminho)
        const relativePath = file.originalname.includes("/") 
            ? path.dirname(file.originalname) 
            : "";

        const finalPath = relativePath 
            ? path.join(folderPath, relativePath)
            : folderPath;

        // Criar o diretório se não existir
        if (!fs.existsSync(finalPath)) {
            fs.mkdirSync(finalPath, { recursive: true });
        }

        cb(null, finalPath);
    },
    filename: (req, file, cb) => {
        // Pega apenas o nome do arquivo, sem o caminho
        const nameOnly = path.basename(file.originalname);
        cb(null, nameOnly);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 500 }, // 500MB
});

module.exports = upload;
