const CHAVE_TEMA = "comicOrganizerTheme";
const BASE_API = (() => {
    const { protocol, hostname, port } = window.location;
    const isHttp = protocol === "http:" || protocol === "https:";
    if (!isHttp) {
        return "http://localhost:3000/api";
    }
    if (port && port !== "3000") {
        return `${protocol}//${hostname}:3000/api`;
    }
    return "/api";
})();

// Estado de visualização de imagens
let imagensDisponiveis = [];
let indiceImagemAtual = 0;
const EXTENSOES_IMAGEM = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];

const ehImagem = (nomeArquivo) => {
    const extensao = nomeArquivo.toLowerCase().match(/\.[^/.]+$/)?.[0] || "";
    return EXTENSOES_IMAGEM.includes(extensao);
};

const aplicarTema = (tema, botao) => {
    const ehEscuro = tema === "dark";
    document.body.classList.toggle("modo-escuro", ehEscuro);

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
        const proximoTema = document.body.classList.contains("modo-escuro") ? "light" : "dark";
        aplicarTema(proximoTema, botaoAlternancia);
        try {
            localStorage.setItem(CHAVE_TEMA, proximoTema);
        } catch (error) {
            return;
        }
    });
};

const inicializarUploadPasta = () => {
    const botaoSelecionar = document.querySelector("#selecionar-pasta");
    const inputPasta = document.querySelector("#entrada-pasta");
    const mensagemStatus = document.querySelector("#mensagem-status");

    if (!botaoSelecionar || !inputPasta) {
        return;
    }

    botaoSelecionar.addEventListener("click", (e) => {
        e.preventDefault();
        inputPasta.click();
    });

    inputPasta.addEventListener("change", async (e) => {
        const arquivos = Array.from(e.target.files);

        if (arquivos.length === 0) {
            return;
        }

        // Extrai o nome da pasta raiz do primeiro arquivo
        const nomePastaRaiz = arquivos[0].webkitRelativePath?.split("/")[0];

        if (!nomePastaRaiz) {
            mostrarMensagem("✗ Erro: Selecione uma pasta válida", "erro");
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
        }
    });
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
            imagensDisponiveis = [];
            indiceImagemAtual = 0;
            limparVisualizacao();
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

const visualizarRenomeacao = () => {
    const nome = document.querySelector("#novo-titulo")?.value.trim();
    const ano = document.querySelector("#novo-ano")?.value.trim();
    const edicao = document.querySelector("#nova-edicao")?.value.trim();

    // Validações
    if (!nome) {
        mostrarMensagem("✗ Nome obrigatório", "erro");
        return;
    }

    const anoNum = parseInt(ano) || new Date().getFullYear();
    if (anoNum < 1938) {
        mostrarMensagem("✗ Ano deve ser >= 1938", "erro");
        return;
    }

    const edicaoNum = parseInt(edicao) || 1;

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
        const novoNome = `${nome} (${anoNum}) #${String(edicaoNum).padStart(2, "0")} - ${String(index + 1).padStart(3, "0")}${ext}`;

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
    const nome = document.querySelector("#novo-titulo")?.value.trim();
    const ano = document.querySelector("#novo-ano")?.value.trim();
    const edicao = document.querySelector("#nova-edicao")?.value.trim();

    if (!nome) {
        mostrarMensagem("✗ Nome obrigatório", "erro");
        return;
    }

    const anoNum = parseInt(ano) || new Date().getFullYear();
    if (anoNum < 1938) {
        mostrarMensagem("✗ Ano deve ser >= 1938", "erro");
        return;
    }

    const edicaoNum = parseInt(edicao) || 1;

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
                title: nome,
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

const limparCamposRenomeacao = () => {
    document.querySelector("#novo-titulo").value = "";
    document.querySelector("#novo-ano").value = "";
    document.querySelector("#nova-edicao").value = "";

    const listaRenomeacao = document.querySelector(".visualizacao-renomeacao");
    if (listaRenomeacao) {
        listaRenomeacao.innerHTML = "";
    }

    const contagem = document.querySelector("#contagem-visualizacao");
    if (contagem) {
        contagem.textContent = "(0 arquivos)";
    }
};

const gerarCBZ = async () => {
    if (imagensDisponiveis.length === 0) {
        mostrarMensagem("✗ Selecione uma pasta com imagens", "erro");
        return;
    }

    const nomePasta = imagensDisponiveis[0].pasta;

    try {
        mostrarMensagem("Gerando CBZ...", "info");

        const response = await fetch(`${BASE_API}/generate-cbz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderName: nomePasta }),
        });

        if (!response.ok) {
            throw new Error("Erro ao gerar CBZ");
        }

        // Fazer download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nomePasta}.cbz`;
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
    const botaoGerarCBZ = document.querySelector("#botao-gerar-cbz");

    if (botaoVisualizar) botaoVisualizar.addEventListener("click", visualizarRenomeacao);
    if (botaoRenomear) botaoRenomear.addEventListener("click", renomearArquivos);
    if (botaoLimpar) botaoLimpar.addEventListener("click", limparCamposRenomeacao);
    if (botaoGerarCBZ) botaoGerarCBZ.addEventListener("click", gerarCBZ);
};

document.addEventListener("DOMContentLoaded", () => {
    inicializarAlternanciaAuxTema();
    inicializarUploadPasta();
    inicializarNavegacaoImagens();
    inicializarBotoesRenomeacao();
    limparUploadsAoCarregar();
});
