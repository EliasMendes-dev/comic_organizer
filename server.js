const express = require("express");
const cors = require("cors");
const path = require("path");
const fileRoutes = require("./src/routes/fileRoutes");
const { ensureDirectory, uploadsDir, outputDir, clearDirectory } = require("./src/services/fileService");

const app = express();
const PORT = process.env.PORT || 3000;

ensureDirectory(uploadsDir);
ensureDirectory(outputDir);
clearDirectory(uploadsDir); // Limpa uploads ao iniciar o servidor
clearDirectory(outputDir); // Limpa output ao iniciar o servidor

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));
app.use("/output", express.static(outputDir));

app.use("/api", fileRoutes);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
    if (!err) {
        return next();
    }
    return res.status(400).json({ error: err.message || "Erro inesperado." });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

