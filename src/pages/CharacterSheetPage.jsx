// ============================================================
// CharacterSheetPage.jsx
//
// Ficha do personagem (equivalente a sheet.html + javascript/
// character-sheet.js + javascript/script.js na versão vanilla): o
// pentagrama de atributos (clicar rola), Vida/PE/Defesa, e uma coluna
// com abas — COMBATE (Ataques + Rolagem Personalizada + log),
// RITUAIS (com a modal de adicionar ritual) e INVENTÁRIO (com a modal
// de adicionar item) — mais a lista de Perícias na coluna do meio.
//
// "PE" na tela é o mesmo recurso que o código chama internamente de
// "Determinação" (mesma fórmula, mesmo campo no Firestore
// `determinacaoAtual`/`determinacaoMaxima` — não renomeado por baixo
// dos panos de propósito, pra não migrar dados de personagens já
// salvos) — só o RÓTULO visível virou "PE / Pontos de Esforço", que é
// o nome oficial do livro (rituais.js já usa "PE" no custo de cada
// círculo, então isso alinha o nome na tela com o que já existia na
// mecânica). O botão "Conjurar" de cada ritual conhecido desconta esse
// custo do PE atual.
//
// Vida/PE/Defesa/Inventário/Rituais/Ataques são editáveis direto na
// ficha e salvos automaticamente no Firestore (debounced, ver
// salvarCampos) — sem precisar passar pelo formulário de edição pra isso.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Characters } from '@/services/firebase';
import AttributePentagram from '@/components/AttributePentagram';
import { useDiceBox } from '@/hooks/useDiceBox';
import { playDiceRollSound, playRitualCastSound } from '@/lib/diceSound';
import * as OP from '@/lib/pericias';
import * as OPI from '@/lib/itens';
import * as OPR from '@/lib/rituais';

const ATTR_MAP = [
    { key: 'agi', nome: 'Agilidade', label: 'AGI', posClass: 'pos-agi' },
    { key: 'int', nome: 'Intelecto', label: 'INT', posClass: 'pos-int' },
    { key: 'vig', nome: 'Vigor', label: 'VIG', posClass: 'pos-vig' },
    { key: 'pre', nome: 'Presença', label: 'PRE', posClass: 'pos-pre' },
    { key: 'for', nome: 'Força', label: 'FOR', posClass: 'pos-for' },
];

// Ícone de lixeira (SVG inline, sem depender de nenhuma lib de ícones)
// — usado nos 3 botões de "remover" da ficha (item do inventário,
// ritual conhecido, ataque cadastrado), no lugar do "✕" de texto que
// tinha antes só no de ritual/ataque (e no inventário nem isso, era um
// botão retangular diferente — ver .btn-danger em index.css). Os três
// agora usam o mesmo ícone dentro do mesmo botão circular
// (.modal-item-card-remove), pra não ter 2 estilos de "remover"
// diferentes dependendo da aba.
function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </svg>
    );
}

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

// Vira nome de classe CSS (sem acento, minúsculo) — os 5 elementos de
// rituais.js (Conhecimento/Energia/Morte/Sangue/Medo) não têm acento,
// mas a normalização fica aqui pra não quebrar se algum dia mudar.
function elementoSlug(elemento) {
    return String(elemento || '').trim().toLowerCase();
}

// Texto curto embaixo do nome no cartão de ritual (igual em espírito a
// subcategoriaTexto, mas os campos de ritual são outros).
function subtituloRitual(ritual) {
    return `${ritual.execucao || '—'} · Alcance ${ritual.alcance || '—'}`;
}

// Monta os pares label/valor da "linha de estatísticas" do cartão de
// ritual expandido — características fixas de todo ritual (ver
// rituais.js), mais o custo em PE (que vem do círculo, não do próprio
// ritual — ver CUSTO_PE_POR_CIRCULO) e o dano/cura só quando existe.
function statsDoRitual(ritual) {
    const stats = [
        { label: 'Execução', valor: ritual.execucao || '—' },
        { label: 'Alcance', valor: ritual.alcance || '—' },
        { label: ritual.area ? 'Área' : 'Alvo', valor: ritual.area || ritual.alvo || '—' },
        { label: 'Duração', valor: ritual.duracao || '—' },
    ];
    if (ritual.resistencia) stats.push({ label: 'Resistência', valor: ritual.resistencia });
    stats.push({ label: 'Custo', valor: `${OPR.CUSTO_PE_POR_CIRCULO[ritual.circulo] || '?'} PE` });
    if (ritual.dano) stats.push({ label: 'Dano/Cura', valor: ritual.dano });
    return stats;
}

// Tenta ler uma notação de dado tipo "2d6", "1d4+2" ou "2d6-1" no campo
// livre de dano de um Ataque, pra dar pra rolar direto pelo botão de
// dado do cartão. Ataques são sempre digitados à mão (não existe um
// "catálogo de ataques" — cada mesa tem os seus), então o campo é
// texto livre e pode não bater com esse formato (ex: "Especial, veja
// descrição") — nesse caso devolve null e o botão de rolar avisa.
function parseNotacaoDano(str) {
    const m = /(\d+)\s*d\s*(\d+)(?:\s*([+-])\s*(\d+))?/i.exec(String(str || ''));
    if (!m) return null;
    const qty = parseInt(m[1], 10);
    const sides = parseInt(m[2], 10);
    const sinal = m[3] === '-' ? -1 : 1;
    const mod = m[4] ? sinal * parseInt(m[4], 10) : 0;
    if (!qty || !sides) return null;
    return { qty, sides, mod };
}

export default function CharacterSheetPage() {
    const { id } = useParams();
    const { user } = useOutletContext();
    const navigate = useNavigate();

    const [carregando, setCarregando] = useState(true);
    const [personagem, setPersonagem] = useState(null);
    const [inventario, setInventario] = useState([]);
    const [rituais, setRituais] = useState([]);
    const [ataques, setAtaques] = useState([]);
    const [vidaAtual, setVidaAtual] = useState(0);
    const [detAtual, setDetAtual] = useState(0);
    // Contador que só serve pra forçar o React a "trocar" o key do bloco
    // de Vida/PE (ver JSX mais abaixo) toda vez que um ritual é
    // conjurado, re-disparando a animação CSS .pe-spent-flash mesmo que
    // o valor de PE mude repetidamente em sequência — sinal visual de
    // que o PE foi gasto, visível em qualquer aba (não só no log da
    // aba Combate).
    const [peFlash, setPeFlash] = useState(0);
    const [defesaOutros, setDefesaOutros] = useState(0);
    // Origem e Resistências não têm nenhuma fonte estruturada no
    // projeto (Origem nunca foi um campo da criação de personagem;
    // Resistências dependeria de "ler" o texto livre de efeito de cada
    // item/ritual, o que não é confiável) — por isso são campos de
    // texto livre, editados direto na ficha e salvos como os outros
    // campos (ver salvarCampos). Proteção, por outro lado, já tem uma
    // fonte de verdade (o item de proteção equipado no Inventário), e
    // por isso é só exibida (ver `protecaoTexto` mais abaixo), não
    // editável aqui.
    const [origem, setOrigem] = useState('');
    const [resistencias, setResistencias] = useState('');
    const [rollLog, setRollLog] = useState([]);
    // Só a rolagem mais recente, pra mostrar em cima do quadrado dos
    // dados (sem histórico ali — o histórico já vive no log abaixo).
    const [ultimoResultado, setUltimoResultado] = useState(null);

    // --- Aba ativa da coluna 3 (Combate / Rituais / Inventário) ---
    const [abaAtiva, setAbaAtiva] = useState('combate');

    // --- Modal "Novo Ataque" ---
    const [modalAtaqueAberto, setModalAtaqueAberto] = useState(false);
    const [ataqueNome, setAtaqueNome] = useState('');
    const [ataqueDano, setAtaqueDano] = useState('');
    const [ataqueCritico, setAtaqueCritico] = useState('');
    const [ataqueAlcance, setAtaqueAlcance] = useState('');
    const [ataqueObs, setAtaqueObs] = useState('');
    const [buscaAtaque, setBuscaAtaque] = useState('');
    const [expandidosAtaques, setExpandidosAtaques] = useState(() => new Set());

    // --- Modal "Adicionar Item" ---
    const [modalAberto, setModalAberto] = useState(false);
    const [modalTab, setModalTab] = useState('catalogo');
    const [grupoAtivo, setGrupoAtivo] = useState(OPI.GRUPOS[0]?.chave || 'armas');
    const [busca, setBusca] = useState('');
    const [expandidos, setExpandidos] = useState(() => new Set());
    const [customNome, setCustomNome] = useState('');
    const [customEspacos, setCustomEspacos] = useState(1);
    const [customEfeito, setCustomEfeito] = useState('');

    // --- Modal "Adicionar Ritual" (mesmo espírito da de item, mas
    // filtrando por Elemento + Círculo em vez de grupo/categoria) ---
    const [modalRitualAberto, setModalRitualAberto] = useState(false);
    const [elementoAtivo, setElementoAtivo] = useState(OPR.ELEMENTOS_RITUAL[0]);
    const [circuloFiltro, setCirculoFiltro] = useState(0); // 0 = todos os círculos
    const [buscaRitual, setBuscaRitual] = useState('');
    const [expandidosRituais, setExpandidosRituais] = useState(() => new Set());
    // Expandir/recolher os cartões da lista de "Rituais Conhecidos" na
    // própria ficha (Set separado do usado dentro da modal).
    const [expandidosConhecidos, setExpandidosConhecidos] = useState(() => new Set());

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
                setRituais(Array.isArray(p.rituais) ? p.rituais : []);
                setAtaques(Array.isArray(p.ataques) ? p.ataques : []);
                setDefesaOutros(Number(p.defesaOutros) || 0);
                setOrigem(p.origem || '');
                setResistencias(p.resistencias || '');

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
    const peRodada = useMemo(() => OP.peRodadaPorNex(nex), [nex]);
    // Texto do campo "Proteção" — nome(s) da(s) proteção(ões) equipada(s)
    // no Inventário agora mesmo (mesma fonte de verdade do bônus de
    // Defesa acima), não um campo digitado à parte que poderia ficar
    // desatualizado se o jogador trocar de armadura.
    const protecaoTexto = useMemo(() => {
        const equipadas = inventario.filter(it => it.grupo === 'protecoes' && it.equipado).map(it => it.nome);
        return equipadas.length ? equipadas.join(', ') : 'Nenhuma';
    }, [inventario]);

    function handleOrigemChange(valor) {
        setOrigem(valor);
        salvarCampos({ origem: valor });
    }
    function handleResistenciasChange(valor) {
        setResistencias(valor);
        salvarCampos({ resistencias: valor });
    }

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
        toast.success(`"${catalogItem.nome}" adicionado ao inventário.`);
    }

    function handleAdicionarCustom() {
        const nome = customNome.trim();
        if (!nome) {
            window.alert('Dê um nome para o item personalizado.');
            return;
        }
        const espacos = parseInt(customEspacos, 10) || 0;
        const efeito = customEfeito.trim();
        atualizarInventario([...inventario, { nome, categoria: 'Personalizado', espacos, efeito, quantidade: 1, equipado: false, custom: true }]);
        toast.success(`"${nome}" adicionado ao inventário.`);
        setCustomNome('');
        setCustomEspacos(1);
        setCustomEfeito('');
    }

    function abrirModal() {
        setModalTab('catalogo');
        setBusca('');
        setExpandidos(new Set());
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
    // Rituais
    // ---------------------------------------------------------------
    // Até que círculo o NEX atual libera (só faz sentido pra Ocultista —
    // ver circuloRitualLiberado em pericias.js). É só informativo: o app
    // não impede adicionar um ritual de círculo mais alto, do mesmo jeito
    // que o inventário não impede carregar mais peso que o permitido —
    // só avisa.
    const circuloLiberado = useMemo(
        () => (trilha === 'Ocultista' ? OP.circuloRitualLiberado(nex) : 0),
        [trilha, nex]
    );

    function atualizarRituais(novosRituais) {
        setRituais(novosRituais);
        salvarCampos({ rituais: novosRituais });
    }

    function handleRemoverRitual(index) {
        atualizarRituais(rituais.filter((_, i) => i !== index));
    }

    function adicionarRitual(catalogRitual) {
        // Diferente do inventário (onde dá pra ter várias facas), um
        // ritual só faz sentido conhecer uma vez — ignora duplicata.
        if (rituais.some(r => r.nome === catalogRitual.nome)) {
            toast.error(`Você já conhece "${catalogRitual.nome}".`);
            return;
        }
        atualizarRituais([...rituais, { ...catalogRitual }]);
        toast.success(`"${catalogRitual.nome}" adicionado aos rituais.`);
    }

    function abrirModalRituais() {
        setElementoAtivo(OPR.ELEMENTOS_RITUAL[0]);
        setCirculoFiltro(0);
        setBuscaRitual('');
        setExpandidosRituais(new Set());
        setModalRitualAberto(true);
    }
    function fecharModalRituais() {
        setModalRitualAberto(false);
    }

    useEffect(() => {
        if (!modalRitualAberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') fecharModalRituais();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [modalRitualAberto]);

    function toggleExpandidoRitual(nome) {
        setExpandidosRituais(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

    function toggleExpandidoConhecido(nome) {
        setExpandidosConhecidos(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

    const cardsFiltradosRituais = useMemo(() => {
        const termo = buscaRitual.trim().toLowerCase();
        return OPR.rituaisDoElemento(elementoAtivo).filter(ritual => {
            if (circuloFiltro && ritual.circulo !== circuloFiltro) return false;
            if (termo && !ritual.nome.toLowerCase().includes(termo)) return false;
            return true;
        });
    }, [elementoAtivo, circuloFiltro, buscaRitual]);

    // Desconta o custo em PE do ritual (fixo por círculo — ver
    // CUSTO_PE_POR_CIRCULO em rituais.js) e registra no log, igual a
    // uma rolagem normal (mensagem de sistema, sem valor de dado).
    //
    // Antes disso só "aparecia" no log (que só existe na aba Combate) —
    // quem tava na aba Rituais quando conjurava não tinha nenhum sinal
    // óbvio de que o PE saiu dali, além do número mudando no canto. Por
    // isso, além do log, toca um som (playRitualCastSound) e faz o
    // bloco de VIDA/PE piscar por um instante (peFlash + .pe-spent-flash
    // no CSS) — funciona mesmo se a aba ativa não for Combate, porque o
    // bloco de Vida/PE fica sempre visível na coluna 1.
    function conjurarRitual(ritual) {
        const custo = OPR.CUSTO_PE_POR_CIRCULO[ritual.circulo] || 0;
        if (detAtual < custo) {
            toast.error(`PE insuficiente pra conjurar "${ritual.nome}" (precisa de ${custo}).`);
            return;
        }
        const novo = Math.max(0, detAtual - custo);
        setDetAtual(novo);
        salvarCampos({ determinacaoAtual: novo });
        setRollLog(prev => [{ id: proximoLogId++, system: true, title: `Ritual: ${ritual.nome} conjurado (-${custo} PE).` }, ...prev].slice(0, MAX_LOG_ENTRIES));
        toast.success(`"${ritual.nome}" conjurado! -${custo} PE (restam ${novo}/${detMax}).`);
        playRitualCastSound();
        setPeFlash(f => f + 1);
    }

    // ---------------------------------------------------------------
    // Ataques (lista livre — cada mesa/personagem tem os seus, não
    // existe um "catálogo" pra escolher como em Itens/Rituais, então a
    // modal de adicionar é sempre o formulário em branco).
    // ---------------------------------------------------------------
    function atualizarAtaques(novosAtaques) {
        setAtaques(novosAtaques);
        salvarCampos({ ataques: novosAtaques });
    }

    function handleRemoverAtaque(index) {
        atualizarAtaques(ataques.filter((_, i) => i !== index));
    }

    function toggleExpandidoAtaque(nome) {
        setExpandidosAtaques(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

    function abrirModalAtaque() {
        setAtaqueNome('');
        setAtaqueDano('');
        setAtaqueCritico('');
        setAtaqueAlcance('');
        setAtaqueObs('');
        setModalAtaqueAberto(true);
    }
    function fecharModalAtaque() {
        setModalAtaqueAberto(false);
    }

    useEffect(() => {
        if (!modalAtaqueAberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') fecharModalAtaque();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [modalAtaqueAberto]);

    function handleAdicionarAtaque() {
        const nome = ataqueNome.trim();
        if (!nome) {
            window.alert('Dê um nome para o ataque.');
            return;
        }
        atualizarAtaques([...ataques, {
            nome,
            dano: ataqueDano.trim(),
            critico: ataqueCritico.trim(),
            alcance: ataqueAlcance.trim(),
            observacoes: ataqueObs.trim(),
        }]);
        fecharModalAtaque();
    }

    async function rollAtaque(ataque) {
        const parsed = parseNotacaoDano(ataque.dano);
        if (!parsed) {
            window.alert(`Não entendi a notação de dano de "${ataque.nome}" (ex: 2d6, 1d4+2) — role manualmente.`);
            return;
        }
        const rolls = await rollDice(parsed.qty, parsed.sides);
        const sum = rolls.reduce((a, b) => a + b, 0) + parsed.mod;
        const details = `[${rolls.join(' + ')}]${parsed.mod !== 0 ? (parsed.mod > 0 ? ` + ${parsed.mod}` : ` ${parsed.mod}`) : ''}`;
        logMessage(`${ataque.nome} (dano)`, details, sum);
    }

    const ataquesFiltrados = useMemo(() => {
        const termo = buscaAtaque.trim().toLowerCase();
        if (!termo) return ataques;
        return ataques.filter(a => a.nome.toLowerCase().includes(termo));
    }, [ataques, buscaAtaque]);

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

                    <div className="identity-block">
                        <div className="identity-row">
                            <div className="identity-field">
                                <label className="identity-field-label" htmlFor="campo-origem">Origem</label>
                                <input
                                    id="campo-origem"
                                    type="text"
                                    placeholder="Ex: Policial"
                                    value={origem}
                                    onChange={e => handleOrigemChange(e.target.value)}
                                />
                            </div>
                            <div className="identity-field">
                                <span className="identity-field-label">Classe</span>
                                <span className="identity-field-value" title="Editável na tela de Editar personagem">{trilha || '—'}</span>
                            </div>
                        </div>
                        <div className="identity-row">
                            <div className="identity-field">
                                <span className="identity-field-label">NEX</span>
                                <span className="identity-field-value" title="Editável na tela de Editar personagem">{nex}%</span>
                            </div>
                            <div className="identity-field">
                                <span className="identity-field-label">PE / Rodada</span>
                                <span className="identity-field-value" title="Quanto PE dá pra gastar numa única rodada, pela Tabela 1.2 do livro">{peRodada}</span>
                            </div>
                        </div>
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
                            <div className="vital-label">PE <small className="vital-label-sub">Pontos de Esforço</small></div>
                            <div className="vital-bar-wrap">
                                <button className="vital-btn" title="-5" onClick={() => ajustarDet(-5)}>«</button>
                                <button className="vital-btn" title="-1" onClick={() => ajustarDet(-1)}>‹</button>
                                <div key={peFlash} className={`vital-bar det-bar${peFlash > 0 ? ' pe-spent-flash' : ''}`}>
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

                        <div className="protecao-resistencias-block">
                            <div className="identity-field">
                                <span className="identity-field-label">Proteção</span>
                                <span className="identity-field-value" title="Vem da proteção equipada no Inventário">{protecaoTexto}</span>
                            </div>
                            <div className="identity-field">
                                <label className="identity-field-label" htmlFor="campo-resistencias">Resistências</label>
                                <input
                                    id="campo-resistencias"
                                    type="text"
                                    placeholder="Ex: Resistência a Sangue 2 (colete)"
                                    value={resistencias}
                                    onChange={e => handleResistenciasChange(e.target.value)}
                                />
                            </div>
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

                <section className="sheet-tabs-section">
                    <nav className="sheet-tabs-nav">
                        <button
                            type="button"
                            className={`sheet-tab-btn${abaAtiva === 'combate' ? ' active' : ''}`}
                            onClick={() => setAbaAtiva('combate')}
                        >
                            Combate
                        </button>
                        <button
                            type="button"
                            className={`sheet-tab-btn${abaAtiva === 'rituais' ? ' active' : ''}`}
                            onClick={() => setAbaAtiva('rituais')}
                        >
                            Rituais
                        </button>
                        <button
                            type="button"
                            className={`sheet-tab-btn${abaAtiva === 'inventario' ? ' active' : ''}`}
                            onClick={() => setAbaAtiva('inventario')}
                        >
                            Inventário
                        </button>
                    </nav>

                    <div className="sheet-tab-panel">
                        {abaAtiva === 'combate' && (
                            <div className="tab-panel-combate">
                                <div className="ataques-section-header">
                                    <input
                                        type="text"
                                        className="modal-search-input tab-filter-input"
                                        placeholder="Filtrar ataques..."
                                        value={buscaAtaque}
                                        onChange={e => setBuscaAtaque(e.target.value)}
                                    />
                                    <button type="button" className="btn-add-item" title="Novo ataque" onClick={abrirModalAtaque}>+</button>
                                </div>

                                <div className="ataques-list">
                                    {ataquesFiltrados.length === 0 && (
                                        <div className="inventory-empty">
                                            {ataques.length === 0 ? 'Nenhum ataque cadastrado ainda.' : 'Nenhum ataque encontrado.'}
                                        </div>
                                    )}
                                    {ataquesFiltrados.map((ataque, index) => {
                                        const aberto = expandidosAtaques.has(ataque.nome);
                                        return (
                                            <div className={`modal-item-card ataque-card${aberto ? ' expanded' : ''}`} key={`${ataque.nome}-${index}`}>
                                                <div className="modal-item-card-header" onClick={() => toggleExpandidoAtaque(ataque.nome)}>
                                                    <span className="modal-item-card-chevron">▶</span>
                                                    <div className="modal-item-card-info">
                                                        <div className="modal-item-card-title-row">
                                                            <span className="modal-item-card-nome">{ataque.nome}</span>
                                                            {ataque.dano && <span className="modal-item-card-badge">Dano: {ataque.dano}</span>}
                                                            {ataque.critico && <span className="modal-item-card-badge">Crítico: {ataque.critico}</span>}
                                                        </div>
                                                        {ataque.alcance && <div className="modal-item-card-sub">Alcance {ataque.alcance}</div>}
                                                    </div>
                                                    <div className="ataque-card-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-roll-icon"
                                                            title="Rolar dano"
                                                            onClick={ev => { ev.stopPropagation(); rollAtaque(ataque); }}
                                                        >
                                                            🎲
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="modal-item-card-remove"
                                                            title="Remover ataque"
                                                            onClick={ev => { ev.stopPropagation(); handleRemoverAtaque(index); }}
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                                {ataque.observacoes && (
                                                    <div className={`modal-item-card-body${aberto ? '' : ' hidden'}`}>
                                                        <div className="modal-item-card-efeito">{ataque.observacoes}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

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
                            </div>
                        )}

                        {abaAtiva === 'rituais' && (
                            <div className="tab-panel-rituais">
                                <div className="rituals-section-header">
                                    <h3>Rituais Conhecidos</h3>
                                    <button type="button" className="btn-add-item" title="Adicionar ritual" onClick={abrirModalRituais}>+</button>
                                </div>

                                {trilha === 'Ocultista' && (
                                    <div className="rituals-nex-info">
                                        Seu NEX libera até o{' '}
                                        <strong>{circuloLiberado > 0 ? `${circuloLiberado}º círculo` : 'nenhum círculo ainda'}</strong>.
                                    </div>
                                )}

                                <div className="rituals-list">
                                    {rituais.length === 0 && (
                                        <div className="inventory-empty">Nenhum ritual conhecido ainda.</div>
                                    )}
                                    {rituais.map((ritual, index) => {
                                        const aberto = expandidosConhecidos.has(ritual.nome);
                                        const custo = OPR.CUSTO_PE_POR_CIRCULO[ritual.circulo] || 0;
                                        return (
                                            <div className={`modal-item-card ritual-card elemento-${elementoSlug(ritual.elemento)}${aberto ? ' expanded' : ''}`} key={ritual.nome}>
                                                <div className="modal-item-card-header" onClick={() => toggleExpandidoConhecido(ritual.nome)}>
                                                    <span className="modal-item-card-chevron">▶</span>
                                                    <div className="modal-item-card-info">
                                                        <div className="modal-item-card-title-row">
                                                            <span className="modal-item-card-nome">{ritual.nome}</span>
                                                            <span className={`modal-item-card-badge badge-elemento-${elementoSlug(ritual.elemento)}`}>{ritual.elemento}</span>
                                                            <span className="modal-item-card-badge badge-circulo">{ritual.circulo}º círc.</span>
                                                        </div>
                                                        <div className="modal-item-card-sub">{subtituloRitual(ritual)}</div>
                                                    </div>
                                                    <div className="ataque-card-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-conjurar"
                                                            title={`Conjurar (-${custo} PE)`}
                                                            onClick={ev => { ev.stopPropagation(); conjurarRitual(ritual); }}
                                                        >
                                                            Conjurar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="modal-item-card-remove"
                                                            title="Esquecer ritual"
                                                            onClick={ev => { ev.stopPropagation(); handleRemoverRitual(index); }}
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className={`modal-item-card-body${aberto ? '' : ' hidden'}`}>
                                                    <div className="modal-item-stats-grid">
                                                        {statsDoRitual(ritual).map(({ label, valor }) => (
                                                            <div className="modal-item-stat" key={label}>
                                                                <span className="modal-item-stat-label">{label}</span>
                                                                <span className="modal-item-stat-value">{valor}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {ritual.descricao && <div className="modal-item-card-efeito">{ritual.descricao}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {abaAtiva === 'inventario' && (
                            <div className="tab-panel-inventario">
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
                                                <button type="button" onClick={() => handleQtyDelta(index, -1)}>−</button>
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
                                                <button
                                                    type="button"
                                                    className="modal-item-card-remove"
                                                    title="Remover item"
                                                    onClick={() => handleRemoverItem(index)}
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                            {item.efeito && <span className="inventory-item-efeito">{item.efeito}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                                    <button type="button" className="btn-action" onClick={handleAdicionarCustom}>Adicionar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {modalRitualAberto && (
                <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) fecharModalRituais(); }}>
                    <div className="modal-box wide">
                        <div className="modal-header">
                            <h3>Adicionar Ritual</h3>
                            <button type="button" className="modal-close" title="Fechar" onClick={fecharModalRituais}>&times;</button>
                        </div>

                        <div className="modal-catalogo-subtabs">
                            {OPR.ELEMENTOS_RITUAL.map(el => (
                                <button
                                    type="button"
                                    key={el}
                                    className={`modal-subtab elemento-${elementoSlug(el)}${el === elementoAtivo ? ' active' : ''}`}
                                    onClick={() => setElementoAtivo(el)}
                                >
                                    {el}
                                </button>
                            ))}
                        </div>

                        <div className="modal-catalogo-subtabs modal-circulo-filtro">
                            {[0, 1, 2, 3, 4].map(c => (
                                <button
                                    type="button"
                                    key={c}
                                    className={`modal-subtab${c === circuloFiltro ? ' active' : ''}`}
                                    onClick={() => setCirculoFiltro(c)}
                                >
                                    {c === 0 ? 'Todos os círculos' : `${c}º círculo`}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text"
                            className="modal-search-input"
                            placeholder="Buscar ritual..."
                            value={buscaRitual}
                            onChange={e => setBuscaRitual(e.target.value)}
                        />

                        {trilha === 'Ocultista' && (
                            <div className="rituals-nex-info">
                                Seu NEX libera até o{' '}
                                <strong>{circuloLiberado > 0 ? `${circuloLiberado}º círculo` : 'nenhum círculo ainda'}</strong>.
                            </div>
                        )}

                        <div className="modal-item-cards">
                            {cardsFiltradosRituais.length === 0 && (
                                <div className="modal-item-cards-empty">Nenhum ritual encontrado.</div>
                            )}
                            {cardsFiltradosRituais.map(ritual => {
                                const aberto = expandidosRituais.has(ritual.nome);
                                const jaConhece = rituais.some(r => r.nome === ritual.nome);
                                const bloqueadoPorNex = trilha === 'Ocultista' && ritual.circulo > circuloLiberado;
                                return (
                                    <div className={`modal-item-card ritual-card elemento-${elementoSlug(ritual.elemento)}${aberto ? ' expanded' : ''}`} key={ritual.nome}>
                                        <div className="modal-item-card-header" onClick={() => toggleExpandidoRitual(ritual.nome)}>
                                            <span className="modal-item-card-chevron">▶</span>
                                            <div className="modal-item-card-info">
                                                <div className="modal-item-card-title-row">
                                                    <span className="modal-item-card-nome">{ritual.nome}</span>
                                                    <span className={`modal-item-card-badge badge-elemento-${elementoSlug(ritual.elemento)}`}>{ritual.elemento}</span>
                                                    <span className="modal-item-card-badge badge-circulo">{ritual.circulo}º círc.</span>
                                                    {bloqueadoPorNex && (
                                                        <span className="modal-item-card-badge badge-locked" title={`Seu NEX só libera até o ${circuloLiberado}º círculo`}>
                                                            NEX insuficiente
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="modal-item-card-sub">{subtituloRitual(ritual)}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className={`modal-item-card-add${jaConhece ? ' added' : ''}`}
                                                title={jaConhece ? 'Já conhecido' : 'Adicionar aos rituais'}
                                                disabled={jaConhece}
                                                onClick={ev => { ev.stopPropagation(); adicionarRitual(ritual); }}
                                            >
                                                {jaConhece ? '✓' : '+'}
                                            </button>
                                        </div>
                                        <div className={`modal-item-card-body${aberto ? '' : ' hidden'}`}>
                                            <div className="modal-item-stats-grid">
                                                {statsDoRitual(ritual).map(({ label, valor }) => (
                                                    <div className="modal-item-stat" key={label}>
                                                        <span className="modal-item-stat-label">{label}</span>
                                                        <span className="modal-item-stat-value">{valor}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {ritual.descricao && <div className="modal-item-card-efeito">{ritual.descricao}</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {modalAtaqueAberto && (
                <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) fecharModalAtaque(); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Novo Ataque</h3>
                            <button type="button" className="modal-close" title="Fechar" onClick={fecharModalAtaque}>&times;</button>
                        </div>

                        <div className="modal-tab-content">
                            <div className="control-group full">
                                <label>Nome do ataque</label>
                                <input type="text" placeholder="Ex: Revólver" value={ataqueNome} onChange={e => setAtaqueNome(e.target.value)} />
                            </div>
                            <div className="ataque-form-row">
                                <div className="control-group">
                                    <label>Dano</label>
                                    <input type="text" placeholder="Ex: 2d6" value={ataqueDano} onChange={e => setAtaqueDano(e.target.value)} />
                                </div>
                                <div className="control-group">
                                    <label>Crítico</label>
                                    <input type="text" placeholder="Ex: 19/x3" value={ataqueCritico} onChange={e => setAtaqueCritico(e.target.value)} />
                                </div>
                                <div className="control-group">
                                    <label>Alcance</label>
                                    <input type="text" placeholder="Ex: Curto" value={ataqueAlcance} onChange={e => setAtaqueAlcance(e.target.value)} />
                                </div>
                            </div>
                            <div className="control-group full">
                                <label>Observações (opcional)</label>
                                <textarea rows={3} placeholder="Munição, propriedades especiais..." value={ataqueObs} onChange={e => setAtaqueObs(e.target.value)}></textarea>
                            </div>
                            <div className="modal-item-actions">
                                <button type="button" className="btn-action" onClick={handleAdicionarAtaque}>Adicionar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
