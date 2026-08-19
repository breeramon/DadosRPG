// ============================================================
// character-form.js
//
// Lógica da tela "Criar / Editar Personagem" (form.html). Requer login
// (ver javascript/auth-guard.js). Sem "?id=" na URL = criando um
// personagem novo; com "?id=XXXX" = editando o personagem com esse id
// (buscado no Firestore via window.Characters.get ao carregar a página,
// já que agora cada página começa "do zero" — não tem mais um cache em
// memória compartilhado com a lista, como tinha na SPA antiga).
// ============================================================

const ATRIBUTOS = [
    { key: 'agi', label: 'AGI' },
    { key: 'int', label: 'INT' },
    { key: 'vig', label: 'VIG' },
    { key: 'pre', label: 'PRE' },
    { key: 'for', label: 'FOR' },
];

let currentUser = null;
let editingCharacterId = null; // null = criando um personagem novo

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
// Perícias (catálogo + NEX)
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

// Recalcula quantos pontos de atributo o NEX atual libera, reenquadra
// os valores dos 5 campos dentro do mínimo/máximo permitido (e do total
// de pontos disponível) e redesenha o aviso acima do pentagrama de
// atributos. Chamada sempre que o NEX muda ou um atributo é editado —
// ver pericias.js (`pontosAtributoPorNex`) pra regra completa.
function renderAtributosForm() {
    const OP = window.OrdemParanormal;
    if (!OP) return;

    const nex = OP.clampNex(document.getElementById('form-nex').value);
    const regra = OP.pontosAtributoPorNex(nex);

    // 1) Reenquadra cada atributo dentro de [min, maxPorAtributo].
    ATRIBUTOS.forEach(({ key }) => {
        const el = document.getElementById(`form-${key}`);
        let v = parseInt(el.value, 10);
        if (Number.isNaN(v)) v = regra.minPorAtributo;
        v = Math.max(regra.minPorAtributo, Math.min(regra.maxPorAtributo, v));
        el.value = v;
    });

    // 2) Se a soma passar do total de pontos liberado (ex: acabou de
    // baixar o NEX), tira pontos do(s) atributo(s) mais alto(s) até
    // caber — sem deixar nenhum abaixo do mínimo.
    function somaAtual() {
        return ATRIBUTOS.reduce((acc, { key }) => acc + (parseInt(document.getElementById(`form-${key}`).value, 10) || 0), 0);
    }
    let guardaLoop = 0;
    while (somaAtual() > regra.total && guardaLoop < 100) {
        guardaLoop++;
        let maiorKey = null, maiorVal = regra.minPorAtributo;
        ATRIBUTOS.forEach(({ key }) => {
            const v = parseInt(document.getElementById(`form-${key}`).value, 10) || 0;
            if (v > maiorVal) { maiorVal = v; maiorKey = key; }
        });
        if (!maiorKey) break; // todo mundo já no mínimo, não dá mais pra reduzir
        const el = document.getElementById(`form-${maiorKey}`);
        el.value = (parseInt(el.value, 10) || 0) - 1;
    }

    const somaFinal = somaAtual();
    const infoEl = document.getElementById('form-atributos-info');
    if (infoEl) {
        infoEl.innerHTML = `
            <span>Pontos de atributo: <strong class="${somaFinal > regra.total ? 'atributos-erro' : ''}">${somaFinal} / ${regra.total}</strong></span>
            <span>Máximo por atributo neste NEX: <strong>${regra.maxPorAtributo}</strong> (mínimo 0)</span>
            ${regra.extrapolado ? '<div class="atributos-aviso">NEX acima de 5%: total e máximo ampliados por uma extensão não-oficial das regras (ver comentário em pericias.js) — ajuste com seu mestre se preferir outra convenção.</div>' : ''}
        `;
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

// Preenche o formulário com os dados de um personagem (edição) ou com
// os valores padrão (criação, personagem === null).
function preencherFormulario(personagem) {
    document.getElementById('form-title').textContent = personagem ? 'Editar Personagem' : 'Novo Personagem';
    document.getElementById('form-nome').value = personagem ? (personagem.nome || '') : '';
    document.getElementById('form-trilha').value = personagem ? (personagem.trilha || 'Ocultista') : 'Ocultista';
    document.getElementById('form-nex').value = personagem ? (Number(personagem.nex) || 5) : 5;

    const atributos = (personagem && personagem.atributos) || {};
    ATRIBUTOS.forEach(({ key }) => {
        document.getElementById(`form-${key}`).value = Number(atributos[key]) || 0;
    });

    renderAtributosForm();
    resetPericiasState(personagem);
    renderPericiasForm();
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

    const regraAtributos = OP.pontosAtributoPorNex(nex);
    const somaAtributos = ATRIBUTOS.reduce((acc, { key }) => acc + (atributos[key] || 0), 0);
    const atributoForaDoLimite = ATRIBUTOS.find(({ key }) => {
        const v = atributos[key] || 0;
        return v < regraAtributos.minPorAtributo || v > regraAtributos.maxPorAtributo;
    });
    if (atributoForaDoLimite) {
        alert(`${atributoForaDoLimite.label} está fora do limite permitido pelo NEX ${nex}% (entre ${regraAtributos.minPorAtributo} e ${regraAtributos.maxPorAtributo}).`);
        return null;
    }
    if (somaAtributos > regraAtributos.total) {
        alert(`Esse personagem tem ${somaAtributos} pontos de atributo distribuídos, mas o NEX ${nex}% só libera ${regraAtributos.total}. Ajuste os atributos antes de salvar.`);
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
        window.location.href = 'characters.html';
    } catch (err) {
        console.error('[character-form] Erro ao salvar personagem:', err);
        alert('Não foi possível salvar: ' + (err.message || err));
        btn.disabled = false;
    }
}

function wireStaticButtons() {
    document.getElementById('btn-salvar-personagem').addEventListener('click', salvarPersonagem);
    document.getElementById('btn-cancelar-form').addEventListener('click', () => {
        window.location.href = 'characters.html';
    });

    // Trocar de trilha, mudar o NEX ou mudar o Intelecto muda quantas
    // perícias/graus são permitidos — redesenha a lista toda vez.
    document.getElementById('form-trilha').addEventListener('change', () => {
        combatenteEscolhasFixas = [null, null]; // trilha nova = escolhas antigas não valem mais
        renderPericiasForm();
    });
    document.getElementById('form-nex').addEventListener('change', () => {
        renderAtributosForm(); // NEX muda pontos/teto de atributo
        renderPericiasForm();
    });

    // Cada atributo editado reenquadra os 5 campos dentro do novo total
    // de pontos permitido. Intelecto também afeta a cota de perícias à
    // escolha, por isso renderPericiasForm roda de novo em seguida pra
    // todos eles (mais simples e barato do que só religar o do INT).
    ATRIBUTOS.forEach(({ key }) => {
        document.getElementById(`form-${key}`).addEventListener('change', () => {
            renderAtributosForm();
            renderPericiasForm();
        });
    });

    // Botões "−"/"+" ao lado de cada círculo do pentagrama (ver
    // form.html) — só mexem no valor do <input> por trás e disparam
    // 'change', reaproveitando exatamente a mesma validação de
    // min/máx/total de cima (nenhuma regra nova aqui).
    document.querySelectorAll('.attr-stepper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.attr;
            const delta = parseInt(btn.dataset.delta, 10) || 0;
            const el = document.getElementById(`form-${key}`);
            if (!el) return;
            el.value = (parseInt(el.value, 10) || 0) + delta;
            el.dispatchEvent(new Event('change'));
        });
    });
}

wireStaticButtons();
window.requireAuth(async (user) => {
    currentUser = user;

    const params = new URLSearchParams(window.location.search);
    editingCharacterId = params.get('id');

    if (!editingCharacterId) {
        preencherFormulario(null);
        return;
    }

    try {
        const personagem = await window.Characters.get(currentUser.uid, editingCharacterId);
        if (!personagem) {
            alert('Esse personagem não existe (ou já foi excluído).');
            window.location.href = 'characters.html';
            return;
        }
        preencherFormulario(personagem);
    } catch (err) {
        console.error('[character-form] Erro ao carregar personagem pra edição:', err);
        alert('Não foi possível carregar o personagem: ' + (err.message || err));
        window.location.href = 'characters.html';
    }
});
