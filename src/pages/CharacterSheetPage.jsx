// ============================================================
// CharacterSheetPage.jsx
//
// Ficha do personagem (equivalente a sheet.html + javascript/
// character-sheet.js + javascript/script.js na versão vanilla): o
// pentagrama de atributos (clicar rola), Vida/Determinação/Defesa,
// Inventário (com a modal de adicionar item), a lista de Perícias e a
// Rolagem Personalizada com o log das últimas 4 rolagens.
//
// Vida/Determinação/Defesa/Inventário são editáveis direto na ficha e
// salvos automaticamente no Firestore (debounced, ver salvarCampos) —
// sem precisar passar pelo formulário de edição pra isso.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Characters } from '@/services/firebase';
import AttributePentagram from '@/components/AttributePentagram';
import { useDiceBox } from '@/hooks/useDiceBox';
import { playDiceRollSound } from '@/lib/diceSound';
import * as OP from '@/lib/pericias';
import * as OPI from '@/lib/itens';

const ATTR_MAP = [
    { key: 'agi', nome: 'Agilidade', label: 'AGI', posClass: 'pos-agi' },
    { key: 'int', nome: 'Intelecto', label: 'INT', posClass: 'pos-int' },
    { key: 'vig', nome: 'Vigor', label: 'VIG', posClass: 'pos-vig' },
    { key: 'pre', nome: 'Presença', label: 'PRE', posClass: 'pos-pre' },
    { key: 'for', nome: 'Força', label: 'FOR', posClass: 'pos-for' },
];

const GRAU_ABREV = { treinado: 'T', veterano: 'V', expert: 'E' };
const MAX_LOG_ENTRIES = 4;
let proximoLogId = 1;

// Monta o texto em itálico que aparece embaixo do nome de cada item no
// cartão do catálogo — varia conforme o grupo do item.
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

// Monta os pares label/valor da "linha de estatísticas" do cartão
// expandido — os campos variam conforme o grupo (armas mostram Dano/
// Crítico/Tipo/Munição, proteções mostram Defesa, munições mostram
// Compatibilidade etc.).
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

export default function CharacterSheetPage() {
    const { id } = useParams();
    const { user } = useOutletContext();
    const navigate = useNavigate();

    const [carregando, setCarregando] = useState(true);
    const [personagem, setPersonagem] = useState(null);
    const [inventario, setInventario] = useState([]);
    const [vidaAtual, setVidaAtual] = useState(0);
    const [detAtual, setDetAtual] = useState(0);
    const [defesaOutros, setDefesaOutros] = useState(0);
    const [rollLog, setRollLog] = useState([]);
    // Só a rolagem mais recente, pra mostrar em cima do quadrado dos
    // dados (sem histórico ali — o histórico já vive no log abaixo).
    const [ultimoResultado, setUltimoResultado] = useState(null);

    // --- Modal "Adicionar Item" ---
    const [modalAberto, setModalAberto] = useState(false);
    const [modalTab, setModalTab] = useState('catalogo');
    const [grupoAtivo, setGrupoAtivo] = useState(OPI.GRUPOS[0]?.chave || 'armas');
    const [busca, setBusca] = useState('');
    const [expandidos, setExpandidos] = useState(() => new Set());
    const [feedback, setFeedback] = useState('');
    const [customNome, setCustomNome] = useState('');
    const [customEspacos, setCustomEspacos] = useState(1);
    const [customEfeito, setCustomEfeito] = useState('');
    const [customFeedback, setCustomFeedback] = useState('');

    // --- Rolagem personalizada ---
    const [dieSides, setDieSides] = useState(20);
    const [diceQty, setDiceQty] = useState(1);
    const [diceMod, setDiceMod] = useState(0);

    const rollDiceAnimated = useDiceBox('#dice-box');

    // ---------------------------------------------------------------
    // Carrega o personagem
    // ---------------------------------------------------------------
    useEffect(() => {
        let cancelado = false;
        setCarregando(true);
        Characters.get(user.uid, id)
            .then(p => {
                if (cancelado) return;
                if (!p) {
                    window.alert('Esse personagem não existe (ou já foi excluído).');
                    navigate('/characters');
                    return;
                }
                setPersonagem(p);
                setInventario(Array.isArray(p.inventario) ? p.inventario : []);
                setDefesaOutros(Number(p.defesaOutros) || 0);

                const atributos = p.atributos || {};
                const trilha = p.trilha || 'Combatente';
                const nex = Number(p.nex) || 5;
                const vidaMax = OP.vidaMaxima(trilha, atributos.vig, nex);
                const detMax = OP.determinacaoMaxima(trilha, atributos.pre, nex);
                const vida = (typeof p.vidaAtual === 'number') ? Math.min(p.vidaAtual, vidaMax) : vidaMax;
                const det = (typeof p.determinacaoAtual === 'number') ? Math.min(p.determinacaoAtual, detMax) : detMax;
                setVidaAtual(vida);
                setDetAtual(det);
                // Se o máximo mudou desde a última vez salva (edição de NEX/
                // atributos), já grava os valores clampados de volta.
                if (p.vidaAtual !== vida || p.determinacaoAtual !== det) {
                    Characters.update(user.uid, id, { vidaAtual: vida, determinacaoAtual: det }).catch(() => {});
                }

                setRollLog([{ id: proximoLogId++, system: true, title: `Sessão iniciada — ${p.nome || ''}.` }]);
            })
            .catch(err => {
                console.error('[character-sheet] Erro ao carregar personagem:', err);
                window.alert('Não foi possível carregar o personagem: ' + (err.message || err));
                navigate('/characters');
            })
            .finally(() => {
                if (!cancelado) setCarregando(false);
            });
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user.uid]);

    // ---------------------------------------------------------------
    // Salvamento automático (debounced) — acumula os campos alterados
    // num objeto pendente e manda tudo junto 400ms depois da última
    // mudança, em vez de um request por clique.
    // ---------------------------------------------------------------
    const pendenteRef = useRef({});
    const saveTimeoutRef = useRef(null);
    const salvarCampos = useCallback((campos) => {
        Object.assign(pendenteRef.current, campos);
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            const aEnviar = pendenteRef.current;
            pendenteRef.current = {};
            Characters.update(user.uid, id, aEnviar).catch(err => {
                console.error('[character-sheet] Erro ao salvar vida/determinação/defesa/inventário:', err);
            });
        }, 400);
    }, [user.uid, id]);

    // ---------------------------------------------------------------
    // Log de rolagens (últimas 4)
    // ---------------------------------------------------------------
    const logMessage = useCallback((title, details, result, type = 'normal') => {
        setRollLog(prev => [{ id: proximoLogId++, title, details, result, type }, ...prev].slice(0, MAX_LOG_ENTRIES));
        // Mesma informação, só que "sem memória" — cada rolagem nova
        // substitui a anterior (ver .dice-box-result no CSS).
        setUltimoResultado({ id: proximoLogId, titulo: title, valor: result, tipo: type });
    }, []);

    async function rollDice(qty, sides) {
        // Tira o resultado anterior de cima do quadrado assim que uma
        // rolagem nova começa, em vez de deixá-lo lá até o novo valor
        // ficar pronto — some na hora do clique, o número novo só some
        // depois que a animação/física da rolagem atual terminar.
        setUltimoResultado(null);
        playDiceRollSound(qty);
        return rollDiceAnimated(`${qty}d${sides}`);
    }

    async function rollSystemDice(attrName, diceCount) {
        let rolls, finalResult, detailsString;
        if (diceCount > 0) {
            rolls = await rollDice(diceCount, 20);
            finalResult = Math.max(...rolls);
            detailsString = `[${rolls.map(r => r === finalResult ? `<b>${r}</b>` : r).join(', ')}]`;
        } else {
            rolls = await rollDice(2, 20);
            finalResult = Math.min(...rolls);
            detailsString = `Desvantagem (0): [${rolls.map(r => r === finalResult ? `<b>${r}</b>` : r).join(', ')}]`;
        }
        let type = 'normal';
        if (finalResult === 20) type = 'crit';
        if (finalResult === 1) type = 'fail';
        logMessage(attrName, detailsString, finalResult, type);
    }

    async function rollSkill(skillName, attrDice, bonus) {
        let rolls, bestDie;
        if (attrDice > 0) {
            rolls = await rollDice(attrDice, 20);
            bestDie = Math.max(...rolls);
        } else {
            rolls = await rollDice(2, 20);
            bestDie = Math.min(...rolls);
        }
        const total = bestDie + bonus;
        const details = `Dados: [${rolls.join(', ')}] (Melhor: ${bestDie}) + ${bonus}`;
        logMessage(skillName, details, total, bestDie === 20 ? 'crit' : 'normal');
    }

    async function handleRollSelectedDice() {
        const qty = parseInt(diceQty, 10) || 1;
        const mod = parseInt(diceMod, 10) || 0;
        const rolls = await rollDice(qty, dieSides);
        const sum = rolls.reduce((a, b) => a + b, 0);
        const total = sum + mod;
        const expression = `${qty}d${dieSides}${mod >= 0 ? '+' + mod : mod}`;
        const details = `[${rolls.join(' + ')}] ${mod !== 0 ? (mod > 0 ? '+ ' + mod : mod) : ''}`;
        logMessage(`Personalizada (${expression})`, details, total);
    }

    // ---------------------------------------------------------------
    // Vida / Determinação / Defesa
    // ---------------------------------------------------------------
    const atributos = personagem?.atributos || {};
    const trilha = personagem?.trilha || 'Combatente';
    const nex = Number(personagem?.nex) || 5;
    const vidaMax = useMemo(() => OP.vidaMaxima(trilha, atributos.vig, nex), [trilha, atributos.vig, nex]);
    const detMax = useMemo(() => OP.determinacaoMaxima(trilha, atributos.pre, nex), [trilha, atributos.pre, nex]);
    const defesaEquip = useMemo(() => OPI.defesaDoInventario(inventario), [inventario]);
    const defesaTotal = OP.defesaTotal(atributos.agi, defesaEquip, defesaOutros);

    function ajustarVida(delta) {
        const novo = Math.max(0, Math.min(vidaMax, vidaAtual + delta));
        setVidaAtual(novo);
        salvarCampos({ vidaAtual: novo });
    }
    function ajustarDet(delta) {
        const novo = Math.max(0, Math.min(detMax, detAtual + delta));
        setDetAtual(novo);
        salvarCampos({ determinacaoAtual: novo });
    }
    function handleDefesaOutrosChange(valor) {
        const v = parseInt(valor, 10) || 0;
        setDefesaOutros(v);
        salvarCampos({ defesaOutros: v });
    }

    // ---------------------------------------------------------------
    // Inventário
    // ---------------------------------------------------------------
    const forca = atributos.for || 0;
    const usados = useMemo(() => OPI.espacosUsados(inventario), [inventario]);
    const espacosMax = OPI.espacosMaximos(forca);
    const espacosLimite = OPI.espacosSobrecarga(forca);
    const estadoCarga = OPI.estadoCarga(usados, forca);

    function atualizarInventario(novoInventario) {
        setInventario(novoInventario);
        salvarCampos({ inventario: novoInventario });
    }

    function handleQtyDelta(index, delta) {
        const next = inventario.map((it, i) => i === index
            ? { ...it, quantidade: Math.max(1, (Number(it.quantidade) || 1) + delta) }
            : it);
        atualizarInventario(next);
    }
    function handleEquiparToggle(index) {
        const next = inventario.map((it, i) => i === index ? { ...it, equipado: !it.equipado } : it);
        atualizarInventario(next);
    }
    function handleRemoverItem(index) {
        atualizarInventario(inventario.filter((_, i) => i !== index));
    }

    let feedbackTimeoutRef = useRef(null);
    function mostrarFeedback(texto) {
        setFeedback(texto);
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => setFeedback(''), 2500);
    }

    function adicionarAoInventario(catalogItem) {
        const existenteIdx = inventario.findIndex(i => i.nome === catalogItem.nome && !i.custom);
        let next;
        if (existenteIdx !== -1) {
            next = inventario.map((it, i) => i === existenteIdx
                ? { ...it, quantidade: (Number(it.quantidade) || 1) + 1 }
                : it);
        } else {
            next = [...inventario, { ...catalogItem, quantidade: 1, equipado: false }];
        }
        atualizarInventario(next);
        mostrarFeedback(`"${catalogItem.nome}" adicionado ao inventário.`);
    }

    let customFeedbackTimeoutRef = useRef(null);
    function handleAdicionarCustom() {
        const nome = customNome.trim();
        if (!nome) {
            window.alert('Dê um nome para o item personalizado.');
            return;
        }
        const espacos = parseInt(customEspacos, 10) || 0;
        const efeito = customEfeito.trim();
        atualizarInventario([...inventario, { nome, categoria: 'Personalizado', espacos, efeito, quantidade: 1, equipado: false, custom: true }]);
        setCustomFeedback(`"${nome}" adicionado ao inventário.`);
        setCustomNome('');
        setCustomEspacos(1);
        setCustomEfeito('');
        clearTimeout(customFeedbackTimeoutRef.current);
        customFeedbackTimeoutRef.current = setTimeout(() => setCustomFeedback(''), 2500);
    }

    function abrirModal() {
        setModalTab('catalogo');
        setBusca('');
        setExpandidos(new Set());
        setFeedback('');
        setModalAberto(true);
    }
    function fecharModal() {
        setModalAberto(false);
    }

    useEffect(() => {
        if (!modalAberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') fecharModal();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [modalAberto]);

    function toggleExpandido(nome) {
        setExpandidos(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

    const cardsFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return OPI.ITENS_CATALOGO.filter(item => {
            if (item.grupo !== grupoAtivo) return false;
            if (termo && !item.nome.toLowerCase().includes(termo)) return false;
            return true;
        });
    }, [grupoAtivo, busca]);

    // ---------------------------------------------------------------
    // Perícias
    // ---------------------------------------------------------------
    const salvasPorNome = useMemo(
        () => Object.fromEntries((personagem?.pericias || []).map(p => [p.nome, p])),
        [personagem]
    );

    if (carregando || !personagem) {
        return <div className="app-loading">Carregando...</div>;
    }

    const pentagramNodes = ATTR_MAP.map(({ key, nome, label, posClass }) => {
        const valor = Number(atributos[key]) || 0;
        return {
            key,
            label,
            posClass,
            content: <button className="attr-btn" onClick={() => rollSystemDice(nome, valor)}>{valor}</button>,
        };
    });

    return (
        <div className="screen screen-sheet">
            <div className="sheet-topbar">
                <button className="btn-secondary" onClick={() => navigate('/characters')}>&larr; Meus Personagens</button>
                <div className="sheet-topbar-title">
                    <span>{personagem.nome || '-'}</span>
                    <span className="sheet-character-trilha">{personagem.trilha ? `(${personagem.trilha})` : ''}</span>
                    <span className="sheet-character-nex">{personagem.nex ? `NEX ${Number(personagem.nex)}%` : ''}</span>
                </div>
                <button className="btn-secondary" onClick={() => navigate(`/form/${encodeURIComponent(id)}`)}>Editar</button>
            </div>

            <div className="dice-box-wrap">
                <div id="dice-box"></div>
                {ultimoResultado && (
                    <div
                        className={`dice-box-result${ultimoResultado.tipo === 'crit' ? ' crit-success' : ''}${ultimoResultado.tipo === 'fail' ? ' crit-fail' : ''}`}
                        key={ultimoResultado.id}
                        aria-hidden="true"
                    >
                        <span className="dice-box-result-titulo">{ultimoResultado.titulo}</span>
                        <span className="dice-box-result-valor">{ultimoResultado.valor}</span>
                    </div>
                )}
            </div>

            <div className="character-sheet">
                <section className="attributes-section">
                    <AttributePentagram gradientId="opRitualGlow" nodes={pentagramNodes} />
                    <div className="pentagram-footer">
                        <small>Clique no número para rolar</small>
                    </div>

                    <div className="vitals-block">
                        <div className="vital-row">
                            <div className="vital-label">VIDA</div>
                            <div className="vital-bar-wrap">
                                <button className="vital-btn" title="-5" onClick={() => ajustarVida(-5)}>«</button>
                                <button className="vital-btn" title="-1" onClick={() => ajustarVida(-1)}>‹</button>
                                <div className="vital-bar vida-bar">
                                    <div className="vital-bar-fill vida-fill" style={{ width: `${vidaMax > 0 ? Math.max(0, Math.min(100, (vidaAtual / vidaMax) * 100)) : 0}%` }}></div>
                                    <span className="vital-bar-text">{vidaAtual} / {vidaMax}</span>
                                </div>
                                <button className="vital-btn" title="+1" onClick={() => ajustarVida(1)}>&rsaquo;</button>
                                <button className="vital-btn" title="+5" onClick={() => ajustarVida(5)}>&raquo;</button>
                            </div>
                        </div>

                        <div className="vital-row">
                            <div className="vital-label">DETERMINAÇÃO</div>
                            <div className="vital-bar-wrap">
                                <button className="vital-btn" title="-5" onClick={() => ajustarDet(-5)}>«</button>
                                <button className="vital-btn" title="-1" onClick={() => ajustarDet(-1)}>‹</button>
                                <div className="vital-bar det-bar">
                                    <div className="vital-bar-fill det-fill" style={{ width: `${detMax > 0 ? Math.max(0, Math.min(100, (detAtual / detMax) * 100)) : 0}%` }}></div>
                                    <span className="vital-bar-text">{detAtual} / {detMax}</span>
                                </div>
                                <button className="vital-btn" title="+1" onClick={() => ajustarDet(1)}>&rsaquo;</button>
                                <button className="vital-btn" title="+5" onClick={() => ajustarDet(5)}>&raquo;</button>
                            </div>
                        </div>

                        <div className="defesa-row">
                            <div className="defesa-box">
                                <span className="defesa-label">DEFESA</span>
                                <span className="defesa-total">{defesaTotal}</span>
                            </div>
                            <div className="defesa-formula">
                                10 + AGI +
                                <span className="defesa-input defesa-equip-readonly" title="Vem da proteção equipada no Inventário">{defesaEquip}</span>
                                <small>equip.</small> +
                                <input
                                    type="number"
                                    className="defesa-input"
                                    value={defesaOutros}
                                    title="Outros bônus (talentos, condições)"
                                    onChange={e => handleDefesaOutrosChange(e.target.value)}
                                />
                                <small>outros</small>
                            </div>
                        </div>
                    </div>

                    <div className="inventory-section">
                        <div className="inventory-section-header">
                            <h3>Inventário</h3>
                            <button type="button" className="btn-add-item" title="Adicionar item" onClick={abrirModal}>+</button>
                        </div>

                        <div className="inventory-carga-info">
                            <span>Carga: <strong>{usados} / {espacosMax}</strong> espaços</span>
                            <div className="inventory-carga-bar">
                                <div
                                    className={`inventory-carga-bar-fill${estadoCarga !== 'normal' ? ' ' + estadoCarga : ''}`}
                                    style={{ width: `${Math.min(100, (usados / Math.max(1, espacosLimite)) * 100)}%` }}
                                ></div>
                            </div>
                            {estadoCarga === 'sobrecarregado' && (
                                <span className="inventory-carga-aviso">
                                    Sobrecarregado (acima de {espacosMax}): -5 em Atletismo/Furtividade, -3m de deslocamento.
                                </span>
                            )}
                            {estadoCarga === 'excesso' && (
                                <span className="inventory-carga-aviso excesso">
                                    Acima do limite absoluto ({espacosLimite}) — remova itens ou aumente a Força.
                                </span>
                            )}
                        </div>

                        <div className="inventory-list">
                            {inventario.length === 0 && (
                                <div className="inventory-empty">Nenhum item no inventário ainda.</div>
                            )}
                            {inventario.map((item, index) => (
                                <div className={`inventory-item${item.equipado ? ' equipado' : ''}`} key={index}>
                                    <span className="inventory-item-nome">{item.nome}</span>
                                    <span className="inventory-item-categoria">{item.categoria || 'Personalizado'}</span>
                                    <span className="inventory-item-espacos">{item.espacos || 0} esp.</span>
                                    <div className="inventory-item-qty">
                                        <button type="button" onClick={() => handleQtyDelta(index, -1)}>-</button>
                                        <span>x{Number(item.quantidade) || 1}</span>
                                        <button type="button" onClick={() => handleQtyDelta(index, 1)}>+</button>
                                    </div>
                                    <div className="inventory-item-acoes">
                                        {item.grupo === 'protecoes' && (
                                            <button
                                                type="button"
                                                className={`btn-equipar${item.equipado ? ' equipado' : ''}`}
                                                onClick={() => handleEquiparToggle(index)}
                                            >
                                                {item.equipado ? 'Vestida' : 'Vestir'}
                                            </button>
                                        )}
                                        <button type="button" className="btn-danger" onClick={() => handleRemoverItem(index)}>✕</button>
                                    </div>
                                    {item.efeito && <span className="inventory-item-efeito">{item.efeito}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="skills-section">
                    <h3>Perícias</h3>
                    <div className="skills-header">
                        <span>Nome</span>
                        <span>Dados</span>
                        <span>Bônus</span>
                        <span>Treino</span>
                        <span>Ação</span>
                    </div>
                    <div className="skills-list">
                        {OP.PERICIAS_CATALOGO.map(catItem => {
                            const salva = salvasPorNome[catItem.nome];
                            const treinado = !!(salva && salva.treinado);
                            const valorAtributo = Number(atributos[catItem.atributo]) || 0;
                            const bonus = treinado ? (Number(salva.bonus) || 0) : 0;
                            const grau = treinado ? (salva.grau || 'treinado') : null;
                            const bloqueada = !!catItem.somenteTreinada && !treinado;
                            const labelAtributo = ATTR_MAP.find(a => a.key === catItem.atributo)?.label || '?';

                            return (
                                <div className={`skill-item${treinado ? ' treinada' : ''}${bloqueada ? ' bloqueada' : ''}`} key={catItem.nome}>
                                    <span className="skill-name">
                                        {catItem.nome}{catItem.somenteTreinada ? '*' : ''}{' '}
                                        <span className="skill-attr-ref">({labelAtributo})</span>
                                    </span>
                                    <span className="skill-dice">{valorAtributo > 0 ? `${valorAtributo}d20` : '2d20↓'}</span>
                                    <span className="skill-bonus">{bonus >= 0 ? `+${bonus}` : `${bonus}`}</span>
                                    <span
                                        className="skill-treino"
                                        title={treinado ? (OP.GRAU_LABEL[grau] || 'Treinado') : (bloqueada ? 'Só pode ser usada treinada' : 'Destreinado')}
                                    >
                                        {treinado ? (GRAU_ABREV[grau] || 'T') : '-'}
                                    </span>
                                    <button
                                        className="btn-roll-skill"
                                        disabled={bloqueada}
                                        onClick={() => rollSkill(catItem.nome, valorAtributo, bonus)}
                                    >
                                        Rolar
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="dice-section">
                    <div className="custom-roller">
                        <h3>Rolagem Personalizada</h3>

                        <div className="dice-type-selector">
                            {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                                <button
                                    key={sides}
                                    className={`die-btn${dieSides === sides ? ' active' : ''}`}
                                    onClick={() => setDieSides(sides)}
                                >
                                    d{sides}
                                </button>
                            ))}
                        </div>

                        <div className="dice-controls">
                            <div className="control-group">
                                <label>Qtd.</label>
                                <input type="number" min={1} value={diceQty} onChange={e => setDiceQty(e.target.value)} />
                            </div>
                            <div className="control-group">
                                <label>Bônus</label>
                                <input type="number" value={diceMod} onChange={e => setDiceMod(e.target.value)} />
                            </div>
                            <button className="btn-action" onClick={handleRollSelectedDice}>ROLAR</button>
                        </div>
                    </div>

                    <div className="log-container">
                        {rollLog.length === 0 ? (
                            <div className="log-entry system-msg">Sessão iniciada.</div>
                        ) : (
                            rollLog.map(entry => entry.system ? (
                                <div className="log-entry system-msg" key={entry.id}>{entry.title}</div>
                            ) : (
                                <div
                                    className={`log-entry${entry.type === 'crit' ? ' crit-success' : ''}${entry.type === 'fail' ? ' crit-fail' : ''}`}
                                    key={entry.id}
                                >
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{entry.title}</div>
                                    <div style={{ color: '#aaa', fontSize: '0.85em' }} dangerouslySetInnerHTML={{ __html: entry.details }}></div>
                                    <div className="result-highlight">{entry.result}</div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {modalAberto && (
                <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) fecharModal(); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Adicionar Item</h3>
                            <button type="button" className="modal-close" title="Fechar" onClick={fecharModal}>&times;</button>
                        </div>

                        <div className="modal-item-tabs">
                            <button type="button" className={`modal-tab${modalTab === 'catalogo' ? ' active' : ''}`} onClick={() => setModalTab('catalogo')}>Catálogo</button>
                            <button type="button" className={`modal-tab${modalTab === 'personalizado' ? ' active' : ''}`} onClick={() => setModalTab('personalizado')}>Personalizado</button>
                        </div>

                        {modalTab === 'catalogo' && (
                            <div className="modal-tab-content">
                                <div className="modal-catalogo-subtabs">
                                    {OPI.GRUPOS.map(g => (
                                        <button
                                            type="button"
                                            key={g.chave}
                                            className={`modal-subtab${g.chave === grupoAtivo ? ' active' : ''}`}
                                            onClick={() => setGrupoAtivo(g.chave)}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>

                                <input
                                    type="text"
                                    className="modal-search-input"
                                    placeholder="Buscar item..."
                                    value={busca}
                                    onChange={e => setBusca(e.target.value)}
                                />

                                <div className="modal-item-cards">
                                    {cardsFiltrados.length === 0 && (
                                        <div className="modal-item-cards-empty">Nenhum item encontrado.</div>
                                    )}
                                    {cardsFiltrados.map(item => {
                                        const aberto = expandidos.has(item.nome);
                                        return (
                                            <div className={`modal-item-card${aberto ? ' expanded' : ''}`} key={item.nome}>
                                                <div className="modal-item-card-header" onClick={() => toggleExpandido(item.nome)}>
                                                    <span className="modal-item-card-chevron">▶</span>
                                                    <div className="modal-item-card-info">
                                                        <div className="modal-item-card-title-row">
                                                            <span className="modal-item-card-nome">{item.nome}</span>
                                                            <span className="modal-item-card-badge">{item.categoria || '—'}</span>
                                                        </div>
                                                        <div className="modal-item-card-sub">{subcategoriaTexto(item)}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="modal-item-card-add"
                                                        title="Adicionar ao inventário"
                                                        onClick={ev => { ev.stopPropagation(); adicionarAoInventario(item); }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className={`modal-item-card-body${aberto ? '' : ' hidden'}`}>
                                                    <div className="modal-item-stats-grid">
                                                        {statsDoItem(item).map(({ label, valor }) => (
                                                            <div className="modal-item-stat" key={label}>
                                                                <span className="modal-item-stat-label">{label}</span>
                                                                <span className="modal-item-stat-value">{valor}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {item.efeito && <div className="modal-item-card-efeito">{item.efeito}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="modal-item-actions">
                                    <span className="modal-item-feedback">{feedback}</span>
                                </div>
                            </div>
                        )}

                        {modalTab === 'personalizado' && (
                            <div className="modal-tab-content">
                                <div className="control-group full">
                                    <label>Nome do item</label>
                                    <input type="text" placeholder="Ex: Amuleto de família" value={customNome} onChange={e => setCustomNome(e.target.value)} />
                                </div>
                                <div className="control-group full">
                                    <label>Espaços ocupados</label>
                                    <input type="number" min={0} value={customEspacos} onChange={e => setCustomEspacos(e.target.value)} />
                                </div>
                                <div className="control-group full">
                                    <label>Descrição / efeito (opcional)</label>
                                    <textarea rows={3} placeholder="Pra que serve, bônus, restrições..." value={customEfeito} onChange={e => setCustomEfeito(e.target.value)}></textarea>
                                </div>
                                <div className="modal-item-actions">
                                    <span className="modal-custom-feedback">{customFeedback}</span>
                                    <button type="button" className="btn-action" onClick={handleAdicionarCustom}>Adicionar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
