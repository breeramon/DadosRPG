// ============================================================
// copy-dice-themes.mjs
//
// O pacote "@3d-dice/dice-box" já copia sozinho (via seu próprio
// "postinstall") os assets do tema "default" pra public/assets/themes/
// default — ver o comentário sobre isso no .gitignore. Só que os OUTROS
// temas prontos da biblioteca (rust, Dice of Rolling, Gemstone) vêm
// cada um num pacote npm separado (@3d-dice/theme-rust,
// @3d-dice/theme-dice-of-rolling, @3d-dice/theme-gemstone) que não tem
// esse mecanismo — são só pastas de arquivos estáticos (imagens +
// theme.config.json), sem nenhum script próprio.
//
// Este script faz a mesma coisa que o "postinstall" do dice-box faria
// pra esses temas: copia os arquivos de cada pacote pra dentro de
// public/assets/themes/<nome-do-tema>/, onde a DiceBox (rodando no
// navegador) já sabe procurar. Roda automaticamente depois de "npm
// install" (ver o script "postinstall" no package.json) — tanto na
// sua máquina quanto no build da Vercel, sem precisar de nenhum passo
// manual.
//
// Pra adicionar um tema novo no futuro: só instalar o pacote dele
// (npm install @3d-dice/theme-X) e acrescentar o nome do pacote na
// lista TEMAS_PARA_COPIAR abaixo.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_PROJETO = path.resolve(__dirname, '..');

const TEMAS_PARA_COPIAR = [
    '@3d-dice/theme-rust',
    '@3d-dice/theme-dice-of-rolling',
    '@3d-dice/theme-gemstone',
];

// Arquivos que existem no pacote npm mas não são assets do tema em si
// (metadados do pacote) — não precisam ir pra public/.
const IGNORAR = new Set(['package.json', 'README.md', 'LICENSE', 'LICENSE.md', '.npmignore', '.DS_Store']);

function copiarTema(nomePacote) {
    const pastaPacote = path.join(RAIZ_PROJETO, 'node_modules', nomePacote);

    if (!fs.existsSync(pastaPacote)) {
        console.warn(`[copy-dice-themes] Pacote "${nomePacote}" não encontrado em node_modules — pulando. Rode "npm install" primeiro.`);
        return;
    }

    const caminhoConfig = path.join(pastaPacote, 'theme.config.json');
    if (!fs.existsSync(caminhoConfig)) {
        console.warn(`[copy-dice-themes] "${nomePacote}" não tem theme.config.json — pulando (não parece ser um tema válido da DiceBox).`);
        return;
    }

    // O "systemName" dentro do theme.config.json é o nome que a DiceBox
    // usa pra montar a URL do tema (assetPath + "themes/" + systemName)
    // — pode ser diferente do nome do pacote npm (ex: pacote
    // "@3d-dice/theme-dice-of-rolling" -> systemName "diceOfRolling").
    const config = JSON.parse(fs.readFileSync(caminhoConfig, 'utf-8'));
    const nomeTema = config.systemName;
    if (!nomeTema) {
        console.warn(`[copy-dice-themes] "${nomePacote}" não define "systemName" no theme.config.json — pulando.`);
        return;
    }

    const pastaDestino = path.join(RAIZ_PROJETO, 'public', 'assets', 'themes', nomeTema);
    fs.mkdirSync(pastaDestino, { recursive: true });

    const arquivos = fs.readdirSync(pastaPacote).filter(nome => !IGNORAR.has(nome));
    for (const arquivo of arquivos) {
        fs.copyFileSync(path.join(pastaPacote, arquivo), path.join(pastaDestino, arquivo));
    }

    console.log(`[copy-dice-themes] Tema "${nomeTema}" copiado (${arquivos.length} arquivo(s)) para public/assets/themes/${nomeTema}/`);
}

for (const nomePacote of TEMAS_PARA_COPIAR) {
    copiarTema(nomePacote);
}
