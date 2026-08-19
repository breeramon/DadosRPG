let currentSides = 20;

// Gerador de números aleatórios (dado) — usado só se, por algum motivo,
// window.rollDiceAnimated (definido em dice-animation.js) não existir.
function d(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

// Rola `qty` dados de `sides` lados. Usa a animação 3D (dice-animation.js)
// quando disponível; senão cai para o gerador local acima, sem quebrar a ficha.
async function rollDice(qty, sides) {
    // Som de dados caindo/chacoalhando (dice-sound.js) — dispara e não
    // espera terminar, então nunca atrasa a rolagem em si. Se o arquivo
    // não carregou por algum motivo, simplesmente não tem som.
    if (typeof window.playDiceRollSound === 'function') {
        window.playDiceRollSound(qty);
    }

    if (typeof window.rollDiceAnimated === 'function') {
        return window.rollDiceAnimated(`${qty}d${sides}`);
    }
    const rolls = [];
    for (let i = 0; i < qty; i++) rolls.push(d(sides));
    return rolls;
}

// Só guarda os últimos N resultados de rolagem no log — sem isso a
// lista crescia pra sempre a cada rolagem e ia empurrando a página
// (o container ficava cada vez mais alto em vez de ficar do tamanho
// fixo e rolar por dentro).
const MAX_LOG_ENTRIES = 4;

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

    // Descarta os mais antigos além do limite (o prepend acima faz o
    // resultado novo virar o primeiro filho, então os mais velhos vão
    // se acumulando no final da lista de filhos).
    while (logContainer.children.length > MAX_LOG_ENTRIES) {
        logContainer.removeChild(logContainer.lastElementChild);
    }
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
// Recalcula e redesenha só a Defesa — chamada tanto de wireVitalsBlock
// (quando o campo "Outros" muda) quanto de renderInventory (quando uma
// proteção é equipada/desequipada), já que a Defesa depende dos dois.
function recomputeDefesa(personagem) {
    const OP = window.OrdemParanormal;
    const OPI = window.OrdemParanormalItens;
    if (!OP) return;

    const atributos = personagem.atributos || {};
    const equip = OPI ? OPI.defesaDoInventario(personagem.inventario) : (Number(personagem.defesaEquipamento) || 0);
    const outrosInput = document.getElementById('defesa-outros');
    const outros = outrosInput ? (parseInt(outrosInput.value, 10) || 0) : (Number(personagem.defesaOutros) || 0);

    const equipEl = document.getElementById('defesa-equip');
    const totalEl = document.getElementById('defesa-total');
    if (equipEl) equipEl.textContent = equip;
    if (totalEl) totalEl.textContent = OP.defesaTotal(atributos.agi, equip, outros);
}

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

    const vidaFill = document.getElementById('vida-fill');
    const vidaText = document.getElementById('vida-text');
    const detFill = document.getElementById('det-fill');
    const detText = document.getElementById('det-text');
    const outrosInput = document.getElementById('defesa-outros');
    if (!vidaFill || !detFill) return;

    function redesenhar() {
        const vidaPct = vidaMax > 0 ? Math.max(0, Math.min(100, (vidaAtual / vidaMax) * 100)) : 0;
        vidaFill.style.width = vidaPct + '%';
        vidaText.textContent = `${vidaAtual} / ${vidaMax}`;

        const detPct = detMax > 0 ? Math.max(0, Math.min(100, (detAtual / detMax) * 100)) : 0;
        detFill.style.width = detPct + '%';
        detText.textContent = `${detAtual} / ${detMax}`;

        recomputeDefesa(personagem);
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

    outrosInput.value = Number(personagem.defesaOutros) || 0;
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

    outrosInput.onchange = () => {
        const defesaOutros = parseInt(outrosInput.value, 10) || 0;
        personagem.defesaOutros = defesaOutros;
        recomputeDefesa(personagem);
        salvar({ defesaOutros });
    };

    // Guarda os valores iniciais (já clampados ao novo máximo) caso
    // tenham mudado só por causa de uma edição de NEX/atributo — assim o
    // Firestore não fica com um vidaAtual maior que o vidaMax novo.
    if (personagem.vidaAtual !== vidaAtual || personagem.determinacaoAtual !== detAtual) {
        salvar({ vidaAtual, determinacaoAtual: detAtual });
    }
}

// Guarda o handler de "Esc fecha o modal" atual, pra poder trocar sem
// empilhar um novo listener no document a cada personagem aberto (ver
// renderInventory/wireModalAddItem mais abaixo).
let modalItemEscHandler = null;

// ---------------------------------------------------------------
// INVENTÁRIO
// ---------------------------------------------------------------
function renderInventory(personagem, opts) {
    const OPI = window.OrdemParanormalItens;
    const listaEl = document.getElementById('inventory-list');
    const cargaInfoEl = document.getElementById('inventory-carga-info');
    if (!OPI || !listaEl || !cargaInfoEl) return;

    if (!Array.isArray(personagem.inventario)) personagem.inventario = [];

    function persistir() {
        if (typeof opts?.onSaveVitais === 'function') {
            opts.onSaveVitais({ inventario: personagem.inventario });
        }
    }

    function render() {
        const forca = (personagem.atributos && personagem.atributos.for) || 0;
        const usados = OPI.espacosUsados(personagem.inventario);
        const max = OPI.espacosMaximos(forca);
        const limite = OPI.espacosSobrecarga(forca);
        const estado = OPI.estadoCarga(usados, forca);

        cargaInfoEl.innerHTML = '';
        const texto = document.createElement('span');
        texto.innerHTML = `Carga: <strong>${usados} / ${max}</strong> espaços`;
        cargaInfoEl.appendChild(texto);

        const barra = document.createElement('div');
        barra.className = 'inventory-carga-bar';
        const barraFill = document.createElement('div');
        barraFill.className = 'inventory-carga-bar-fill' + (estado !== 'normal' ? ' ' + estado : '');
        barraFill.style.width = Math.min(100, (usados / Math.max(1, limite)) * 100) + '%';
        barra.appendChild(barraFill);
        cargaInfoEl.appendChild(barra);

        if (estado === 'sobrecarregado') {
            const aviso = document.createElement('span');
            aviso.className = 'inventory-carga-aviso';
            aviso.textContent = `Sobrecarregado (acima de ${max}): -5 em Atletismo/Furtividade, -3m de deslocamento.`;
            cargaInfoEl.appendChild(aviso);
        } else if (estado === 'excesso') {
            const aviso = document.createElement('span');
            aviso.className = 'inventory-carga-aviso excesso';
            aviso.textContent = `Acima do limite absoluto (${limite}) — remova itens ou aumente a Força.`;
            cargaInfoEl.appendChild(aviso);
        }

        listaEl.innerHTML = '';
        if (!personagem.inventario.length) {
            const vazio = document.createElement('div');
            vazio.className = 'inventory-empty';
            vazio.textContent = 'Nenhum item no inventário ainda.';
            listaEl.appendChild(vazio);
        }

        personagem.inventario.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'inventory-item' + (item.equipado ? ' equipado' : '');

            const nome = document.createElement('span');
            nome.className = 'inventory-item-nome';
            nome.textContent = item.nome;

            const categoria = document.createElement('span');
            categoria.className = 'inventory-item-categoria';
            categoria.textContent = item.categoria || 'Personalizado';

            const espacos = document.createElement('span');
            espacos.className = 'inventory-item-espacos';
            espacos.textContent = `${item.espacos || 0} esp.`;

            const qtyWrap = document.createElement('div');
            qtyWrap.className = 'inventory-item-qty';
            const btnMenos = document.createElement('button');
            btnMenos.type = 'button';
            btnMenos.textContent = '-';
            btnMenos.onclick = () => {
                item.quantidade = Math.max(1, (Number(item.quantidade) || 1) - 1);
                render();
                persistir();
            };
            const qtySpan = document.createElement('span');
            qtySpan.textContent = `x${Number(item.quantidade) || 1}`;
            const btnMais = document.createElement('button');
            btnMais.type = 'button';
            btnMais.textContent = '+';
            btnMais.onclick = () => {
                item.quantidade = (Number(item.quantidade) || 1) + 1;
                render();
                persistir();
            };
            qtyWrap.append(btnMenos, qtySpan, btnMais);

            const acoes = document.createElement('div');
            acoes.className = 'inventory-item-acoes';

            if (item.grupo === 'protecoes') {
                const btnEquipar = document.createElement('button');
                btnEquipar.type = 'button';
                btnEquipar.className = 'btn-equipar' + (item.equipado ? ' equipado' : '');
                btnEquipar.textContent = item.equipado ? 'Vestida' : 'Vestir';
                btnEquipar.onclick = () => {
                    item.equipado = !item.equipado;
                    render();
                    recomputeDefesa(personagem);
                    persistir();
                };
                acoes.appendChild(btnEquipar);
            }

            const btnRemover = document.createElement('button');
            btnRemover.type = 'button';
            btnRemover.className = 'btn-danger';
            btnRemover.textContent = '✕';
            btnRemover.onclick = () => {
                personagem.inventario.splice(index, 1);
                render();
                recomputeDefesa(personagem);
                persistir();
            };
            acoes.appendChild(btnRemover);

            row.append(nome, categoria, espacos, qtyWrap, acoes);

            if (item.efeito) {
                const efeito = document.createElement('span');
                efeito.className = 'inventory-item-efeito';
                efeito.textContent = item.efeito;
                row.appendChild(efeito);
            }

            listaEl.appendChild(row);
        });
    }

    wireModalAddItem(personagem, OPI, render, persistir);

    render();
}

// Monta o texto em itálico que aparece embaixo do nome de cada item no
// cartão do catálogo (a "subcategoria" que aparecia na imagem de
// referência do usuário) — varia conforme o grupo do item.
function subcategoriaTexto(item) {
    if (item.grupo === 'armas') {
        return item.tipoArma === 'distancia'
            ? `Arma de Fogo/Distância — Alcance ${item.alcance || '—'}`
            : 'Arma Branca — Corpo a Corpo';
    }
    if (item.grupo === 'protecoes') return 'Proteção corporal';
    if (item.grupo === 'municoes') return 'Munição';
    return item.categoria || 'Item Geral';
}

// Monta os pares label/valor da "linha de estatísticas" que aparece
// quando o cartão do item é expandido — os campos variam conforme o
// grupo (armas mostram Dano/Crítico/Tipo/Munição, proteções mostram
// Defesa, munições mostram Compatibilidade etc.), igual à imagem de
// referência do usuário (colunas Categoria/Dano/Crítico/Tipo/Espaços/
// Munição).
function statsDoItem(item) {
    const stats = [{ label: 'Categoria', valor: item.categoria || '—' }];
    if (item.grupo === 'armas') {
        stats.push({ label: 'Dano', valor: item.dano || '—' });
        stats.push({ label: 'Crítico', valor: item.critico || '—' });
        stats.push({ label: 'Tipo', valor: item.tipoDano || '—' });
        stats.push({ label: 'Espaços', valor: `${item.espacos || 0}` });
        if (item.tipoArma === 'distancia') {
            stats.push({ label: 'Munição', valor: item.municao || '—' });
        }
    } else if (item.grupo === 'protecoes') {
        stats.push({ label: 'Defesa', valor: `+${item.defesaBonus || 0}` });
        stats.push({ label: 'Espaços', valor: `${item.espacos || 0}` });
    } else if (item.grupo === 'municoes') {
        stats.push({ label: 'Compatível', valor: item.compativel || '—' });
        stats.push({ label: 'Espaços', valor: `${item.espacos || 0}` });
    } else {
        stats.push({ label: 'Espaços', valor: `${item.espacos || 0}` });
    }
    return stats;
}

// Modal "Adicionar Item" (botão "+" no cabeçalho do Inventário). Tem duas
// abas: Catálogo (sub-abas por grupo — Armas/Munições/Proteções/Geral —
// com busca e cartões expansíveis, um botão "+" por cartão pra adicionar
// na hora) e Personalizado (nome livre + espaços + descrição opcional).
// Fica fora da .character-sheet no HTML (é um overlay fixo), mas a
// lógica de adicionar o item mexe no MESMO personagem.inventario que o
// resto do Inventário — por isso recebe `render`/`persistir` já prontos
// de dentro de renderInventory, em vez de duplicar essa lógica.
function wireModalAddItem(personagem, OPI, render, persistir) {
    const modalEl = document.getElementById('modal-add-item');
    const abrirBtn = document.getElementById('btn-abrir-modal-item');
    const fecharBtn = document.getElementById('btn-modal-item-fechar');
    const tabCatalogoBtn = document.getElementById('tab-btn-catalogo');
    const tabPersonalizadoBtn = document.getElementById('tab-btn-personalizado');
    const painelCatalogo = document.getElementById('modal-tab-catalogo');
    const painelPersonalizado = document.getElementById('modal-tab-personalizado');
    const subtabsEl = document.getElementById('modal-catalogo-subtabs');
    const buscaEl = document.getElementById('modal-item-busca');
    const cardsEl = document.getElementById('modal-item-cards');
    const feedbackEl = document.getElementById('modal-item-feedback');
    const addCustomBtn = document.getElementById('btn-modal-custom-adicionar');
    const customFeedbackEl = document.getElementById('modal-custom-feedback');
    if (!modalEl || !abrirBtn || !cardsEl) return;

    function abrirTab(nome) {
        const catalogoAtiva = nome === 'catalogo';
        tabCatalogoBtn.classList.toggle('active', catalogoAtiva);
        tabPersonalizadoBtn.classList.toggle('active', !catalogoAtiva);
        painelCatalogo.classList.toggle('hidden', !catalogoAtiva);
        painelPersonalizado.classList.toggle('hidden', catalogoAtiva);
    }

    // --- Sub-abas de categoria (Armas / Munições / Proteções / Geral) ---
    let grupoAtivo = (OPI.GRUPOS[0] && OPI.GRUPOS[0].chave) || 'armas';
    const expandidos = new Set(); // nomes dos cartões abertos nesta sessão da modal

    subtabsEl.innerHTML = '';
    OPI.GRUPOS.forEach(g => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'modal-subtab' + (g.chave === grupoAtivo ? ' active' : '');
        btn.textContent = g.label;
        btn.onclick = () => {
            grupoAtivo = g.chave;
            Array.from(subtabsEl.children).forEach(c => c.classList.toggle('active', c === btn));
            renderCards();
        };
        subtabsEl.appendChild(btn);
    });

    let feedbackTimeout = null;
    function mostrarFeedback(texto) {
        feedbackEl.textContent = texto;
        clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => { feedbackEl.textContent = ''; }, 2500);
    }

    function adicionarAoInventario(catalogItem) {
        const existente = personagem.inventario.find(i => i.nome === catalogItem.nome && !i.custom);
        if (existente) {
            existente.quantidade = (Number(existente.quantidade) || 1) + 1;
        } else {
            personagem.inventario.push({ ...catalogItem, quantidade: 1, equipado: false });
        }
        render();
        recomputeDefesa(personagem);
        persistir();
        mostrarFeedback(`"${catalogItem.nome}" adicionado ao inventário.`);
    }

    function renderCards() {
        const termo = (buscaEl.value || '').trim().toLowerCase();
        const itens = OPI.ITENS_CATALOGO.filter(item => {
            if (item.grupo !== grupoAtivo) return false;
            if (termo && !item.nome.toLowerCase().includes(termo)) return false;
            return true;
        });

        cardsEl.innerHTML = '';
        if (!itens.length) {
            const vazio = document.createElement('div');
            vazio.className = 'modal-item-cards-empty';
            vazio.textContent = 'Nenhum item encontrado.';
            cardsEl.appendChild(vazio);
            return;
        }

        itens.forEach(item => {
            const aberto = expandidos.has(item.nome);

            const card = document.createElement('div');
            card.className = 'modal-item-card' + (aberto ? ' expanded' : '');

            const header = document.createElement('div');
            header.className = 'modal-item-card-header';

            const chevron = document.createElement('span');
            chevron.className = 'modal-item-card-chevron';
            chevron.textContent = '▶';

            const info = document.createElement('div');
            info.className = 'modal-item-card-info';
            const tituloRow = document.createElement('div');
            tituloRow.className = 'modal-item-card-title-row';
            const nomeEl = document.createElement('span');
            nomeEl.className = 'modal-item-card-nome';
            nomeEl.textContent = item.nome;
            const badgeEl = document.createElement('span');
            badgeEl.className = 'modal-item-card-badge';
            badgeEl.textContent = item.categoria || '—';
            tituloRow.append(nomeEl, badgeEl);
            const subEl = document.createElement('div');
            subEl.className = 'modal-item-card-sub';
            subEl.textContent = subcategoriaTexto(item);
            info.append(tituloRow, subEl);

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'modal-item-card-add';
            addBtn.title = 'Adicionar ao inventário';
            addBtn.textContent = '+';
            addBtn.onclick = (ev) => {
                ev.stopPropagation();
                adicionarAoInventario(item);
            };

            header.append(chevron, info, addBtn);
            header.onclick = () => {
                if (expandidos.has(item.nome)) expandidos.delete(item.nome);
                else expandidos.add(item.nome);
                renderCards();
            };

            const body = document.createElement('div');
            body.className = 'modal-item-card-body' + (aberto ? '' : ' hidden');

            const statsGrid = document.createElement('div');
            statsGrid.className = 'modal-item-stats-grid';
            statsDoItem(item).forEach(({ label, valor }) => {
                const statEl = document.createElement('div');
                statEl.className = 'modal-item-stat';
                const labelEl = document.createElement('span');
                labelEl.className = 'modal-item-stat-label';
                labelEl.textContent = label;
                const valorEl = document.createElement('span');
                valorEl.className = 'modal-item-stat-value';
                valorEl.textContent = valor;
                statEl.append(labelEl, valorEl);
                statsGrid.appendChild(statEl);
            });
            body.appendChild(statsGrid);

            if (item.efeito) {
                const efeitoEl = document.createElement('div');
                efeitoEl.className = 'modal-item-card-efeito';
                efeitoEl.textContent = item.efeito;
                body.appendChild(efeitoEl);
            }

            card.append(header, body);
            cardsEl.appendChild(card);
        });
    }

    buscaEl.oninput = renderCards;

    let customFeedbackTimeout = null;
    addCustomBtn.onclick = () => {
        const nomeInput = document.getElementById('modal-custom-nome');
        const espacosInput = document.getElementById('modal-custom-espacos');
        const efeitoInput = document.getElementById('modal-custom-efeito');
        const nome = nomeInput.value.trim();
        if (!nome) {
            alert('Dê um nome para o item personalizado.');
            return;
        }
        const espacos = parseInt(espacosInput.value, 10) || 0;
        const efeito = efeitoInput.value.trim();
        personagem.inventario.push({ nome, categoria: 'Personalizado', espacos, efeito, quantidade: 1, equipado: false, custom: true });
        render();
        persistir();

        customFeedbackEl.textContent = `"${nome}" adicionado ao inventário.`;
        nomeInput.value = '';
        espacosInput.value = 1;
        efeitoInput.value = '';
        clearTimeout(customFeedbackTimeout);
        customFeedbackTimeout = setTimeout(() => { customFeedbackEl.textContent = ''; }, 2500);
    };

    function abrirModal() {
        abrirTab('catalogo');
        buscaEl.value = '';
        expandidos.clear();
        renderCards();
        feedbackEl.textContent = '';
        modalEl.classList.remove('hidden');
    }
    function fecharModal() {
        modalEl.classList.add('hidden');
    }

    abrirBtn.onclick = abrirModal;
    fecharBtn.onclick = fecharModal;
    tabCatalogoBtn.onclick = () => abrirTab('catalogo');
    tabPersonalizadoBtn.onclick = () => abrirTab('personalizado');
    // Clicar no fundo escurecido (fora da caixa) também fecha.
    modalEl.onclick = (ev) => { if (ev.target === modalEl) fecharModal(); };

    if (modalItemEscHandler) document.removeEventListener('keydown', modalItemEscHandler);
    modalItemEscHandler = (ev) => {
        if (ev.key === 'Escape' && !modalEl.classList.contains('hidden')) fecharModal();
    };
    document.addEventListener('keydown', modalItemEscHandler);
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
    renderInventory(personagem, opts);

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