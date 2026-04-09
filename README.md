# 📚 Comic Organizer

Aplicação para organizar, renomear e preparar HQs (comics) automaticamente, com suporte a múltiplas pastas, preview de nomes e geração de arquivos `.cbz`.

---

## 🚀 Funcionalidades

* 📂 Upload de múltiplas pastas com imagens

* 🧠 Ordenação inteligente de arquivos (1, 2, 10 corretamente)

* 🔄 Preview de renomeação antes de aplicar

* ✏️ Renomeação automática no padrão:

  ```
  Título (Ano) #01 - 001.jpg
  ```

* 📦 Geração de arquivos `.cbz`

* 🎨 Interface moderna (dark mode)

* ⚡ Processamento rápido em lote

---

## 🧱 Estrutura do Projeto

```
comic-organizer/
│
├── server.js
├── package.json
│
├── src/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── utils/
│   └── config/
│
├── uploads/
├── output/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
└── README.md
```

---

## 🧠 Arquitetura

O projeto segue separação de responsabilidades:

* **Controllers** → recebem requisições
* **Services** → regras de negócio (renomeação, arquivos, zip)
* **Routes** → definição das rotas da API
* **Utils** → funções auxiliares
* **Public** → frontend (interface do usuário)

---

## ⚙️ Tecnologias Utilizadas

* Node.js
* Express
* Multer (upload de arquivos)
* Archiver (geração de `.zip` / `.cbz`)
* HTML, CSS e JavaScript

---

## 📦 Instalação

Clone o repositório:

```bash
git clone https://github.com/seu-usuario/comic-organizer.git
cd comic-organizer
```

Instale as dependências:

```bash
npm install
```

---

## ▶️ Como Executar

Modo padrão:

```bash
node server.js
```

Modo desenvolvimento (recomendado):

```bash
npm run dev
```

Acesse no navegador:

```
http://localhost:3000
```

---

## 📂 Fluxo de Uso

1. Selecione ou arraste pastas com imagens
2. Escolha:

   * Título
   * Edição
3. Clique em **Preview**
4. Confira os novos nomes
5. Clique em **Renomear**
6. (Opcional) Gere o arquivo `.cbz`

---

## 🧩 Padrão de Nome

Os arquivos são renomeados no formato:

```
Título (Ano) #Edição - Página.jpg
```

Exemplo:

```
DC K.O. Guerra do Morcego (2025) #01 - 001.jpg
```

---

## ⚠️ Observações

* Apenas arquivos `.jpg` são processados
* A ordenação é feita de forma numérica
* Recomenda-se testar com arquivos de exemplo antes

---

## 🔥 Melhorias Futuras

* Drag & Drop completo
* Suporte a mais formatos (PNG, WEBP)
* Sistema de desfazer (undo)
* Persistência de configurações
* Interface ainda mais interativa

---

## 👨‍💻 Autor

Desenvolvido por José Elias

---

## 📄 Licença

Este projeto está sob a licença MIT.
