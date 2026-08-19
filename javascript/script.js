let currentSides = 20;

// Gerador de números aleatórios (dado) — usado só se, por algum motivo,
// window.rollDiceAnimated (definido em dice-animation.js) não existir.
function d(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

// Rola `qty` dados de `sides` lados. Usa a animação 3D (dice-animation.js)
// quando disponível; senão cai para o gerador local acima, sem quebrar a ficha.
async function rollDice(qty, sides) {
    if (typeof window.rollDiceAnimated === 'function') {
        return window.rollDiceAnimated(`${qty}d${sides}`);
    }
    const rolls = [];
    for (let i = 0; i < qty; i++) rolls.push(d(sides));
    return rolls;
}

// Função para adicionar mensagens ao log
function logMessage(title, details, result, type = 'normal') {
    const logContainer = document.getElementById('roll-log');
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    if (type === 'crit') entry.classList.add('crit-success');
    if (type === 'fail') entry.classList.add('crit-fail');

    entry.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">${title}</div>
        <div style="color:#aaa; font-size:0.85em;">${details}</div>
        <div class="result-highlight">${result}</div>
    `;
    
    // Adiciona no topo da lista (dentro do flex-direction: column-reverse, isso coloca visualmente no final)
    logContainer.prepend(entry);
}

// ROLAGEM DE SISTEMA (Atributos)
async function rollSystemDice(attrName, diceCount) {
    let rolls = [];
    let finalResult = 0;
    let detailsString = "";

    if (diceCount > 0) {
        rolls = await rollDice(diceCount, 20);
        finalResult = Math.max(...rolls);

        // Destaca o dado usado
        const formattedRolls = rolls.map(r => r === finalResult ? `<b>${r}</b>` : r).join(', ');
        detailsString = `[${formattedRolls}]`;

    } else {
        // Desvantagem (Atributo 0)
        rolls = await rollDice(2, 20);
        finalResult = Math.min(...rolls);

        const formattedRolls = rolls.map(r => r === finalResult ? `<b>${r}</b>` : r).join(', ');
        detailsString = `Desvantagem (0): [${formattedRolls}]`;
    }

    let type = 'normal';
    if (finalResult === 20) type = 'crit';
    if (finalResult === 1) type = 'fail';

    logMessage(attrName, detailsString, finalResult, type);
}

// ROLAGEM DE PERÍCIA
async function rollSkill(skillName, attrDice, bonus) {
    let rolls = [];
    let bestDie = 0;

    if (attrDice > 0) {
        rolls = await rollDice(attrDice, 20);
        bestDie = Math.max(...rolls);
    } else {
        rolls = await rollDice(2, 20);
        bestDie = Math.min(...rolls);
    }

    const total = bestDie + bonus;
    const details = `Dados: [${rolls.join(', ')}] (Melhor: ${bestDie}) + ${bonus}`;

    let type = 'normal';
    if (bestDie === 20) type = 'crit';

    logMessage(skillName, details, total, type);
}

// ROLAGEM CUSTOMIZADA
async function rollCustomExpr() {
    const input = document.getElementById('customDiceInput');
    let expr = input.value.toLowerCase().replace(/\s/g, '');

    const regex = /^(\d+)d(\d+)(\+(\d+))?$/;
    const match = expr.match(regex);

    if (!match) {
        alert("Formato inválido! Use algo como '2d6', '1d20' ou '3d8+5'");
        return;
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const bonus = match[4] ? parseInt(match[4]) : 0;

    const rolls = await rollDice(count, sides);
    const sumRolls = rolls.reduce((a, b) => a + b, 0);

    const total = sumRolls + bonus;
    const details = `[${rolls.join(' + ')}] ${bonus > 0 ? '+ ' + bonus : ''}`;

    logMessage(`Extra (${expr})`, details, total);

    input.value = '';
    input.focus();
}

function handleEnter(e) {
    if (e.key === 'Enter') rollCustomExpr();
}

function selectDie(sides) {
    currentSides = sides;
    
    // Remove a classe 'active' de todos e adiciona no selecionado
    document.querySelectorAll('.die-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('d' + sides).classList.add('active');
}

async function rollSelectedDice() {
    const qty = parseInt(document.getElementById('diceQty').value) || 1;
    const mod = parseInt(document.getElementById('diceMod').value) || 0;

    const rolls = await rollDice(qty, currentSides);
    const sum = rolls.reduce((a, b) => a + b, 0);

    const total = sum + mod;
    
    // Formatação do log
    const expression = `${qty}d${currentSides}${mod >= 0 ? '+' + mod : mod}`;
    const details = `[${rolls.join(' + ')}] ${mod !== 0 ? (mod > 0 ? '+ ' + mod : mod) : ''}`;

    logMessage(`Personalizada (${expression})`, details, total);
}

// Nomes de exibição e seletor de cada atributo. A ficha em si (Ordem
// Paranormal) sempre tem esses 5 atributos fixos — o que muda de
// personagem pra personagem é só o valor de cada um.
const ATTR_MAP = [
    { key: 'agi', nome: 'Agilidade', label: 'AGI', btnId: 'attr-btn-agi' },
    { key: 'int', nome: 'Intelecto', label: 'INT', btnId: 'attr-btn-int' },
    { key: 'vig', nome: 'Vigor',     label: 'VIG', btnId: 'attr-btn-vig' },
    { key: 'pre', nome: 'Presença',  label: 'PRE', btnId: 'attr-btn-pre' },
    { key: 'for', nome: 'Força',     label: 'FOR', btnId: 'attr-btn-for' },
];

// Desenha a lista de perícias na ficha. Diferente de antes, mostra as 28
// perícias do catálogo SEMPRE (mesmo as destreinadas) — perícia treinada
// fica com o nome em verde, igual à ficha oficial. Perícias marcadas como
// "só treinada" (ver pericias.js) que o personagem não tem treino ficam
// apagadas e sem botão de rolar, porque a regra não permite tentar.
function renderSkillsList(personagem) {
    const atributos = personagem.atributos || {};
    const listaPericias = document.getElementById('skills-list');
    listaPericias.innerHTML = '';

    const labelPorChave = Object.fromEntries(ATTR_MAP.map(a => [a.key, a.label]));
    const grauAbrev = { treinado: 'T', veterano: 'V', expert: 'E' };
    const OP = window.OrdemParanormal;

    // Catálogo oficial se pericias.js carregou; senão cai pro que estiver
    // salvo no personagem (compatibilidade se o script não carregar).
    const catalogo = (OP && OP.PERICIAS_CATALOGO) || (personagem.pericias || []);
    const salvasPorNome = Object.fromEntries((personagem.pericias || []).map(p => [p.nome, p]));

    catalogo.forEach(catItem => {
        const salva = salvasPorNome[catItem.nome];
        const treinado = !!(salva && salva.treinado);
        const atributoChave = catItem.atributo;
        const valorAtributo = Number(atributos[atributoChave]) || 0;
        const bonus = treinado ? (Number(salva.bonus) || 0) : 0;
        const grau = treinado ? (salva.grau || 'treinado') : null;
        const bloqueada = !!catItem.somenteTreinada && !treinado;

        const item = document.createElement('div');
        item.className = 'skill-item' + (treinado ? ' treinada' : '') + (bloqueada ? ' bloqueada' : '');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'skill-name';
        nameSpan.append(`${catItem.nome}${catItem.somenteTreinada ? '*' : ''} `);
        const refSpan = document.createElement('span');
        refSpan.className = 'skill-attr-ref';
        refSpan.textContent = `(${labelPorChave[atributoChave] || '?'})`;
        nameSpan.appendChild(refSpan);

        const diceSpan = document.createElement('span');
        diceSpan.className = 'skill-dice';
        // Atributo 0 (ou negativo) rola em desvantagem (2d20, fica com o
        // pior) — ver rollSkill() logo abaixo — em vez de "0d20", que não
        // corresponde a como a rolagem realmente funciona.
        diceSpan.textContent = valorAtributo > 0 ? `${valorAtributo}d20` : '2d20↓';

        const bonusSpan = document.createElement('span');
        bonusSpan.className = 'skill-bonus';
        bonusSpan.textContent = bonus >= 0 ? `+${bonus}` : `${bonus}`;

        const treinoSpan = document.createElement('span');
        treinoSpan.className = 'skill-treino';
        treinoSpan.title = treinado
            ? ((OP && OP.GRAU_LABEL[grau]) || 'Treinado')
            : (bloqueada ? 'Só pode ser usada treinada' : 'Destreinado');
        treinoSpan.textContent = treinado ? (grauAbrev[grau] || 'T') : '-';

        const rollBtn = document.createElement('button');
        rollBtn.className = 'btn-roll-skill';
        rollBtn.textContent = 'Rolar';
        if (bloqueada) {
            rollBtn.disabled = true;
        } else {
            rollBtn.onclick = () => rollSkill(catItem.nome, valorAtributo, bonus);
        }

        item.append(nameSpan, diceSpan, bonusSpan, treinoSpan, rollBtn);
        listaPericias.appendChild(item);
    });
}

// Vida, Determinação e Defesa: os máximos são sempre recalculados a
// partir de trilha/atributos/NEX (ver pericias.js); os valores ATUAIS de
// vida/determinação e os bônus de equipamento/outros da Defesa é que
// ficam guardados no personagem e são editáveis aqui na ficha, com
// salvamento automático (debounced) via `opts.onSaveVitais`.
function wireVitalsBlock(personagem, opts) {
    const OP = window.OrdemParanormal;
    if (!OP) return;

    const atributos = personagem.atributos || {};
    const trilha = personagem.trilha || 'Combatente';
    const nex = Number(personagem.nex) || 5;

    const vidaMax = OP.vidaMaxima(trilha, atributos.vig, nex);
    const detMax = OP.determinacaoMaxima(trilha, atributos.pre, nex);

    // Se nunca foi salvo (personagem novo/antigo), começa no máximo; senão
    // usa o que tiver salvo, sem deixar passar do novo máximo (ex: se
    // baixou o NEX na edição).
    let vidaAtual = (typeof personagem.vidaAtual === 'number') ? Math.min(personagem.vidaAtual, vidaMax) : vidaMax;
    let detAtual = (typeof personagem.determinacaoAtual === 'number') ? Math.min(personagem.determinacaoAtual, detMax) : detMax;
    let defesaEquip = Number(personagem.defesaEquipamento) || 0;
    let defesaOutros = Number(personagem.defesaOutros) || 0;

    const vidaFill = document.getElementById('vida-fill');
    const vidaText = document.getElementById('vida-text');
    const detFill = document.getElementById('det-fill');
    const detText = document.getElementById('det-text');
    const defesaTotalEl = document.getElementById('defesa-total');
    const equipInput = document.getElementById('defesa-equip');
    const outrosInput = document.getElementById('defesa-outros');
    if (!vidaFill || !detFill || !defesaTotalEl) return;

    function redesenhar() {
        const vidaPct = vidaMax > 0 ? Math.max(0, Math.min(100, (vidaAtual / vidaMax) * 100)) : 0;
        vidaFill.style.width = vidaPct + '%';
        vidaText.textContent = `${vidaAtual} / ${vidaMax}`;

        const detPct = detMax > 0 ? Math.max(0, Math.min(100, (detAtual / detMax) * 100)) : 0;
        detFill.style.width = detPct + '%';
        detText.textContent = `${detAtual} / ${detMax}`;

        defesaTotalEl.textContent = OP.defesaTotal(atributos.agi, defesaEquip, defesaOutros);
    }

    // Acumula os campos alterados (vida, determinação, defesa podem mudar
    // em sequência rápida) num único objeto pendente e manda tudo junto
    // depois de um tempo sem novas mudanças — em vez de um timeout por
    // campo, que faria uma mudança "cancelar" a outra que ainda não tinha
    // sido salva.
    let salvarTimeout = null;
    let pendente = {};
    function salvar(campos) {
        if (typeof opts?.onSaveVitais !== 'function') return;
        Object.assign(pendente, campos);
        clearTimeout(salvarTimeout);
        salvarTimeout = setTimeout(() => {
            const aEnviar = pendente;
            pendente = {};
            opts.onSaveVitais(aEnviar);
        }, 400);
    }

    equipInput.value = defesaEquip;
    outrosInput.value = defesaOutros;
    redesenhar();

    function ajustarVida(delta) {
        vidaAtual = Math.max(0, Math.min(vidaMax, vidaAtual + delta));
        redesenhar();
        salvar({ vidaAtual });
    }
    function ajustarDet(delta) {
        detAtual = Math.max(0, Math.min(detMax, detAtual + delta));
        redesenhar();
        salvar({ determinacaoAtual: detAtual });
    }

    document.getElementById('vida-menos5').onclick = () => ajustarVida(-5);
    document.getElementById('vida-menos1').onclick = () => ajustarVida(-1);
    document.getElementById('vida-mais1').onclick = () => ajustarVida(1);
    document.getElementById('vida-mais5').onclick = () => ajustarVida(5);

    document.getElementById('det-menos5').onclick = () => ajustarDet(-5);
    document.getElementById('det-menos1').onclick = () => ajustarDet(-1);
    document.getElementById('det-mais1').onclick = () => ajustarDet(1);
    document.getElementById('det-mais5').onclick = () => ajustarDet(5);

    equipInput.onchange = () => {
        defesaEquip = parseInt(equipInput.value, 10) || 0;
        redesenhar();
        salvar({ defesaEquipamento: defesaEquip });
    };
    outrosInput.onchange = () => {
        defesaOutros = parseInt(outrosInput.value, 10) || 0;
        redesenhar();
        salvar({ defesaOutros: defesaOutros });
    };

    // Guarda os valores iniciais (já clampados ao novo máximo) caso
    // tenham mudado só por causa de uma edição de NEX/atributo — assim o
    // Firestore não fica com um vidaAtual maior que o vidaMax novo.
    if (personagem.vidaAtual !== vidaAtual || personagem.determinacaoAtual !== detAtual) {
        salvar({ vidaAtual, determinacaoAtual: detAtual });
    }
}

// Preenche a ficha (pentagrama de atributos + vida/determinação/defesa +
// lista de perícias) com os dados de um personagem carregado do Firestore
// (veja javascript/app-ui.js). `opts.onSaveVitais(campos)` é chamado pra
// persistir mudanças de vida/determinação/defesa direto da ficha, sem
// precisar abrir o formulário de edição.
window.loadCharacterIntoSheet = function loadCharacterIntoSheet(personagem, opts) {
    const atributos = personagem.atributos || {};

    ATTR_MAP.forEach(({ key, nome, btnId }) => {
        const valor = Number(atributos[key]) || 0;
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.textContent = valor;
        btn.onclick = () => rollSystemDice(nome, valor);
    });

    renderSkillsList(personagem);
    wireVitalsBlock(personagem, opts);

    const nameEl = document.getElementById('sheet-character-name');
    if (nameEl) nameEl.textContent = personagem.nome || '';
    const trilhaEl = document.getElementById('sheet-character-trilha');
    if (trilhaEl) trilhaEl.textContent = personagem.trilha ? `(${personagem.trilha})` : '';
    const nexEl = document.getElementById('sheet-character-nex');
    if (nexEl) nexEl.textContent = personagem.nex ? `NEX ${Number(personagem.nex)}%` : '';

    // Reinicia o log de rolagens ao trocar de personagem.
    const logContainer = document.getElementById('roll-log');
    if (logContainer) {
        logContainer.innerHTML = `<div class="log-entry system-msg">Sessão iniciada — ${personagem.nome || ''}.</div>`;
    }
};