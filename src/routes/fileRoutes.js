const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const { uploadPasta, clearUploads, clearOutput, listarPastas, deletarPasta, renomearArquivos, gerarCBZ } = require("../controllers/fileController");

router.post("/upload", upload.array("files"), uploadPasta);
router.post("/clear-uploads", clearUploads);
router.post("/clear-output", clearOutput);
router.get("/folders", listarPastas);
router.delete("/folders/:folderName", deletarPasta);
router.post("/rename", renomearArquivos);
router.post("/generate-cbz", gerarCBZ);

module.exports = router;


