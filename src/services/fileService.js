const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../uploads");
const outputDir = path.join(__dirname, "../../output");

const ensureDirectory = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const clearDirectory = (dir) => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                clearDirectory(filePath); // Recursão para apagar subpastas
                fs.rmdirSync(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        }
    }
};

module.exports = {
    ensureDirectory,
    clearDirectory,
    uploadsDir,
    outputDir,
};
