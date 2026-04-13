const CHAVE_TEMA = "comicOrganizerTheme";
const BASE_API = (() => {
    const { hostname, port } = window.location;
    // Se estiver em localhost com porta diferente de 3000, conectar à porta 3000 (desenvolvimento)
    if (hostname === "localhost" && port && port !== "3000") {
        return "http://localhost:3000/api";
    }
    // Caso contrário, usar caminho relativo (funciona em todos os casos: dev e produção)
    return "/api";
})();

// Estado de visualização de imagens
let imagensDisponiveis = [];
let indiceImagemAtual = 0;
const EXTENSOES_IMAGEM = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];

// Estado de seleção
let tipoSelecaoAtual = null; // "pasta", "cbr" ou "cbz"
let cbzsCarregados = []; // Array com caminhos dos CBZs selecionados
let pastaSelecionadaAtual = null;
let pastasDisponiveis = [];

const obterMetadadosObrigatorios = () => {
    const titulo = document.querySelector("#novo-titulo")?.value.trim();
    const ano = document.querySelector("#novo-ano")?.value.trim();
    const edicao = document.querySelector("#nova-edicao")?.value.trim();

    if (!titulo) {
        mostrarMensagem("✖ Título é obrigatório", "erro");
        return null;
    }

    if (!ano) {
        mostrarMensagem("✖ Ano é obrigatório", "erro");
        return null;
    }

    const anoNum = Number.parseInt(ano, 10);
    const anoMaximo = new Date().getFullYear() + 10;
    if (Number.isNaN(anoNum) || anoNum < 1938 || anoNum > anoMaximo) {
        mostrarMensagem("✖ Ano deve ser >= 1938", "erro");
        return null;
    }

    if (edicao === "") {
        mostrarMensagem("✖ Edição é obrigatória", "erro");
        return null;
    }

    const edicaoNum = Number.parseInt(edicao, 10);
    if (Number.isNaN(edicaoNum) || edicaoNum < 0 || edicaoNum > 9999) {
        mostrarMensagem("✖ Edição deve ser entre 00 e 9999", "erro");
        return null;
    }

    return { titulo, anoNum, edicaoNum };
};

const setEdicaoHabilitada = (habilitado) => {
    const inputs = ["#novo-titulo", "#novo-ano", "#nova-edicao"];
    const botoes = ["#botao-visualizar", "#botao-renomear"];
    const botaoAcao = document.querySelector("#botao-acao-principal");

    inputs.forEach((seletor) => {
        const el = document.querySelector(seletor);
        if (el) el.disabled = !habilitado;
    });

    botoes.forEach((seletor) => {
        const el = document.querySelector(seletor);
        if (el) el.disabled = !habilitado;
    });

    if (botaoAcao && (tipoSelecaoAtual === "pasta" || tipoSelecaoAtual === "cbr")) {
        botaoAcao.disabled = !habilitado;
    }
};

const ehImagem = (nomeArquivo) => {
    const extensao = nomeArquivo.toLowerCase().match(/\.[^/.]+$/)?.[0] || "";
    return EXTENSOES_IMAGEM.includes(extensao);
};

const mudarTipoSelecao = (novoTipo) => {
    if (tipoSelecaoAtual && tipoSelecaoAtual !== novoTipo) {
        mostrarMensagem(`✗ Não é possível misturar seleções. Limpe primeiro.`, "erro");
        return false;
    }
    tipoSelecaoAtual = novoTipo;
    atualizarBotaoPrincipal();
    return true;
};

const limparTipoSelecao = () => {
    tipoSelecaoAtual = null;
    cbzsCarregados = [];
    imagensDisponiveis = [];
    indiceImagemAtual = 0;
    pastaSelecionadaAtual = null;
    limparVisualizacao();
    limparCamposRenomeacao();
    setEdicaoHabilitada(false);
    atualizarBotaoPrincipal();
};

const atualizarBotaoPrincipal = () => {
    const botaoPrincipal = document.querySelector("#botao-acao-principal");
    const botaoVisualizar = document.querySelector("#botao-visualizar");
    const botaoRenomear = document.querySelector("#botao-renomear");
    const containerNomeCBZ = document.querySelector("#container-nome-cbz");

    if (!botaoPrincipal) return;

    if (tipoSelecaoAtual === "pasta") {
        botaoPrincipal.textContent = "Gerar CBZ";
        botaoPrincipal.innerHTML = '<i class="fas fa-file-archive"></i> Gerar CBZ';
        botaoPrincipal.style.display = "block";
        if (containerNomeCBZ) containerNomeCBZ.style.display = "none";
        if (botaoVisualizar) botaoVisualizar.style.display = "block";
        if (botaoRenomear) botaoRenomear.style.display = "block";
    } else if (tipoSelecaoAtual === "cbr") {
        botaoPrincipal.textContent = "Converter para CBZ";
        botaoPrincipal.innerHTML = '<i class="fas fa-exchange-alt"></i> Converter para CBZ';
        botaoPrincipal.style.display = "block";
        if (containerNomeCBZ) containerNomeCBZ.style.display = "none";
        if (botaoVisualizar) botaoVisualizar.style.display = "block";
        if (botaoRenomear) botaoRenomear.style.display = "block";
    } else if (tipoSelecaoAtual === "cbz") {
        botaoPrincipal.textContent = `Criar Omnibus (${cbzsCarregados.length} selecionados)`;
        botaoPrincipal.innerHTML = `<i class="fas fa-book"></i> Criar Omnibus (${cbzsCarregados.length})`;
        botaoPrincipal.style.display = cbzsCarregados.length >= 2 ? "block" : "none";
        if (containerNomeCBZ) containerNomeCBZ.style.display = "block";
        if (botaoVisualizar) botaoVisualizar.style.display = "none";
        if (botaoRenomear) botaoRenomear.style.display = "none";
    } else {
        botaoPrincipal.style.display = "none";
        if (containerNomeCBZ) containerNomeCBZ.style.display = "none";
        if (botaoVisualizar) botaoVisualizar.style.display = "block";
        if (botaoRenomear) botaoRenomear.style.display = "block";
    }
};

const aplicarTema = (tema, botao) => {
    const ehEscuro = tema === "dark";
    document.body.classList.toggle("dark-mode", ehEscuro);

    if (!botao) {
        return;
    }

    botao.setAttribute("aria-pressed", String(ehEscuro));

    const icon = botao.querySelector("i");
    if (icon) {
        icon.classList.remove("fa-moon", "fa-sun");
        icon.classList.add(ehEscuro ? "fa-sun" : "fa-moon");
    }
};

const inicializarMenuSelecao = () => {
    const botaoPrincipal = document.querySelector("#botao-selecionar-principal");
    const menu = document.querySelector("#menu-selecao");
    const overlay = document.querySelector("#overlay-menu");
    const opcaoPasta = document.querySelector("#opcao-pasta");
    const opcaoCBR = document.querySelector("#opcao-cbr");
    const opcaoCBZ = document.querySelector("#opcao-cbz");

    if (!botaoPrincipal || !menu) return;

    const fecharMenu = () => {
        menu.style.display = "none";
        if (overlay) overlay.style.display = "none";
    };

    const abrirMenu = () => {
        menu.style.display = "block";
        if (overlay) overlay.style.display = "block";
    };

    botaoPrincipal.addEventListener("click", (e) => {
        e.preventDefault();
        
        if (tipoSelecaoAtual === null) {
            // Nenhum tipo selecionado, mostrar menu
            abrirMenu();
        } else if (tipoSelecaoAtual === "pasta") {
            // Pasta já selecionada, abrir input
            const inputPasta = document.querySelector("#entrada-pasta");
            if (inputPasta) inputPasta.click();
        } else if (tipoSelecaoAtual === "cbr") {
            // CBR já selecionado, abrir input
            const inputCBR = document.querySelector("#entrada-cbr");
            if (inputCBR) inputCBR.click();
        } else if (tipoSelecaoAtual === "cbz") {
            // CBZ já selecionado, abrir input
            const inputCBZ = document.querySelector("#entrada-cbz");
            if (inputCBZ) inputCBZ.click();
        }
    });

    if (opcaoPasta) {
        opcaoPasta.addEventListener("click", (e) => {
            e.preventDefault();
            fecharMenu();
            if (!mudarTipoSelecao("pasta")) return;
            const inputPasta = document.querySelector("#entrada-pasta");
            if (inputPasta) inputPasta.click();
        });
    }

    if (opcaoCBR) {
        opcaoCBR.addEventListener("click", (e) => {
            e.preventDefault();
            fecharMenu();
            if (!mudarTipoSelecao("cbr")) return;
            const inputCBR = document.querySelector("#entrada-cbr");
            if (inputCBR) inputCBR.click();
        });
    }

    if (opcaoCBZ) {
        opcaoCBZ.addEventListener("click", (e) => {
            e.preventDefault();
            fecharMenu();
            if (!mudarTipoSelecao("cbz")) return;
            const inputCBZ = document.querySelector("#entrada-cbz");
            if (inputCBZ) inputCBZ.click();
        });
    }

    if (overlay) {
        overlay.addEventListener("click", fecharMenu);
    }

    // Fechar menu ao clicar fora
    document.addEventListener("click", (e) => {
        if (!botaoPrincipal.contains(e.target) && !menu.contains(e.target)) {
            fecharMenu();
        }
    });
};

const inicializarAlternanciaAuxTema = () => {
    const botaoAlternancia = document.querySelector("#alternar-tema");
    let temaSalvo = null;

    try {
        temaSalvo = localStorage.getItem(CHAVE_TEMA);
    } catch (error) {
        temaSalvo = null;
    }
    const temaInicial = temaSalvo || "dark";

    aplicarTema(temaInicial, botaoAlternancia);

    if (!botaoAlternancia) {
        return;
    }

    botaoAlternancia.addEventListener("click", () => {
        const proximoTema = document.body.classList.contains("dark-mode") ? "light" : "dark";
        aplicarTema(proximoTema, botaoAlternancia);
        try {
            localStorage.setItem(CHAVE_TEMA, proximoTema);
        } catch (error) {
            return;
        }
    });
};

const inicializarUploadPasta = () => {
    const inputPasta = document.querySelector("#entrada-pasta");

    if (!inputPasta) {
        return;
    }

    inputPasta.addEventListener("change", async (e) => {
        const arquivos = Array.from(e.target.files);

        if (arquivos.length === 0) {
            return;
        }

        // Extrai o nome da pasta raiz do primeiro arquivo
        const nomePastaRaiz = arquivos[0].webkitRelativePath?.split("/")[0];

        if (!nomePastaRaiz) {
            mostrarMensagem("✗ Erro: Selecione uma pasta válida", "erro");
            limparTipoSelecao();
            return;
        }

        const formData = new FormData();
        
        arquivos.forEach((arquivo) => {
            formData.append("files", arquivo, arquivo.webkitRelativePath || arquivo.name);
        });

        try {
            mostrarMensagem("Enviando pasta...", "info");

            const response = await fetch(`${BASE_API}/upload?folderName=${encodeURIComponent(nomePastaRaiz)}`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Erro ao enviar pasta");
            }

            const dados = await response.json();
            mostrarMensagem(`✓ ${dados.message}`, "sucesso");

            inputPasta.value = "";
            carregarPastas();
        } catch (error) {
            mostrarMensagem(`✗ Erro: ${error.message}`, "erro");
            limparTipoSelecao();
        }
    });
};

const lerArquivoEntrada = (entry) => new Promise((resolve, reject) => {
    entry.file(resolve, reject);
});

const lerEntriesDiretorio = (reader) => new Promise((resolve) => {
    reader.readEntries(resolve);
});

const coletarArquivosDiretorio = async (dirEntry, caminhoRelativo = "") => {
    const reader = dirEntry.createReader();
    const arquivos = [];

    while (true) {
        const entries = await lerEntriesDiretorio(reader);
        if (!entries.length) break;

        for (const entry of entries) {
            if (entry.isFile) {
                const file = await lerArquivoEntrada(entry);
                arquivos.push({ file, caminho: `${caminhoRelativo}${file.name}` });
            } else if (entry.isDirectory) {
                const subArquivos = await coletarArquivosDiretorio(entry, `${caminhoRelativo}${entry.name}/`);
                arquivos.push(...subArquivos);
            }
        }
    }

    return arquivos;
};

const enviarPastaArraste = async (nomePasta, arquivos) => {
    const formData = new FormData();
    arquivos.forEach(({ file, caminho }) => {
        formData.append("files", file, `${nomePasta}/${caminho}`);
    });

    const response = await fetch(`${BASE_API}/upload?folderName=${encodeURIComponent(nomePasta)}`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Erro ao enviar pasta");
    }
};

const inicializarDragDropPastas = () => {
    const explorador = document.querySelector(".explorador-arquivos");
    if (!explorador) return;

    let contadorArraste = 0;

    const onDragEnter = (e) => {
        e.preventDefault();
        contadorArraste += 1;
        explorador.classList.add("estan-arrastando");
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        contadorArraste = Math.max(0, contadorArraste - 1);
        if (contadorArraste === 0) {
            explorador.classList.remove("estan-arrastando");
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
    };

    const onDrop = async (e) => {
        e.preventDefault();
        contadorArraste = 0;
        explorador.classList.remove("estan-arrastando");

        const items = Array.from(e.dataTransfer?.items || []);
        if (!items.length) return;

        if (!mudarTipoSelecao("pasta")) {
            return;
        }

        const entradas = items
            .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
            .filter(Boolean);

        const pastas = entradas.filter((entry) => entry.isDirectory);
        if (pastas.length === 0) {
            mostrarMensagem("Erro: Solte uma ou mais pastas", "erro");
            return;
        }

        try {
            mostrarMensagem(`Enviando ${pastas.length} pasta(s)...`, "info");
            for (const pasta of pastas) {
                const arquivos = await coletarArquivosDiretorio(pasta);
                if (arquivos.length === 0) continue;
                await enviarPastaArraste(pasta.name, arquivos);
            }

            await carregarPastas();
            mostrarMensagem(`${pastas.length} pasta(s) enviada(s)`, "sucesso");
        } catch (error) {
            mostrarMensagem(`Erro ao enviar pastas: ${error.message}`, "erro");
        }
    };

    explorador.addEventListener("dragenter", onDragEnter);
    explorador.addEventListener("dragleave", onDragLeave);
    explorador.addEventListener("dragover", onDragOver);
    explorador.addEventListener("drop", onDrop);
};

const limparUploadsAoCarregar = async () => {
    try {
        await fetch(`${BASE_API}/clear-uploads`, {
            method: "POST",
        });
        await fetch(`${BASE_API}/clear-output`, {
            method: "POST",
        });
        carregarPastas();
    } catch (error) {
        console.log("Pastalhas limpas ao carregar a página");
    }
};

const limparUploadsManual = async () => {
    try {
        await fetch(`${BASE_API}/clear-uploads`, {
            method: "POST",
        });
        await fetch(`${BASE_API}/clear-output`, {
            method: "POST",
        });
        await carregarPastas();
        mostrarMensagem("Uploads limpos", "sucesso");
    } catch (error) {
        mostrarMensagem("Erro ao limpar uploads", "erro");
    }
};

const carregarPastas = async () => {
    try {
        const response = await fetch(`${BASE_API}/folders`);
        const dados = await response.json();
        renderizarPastas(dados.folders);
    } catch (error) {
        console.error("Erro ao carregar pastas:", error);
    }
};

const renderizarPastas = (pastas) => {
    const listaArquivos = document.querySelector(".lista-arquivos");
    if (!listaArquivos) return;

    listaArquivos.innerHTML = "";
    pastasDisponiveis = Array.isArray(pastas) ? pastas : [];

    if (pastas.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.style.color = "var(--texto-mudo)";
        emptyItem.style.padding = "0.5rem";
        emptyItem.textContent = "Nenhuma pasta salva";
        listaArquivos.appendChild(emptyItem);
        return;
    }

    pastas.forEach((pasta) => {
        const folderGroup = document.createElement("div");
        folderGroup.className = "folder-group";
        folderGroup.dataset.folderName = pasta.name;

        const folderHeader = document.createElement("div");
        folderHeader.className = "folder-header";

        const caretBtn = document.createElement("button");
        caretBtn.className = "folder-caret-btn";
        caretBtn.innerHTML = '<i class="fas fa-chevron-right folder-caret"></i>';
        caretBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            expandirMinimiazarPasta(folderGroup);
        });

        const folderToggle = document.createElement("button");
        folderToggle.className = "folder-toggle";
        folderToggle.innerHTML = `<i class="fas fa-folder"></i><span class="folder-name">${pasta.name}</span><span class="folder-count">${pasta.files.length}</span>`;
        folderToggle.addEventListener("click", () => {
            expandirMinimiazarPasta(folderGroup);
        });

        const removeBtn = document.createElement("button");
        removeBtn.className = "folder-remove";
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await deletarPasta(pasta.name);
        });

        folderHeader.appendChild(caretBtn);
        folderHeader.appendChild(folderToggle);
        folderHeader.appendChild(removeBtn);
        folderGroup.appendChild(folderHeader);

        const filesList = document.createElement("ul");
        filesList.style.display = "none";
        filesList.style.paddingLeft = "2rem";
        filesList.style.marginTop = "0.3rem";

        pasta.files.forEach((arquivo) => {
            const fileItem = document.createElement("li");
            fileItem.style.listStyle = "none";
            fileItem.style.padding = "0.3rem 0.5rem";
            fileItem.style.fontSize = "var(--fonte-xs)";
            fileItem.style.color = "var(--texto-secundario)";
            fileItem.style.overflow = "hidden";
            fileItem.style.textOverflow = "ellipsis";
            fileItem.style.whiteSpace = "nowrap";
            fileItem.dataset.arquivo = arquivo;

            if (ehImagem(arquivo)) {
                fileItem.style.cursor = "pointer";
                fileItem.style.transition = "background-color 0.2s ease";
                fileItem.innerHTML = `<i class="fas fa-image"></i> ${arquivo}`;
                fileItem.addEventListener("click", () => {
                    selecionarImagem(pasta.name, arquivo);
                });
                fileItem.addEventListener("mouseenter", () => {
                    fileItem.style.backgroundColor = "var(--fundo-hover)";
                });
                fileItem.addEventListener("mouseleave", () => {
                    fileItem.style.backgroundColor = "transparent";
                });
            } else {
                fileItem.innerHTML = `<i class="fas fa-file"></i> ${arquivo}`;
            }

            filesList.appendChild(fileItem);
        });

        folderGroup.appendChild(filesList);
        listaArquivos.appendChild(folderGroup);
    });

    atualizarContadorArquivos();
    atualizarBotaoGerarTodos();

    if (tipoSelecaoAtual === "pasta" || tipoSelecaoAtual === "cbr") {
        const pastaAberta = document.querySelector(".folder-group.is-open");
        if (!pastaAberta) {
            resetarSelecaoPasta();
        } else {
            setEdicaoHabilitada(true);
        }
    }
};

const expandirMinimiazarPasta = (folderGroup) => {
    const listaArquivos = document.querySelector(".lista-arquivos");
    
    // Fechar todos os outros
    document.querySelectorAll(".folder-group").forEach((group) => {
        if (group !== folderGroup) {
            group.classList.remove("is-open");
            const filesList = group.querySelector("ul");
            if (filesList) filesList.style.display = "none";
            const toggle = group.querySelector(".folder-toggle");
            if (toggle) toggle.classList.remove("is-active");
        }
    });

    // Toggle o atual
    folderGroup.classList.toggle("is-open");
    const filesList = folderGroup.querySelector("ul");
    const toggle = folderGroup.querySelector(".folder-toggle");

    if (folderGroup.classList.contains("is-open")) {
        filesList.style.display = "block";
        toggle.classList.add("is-active");

        // Mostrar o primeiro arquivo de imagem da pasta
        const nomePasta = folderGroup.dataset.folderName;
        if (pastaSelecionadaAtual && pastaSelecionadaAtual !== nomePasta) {
            limparPreviewRenomeacao();
        }
        pastaSelecionadaAtual = nomePasta;
        setEdicaoHabilitada(true);
        const primeiroItem = filesList.querySelector("li");
        
        if (primeiroItem) {
            // Procurar a primeira imagem
            let primeiraImagem = primeiroItem;
            if (!ehImagem(primeiroItem.dataset.arquivo)) {
                // Se o primeiro não é imagem, procurar a primeira imagem
                const todosItems = filesList.querySelectorAll("li");
                for (let item of todosItems) {
                    if (ehImagem(item.dataset.arquivo)) {
                        primeiraImagem = item;
                        break;
                    }
                }
            }
            
            // Se encontrou imagem, selecionar ela
            if (primeiraImagem && ehImagem(primeiraImagem.dataset.arquivo)) {
                selecionarImagem(nomePasta, primeiraImagem.dataset.arquivo);
            }
        }
    } else {
        filesList.style.display = "none";
        toggle.classList.remove("is-active");
        const pastaAberta = document.querySelector(".folder-group.is-open");
        if (!pastaAberta) {
            resetarSelecaoPasta();
        }
    }
};

const deletarPasta = async (nomePasta) => {
    if (!confirm(`Tem certeza que quer deletar a pasta "${nomePasta}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${BASE_API}/folders/${encodeURIComponent(nomePasta)}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Erro ao deletar pasta");
        }

        mostrarMensagem(`✓ Pasta ${nomePasta} deletada`, "sucesso");
        
        // Se a pasta deletada era a que estava sendo visualizada, limpar a visualização
        if (imagensDisponiveis.length > 0 && imagensDisponiveis[0].pasta === nomePasta) {
            resetarSelecaoPasta();
        }
        
        carregarPastas();
    } catch (error) {
        mostrarMensagem(`✗ Erro: ${error.message}`, "erro");
    }
};

const limparVisualizacao = () => {
    const imgElement = document.querySelector(".imagem-visualizacao");
    const placeholderElement = document.querySelector(".placeholder-visualizacao");
    const nomeVisualizacao = document.querySelector("#nome-visualizacao");
    const pastaVisualizacao = document.querySelector("#pasta-visualizacao");

    if (imgElement) {
        imgElement.src = "";
        imgElement.setAttribute("hidden", "");
        imgElement.style.display = "none";
    }

    if (placeholderElement) {
        placeholderElement.removeAttribute("hidden");
        placeholderElement.style.display = "block";
    }

    if (nomeVisualizacao) {
        nomeVisualizacao.textContent = "Nenhum arquivo selecionado";
    }

    if (pastaVisualizacao) {
        pastaVisualizacao.textContent = "";
    }
};

const resetarSelecaoPasta = () => {
    imagensDisponiveis = [];
    indiceImagemAtual = 0;
    pastaSelecionadaAtual = null;
    limparVisualizacao();
    limparPreviewRenomeacao();
    if (tipoSelecaoAtual === "pasta" || tipoSelecaoAtual === "cbr") {
        setEdicaoHabilitada(false);
    }
};

const atualizarContadorArquivos = () => {
    const listaArquivos = document.querySelector(".lista-arquivos");
    let totalArquivos = 0;

    document.querySelectorAll(".folder-count").forEach((count) => {
        totalArquivos += parseInt(count.textContent) || 0;
    });

    const fileCountSpan = document.querySelector("#file-count");
    if (fileCountSpan) {
        fileCountSpan.textContent = `${totalArquivos} arquivo${totalArquivos !== 1 ? "s" : ""}`;
    }
};

const selecionarImagem = (nomePasta, nomeArquivo) => {
    // Pegar APENAS as imagens da pasta selecionada
    imagensDisponiveis = [];
    let imagemEncontrada = false;

    document.querySelectorAll(".folder-group").forEach((folderGroup) => {
        const pasta = folderGroup.dataset.folderName;
        
        // Só processar a pasta selecionada
        if (pasta === nomePasta) {
            const filesList = folderGroup.querySelector("ul");

            if (filesList) {
                filesList.querySelectorAll("li").forEach((fileItem) => {
                    const arquivo = fileItem.dataset.arquivo;

                    if (ehImagem(arquivo)) {
                        imagensDisponiveis.push({
                            pasta,
                            arquivo: arquivo,
                            elemento: fileItem,
                        });

                        if (arquivo === nomeArquivo) {
                            imagemEncontrada = true;
                            indiceImagemAtual = imagensDisponiveis.length - 1;
                        }
                    }
                });
            }
        }
    });

    if (imagemEncontrada) {
        mostrarImagemAtual();
    }
};

const mostrarImagemAtual = () => {
    if (imagensDisponiveis.length === 0) {
        return;
    }

    const itemAtual = imagensDisponiveis[indiceImagemAtual];
    
    // Converter barras invertidas (Windows) para forward slashes (URL)
    const caminhoURL = itemAtual.arquivo.replace(/\\/g, "/");
    // Encoder cada parte do path (contorna o problema do # ser truncado)
    const partesEncodadas = caminhoURL.split("/").map(parte => encodeURIComponent(parte)).join("/");
    const caminhoCompleto = `/uploads/${partesEncodadas}`;

    const imgElement = document.querySelector(".imagem-visualizacao");
    const placeholderElement = document.querySelector(".placeholder-visualizacao");
    const nomeVisualizacao = document.querySelector("#nome-visualizacao");
    const pastaVisualizacao = document.querySelector("#pasta-visualizacao");

    if (imgElement) {
        imgElement.src = caminhoCompleto;
        imgElement.removeAttribute("hidden");
        imgElement.style.display = "block";
    }

    if (placeholderElement) {
        placeholderElement.setAttribute("hidden", "");
        placeholderElement.style.display = "none";
    }

    if (nomeVisualizacao) {
        nomeVisualizacao.textContent = itemAtual.arquivo;
    }

    if (pastaVisualizacao) {
        pastaVisualizacao.textContent = `📁 ${itemAtual.pasta}`;
    }
};

const mostrarProximaImagem = () => {
    if (imagensDisponiveis.length <= 1) return;
    indiceImagemAtual = (indiceImagemAtual + 1) % imagensDisponiveis.length;
    mostrarImagemAtual();
};

const mostrarImagemAnterior = () => {
    if (imagensDisponiveis.length <= 1) return;
    indiceImagemAtual = (indiceImagemAtual - 1 + imagensDisponiveis.length) % imagensDisponiveis.length;
    mostrarImagemAtual();
};

const inicializarNavegacaoImagens = () => {
    // Navegação com teclado (setas, A, S)
    document.addEventListener("keydown", (e) => {
        if (imagensDisponiveis.length === 0) return;

        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            mostrarProximaImagem();
        } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            mostrarImagemAnterior();
        }
    });

    // Navegação com scroll do mouse
    const visualizacaoConteudo = document.querySelector(".visualizacao-conteudo");
    if (visualizacaoConteudo) {
        visualizacaoConteudo.addEventListener("wheel", (e) => {
            if (imagensDisponiveis.length === 0) return;
            e.preventDefault();

            if (e.deltaY > 0) {
                mostrarProximaImagem();
            } else if (e.deltaY < 0) {
                mostrarImagemAnterior();
            }
        }, { passive: false });
    }
};

const mostrarMensagem = (texto, tipo) => {
    const elemento = document.querySelector("#mensagem-status");
    if (!elemento) return;

    elemento.textContent = texto;
    elemento.className = `mensagem-status ${tipo === "sucesso" ? "sucesso" : tipo === "erro" ? "erro" : "info"}`;
    elemento.classList.remove("oculto");

    if (tipo !== "info") {
        setTimeout(() => {
            elemento.classList.add("oculto");
        }, 3000);
    }
};

const atualizarBotaoGerarTodos = () => {
    const botao = document.querySelector("#botao-gerar-todos");
    if (!botao) return;
    botao.disabled = pastasDisponiveis.length === 0;
};

const renomearArquivosParaPasta = async (nomePasta, titulo, anoNum, edicaoNum) => {
    try {
        const response = await fetch(`${BASE_API}/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                folderName: nomePasta,
                title: titulo,
                year: anoNum,
                edition: edicaoNum,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Erro ao renomear");
        }

        return true;
    } catch (error) {
        mostrarMensagem(`✖ Erro ao renomear ${nomePasta}: ${error.message}`, "erro");
        return false;
    }
};

const gerarCBZParaPasta = async (nomePasta, titulo, anoNum, edicaoNum) => {
    try {
        const response = await fetch(`${BASE_API}/generate-cbz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                folderName: nomePasta,
                title: titulo,
                year: anoNum,
                edition: edicaoNum,
            }),
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || "Erro ao gerar CBZ");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${titulo} (${anoNum}) #${String(edicaoNum).padStart(2, "0")}.cbz`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return true;
    } catch (error) {
        mostrarMensagem(`✖ Erro ao gerar CBZ de ${nomePasta}: ${error.message}`, "erro");
        return false;
    }
};

const gerarConverterTodos = async () => {
    if (pastasDisponiveis.length === 0) {
        mostrarMensagem("✖ Nenhuma pasta para processar", "erro");
        return;
    }

    const metadados = obterMetadadosObrigatorios();
    if (!metadados) {
        return;
    }

    const { titulo, anoNum, edicaoNum } = metadados;
    const botaoGerarTodos = document.querySelector("#botao-gerar-todos");
    if (botaoGerarTodos) botaoGerarTodos.disabled = true;
    setEdicaoHabilitada(false);

    let falhou = false;
    for (let i = 0; i < pastasDisponiveis.length; i++) {
        const pasta = pastasDisponiveis[i];
        const edicaoAtual = edicaoNum + i;
        mostrarMensagem(`Processando ${i + 1}/${pastasDisponiveis.length}: ${pasta.name}`, "info");

        const renomeou = await renomearArquivosParaPasta(pasta.name, titulo, anoNum, edicaoAtual);
        if (!renomeou) {
            falhou = true;
            break;
        }

        const gerou = await gerarCBZParaPasta(pasta.name, titulo, anoNum, edicaoAtual);
        if (!gerou) {
            falhou = true;
            break;
        }
    }

    const pastaAberta = document.querySelector(".folder-group.is-open");
    setEdicaoHabilitada(Boolean(pastaAberta));
    if (botaoGerarTodos) botaoGerarTodos.disabled = pastasDisponiveis.length === 0;
    if (!falhou) {
        mostrarMensagem("✓ Processamento em lote finalizado", "sucesso");
    }
};

const visualizarRenomeacao = () => {
    const metadados = obterMetadadosObrigatorios();
    if (!metadados) {
        return;
    }
    const { titulo, anoNum, edicaoNum } = metadados;

    if (imagensDisponiveis.length === 0) {
        mostrarMensagem("✗ Selecione uma pasta com imagens", "erro");
        return;
    }

    // Gerar preview de renomeação
    const listaRenomeacao = document.querySelector(".visualizacao-renomeacao");
    if (!listaRenomeacao) return;

    listaRenomeacao.innerHTML = "";

    imagensDisponiveis.forEach((img, index) => {
        const ext = img.arquivo.match(/\.[^/.]+$/)?.[0] || "";
        const novoNome = `${titulo} (${anoNum}) #${String(edicaoNum).padStart(2, "0")} #${String(index + 1).padStart(3, "0")}${ext}`;

        const item = document.createElement("li");
        item.style.padding = "0.5rem";
        item.style.fontSize = "var(--fonte-xs)";
        item.style.borderBottom = "1px solid var(--cor-borda)";
        item.style.display = "flex";
        item.style.gap = "0.5rem";
        item.style.alignItems = "center";

        const nomeAntigoEl = document.createElement("span");
        nomeAntigoEl.textContent = img.arquivo.split("\\").pop();
        nomeAntigoEl.style.color = "var(--texto-mudo)";
        nomeAntigoEl.style.textDecoration = "line-through";
        nomeAntigoEl.style.flex = "1";

        const arrowEl = document.createElement("span");
        arrowEl.textContent = "→";
        arrowEl.style.color = "var(--verde-primario)";

        const nomeNovoEl = document.createElement("span");
        nomeNovoEl.textContent = novoNome;
        nomeNovoEl.style.color = "var(--verde-primario)";
        nomeNovoEl.style.fontWeight = "600";
        nomeNovoEl.style.flex = "1";

        item.appendChild(nomeAntigoEl);
        item.appendChild(arrowEl);
        item.appendChild(nomeNovoEl);
        listaRenomeacao.appendChild(item);
    });

    const contagem = document.querySelector("#contagem-visualizacao");
    if (contagem) {
        contagem.textContent = `(${imagensDisponiveis.length} arquivo${imagensDisponiveis.length !== 1 ? "s" : ""})`;
    }

    mostrarMensagem(`✓ Preview gerado para ${imagensDisponiveis.length} arquivo(s)`, "sucesso");
};

const renomearArquivos = async () => {
    const metadados = obterMetadadosObrigatorios();
    if (!metadados) {
        return;
    }
    const { titulo, anoNum, edicaoNum } = metadados;

    if (imagensDisponiveis.length === 0) {
        mostrarMensagem("✗ Selecione uma pasta com imagens", "erro");
        return;
    }

    const nomePasta = imagensDisponiveis[0].pasta;

    try {
        mostrarMensagem("Renomeando arquivos...", "info");

        const response = await fetch(`${BASE_API}/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                folderName: nomePasta,
                title: titulo,
                year: anoNum,
                edition: edicaoNum,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Erro ao renomear");
        }

        const dados = await response.json();
        mostrarMensagem(`✓ ${dados.renamed} arquivo(s) renomeado(s)`, "sucesso");
    } catch (error) {
        mostrarMensagem(`✗ Erro: ${error.message}`, "erro");
    }
};

const limparPreviewRenomeacao = () => {
    const listaRenomeacao = document.querySelector(".visualizacao-renomeacao");
    if (listaRenomeacao) {
        listaRenomeacao.innerHTML = "";
    }

    const contagem = document.querySelector("#contagem-visualizacao");
    if (contagem) {
        contagem.textContent = "(0 arquivos)";
    }
};

const limparCamposRenomeacao = () => {
    document.querySelector("#novo-titulo").value = "";
    document.querySelector("#novo-ano").value = "";
    document.querySelector("#nova-edicao").value = "";
    document.querySelector("#nome-cbz-convertido").value = "";

    limparPreviewRenomeacao();
};

const gerarCBZ = async () => {
    if (imagensDisponiveis.length === 0) {
        mostrarMensagem("\u2716 Selecione uma pasta com imagens", "erro");
        return;
    }

    const nomePasta = imagensDisponiveis[0].pasta;

    const metadados = obterMetadadosObrigatorios();
    if (!metadados) {
        return;
    }
    const { titulo, anoNum, edicaoNum } = metadados;
    const nomeArquivoCBZ = `${titulo} (${anoNum}) #${String(edicaoNum).padStart(2, "0")}`;

    try {
        mostrarMensagem("Gerando CBZ...", "info");

        const response = await fetch(`${BASE_API}/generate-cbz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                folderName: nomePasta,
                title: titulo,
                year: anoNum,
                edition: edicaoNum
            }),
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || "Erro ao gerar CBZ");
        }

        // Fazer download - resposta é o arquivo binary (não JSON)
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nomeArquivoCBZ}.cbz`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        mostrarMensagem("✓ CBZ gerado e baixado", "sucesso");
    } catch (error) {
        mostrarMensagem(`✗ Erro: ${error.message}`, "erro");
    }
};

const inicializarBotoesRenomeacao = () => {
    const botaoVisualizar = document.querySelector("#botao-visualizar");
    const botaoRenomear = document.querySelector("#botao-renomear");
    const botaoLimpar = document.querySelector("#botao-limpar");
    const botaoAcaoPrincipal = document.querySelector("#botao-acao-principal");
    const botaoGerarTodos = document.querySelector("#botao-gerar-todos");

    if (botaoVisualizar) botaoVisualizar.addEventListener("click", visualizarRenomeacao);
    if (botaoRenomear) botaoRenomear.addEventListener("click", renomearArquivos);
    if (botaoLimpar) botaoLimpar.addEventListener("click", async () => {
        limparTipoSelecao();
        await limparUploadsManual();
    });
    if (botaoGerarTodos) botaoGerarTodos.addEventListener("click", gerarConverterTodos);
    
    if (botaoAcaoPrincipal) {
        botaoAcaoPrincipal.addEventListener("click", () => {
            if (tipoSelecaoAtual === "pasta" || tipoSelecaoAtual === "cbr") {
                // Para pasta e CBR extraído, usar a mesma função
                gerarCBZ();
            } else if (tipoSelecaoAtual === "cbz") {
                criarOmnibus();
            }
        });
    }
};

const inicializarUploadCBR = () => {
    const inputCBR = document.querySelector("#entrada-cbr");

    if (!inputCBR) {
        return;
    }

    inputCBR.addEventListener("change", async (e) => {
        const arquivos = Array.from(e.target.files);

        if (arquivos.length === 0) {
            return;
        }

        const cbrsValidos = arquivos.filter((arquivo) => arquivo.name.toLowerCase().endsWith(".cbr"));
        if (cbrsValidos.length === 0) {
            mostrarMensagem("✗ Selecione um ou mais arquivos .cbr válidos", "erro");
            inputCBR.value = "";
            limparTipoSelecao();
            return;
        }

        try {
            mostrarMensagem(`Extraindo ${cbrsValidos.length} CBR(s)...`, "info");

            for (let i = 0; i < cbrsValidos.length; i++) {
                const arquivo = cbrsValidos[i];
                const formData = new FormData();
                formData.append("file", arquivo);

                const response = await fetch(`${BASE_API}/convert-cbr`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Erro ao extrair CBR");
                }
            }

            await carregarPastas();
            mostrarMensagem(`✓ ${cbrsValidos.length} CBR(s) extraído(s)`, "sucesso");
            inputCBR.value = "";
        } catch (error) {
            mostrarMensagem(`✗ Erro: ${error.message}`, "erro");
            limparTipoSelecao();
            inputCBR.value = "";
        }
    });
};

const inicializarUploadCBZ = () => {
    const inputCBZ = document.querySelector("#entrada-cbz");

    if (!inputCBZ) {
        return;
    }

    inputCBZ.addEventListener("change", async (e) => {
        const arquivos = Array.from(e.target.files);

        if (arquivos.length === 0) {
            return;
        }

        // Validar arquivos
        const cbzsValidos = arquivos.filter(arquivo => 
            arquivo.name.toLowerCase().endsWith(".cbz")
        );

        if (cbzsValidos.length === 0) {
            mostrarMensagem("✗ Selecione um ou mais arquivos .cbz válidos", "erro");
            inputCBZ.value = "";
            limparTipoSelecao();
            return;
        }

        cbzsCarregados = cbzsValidos.map(arquivo => ({
            nome: arquivo.name,
            arquivo: arquivo,
            tamanho: arquivo.size,
        }));

        mostrarMensagem(`✓ ${cbzsCarregados.length} arquivo(s) CBZ selecionado(s)`, "sucesso");
        atualizarBotaoPrincipal();
        exibirListaCBZsCarregados();

        inputCBZ.value = "";
    });
};

const exibirListaCBZsCarregados = () => {
    const modoRendererizacao = tipoSelecaoAtual === "cbz";
    if (!modoRendererizacao) return;

    const container = document.querySelector(".visualizacao-renomeacao");
    if (!container) return;

    container.innerHTML = "";
    
    cbzsCarregados.forEach((cbz, index) => {
        const item = document.createElement("li");
        item.style.padding = "0.5rem";
        item.style.fontSize = "var(--fonte-xs)";
        item.style.borderBottom = "1px solid var(--cor-borda)";
        item.style.display = "flex";
        item.style.gap = "0.5rem";
        item.style.alignItems = "center";

        const nomeEl = document.createElement("span");
        nomeEl.textContent = `${index + 1}. ${cbz.nome}`;
        nomeEl.style.flex = "1";
        nomeEl.style.color = "var(--verde-primario)";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✕";
        removeBtn.style.background = "none";
        removeBtn.style.border = "none";
        removeBtn.style.color = "var(--vermelho)";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.fontSize = "1.2rem";
        removeBtn.style.padding = "0";
        removeBtn.style.width = "1.5rem";
        removeBtn.style.height = "1.5rem";
        removeBtn.addEventListener("click", () => {
            cbzsCarregados.splice(index, 1);
            exibirListaCBZsCarregados();
            atualizarBotaoPrincipal();
        });

        item.appendChild(nomeEl);
        item.appendChild(removeBtn);
        container.appendChild(item);
    });

    const contagem = document.querySelector("#contagem-visualizacao");
    if (contagem) {
        contagem.textContent = `(${cbzsCarregados.length} arquivo${cbzsCarregados.length !== 1 ? "s" : ""})`;
    }
};

const criarOmnibus = async () => {
    if (cbzsCarregados.length < 2) {
        mostrarMensagem("✗ Selecione pelo menos 2 CBZs", "erro");
        return;
    }

    const nomeCBZ = document.querySelector("#nome-cbz-convertido")?.value.trim();
    if (!nomeCBZ) {
        mostrarMensagem("✗ Informe o nome do Omnibus", "erro");
        return;
    }

    mostrarMensagem("⏳ Função de Omnibus em desenvolvimento", "info");
};

const inicializarResizers = () => {
    const resizers = document.querySelectorAll(".resizer");
    const main = document.querySelector("main");

    resizers.forEach((resizer) => {
        resizer.addEventListener("mousedown", (e) => {
            e.preventDefault();
            document.body.classList.add("resizing");

            const resizerIndex = parseInt(resizer.dataset.resizer);
            const sections = main.querySelectorAll(".explorador-arquivos, .visualizacao, .configuracao-renomeacao");

            if (resizerIndex === 1) {
                // Resizer entre explorador e visualização
                const leftSection = sections[0]; // explorador-arquivos
                const rightSection = sections[1]; // visualização

                const onMouseMove = (moveEvent) => {
                    const mainRect = main.getBoundingClientRect();
                    const newX = moveEvent.clientX - mainRect.left;

                    const leftPercent = (newX / mainRect.width) * 100;
                    const rightPercent = 100 - leftPercent;

                    leftSection.style.flex = `${leftPercent} 1 0`;
                    rightSection.style.flex = `${rightPercent} 1 0`;
                };

                const onMouseUp = () => {
                    document.body.classList.remove("resizing");
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                };

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            } else if (resizerIndex === 2) {
                // Resizer entre visualização e configuração
                const leftSection = sections[1]; // visualização
                const rightSection = sections[2]; // configuracao-renomeacao

                const onMouseMove = (moveEvent) => {
                    const mainRect = main.getBoundingClientRect();
                    const newX = moveEvent.clientX - mainRect.left;

                    // Calcular a posição relativa ao início da primeira seção
                    const leftStart = leftSection.getBoundingClientRect().left - mainRect.left;
                    const newLeftWidth = newX - leftStart;
                    const rightWidth = mainRect.width - newX;

                    const leftPercent = (newLeftWidth / mainRect.width) * 100;
                    const rightPercent = (rightWidth / mainRect.width) * 100;

                    leftSection.style.flex = `${leftPercent} 1 0`;
                    rightSection.style.flex = `${rightPercent} 1 0`;
                };

                const onMouseUp = () => {
                    document.body.classList.remove("resizing");
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                };

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            }
        });
    });
};

document.addEventListener("DOMContentLoaded", () => {
    inicializarAlternanciaAuxTema();
    inicializarMenuSelecao();
    inicializarUploadPasta();
    inicializarDragDropPastas();
    inicializarUploadCBR();
    inicializarUploadCBZ();
    inicializarNavegacaoImagens();
    inicializarBotoesRenomeacao();
    inicializarResizers();
    limparUploadsAoCarregar();
    setEdicaoHabilitada(false);
});
