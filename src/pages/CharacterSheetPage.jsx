import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Characters } from '@/services/firebase';
import AttributePentagram from '@/components/AttributePentagram';
import { useDiceBox } from '@/hooks/useDiceBox';
import { useDicePreferences } from '@/hooks/useDicePreferences';
import { playDiceRollSound, playRitualCastSound } from '@/lib/diceSound';
import * as OP from '@/lib/pericias';
import * as OPI from '@/lib/itens';
import * as OPR from '@/lib/rituais';
import { origemPorNome, bonusNumericoDaOrigem } from '@/lib/origens';
import * as OPT from '@/lib/trilhas';
import OrigemCatalogModal from '@/components/OrigemCatalogModal';
import DiceThemeModal from '@/components/DiceThemeModal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

const ATTR_MAP = [
    { key: 'agi', nome: 'Agilidade', label: 'AGI', posClass: 'pos-agi' },
    { key: 'int', nome: 'Intelecto', label: 'INT', posClass: 'pos-int' },
    { key: 'vig', nome: 'Vigor', label: 'VIG', posClass: 'pos-vig' },
    { key: 'pre', nome: 'Presença', label: 'PRE', posClass: 'pos-pre' },
    { key: 'for', nome: 'Força', label: 'FOR', posClass: 'pos-for' },
];

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

function DiceIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="8" cy="16" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
        </svg>
    );
}

function GearIcon() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="16.9" y1="7.1" x2="19.1" y2="4.9" />
            <line x1="7.1" y1="7.1" x2="4.9" y2="4.9" />
            <line x1="16.9" y1="16.9" x2="19.1" y2="19.1" />
            <line x1="7.1" y1="16.9" x2="4.9" y2="19.1" />
        </svg>
    );
}

function D20Icon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3L19.8 7.5V16.5L12 21L4.2 16.5V7.5Z" />
            <path d="M12 12L12 3M12 12L19.8 16.5M12 12L4.2 16.5" />
        </svg>
    );
}

function RitualSparkIcon() {
    return (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none" aria-hidden="true">
            <path d="M12 3L14.1 9.9L21 12L14.1 14.1L12 21L9.9 14.1L3 12L9.9 9.9Z" />
        </svg>
    );
}

const GRAU_ABREV = { treinado: 'T', veterano: 'V', expert: 'E' };
const MAX_LOG_ENTRIES = 4;
let proximoLogId = 1;

function nomesPericiasProtegidasPelaTrilha(trilhaNome, periciasSalvas) {
    const regra = OP.TRILHA_REGRAS[trilhaNome] || OP.TRILHA_REGRAS.Combatente;
    const protegidos = new Set(regra.fixasSimples);
    regra.gruposFixos.forEach(grupo => {
        const escolhida = grupo.find(nome => periciasSalvas.some(p => p.nome === nome && p.treinado));
        protegidos.add(escolhida || grupo[0]);
    });
    return protegidos;
}

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
    const [sanidadeAtual, setSanidadeAtual] = useState(0);
    const [sanidadeAtiva, setSanidadeAtiva] = useState(false);
    const [peFlash, setPeFlash] = useState(0);
    const [defesaOutros, setDefesaOutros] = useState(0);
    const [origem, setOrigem] = useState('');
    const [modalOrigemAberto, setModalOrigemAberto] = useState(false);
    const [resistencias, setResistencias] = useState('');
    const [rollLog, setRollLog] = useState([]);
    const [ultimoResultado, setUltimoResultado] = useState(null);

    // --- Aba ativa da coluna 3 (Combate / Rituais / Inventário) ---
    const [abaAtiva, setAbaAtiva] = useState('combate');
    const [trilhaCombatenteEscolhida, setTrilhaCombatenteEscolhida] = useState('');
    const [poderesCombatenteEscolhidos, setPoderesCombatenteEscolhidos] = useState([]);

    // --- Poderes de Trilha
    const [trilhaEspecialistaEscolhida, setTrilhaEspecialistaEscolhida] = useState('');
    const [poderesEspecialistaEscolhidos, setPoderesEspecialistaEscolhidos] = useState([]);
    const [trilhaOcultistaEscolhida, setTrilhaOcultistaEscolhida] = useState('');
    const [poderesOcultistaEscolhidos, setPoderesOcultistaEscolhidos] = useState([]);

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

    // Enquanto qualquer uma das modais desta tela estiver aberta: trava
    // o scroll da página por trás dela
    useLockBodyScroll(modalAtaqueAberto || modalAberto || modalRitualAberto);

    // --- Rolagem personalizada ---
    const [dieSides, setDieSides] = useState(20);
    const [diceQty, setDiceQty] = useState(1);
    const [diceMod, setDiceMod] = useState(0);

    const { rollDiceAnimated, animacao3dPronta, updateDiceTheme } = useDiceBox('#dice-box');

    // --- Tema/cor dos dados (preferência da conta, ver DiceThemeModal) ---
    const { prefs: dicePrefs, carregado: dicePrefsCarregado, salvar: salvarDicePrefs } = useDicePreferences(user.uid);
    const [modalTemaDadoAberto, setModalTemaDadoAberto] = useState(false);

    // Assim que a preferência salva termina de carregar do Firestore
    // (dicePrefsCarregado vira true), aplica ela na DiceBox já
    // inicializada — sem isso a caixa ficaria sempre no tema "default"
    // até a pessoa abrir a modal e trocar de novo. Também reaplica se
    // "dicePrefs" mudar por outro motivo (ex: acabou de salvar uma
    // escolha nova na modal).
    useEffect(() => {
        if (!dicePrefsCarregado) return;
        updateDiceTheme(dicePrefs.tema, dicePrefs.cor);
    }, [dicePrefsCarregado, dicePrefs.tema, dicePrefs.cor, updateDiceTheme]);

    async function handleSalvarTemaDado(tema, cor) {
        try {
            await salvarDicePrefs(tema, cor);
            toast.success('Aparência dos dados atualizada.');
            setModalTemaDadoAberto(false);
        } catch {
            toast.error('Não foi possível salvar a aparência dos dados agora.');
        }
    }

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
                setTrilhaCombatenteEscolhida(p.trilhaCombatenteEscolhida || '');
                setPoderesCombatenteEscolhidos(Array.isArray(p.poderesCombatenteEscolhidos) ? p.poderesCombatenteEscolhidos : []);
                setTrilhaEspecialistaEscolhida(p.trilhaEspecialistaEscolhida || '');
                setPoderesEspecialistaEscolhidos(Array.isArray(p.poderesEspecialistaEscolhidos) ? p.poderesEspecialistaEscolhidos : []);
                setTrilhaOcultistaEscolhida(p.trilhaOcultistaEscolhida || '');
                setPoderesOcultistaEscolhidos(Array.isArray(p.poderesOcultistaEscolhidos) ? p.poderesOcultistaEscolhidos : []);

                const atributos = p.atributos || {};
                const trilha = p.trilha || 'Combatente';
                const nex = Number(p.nex) || 5;
                const bonus = bonusNumericoDaOrigem(p.origem, nex, trilha);
                const bonusCascaGrossa = OPT.bonusVidaCascaGrossa(p.trilhaCombatenteEscolhida, nex);
                const vidaMax = OP.vidaMaxima(trilha, atributos.vig, nex) + bonus.vida + bonusCascaGrossa;
                const detMax = OP.determinacaoMaxima(trilha, atributos.pre, nex) + bonus.pe;
                const sanMax = Math.max(0, OP.sanidadeMaxima(trilha, nex) + bonus.sanidade);
                const vida = (typeof p.vidaAtual === 'number') ? Math.min(p.vidaAtual, vidaMax) : vidaMax;
                const det = (typeof p.determinacaoAtual === 'number') ? Math.min(p.determinacaoAtual, detMax) : detMax;
                const san = (typeof p.sanidadeAtual === 'number') ? Math.min(p.sanidadeAtual, sanMax) : sanMax;
                setVidaAtual(vida);
                setDetAtual(det);
                setSanidadeAtual(san);
                setSanidadeAtiva(!!p.sanidadeAtiva);
                // Se o máximo mudou desde a última vez salva (edição de NEX/
                // atributos), já grava os valores clampados de volta.
                if (p.vidaAtual !== vida || p.determinacaoAtual !== det || p.sanidadeAtual !== san) {
                    Characters.update(user.uid, id, { vidaAtual: vida, determinacaoAtual: det, sanidadeAtual: san }).catch(() => {});
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

                toast.error('Não foi possível salvar — verifique sua conexão.', { id: 'sheet-autosave-error' });
            });
        }, 400);
    }, [user.uid, id]);

    // ---------------------------------------------------------------
    // Log de rolagens (últimas 4)
    // ---------------------------------------------------------------
    const logMessage = useCallback((title, details, result, type = 'normal') => {
        setRollLog(prev => [{ id: proximoLogId++, title, details, result, type }, ...prev].slice(0, MAX_LOG_ENTRIES));

        setUltimoResultado({ id: proximoLogId, titulo: title, valor: result, tipo: type });
    }, []);

    async function rollDice(qty, sides) {
        setUltimoResultado(null);
        playDiceRollSound(qty);
        return rollDiceAnimated(`${qty}d${sides}`);
    }

    function destacarVencedor(rolls, vencedor) {
        return rolls.map((r, i) => (
            <span key={i}>
                {i > 0 && ', '}
                {r === vencedor ? <b>{r}</b> : r}
            </span>
        ));
    }

    async function rollSystemDice(attrName, diceCount) {
        let rolls, finalResult, detailsNode;
        if (diceCount > 0) {
            rolls = await rollDice(diceCount, 20);
            finalResult = Math.max(...rolls);
            detailsNode = <>[{destacarVencedor(rolls, finalResult)}]</>;
        } else {
            rolls = await rollDice(2, 20);
            finalResult = Math.min(...rolls);
            detailsNode = <>Desvantagem (0): [{destacarVencedor(rolls, finalResult)}]</>;
        }
        let type = 'normal';
        if (finalResult === 20) type = 'crit';
        if (finalResult === 1) type = 'fail';
        logMessage(attrName, detailsNode, finalResult, type);
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
    const bonusOrigem = useMemo(() => bonusNumericoDaOrigem(origem, nex, trilha), [origem, nex, trilha]);
    const origemEscolhida = useMemo(() => origemPorNome(origem), [origem]);
    const bonusCascaGrossa = useMemo(
        () => OPT.bonusVidaCascaGrossa(trilhaCombatenteEscolhida, nex),
        [trilhaCombatenteEscolhida, nex]
    );
    const ataqueEspecialAtual = useMemo(() => OPT.ataqueEspecialMaximo(nex), [nex]);
    const slotsPoderCombatente = useMemo(() => OPT.slotsPoderCombatenteLiberados(nex), [nex]);
    const trilhaCombatenteInfo = useMemo(
        () => OPT.trilhaCombatentePorNome(trilhaCombatenteEscolhida),
        [trilhaCombatenteEscolhida]
    );
    const peritoEspecialistaAtual = useMemo(() => OPT.peritoEspecialistaMaximo(nex), [nex]);
    const slotsPoderEspecialista = useMemo(() => OPT.slotsPoderEspecialistaLiberados(nex), [nex]);
    const trilhaEspecialistaInfo = useMemo(
        () => OPT.trilhaEspecialistaPorNome(trilhaEspecialistaEscolhida),
        [trilhaEspecialistaEscolhida]
    );
    const slotsPoderOcultista = useMemo(() => OPT.slotsPoderOcultistaLiberados(nex), [nex]);
    const trilhaOcultistaInfo = useMemo(
        () => OPT.trilhaOcultistaPorNome(trilhaOcultistaEscolhida),
        [trilhaOcultistaEscolhida]
    );

    const bonusPoderes = useMemo(
        () => OPT.bonusNumericoDosPoderes({
            nex,
            poderesCombatenteEscolhidos,
            trilhaCombatenteEscolhida,
            poderesEspecialistaEscolhidos,
            trilhaEspecialistaEscolhida,
            poderesOcultistaEscolhidos,
            trilhaOcultistaEscolhida,
        }),
        [nex, poderesCombatenteEscolhidos, trilhaCombatenteEscolhida, poderesEspecialistaEscolhidos, trilhaEspecialistaEscolhida, poderesOcultistaEscolhidos, trilhaOcultistaEscolhida]
    );
    const vidaMax = useMemo(
        () => OP.vidaMaxima(trilha, atributos.vig, nex) + bonusOrigem.vida + bonusCascaGrossa,
        [trilha, atributos.vig, nex, bonusOrigem, bonusCascaGrossa]
    );
    const detMax = useMemo(
        () => OP.determinacaoMaxima(trilha, atributos.pre, nex) + bonusOrigem.pe,
        [trilha, atributos.pre, nex, bonusOrigem]
    );

    const sanidadeMax = useMemo(
        () => Math.max(0, OP.sanidadeMaxima(trilha, nex) + bonusOrigem.sanidade),
        [trilha, nex, bonusOrigem]
    );
    const defesaEquip = useMemo(() => OPI.defesaDoInventario(inventario), [inventario]);
    const defesaTotal = OP.defesaTotal(atributos.agi, defesaEquip, defesaOutros) + bonusOrigem.defesa + bonusPoderes.defesa;
    const peRodada = useMemo(() => OP.peRodadaPorNex(nex) + bonusOrigem.peRodada, [nex, bonusOrigem]);
    const protecaoTexto = useMemo(() => {
        const equipadas = inventario.filter(it => it.grupo === 'protecoes' && it.equipado).map(it => it.nome);
        return equipadas.length ? equipadas.join(', ') : 'Nenhuma';
    }, [inventario]);

    function handleEscolherOrigem(origemDoCatalogo) {
        const origemAntigaObj = origemEscolhida;
        const periciasAtuais = personagem?.pericias || [];

        // Sincroniza as Perícias Treinadas concedidas pela Origem (mesmo
        // mecanismo do aplicarFixas no Formulário — ver CharacterFormPage.jsx):
        // acrescenta as da nova Origem e remove as da Origem anterior que não
        // sejam também da nova nem protegidas pela Trilha atual. Sem isto, uma
        // troca de Origem direto por aqui deixava a ficha com perícias "órfãs"
        // de uma Origem antiga presas pra sempre (e sem as da nova) — bug pego
        // em teste (Policial -> Militar -> Criminoso) antes de entregar.
        const protegidosPelaTrilha = nomesPericiasProtegidasPelaTrilha(trilha, periciasAtuais);
        const nomesAntigos = new Set(origemAntigaObj ? origemAntigaObj.periciasTreinadas : []);
        const nomesNovos = new Set(origemDoCatalogo.periciasTreinadas);

        const porNome = new Map(periciasAtuais.map(p => [p.nome, p]));
        nomesAntigos.forEach(nome => {
            if (!nomesNovos.has(nome) && !protegidosPelaTrilha.has(nome)) {
                porNome.delete(nome);
            }
        });
        nomesNovos.forEach(nome => {
            if (!porNome.has(nome)) {
                const catalogo = OP.PERICIAS_CATALOGO.find(p => p.nome === nome);
                porNome.set(nome, {
                    nome,
                    atributo: catalogo?.atributo,
                    treinado: true,
                    grau: 'treinado',
                    bonusExtra: 0,
                    bonus: OP.GRAU_BONUS.treinado,
                });
            }
        });
        const novasPericias = Array.from(porNome.values());

        setOrigem(origemDoCatalogo.nome);
        setPersonagem(prev => (prev ? { ...prev, origem: origemDoCatalogo.nome, pericias: novasPericias } : prev));
        salvarCampos({ origem: origemDoCatalogo.nome, pericias: novasPericias });
        setModalOrigemAberto(false);
        toast.success(`Origem "${origemDoCatalogo.nome}" escolhida.`);
    }
    function handleResistenciasChange(valor) {
        setResistencias(valor);
        salvarCampos({ resistencias: valor });
    }

    // --- Poderes de Trilha (Combatente, ver src/lib/trilhas.js) ---
    function handleEscolherTrilhaCombatente(nome) {
        setTrilhaCombatenteEscolhida(nome);
        salvarCampos({ trilhaCombatenteEscolhida: nome });
    }
    function handleEscolherPoderCombatente(indice, nome) {
        setPoderesCombatenteEscolhidos(prev => {
            const novo = [...prev];
            novo[indice] = nome;
            salvarCampos({ poderesCombatenteEscolhidos: novo });
            return novo;
        });
    }

    // --- Poderes de Trilha (Especialista, ver src/lib/trilhas.js) ---
    function handleEscolherTrilhaEspecialista(nome) {
        setTrilhaEspecialistaEscolhida(nome);
        salvarCampos({ trilhaEspecialistaEscolhida: nome });
    }
    function handleEscolherPoderEspecialista(indice, nome) {
        setPoderesEspecialistaEscolhidos(prev => {
            const novo = [...prev];
            novo[indice] = nome;
            salvarCampos({ poderesEspecialistaEscolhidos: novo });
            return novo;
        });
    }

    function handleEscolherTrilhaOcultista(nome) {
        setTrilhaOcultistaEscolhida(nome);
        salvarCampos({ trilhaOcultistaEscolhida: nome });
    }
    function handleEscolherPoderOcultista(indice, nome) {
        setPoderesOcultistaEscolhidos(prev => {
            const novo = [...prev];
            novo[indice] = nome;
            salvarCampos({ poderesOcultistaEscolhidos: novo });
            return novo;
        });
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
    function ajustarSanidade(delta) {
        const novo = Math.max(0, Math.min(sanidadeMax, sanidadeAtual + delta));
        setSanidadeAtual(novo);
        salvarCampos({ sanidadeAtual: novo });
    }
    function alternarSanidade() {
        const novo = !sanidadeAtiva;
        setSanidadeAtiva(novo);
        salvarCampos({ sanidadeAtiva: novo });
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
    // Vestir uma proteção de CORPO (Leve/Pesada — ver
    // OPI.tipoProtecaoDoItem em itens.js) desequipa automaticamente
    // qualquer outra proteção do mesmo slot.
    function handleEquiparToggle(index) {
        const alvo = inventario[index];
        const indoParaEquipado = !alvo.equipado;
        const slotAlvo = OPI.tipoProtecaoDoItem(alvo);
        let next = inventario.map((it, i) => i === index ? { ...it, equipado: indoParaEquipado } : it);

        if (indoParaEquipado && slotAlvo) {
            let desequipou = null;
            next = next.map((it, i) => {
                if (i !== index && it.grupo === 'protecoes' && it.equipado && OPI.tipoProtecaoDoItem(it) === slotAlvo) {
                    desequipou = it.nome;
                    return { ...it, equipado: false };
                }
                return it;
            });
            if (desequipou) {
                toast(`"${desequipou}" foi desequipada — só dá pra equipar uma proteção de corpo por vez.`);
            }
        }

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

    const ataquesAutomaticos = useMemo(() => {
        const porNome = new Map();
        for (const item of inventario) {
            if (item.grupo === 'armas' && !porNome.has(item.nome)) {
                porNome.set(item.nome, {
                    nome: item.nome,
                    dano: item.dano || '',
                    critico: item.critico || '',
                    alcance: item.alcance || 'Corpo a corpo',
                    observacoes: item.efeito || '',
                    auto: true,
                });
            }
        }
        return Array.from(porNome.values());
    }, [inventario]);

    const ataquesCombinados = useMemo(
        () => [...ataquesAutomaticos, ...ataques],
        [ataquesAutomaticos, ataques]
    );

    function atualizarAtaques(novosAtaques) {
        setAtaques(novosAtaques);
        salvarCampos({ ataques: novosAtaques });
    }

    function handleRemoverAtaque(ataque) {
        atualizarAtaques(ataques.filter(a => a !== ataque));
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
        if (!termo) return ataquesCombinados;
        return ataquesCombinados.filter(a => a.nome.toLowerCase().includes(termo));
    }, [ataquesCombinados, buscaAtaque]);

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

            <div className="character-sheet">
                <section className="attributes-section">
                    <AttributePentagram gradientId="opRitualGlow" nodes={pentagramNodes} />
                    <div className="pentagram-footer">
                        <small>Clique no número para rolar</small>
                    </div>

                    <div className="identity-block">
                        <div className="identity-row">
                            <div className="identity-field">
                                <span className="identity-field-label">Origem</span>
                                <button
                                    type="button"
                                    className="identity-field-value identity-field-button"
                                    title="Clique para escolher/trocar a Origem"
                                    onClick={() => setModalOrigemAberto(true)}
                                >
                                    {origemEscolhida
                                        ? origemEscolhida.nome
                                        : (origem ? `${origem} (não reconhecida)` : 'Escolher Origem…')}
                                </button>
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
                                <button className="vital-btn" title="-5" aria-label="Diminuir vida em 5" onClick={() => ajustarVida(-5)}>«</button>
                                <button className="vital-btn" title="-1" aria-label="Diminuir vida em 1" onClick={() => ajustarVida(-1)}>‹</button>
                                <div className="vital-bar vida-bar">
                                    <div className="vital-bar-fill vida-fill" style={{ width: `${vidaMax > 0 ? Math.max(0, Math.min(100, (vidaAtual / vidaMax) * 100)) : 0}%` }}></div>
                                    <span className="vital-bar-text">{vidaAtual} / {vidaMax}</span>
                                </div>
                                <button className="vital-btn" title="+1" aria-label="Aumentar vida em 1" onClick={() => ajustarVida(1)}>&rsaquo;</button>
                                <button className="vital-btn" title="+5" aria-label="Aumentar vida em 5" onClick={() => ajustarVida(5)}>&raquo;</button>
                            </div>
                        </div>

                        <div className="vital-row">
                            <div className="vital-label">PE <small className="vital-label-sub">Pontos de Esforço</small></div>
                            <div className="vital-bar-wrap">
                                <button className="vital-btn" title="-5" aria-label="Diminuir PE em 5" onClick={() => ajustarDet(-5)}>«</button>
                                <button className="vital-btn" title="-1" aria-label="Diminuir PE em 1" onClick={() => ajustarDet(-1)}>‹</button>
                                <div key={peFlash} className={`vital-bar det-bar${peFlash > 0 ? ' pe-spent-flash' : ''}`}>
                                    <div className="vital-bar-fill det-fill" style={{ width: `${detMax > 0 ? Math.max(0, Math.min(100, (detAtual / detMax) * 100)) : 0}%` }}></div>
                                    <span className="vital-bar-text">{detAtual} / {detMax}</span>
                                </div>
                                <button className="vital-btn" title="+1" aria-label="Aumentar PE em 1" onClick={() => ajustarDet(1)}>&rsaquo;</button>
                                <button className="vital-btn" title="+5" aria-label="Aumentar PE em 5" onClick={() => ajustarDet(5)}>&raquo;</button>
                            </div>
                        </div>

                        {sanidadeAtiva && (
                            <div className="vital-row">
                                <div className="vital-label">SANIDADE <small className="vital-label-sub">SAN</small></div>
                                <div className="vital-bar-wrap">
                                    <button className="vital-btn" title="-5" aria-label="Diminuir sanidade em 5" onClick={() => ajustarSanidade(-5)}>«</button>
                                    <button className="vital-btn" title="-1" aria-label="Diminuir sanidade em 1" onClick={() => ajustarSanidade(-1)}>‹</button>
                                    <div className="vital-bar san-bar">
                                        <div className="vital-bar-fill san-fill" style={{ width: `${sanidadeMax > 0 ? Math.max(0, Math.min(100, (sanidadeAtual / sanidadeMax) * 100)) : 0}%` }}></div>
                                        <span className="vital-bar-text">{sanidadeAtual} / {sanidadeMax}</span>
                                    </div>
                                    <button className="vital-btn" title="+1" aria-label="Aumentar sanidade em 1" onClick={() => ajustarSanidade(1)}>&rsaquo;</button>
                                    <button className="vital-btn" title="+5" aria-label="Aumentar sanidade em 5" onClick={() => ajustarSanidade(5)}>&raquo;</button>
                                </div>
                            </div>
                        )}

                        <div className="vital-sanidade-toggle-row">
                            <button
                                type="button"
                                className="vital-sanidade-toggle"
                                onClick={alternarSanidade}
                                aria-pressed={sanidadeAtiva}
                                aria-label={sanidadeAtiva ? 'Ocultar recurso de Sanidade desta ficha' : 'Ativar recurso de Sanidade nesta ficha'}
                                title={sanidadeAtiva ? 'Ocultar Sanidade' : 'Ativar Sanidade'}
                            >
                                {sanidadeAtiva ? '− Ocultar Sanidade' : '+ Ativar Sanidade'}
                            </button>
                        </div>

                        <div className="defesa-row">
                            <div className="defesa-box">
                                <span className="defesa-label">DEFESA</span>
                                <span
                                    className="defesa-total"
                                    title={bonusPoderes.defesa ? `Inclui +${bonusPoderes.defesa} de poder de trilha` : undefined}
                                >
                                    {defesaTotal}
                                </span>
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

                        {origemEscolhida && (
                            <div className="origem-resumo">
                                <div className="origem-resumo-header">
                                    <span className="origem-resumo-nome">{origemEscolhida.nome}</span>
                                    <button type="button" className="btn-secondary" onClick={() => setModalOrigemAberto(true)}>Trocar Origem</button>
                                </div>
                                <div className="origem-resumo-detalhes">
                                    <div className="origem-campo">
                                        <span className="modal-item-stat-label">Perícias Treinadas</span>
                                        <span className="modal-item-stat-value">
                                            {origemEscolhida.periciasTreinadas.length ? origemEscolhida.periciasTreinadas.join(', ') : (origemEscolhida.notaPericias || '—')}
                                        </span>
                                    </div>
                                    <div className="origem-campo">
                                        <span className="modal-item-stat-label">Poder de Origem — {origemEscolhida.poder.nome}</span>
                                        <span className="modal-item-stat-value">{origemEscolhida.poder.descricao}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="dice-box-wrap">
                        <div id="dice-box"></div>
                        <button
                            type="button"
                            className="dice-box-settings-btn"
                            title="Escolher tema/cor dos dados"
                            aria-label="Escolher tema/cor dos dados"
                            onClick={() => setModalTemaDadoAberto(true)}
                        >
                            <GearIcon />
                        </button>
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
                        {/* Quando a animação 3D não consegue inicializar (sem
                            aceleração de GPU/WebGL disponível no navegador,
                            timeout, etc.) o hook cai pro gerador local — o
                            resultado continua certinho, só que sem nenhum
                            dado desenhado, e antes disso acontecia sem
                            nenhuma pista na tela do porquê (só um aviso no
                            console, que quase ninguém abre). Este aviso
                            deixa isso visível em vez de silencioso. */}
                        {animacao3dPronta === false && (
                            <div className="dice-box-aviso-fallback">
                                Animação 3D indisponível neste navegador — mostrando só o resultado.
                            </div>
                        )}
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
                            const bonusBase = treinado ? (Number(salva.bonus) || 0) : 0;
                            // Bônus de poder de trilha (ex: Hacker +5 Tecnologia) soma
                            // independente de treino/destreino — é um bônus concedido
                            // pelo poder escolhido, não pelo grau de treinamento.
                            const bonusPoder = bonusPoderes.pericias[catItem.nome] || 0;
                            const bonus = bonusBase + bonusPoder;
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
                                    <span
                                        className="skill-bonus"
                                        title={bonusPoder ? `Base: ${bonusBase >= 0 ? '+' + bonusBase : bonusBase} · Poderes de trilha: +${bonusPoder}` : undefined}
                                    >
                                        {bonus >= 0 ? `+${bonus}` : `${bonus}`}
                                    </span>
                                    <span
                                        className="skill-treino"
                                        title={treinado ? (OP.GRAU_LABEL[grau] || 'Treinado') : (bloqueada ? 'Só pode ser usada treinada' : 'Destreinado')}
                                    >
                                        {treinado ? (GRAU_ABREV[grau] || 'T') : '-'}
                                    </span>
                                    <button
                                        className="btn-roll-skill"
                                        disabled={bloqueada}
                                        title={`Rolar ${catItem.nome}`}
                                        aria-label={`Rolar ${catItem.nome}`}
                                        onClick={() => rollSkill(catItem.nome, valorAtributo, bonus)}
                                    >
                                        <D20Icon />
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
                        <button
                            type="button"
                            className={`sheet-tab-btn${abaAtiva === 'trilha' ? ' active' : ''}`}
                            onClick={() => setAbaAtiva('trilha')}
                        >
                            Trilha
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
                                            {ataquesCombinados.length === 0 ? 'Nenhum ataque cadastrado ainda.' : 'Nenhum ataque encontrado.'}
                                        </div>
                                    )}
                                    {ataquesFiltrados.map((ataque, index) => {
                                        const aberto = expandidosAtaques.has(ataque.nome);
                                        return (
                                            <div className={`modal-item-card ataque-card${aberto ? ' expanded' : ''}`} key={`${ataque.nome}-${index}`}>
                                                <div
                                                    className="modal-item-card-header"
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-expanded={aberto}
                                                    aria-label={`Detalhes de ${ataque.nome}`}
                                                    onClick={() => toggleExpandidoAtaque(ataque.nome)}
                                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpandidoAtaque(ataque.nome); } }}
                                                >
                                                    <span className="modal-item-card-chevron">▶</span>
                                                    <div className="modal-item-card-info">
                                                        <div className="modal-item-card-title-row">
                                                            <span className="modal-item-card-nome">{ataque.nome}</span>
                                                            {ataque.dano && <span className="modal-item-card-badge">Dano: {ataque.dano}</span>}
                                                            {ataque.critico && <span className="modal-item-card-badge">Crítico: {ataque.critico}</span>}
                                                            {ataque.auto && (
                                                                <span className="modal-item-card-badge badge-auto" title="Gerado automaticamente a partir da arma no Inventário">
                                                                    Inventário
                                                                </span>
                                                            )}
                                                        </div>
                                                        {ataque.alcance && <div className="modal-item-card-sub">Alcance {ataque.alcance}</div>}
                                                    </div>
                                                    <div className="ataque-card-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-roll-icon"
                                                            title="Rolar dano"
                                                            aria-label="Rolar dano"
                                                            onClick={ev => { ev.stopPropagation(); rollAtaque(ataque); }}
                                                        >
                                                            <DiceIcon />
                                                        </button>
                                                        {!ataque.auto && (
                                                            <button
                                                                type="button"
                                                                className="modal-item-card-remove"
                                                                title="Remover ataque"
                                                                onClick={ev => { ev.stopPropagation(); handleRemoverAtaque(ataque); }}
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                        )}
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
                                                <div style={{ color: '#aaa', fontSize: '0.85em' }}>{entry.details}</div>
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
                                                <div
                                                    className="modal-item-card-header"
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-expanded={aberto}
                                                    aria-label={`Detalhes de ${ritual.nome}`}
                                                    onClick={() => toggleExpandidoConhecido(ritual.nome)}
                                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpandidoConhecido(ritual.nome); } }}
                                                >
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
                                                            <RitualSparkIcon />
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
                                                        {item.equipado ? 'Equipado' : 'Equipar'}
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

                        {abaAtiva === 'trilha' && (
                            <div className="tab-panel-trilha">
                                {trilha === 'Combatente' ? (
                                    <>
                                        <div className="trilha-numero-limpo">
                                            <span className="trilha-numero-limpo-label">Ataque Especial</span>
                                            <span className="trilha-numero-limpo-valor">
                                                {ataqueEspecialAtual
                                                    ? `até ${ataqueEspecialAtual.pe} PE por +${ataqueEspecialAtual.bonus} (no ataque ou no dano)`
                                                    : '—'}
                                            </span>
                                        </div>

                                        <div className="trilha-secundaria-picker">
                                            <label htmlFor="trilha-combatente-select">Trilha de Combatente</label>
                                            <select
                                                id="trilha-combatente-select"
                                                value={trilhaCombatenteEscolhida}
                                                onChange={e => handleEscolherTrilhaCombatente(e.target.value)}
                                            >
                                                <option value="">— Escolher (liberado em NEX 10%) —</option>
                                                {OPT.TRILHAS_COMBATENTE.map(t => (
                                                    <option key={t.nome} value={t.nome}>{t.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {trilhaCombatenteInfo && (
                                            <div className="trilha-secundaria-poderes">
                                                <p className="trilha-secundaria-descricao">{trilhaCombatenteInfo.descricao}</p>
                                                {trilhaCombatenteInfo.poderes.map(poder => {
                                                    const liberado = nex >= poder.nex;
                                                    return (
                                                        <div
                                                            className={`trilha-poder-card${liberado ? '' : ' trilha-poder-bloqueado'}`}
                                                            key={poder.nome}
                                                        >
                                                            <div className="trilha-poder-card-header">
                                                                <strong>{poder.nome}</strong>
                                                                <span className="trilha-poder-nex">NEX {poder.nex}%{liberado ? '' : ' (bloqueado)'}</span>
                                                            </div>
                                                            <p className="trilha-poder-descricao">{poder.descricao}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="trilha-poder-slots">
                                            <h3>Poderes de Combatente</h3>
                                            {slotsPoderCombatente === 0 ? (
                                                <p className="trilha-em-breve">Libera o primeiro em NEX 15%.</p>
                                            ) : (
                                                Array.from({ length: slotsPoderCombatente }).map((_, indice) => (
                                                    <div className="trilha-poder-slot" key={indice}>
                                                        <label htmlFor={`poder-combatente-${indice}`}>
                                                            Poder {indice + 1} <small>(NEX {OPT.PODER_COMBATENTE_MARCOS[indice]}%)</small>
                                                        </label>
                                                        <select
                                                            id={`poder-combatente-${indice}`}
                                                            value={poderesCombatenteEscolhidos[indice] || ''}
                                                            onChange={e => handleEscolherPoderCombatente(indice, e.target.value)}
                                                        >
                                                            <option value="">— Escolher —</option>
                                                            {OPT.poderesDisponiveisParaSlot(OPT.PODERES_COMBATENTE, poderesCombatenteEscolhidos, indice).map(p => (
                                                                <option key={p.nome} value={p.nome}>{p.nome}</option>
                                                            ))}
                                                        </select>
                                                        {poderesCombatenteEscolhidos[indice] && (() => {
                                                            const escolhido = OPT.PODERES_COMBATENTE.find(p => p.nome === poderesCombatenteEscolhidos[indice]);
                                                            return escolhido ? (
                                                                <p className="trilha-poder-descricao">
                                                                    {escolhido.descricao}
                                                                    {escolhido.preRequisito && (
                                                                        <em className="trilha-poder-prereq"> (Pré-requisito: {escolhido.preRequisito})</em>
                                                                    )}
                                                                </p>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                ) : trilha === 'Especialista' ? (
                                    <>
                                        <div className="trilha-numero-limpo">
                                            <span className="trilha-numero-limpo-label">Eclético / Perito</span>
                                            <span className="trilha-numero-limpo-valor">
                                                {peritoEspecialistaAtual
                                                    ? `até ${peritoEspecialistaAtual.pe} PE por +${peritoEspecialistaAtual.dado} numa perícia (Eclético/Perito)`
                                                    : '—'}
                                            </span>
                                        </div>

                                        <div className="trilha-secundaria-picker">
                                            <label htmlFor="trilha-especialista-select">Trilha de Especialista</label>
                                            <select
                                                id="trilha-especialista-select"
                                                value={trilhaEspecialistaEscolhida}
                                                onChange={e => handleEscolherTrilhaEspecialista(e.target.value)}
                                            >
                                                <option value="">— Escolher (liberado em NEX 10%) —</option>
                                                {OPT.TRILHAS_ESPECIALISTA.map(t => (
                                                    <option key={t.nome} value={t.nome}>{t.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {trilhaEspecialistaInfo && (
                                            <div className="trilha-secundaria-poderes">
                                                <p className="trilha-secundaria-descricao">{trilhaEspecialistaInfo.descricao}</p>
                                                {trilhaEspecialistaInfo.poderes.map(poder => {
                                                    const liberado = nex >= poder.nex;
                                                    return (
                                                        <div
                                                            className={`trilha-poder-card${liberado ? '' : ' trilha-poder-bloqueado'}`}
                                                            key={poder.nome}
                                                        >
                                                            <div className="trilha-poder-card-header">
                                                                <strong>{poder.nome}</strong>
                                                                <span className="trilha-poder-nex">NEX {poder.nex}%{liberado ? '' : ' (bloqueado)'}</span>
                                                            </div>
                                                            <p className="trilha-poder-descricao">{poder.descricao}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="trilha-poder-slots">
                                            <h3>Poderes de Especialista</h3>
                                            {slotsPoderEspecialista === 0 ? (
                                                <p className="trilha-em-breve">Libera o primeiro em NEX 15%.</p>
                                            ) : (
                                                Array.from({ length: slotsPoderEspecialista }).map((_, indice) => (
                                                    <div className="trilha-poder-slot" key={indice}>
                                                        <label htmlFor={`poder-especialista-${indice}`}>
                                                            Poder {indice + 1} <small>(NEX {OPT.PODER_ESPECIALISTA_MARCOS[indice]}%)</small>
                                                        </label>
                                                        <select
                                                            id={`poder-especialista-${indice}`}
                                                            value={poderesEspecialistaEscolhidos[indice] || ''}
                                                            onChange={e => handleEscolherPoderEspecialista(indice, e.target.value)}
                                                        >
                                                            <option value="">— Escolher —</option>
                                                            {OPT.poderesDisponiveisParaSlot(OPT.PODERES_ESPECIALISTA, poderesEspecialistaEscolhidos, indice).map(p => (
                                                                <option key={p.nome} value={p.nome}>{p.nome}</option>
                                                            ))}
                                                        </select>
                                                        {poderesEspecialistaEscolhidos[indice] && (() => {
                                                            const escolhido = OPT.PODERES_ESPECIALISTA.find(p => p.nome === poderesEspecialistaEscolhidos[indice]);
                                                            return escolhido ? (
                                                                <p className="trilha-poder-descricao">
                                                                    {escolhido.descricao}
                                                                    {escolhido.preRequisito && (
                                                                        <em className="trilha-poder-prereq"> (Pré-requisito: {escolhido.preRequisito})</em>
                                                                    )}
                                                                </p>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                ) : trilha === 'Ocultista' ? (
                                    <>
                                        <div className="trilha-secundaria-picker">
                                            <label htmlFor="trilha-ocultista-select">Trilha de Ocultista</label>
                                            <select
                                                id="trilha-ocultista-select"
                                                value={trilhaOcultistaEscolhida}
                                                onChange={e => handleEscolherTrilhaOcultista(e.target.value)}
                                            >
                                                <option value="">— Escolher (liberado em NEX 10%) —</option>
                                                {OPT.TRILHAS_OCULTISTA.map(t => (
                                                    <option key={t.nome} value={t.nome}>{t.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {trilhaOcultistaInfo && (
                                            <div className="trilha-secundaria-poderes">
                                                <p className="trilha-secundaria-descricao">{trilhaOcultistaInfo.descricao}</p>
                                                {trilhaOcultistaInfo.poderes.map(poder => {
                                                    const liberado = nex >= poder.nex;
                                                    return (
                                                        <div
                                                            className={`trilha-poder-card${liberado ? '' : ' trilha-poder-bloqueado'}`}
                                                            key={poder.nome}
                                                        >
                                                            <div className="trilha-poder-card-header">
                                                                <strong>{poder.nome}</strong>
                                                                <span className="trilha-poder-nex">NEX {poder.nex}%{liberado ? '' : ' (bloqueado)'}</span>
                                                            </div>
                                                            <p className="trilha-poder-descricao">{poder.descricao}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="trilha-poder-slots">
                                            <h3>Poderes de Ocultista</h3>
                                            {slotsPoderOcultista === 0 ? (
                                                <p className="trilha-em-breve">Libera o primeiro em NEX 15%.</p>
                                            ) : (
                                                Array.from({ length: slotsPoderOcultista }).map((_, indice) => (
                                                    <div className="trilha-poder-slot" key={indice}>
                                                        <label htmlFor={`poder-ocultista-${indice}`}>
                                                            Poder {indice + 1} <small>(NEX {OPT.PODER_OCULTISTA_MARCOS[indice]}%)</small>
                                                        </label>
                                                        <select
                                                            id={`poder-ocultista-${indice}`}
                                                            value={poderesOcultistaEscolhidos[indice] || ''}
                                                            onChange={e => handleEscolherPoderOcultista(indice, e.target.value)}
                                                        >
                                                            <option value="">— Escolher —</option>
                                                            {OPT.poderesDisponiveisParaSlot(OPT.PODERES_OCULTISTA, poderesOcultistaEscolhidos, indice).map(p => (
                                                                <option key={p.nome} value={p.nome}>{p.nome}</option>
                                                            ))}
                                                        </select>
                                                        {poderesOcultistaEscolhidos[indice] && (() => {
                                                            const escolhido = OPT.PODERES_OCULTISTA.find(p => p.nome === poderesOcultistaEscolhidos[indice]);
                                                            return escolhido ? (
                                                                <p className="trilha-poder-descricao">
                                                                    {escolhido.descricao}
                                                                    {escolhido.preRequisito && (
                                                                        <em className="trilha-poder-prereq"> (Pré-requisito: {escolhido.preRequisito})</em>
                                                                    )}
                                                                </p>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="trilha-em-breve">
                                        Poderes de trilha para {trilha || 'essa trilha'} ainda não foram
                                        modelados nesta ficha.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {modalAberto && (
                <div className="modal-overlay">
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
                                                <div
                                                    className="modal-item-card-header"
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-expanded={aberto}
                                                    aria-label={`Detalhes de ${item.nome}`}
                                                    onClick={() => toggleExpandido(item.nome)}
                                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpandido(item.nome); } }}
                                                >
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
                <div className="modal-overlay">
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
                                        <div
                                            className="modal-item-card-header"
                                            role="button"
                                            tabIndex={0}
                                            aria-expanded={aberto}
                                            aria-label={`Detalhes de ${ritual.nome}`}
                                            onClick={() => toggleExpandidoRitual(ritual.nome)}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpandidoRitual(ritual.nome); } }}
                                        >
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
                <div className="modal-overlay">
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

            <OrigemCatalogModal
                aberto={modalOrigemAberto}
                onFechar={() => setModalOrigemAberto(false)}
                origemAtual={origem}
                onEscolher={handleEscolherOrigem}
            />

            <DiceThemeModal
                aberto={modalTemaDadoAberto}
                onFechar={() => setModalTemaDadoAberto(false)}
                temaAtual={dicePrefs.tema}
                corAtual={dicePrefs.cor}
                onSalvar={handleSalvarTemaDado}
            />
        </div>
    );
}
