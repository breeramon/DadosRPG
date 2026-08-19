// ============================================================
// app-ui.js
//
// Cola tudo: alterna as telas (login, lista de personagens, formulário,
// ficha) conforme o estado de login e o que o usuário clica, chamando
// window.Auth / window.Characters (definidos em firebase.js) e
// window.loadCharacterIntoSheet (definido em script.js).
// ============================================================

const ATRIBUTOS = [
    { key: 'agi', label: 'AGI' },
    { key: 'int', label: 'INT' },
    { key: 'vig', label: 'VIG' },
    { key: 'pre', label: 'PRE' },
    { key: 'for', label: 'FOR' },
];

let currentUser = null;
let charactersCache = [];
let editingCharacterId = null; // null = criando um personagem novo
let isSignupMode = false;
let currentSheetCharacterId = null;

// Estado "vivo" das perícias do formulário, fora do DOM. É a fonte de
// verdade enquanto o usuário mexe no formulário — a lista na tela é só
// um espelho dela, redesenhado a cada mudança (trilha, NEX, Intelecto,
// clique num checkbox). Formato: { [nomeDaPericia]: { treinado, grau,
// bonusExtra } }.
let periciasState = {};
// Pra trilha Combatente: qual perícia foi escolhida em cada par
// obrigatório (["Luta"|"Pontaria", "Fortitude"|"Reflexos"]).
let combatenteEscolhasFixas = [null, null];

// ---------------------------------------------------------------
// Navegação entre telas
// ---------------------------------------------------------------
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// ---------------------------------------------------------------
// TELA DE LOGIN / CADASTRO
// ---------------------------------------------------------------
function setAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (!msg) {
        el.classList.add('hidden');
        el.textContent = '';
    } else {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function updateAuthModeUI() {
    document.getElementById('btn-auth-submit').textContent = isSignupMode ? 'Criar conta' : 'Entrar';
    document.getElementById('auth-toggle-text').textContent = isSignupMode
        ? 'Já tem conta?'
        : 'Ainda não tem conta?';
    document.getElementById('auth-toggle-link').textContent = isSignupMode ? 'Entrar' : 'Criar conta';
}

// Se o Firebase não carregou (chaves erradas em firebase-config.js, CDN
// bloqueado, sem internet etc.), window.Auth pode nem existir. Em vez de
// travar o app inteiro com um erro críptico, isso vira uma mensagem clara
// na tela de login.
function friendlyAuthError(err) {
    if (window.Auth && typeof window.Auth.friendlyError === 'function') {
        return window.Auth.friendlyError(err);
    }
    return (err && err.message) || 'Não foi possível carregar o Firebase. Veja o GUIA_FIREBASE.md.';
}

function wireAuthScreen() {
    document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        setAuthError(null);
        updateAuthModeUI();
    });

    document.getElementById('form-auth').addEventListener('submit', async (e) => {
        e.preventDefault();
        setAuthError(null);

        if (!window.Auth) {
            setAuthError('Não foi possível carregar o Firebase. Confira javascript/firebase-config.js e o console (F12) — veja o GUIA_FIREBASE.md.');
            return;
        }

        const email = document.getElementById('auth-email').value.trim();
        const senha = document.getElementById('auth-senha').value;
        const submitBtn = document.getElementById('btn-auth-submit');

        submitBtn.disabled = true;
        try {
            if (isSignupMode) {
                await window.Auth.signUp(email, senha);
            } else {
                await window.Auth.signIn(email, senha);
            }
            // O onChange (registrado lá embaixo) cuida de trocar de tela.
        } catch (err) {
            console.error('[app-ui] Erro de autenticação:', err);
            setAuthError(friendlyAuthError(err));
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// ---------------------------------------------------------------
// TELA: LISTA DE PERSONAGENS
// ---------------------------------------------------------------
async function renderCharacterList() {
    const listEl = document.getElementById('characters-list');
    const emptyEl = document.getElementById('characters-empty');
    listEl.innerHTML = '';

    try {
        charactersCache = await window.Characters.list(currentUser.uid);
    } catch (err) {
        console.error('[app-ui] Erro ao listar personagens:', err);
        charactersCache = [];
        const errEl = document.createElement('div');
        errEl.className = 'characters-empty';
        errEl.textContent = 'Não foi possível carregar seus personagens: ' + (err.message || err);
        listEl.appendChild(errEl);
        return;
    }

    emptyEl.classList.toggle('hidden', charactersCache.length > 0);

    charactersCache.forEach(personagem => {
        const card = document.createElement('div');
        card.className = 'character-card';

        const info = document.createElement('div');
        info.className = 'character-card-info';
        const nameEl = document.createElement('strong');
        nameEl.textContent = personagem.nome || '(sem nome)';
        const trilhaEl = document.createElement('span');
        trilhaEl.className = 'character-card-trilha';
        const nex = Number(personagem.nex) || 5;
        trilhaEl.textContent = `${personagem.trilha || ''} • NEX ${nex}%`;
        info.append(nameEl, trilhaEl);

        const actions = document.createElement('div');
        actions.className = 'character-card-actions';

        const btnAbrir = document.createElement('button');
        btnAbrir.className = 'btn-action';
        btnAbrir.textContent = 'Abrir';
        btnAbrir.onclick = () => openCharacterSheet(personagem);

        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn-secondary';
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => openCharacterForm(personagem);

        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'btn-danger';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.onclick = () => excluirPersonagem(personagem);

        actions.append(btnAbrir, btnEditar, btnExcluir);
        card.append(info, actions);
        listEl.appendChild(card);
    });
}

async function excluirPersonagem(personagem) {
    const ok = confirm(`Excluir "${personagem.nome}"? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    try {
        await window.Characters.remove(currentUser.uid, personagem.id);
        await renderCharacterList();
    } catch (err) {
        console.error('[app-ui] Erro ao excluir personagem:', err);
        alert('Não foi possível excluir: ' + (err.message || err));
    }
}

// ---------------------------------------------------------------
// TELA: CRIAR / EDITAR PERSONAGEM — perícias (catálogo + NEX)
// ---------------------------------------------------------------
// Nomes das perícias marcadas como "automáticas da trilha atual" (ver
// aplicarFixasNoEstado). Precisa ser chamada DEPOIS de
// aplicarFixasNoEstado(trilha) pra refletir a trilha certa.
function nomesFixosAtuais() {
    return Object.entries(periciasState).filter(([, st]) => st.autoFixo).map(([nome]) => nome);
}

// Garante que o estado das perícias reflita as automáticas da trilha
// atual (marca como treinada, sem contar na cota "à escolha"), usando
// a flag `autoFixo` pra saber quais entradas foram marcadas por essa
// função (e não pelo próprio usuário clicando um checkbox). Isso evita
// dois bugs: (1) perícias automáticas de uma trilha antiga "grudarem"
// treinadas depois de trocar de trilha; (2) a segunda opção de um par
// obrigatório (ex: Pontaria, se Luta foi escolhida) ser desmarcada à
// força mesmo que o usuário tenha marcado ela por conta própria como
// uma perícia livre extra.
function aplicarFixasNoEstado(trilha) {
    const OP = window.OrdemParanormal;
    const regra = OP.TRILHA_REGRAS[trilha] || OP.TRILHA_REGRAS.Combatente;

    const desejado = new Set(regra.fixasSimples);
    if (regra.gruposFixos.length) {
        regra.gruposFixos.forEach((grupo, i) => {
            if (!combatenteEscolhasFixas[i] || !grupo.includes(combatenteEscolhasFixas[i])) {
                combatenteEscolhasFixas[i] = grupo[0];
            }
            desejado.add(combatenteEscolhasFixas[i]);
        });
    }

    // Limpa a flag de quem era automático antes e não é mais (trilha
    // mudou, ou a escolha do par mudou) — sem mexer em perícias que o
    // usuário marcou manualmente (autoFixo permanece false nelas).
    Object.entries(periciasState).forEach(([nome, st]) => {
        if (st.autoFixo && !desejado.has(nome)) {
            st.treinado = false;
            st.autoFixo = false;
        }
    });

    desejado.forEach(nome => {
        const st = periciasState[nome];
        if (!st) return;
        st.treinado = true;
        st.autoFixo = true;
        if (!st.grau) st.grau = 'treinado';
    });
}

function resetPericiasState(personagem) {
    const OP = window.OrdemParanormal;
    periciasState = {};
    OP.PERICIAS_CATALOGO.forEach(p => {
        periciasState[p.nome] = { treinado: false, grau: 'treinado', bonusExtra: 0, autoFixo: false };
    });
    combatenteEscolhasFixas = [null, null];

    if (personagem && Array.isArray(personagem.pericias)) {
        personagem.pericias.forEach(p => {
            const alvo = periciasState[p.nome];
            if (!alvo) return; // perícia salva não bate com o catálogo atual (dado antigo) — ignora
            const grau = p.grau || OP.grauApartirDoBonus(p.bonus);
            alvo.treinado = true;
            alvo.grau = grau;
            const bonusExtra = (typeof p.bonusExtra === 'number')
                ? p.bonusExtra
                : Math.max(0, (Number(p.bonus) || 0) - (OP.GRAU_BONUS[grau] || 0));
            alvo.bonusExtra = bonusExtra;

            // Se a perícia salva fazia parte de um par obrigatório do
            // Combatente, lembra qual foi a escolha original.
            const trilha = (personagem.trilha || 'Ocultista');
            const regra = OP.TRILHA_REGRAS[trilha];
            if (regra && regra.gruposFixos.length) {
                regra.gruposFixos.forEach((grupo, i) => {
                    if (grupo.includes(p.nome)) combatenteEscolhasFixas[i] = p.nome;
                });
            }
        });
    }
}

function grauSelectOptionsHtml(grausPermitidos, grauAtual) {
    return grausPermitidos.map(g => {
        const OP = window.OrdemParanormal;
        return `<option value="${g}" ${g === grauAtual ? 'selected' : ''}>${OP.GRAU_LABEL[g]} (+${OP.GRAU_BONUS[g]})</option>`;
    }).join('');
}

function renderPericiasForm() {
    const OP = window.OrdemParanormal;
    if (!OP) return; // pericias.js não carregou — evita quebrar o resto do formulário

    const trilha = document.getElementById('form-trilha').value;
    const intelecto = parseInt(document.getElementById('form-int').value, 10) || 0;
    const nexInput = document.getElementById('form-nex');
    const nex = OP.clampNex(nexInput.value);
    nexInput.value = nex;

    aplicarFixasNoEstado(trilha);

    const grausPermitidos = OP.grausPermitidos(nex);
    const grauMaisAlto = grausPermitidos[grausPermitidos.length - 1];

    // Rebaixa qualquer perícia cujo grau não seja mais permitido no NEX atual.
    Object.values(periciasState).forEach(st => {
        if (st.treinado && !grausPermitidos.includes(st.grau)) st.grau = grauMaisAlto;
    });

    const nomesFixos = nomesFixosAtuais();
    const quotaLivre = OP.quotaPericiasLivres(trilha, intelecto);
    const livresUsadas = Object.entries(periciasState)
        .filter(([nome, st]) => st.treinado && !nomesFixos.includes(nome)).length;
    const cotaEsgotada = livresUsadas >= quotaLivre;

    // --- Bloco de perícias automáticas da trilha ---
    const fixasEl = document.getElementById('form-pericias-fixas');
    fixasEl.innerHTML = '';
    const regra = OP.TRILHA_REGRAS[trilha];

    if (regra.fixasSimples.length || regra.gruposFixos.length) {
        const titulo = document.createElement('div');
        titulo.className = 'pericias-fixas-titulo';
        titulo.textContent = 'Perícias automáticas da trilha';
        fixasEl.appendChild(titulo);

        regra.fixasSimples.forEach(nome => {
            const catalogo = OP.PERICIAS_CATALOGO.find(p => p.nome === nome);
            const item = document.createElement('div');
            item.className = 'pericia-fixa-item';
            item.textContent = `${nome} (${(catalogo.atributo || '').toUpperCase()}) — automática`;
            fixasEl.appendChild(item);
        });

        regra.gruposFixos.forEach((grupo, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'pericia-fixa-grupo';

            const label = document.createElement('label');
            label.textContent = `Escolha: ${grupo.join(' ou ')}`;

            const select = document.createElement('select');
            grupo.forEach(nome => {
                const opt = document.createElement('option');
                opt.value = nome;
                opt.textContent = nome;
                if (nome === combatenteEscolhasFixas[i]) opt.selected = true;
                select.appendChild(opt);
            });
            select.addEventListener('change', () => {
                combatenteEscolhasFixas[i] = select.value;
                renderPericiasForm();
            });

            wrap.append(label, select);
            fixasEl.appendChild(wrap);
        });
    }

    // --- Aviso de círculo de ritual (só pra Ocultista) ---
    const rituaisEl = document.getElementById('form-rituais-info');
    if (trilha === 'Ocultista') {
        const circulo = OP.circuloRitualLiberado(nex);
        rituaisEl.classList.remove('hidden');
        rituaisEl.textContent = circulo > 0
            ? `Círculo de Rituais liberado neste NEX: até o ${circulo}º círculo. (Lista de rituais ainda não faz parte do app — use o livro pra escolher.)`
            : 'NEX ainda não libera nenhum círculo de rituais.';
    } else {
        rituaisEl.classList.add('hidden');
        rituaisEl.textContent = '';
    }

    // --- Info geral (NEX, grau máximo, cota de perícias) ---
    const infoEl = document.getElementById('form-pericias-info');
    infoEl.innerHTML = `
        <span>NEX ${nex}%</span>
        <span>Grau máximo liberado: <strong>${OP.GRAU_LABEL[grauMaisAlto]}</strong></span>
        <span class="${cotaEsgotada ? 'pericias-cota-cheia' : ''}">Perícias treinadas à escolha: <strong>${livresUsadas} / ${quotaLivre}</strong></span>
    `;

    // --- Catálogo completo, agrupado por atributo, excluindo as fixas ---
    const container = document.getElementById('form-pericias-catalogo');
    container.innerHTML = '';

    ATRIBUTOS.forEach(({ key, label }) => {
        const itensDoGrupo = OP.PERICIAS_CATALOGO.filter(p => p.atributo === key && !nomesFixos.includes(p.nome));
        if (!itensDoGrupo.length) return;

        const grupoEl = document.createElement('div');
        grupoEl.className = 'pericias-catalogo-grupo';

        const tituloGrupo = document.createElement('div');
        tituloGrupo.className = 'pericias-catalogo-grupo-titulo';
        tituloGrupo.textContent = label;
        grupoEl.appendChild(tituloGrupo);

        itensDoGrupo.forEach(p => {
            const st = periciasState[p.nome];
            const row = document.createElement('div');
            row.className = 'pericia-catalogo-row';

            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'pericia-catalogo-checkbox';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = st.treinado;
            checkbox.disabled = !st.treinado && cotaEsgotada;
            checkbox.addEventListener('change', () => {
                st.treinado = checkbox.checked;
                if (st.treinado) st.grau = 'treinado';
                renderPericiasForm();
            });
            checkboxLabel.append(checkbox, document.createTextNode(' ' + p.nome));
            row.appendChild(checkboxLabel);

            if (st.treinado) {
                const grauSelect = document.createElement('select');
                grauSelect.className = 'pericia-catalogo-grau';
                grauSelect.innerHTML = grauSelectOptionsHtml(grausPermitidos, st.grau);
                grauSelect.addEventListener('change', () => {
                    st.grau = grauSelect.value;
                    renderPericiasForm();
                });
                row.appendChild(grauSelect);

                const bonusInput = document.createElement('input');
                bonusInput.type = 'number';
                bonusInput.className = 'pericia-catalogo-bonus-extra';
                bonusInput.title = 'Bônus extra (equipamento, talento, etc)';
                bonusInput.value = st.bonusExtra || 0;
                bonusInput.addEventListener('change', () => {
                    st.bonusExtra = parseInt(bonusInput.value, 10) || 0;
                });
                row.appendChild(bonusInput);
            }

            grupoEl.appendChild(row);
        });

        container.appendChild(grupoEl);
    });
}

function openCharacterForm(personagem) {
    editingCharacterId = personagem ? personagem.id : null;

    document.getElementById('form-title').textContent = personagem ? 'Editar Personagem' : 'Novo Personagem';
    document.getElementById('form-nome').value = personagem ? (personagem.nome || '') : '';
    document.getElementById('form-trilha').value = personagem ? (personagem.trilha || 'Ocultista') : 'Ocultista';
    document.getElementById('form-nex').value = personagem ? (Number(personagem.nex) || 5) : 5;

    const atributos = (personagem && personagem.atributos) || {};
    ATRIBUTOS.forEach(({ key }) => {
        document.getElementById(`form-${key}`).value = Number(atributos[key]) || 0;
    });

    resetPericiasState(personagem);
    renderPericiasForm();

    showScreen('screen-form');
}

function collectFormData() {
    const OP = window.OrdemParanormal;
    const nome = document.getElementById('form-nome').value.trim();
    if (!nome) {
        alert('Dê um nome para o personagem.');
        return null;
    }

    const trilha = document.getElementById('form-trilha').value;
    const nex = OP ? OP.clampNex(document.getElementById('form-nex').value) : (parseInt(document.getElementById('form-nex').value, 10) || 5);

    const atributos = {};
    ATRIBUTOS.forEach(({ key }) => {
        atributos[key] = parseInt(document.getElementById(`form-${key}`).value, 10) || 0;
    });

    if (!OP) {
        alert('Não foi possível carregar as regras de perícias (javascript/pericias.js). Recarregue a página.');
        return null;
    }

    aplicarFixasNoEstado(trilha);
    const quotaLivre = OP.quotaPericiasLivres(trilha, atributos.int);
    const nomesFixos = nomesFixosAtuais();
    const livresUsadas = Object.entries(periciasState)
        .filter(([n, st]) => st.treinado && !nomesFixos.includes(n)).length;
    if (livresUsadas > quotaLivre) {
        alert(`Esse personagem tem ${livresUsadas} perícias treinadas à escolha, mas o NEX ${nex}% só permite ${quotaLivre}. Desmarque algumas perícias ou aumente o NEX.`);
        return null;
    }

    const pericias = OP.PERICIAS_CATALOGO
        .filter(p => periciasState[p.nome] && periciasState[p.nome].treinado)
        .map(p => {
            const st = periciasState[p.nome];
            const bonus = OP.GRAU_BONUS[st.grau] + (Number(st.bonusExtra) || 0);
            return { nome: p.nome, atributo: p.atributo, treinado: true, grau: st.grau, bonusExtra: Number(st.bonusExtra) || 0, bonus };
        });

    return { nome, trilha, nex, atributos, pericias };
}

async function salvarPersonagem() {
    const dados = collectFormData();
    if (!dados) return;

    const btn = document.getElementById('btn-salvar-personagem');
    btn.disabled = true;
    try {
        if (editingCharacterId) {
            await window.Characters.update(currentUser.uid, editingCharacterId, dados);
        } else {
            await window.Characters.create(currentUser.uid, dados);
        }
        await renderCharacterList();
        showScreen('screen-characters');
    } catch (err) {
        console.error('[app-ui] Erro ao salvar personagem:', err);
        alert('Não foi possível salvar: ' + (err.message || err));
    } finally {
        btn.disabled = false;
    }
}

// ---------------------------------------------------------------
// TELA: FICHA DO PERSONAGEM
// ---------------------------------------------------------------
function openCharacterSheet(personagem) {
    currentSheetCharacterId = personagem.id;
    window.loadCharacterIntoSheet(personagem, {
        // Deixa a ficha salvar vida/determinação/defesa direto no Firestore
        // (sem passar pelo formulário de edição) e mantém o cache local
        // atualizado, pra não perder o valor se o usuário sair e voltar
        // pra ficha sem recarregar a lista de personagens.
        onSaveVitais: async (campos) => {
            Object.assign(personagem, campos);
            try {
                await window.Characters.update(currentUser.uid, personagem.id, campos);
            } catch (err) {
                console.error('[app-ui] Erro ao salvar vida/determinação/defesa:', err);
            }
        },
    });
    showScreen('screen-sheet');
}

// ---------------------------------------------------------------
// Liga os botões estáticos das telas
// ---------------------------------------------------------------
function wireStaticButtons() {
    document.getElementById('btn-novo-personagem').addEventListener('click', () => openCharacterForm(null));
    document.getElementById('btn-logout').addEventListener('click', () => window.Auth && window.Auth.signOut());

    document.getElementById('btn-salvar-personagem').addEventListener('click', salvarPersonagem);
    document.getElementById('btn-cancelar-form').addEventListener('click', () => showScreen('screen-characters'));

    document.getElementById('btn-voltar-lista').addEventListener('click', () => showScreen('screen-characters'));
    document.getElementById('btn-editar-personagem').addEventListener('click', () => {
        const personagem = charactersCache.find(p => p.id === currentSheetCharacterId);
        if (personagem) openCharacterForm(personagem);
    });

    // Trocar de trilha, mudar o NEX ou mudar o Intelecto muda quantas
    // perícias/graus são permitidos — redesenha a lista toda vez.
    document.getElementById('form-trilha').addEventListener('change', () => {
        combatenteEscolhasFixas = [null, null]; // trilha nova = escolhas antigas não valem mais
        renderPericiasForm();
    });
    document.getElementById('form-nex').addEventListener('change', renderPericiasForm);
    document.getElementById('form-int').addEventListener('change', renderPericiasForm);
}

// ---------------------------------------------------------------
// Ponto de entrada: reage a mudanças de login
// ---------------------------------------------------------------
wireAuthScreen();
wireStaticButtons();
updateAuthModeUI();

if (window.Auth) {
    window.Auth.onChange(async (user) => {
        currentUser = user;
        if (user) {
            setAuthError(null);
            document.getElementById('form-auth').reset();
            await renderCharacterList();
            showScreen('screen-characters');
        } else {
            // Sempre volta pro modo "Entrar" depois de um logout, em vez de
            // manter o formulário travado em modo "Criar conta".
            isSignupMode = false;
            updateAuthModeUI();
            document.getElementById('form-auth').reset();
            showScreen('screen-login');
        }
    });
} else {
    // firebase.js não conseguiu nem definir window.Auth — provavelmente um
    // erro de carregamento do SDK (veja o console). Mostra isso na tela de
    // login em vez de deixar a página em branco/quebrada.
    setAuthError('Não foi possível carregar o Firebase. Confira javascript/firebase-config.js e o console (F12) — veja o GUIA_FIREBASE.md.');
    showScreen('screen-login');
}
