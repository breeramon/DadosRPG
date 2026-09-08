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
import NovoAtaqueModal from '@/components/NovoAtaqueModal';
import AdicionarItemModal from '@/components/AdicionarItemModal';
import VitalsPanel from '@/components/VitalsPanel';
import PericiasTable from '@/components/PericiasTable';
import CombateTab from '@/components/CombateTab';
import TrilhaTab from '@/components/TrilhaTab';
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

function RitualSparkIcon() {
    return (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none" aria-hidden="true">
            <path d="M12 3L14.1 9.9L21 12L14.1 14.1L12 21L9.9 14.1L3 12L9.9 9.9Z" />
        </svg>
    );
}

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

// Vira nome de classe CSS (sem acento, minúsculo) — os 5 elementos de
// rituais.js (Conhecimento/Energia/Morte/Sangue/Medo) não têm acento,
// mas a normalização fica aqui pra não quebrar se algum dia mudar.
function elementoSlug(elemento) {
    return String(elemento || '').trim().toLowerCase();
}

// Texto curto embaixo do nome no cartão de ritual (igual em espírito à
// subcategoriaTexto de AdicionarItemModal.jsx, mas os campos de ritual
// são outros).
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
    const [buscaAtaque, setBuscaAtaque] = useState('');
    const [expandidosAtaques, setExpandidosAtaques] = useState(() => new Set());

    // --- Modal "Adicionar Item" ---
    const [modalAberto, setModalAberto] = useState(false);

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
    useLockBodyScroll(modalRitualAberto);

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
    const peritoEspecialistaAtual = useMemo(() => OPT.peritoEspecialistaMaximo(nex), [nex]);

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

    // Recebe { nome, espacos, efeito } já validados (nome não vazio,
    // espacos já numérico) de AdicionarItemModal.jsx -- só decide como
    // persistir e avisar o usuário.
    function handleAdicionarItemCustom({ nome, espacos, efeito }) {
        atualizarInventario([...inventario, { nome, categoria: 'Personalizado', espacos, efeito, quantidade: 1, equipado: false, custom: true }]);
        toast.success(`"${nome}" adicionado ao inventário.`);
    }

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

    // Formulário (nome/dano/crítico/alcance/observações) e validação de
    // nome vazio agora moram dentro de NovoAtaqueModal.jsx -- aqui só
    // decide o que fazer com o ataque já pronto.
    function handleAdicionarAtaque(novoAtaque) {
        atualizarAtaques([...ataques, novoAtaque]);
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

                    <VitalsPanel
                        vidaAtual={vidaAtual}
                        vidaMax={vidaMax}
                        onAjustarVida={ajustarVida}
                        detAtual={detAtual}
                        detMax={detMax}
                        peFlash={peFlash}
                        onAjustarDet={ajustarDet}
                        sanidadeAtiva={sanidadeAtiva}
                        sanidadeAtual={sanidadeAtual}
                        sanidadeMax={sanidadeMax}
                        onAjustarSanidade={ajustarSanidade}
                        onAlternarSanidade={alternarSanidade}
                        defesaTotal={defesaTotal}
                        bonusDefesaPoder={bonusPoderes.defesa}
                        defesaEquip={defesaEquip}
                        defesaOutros={defesaOutros}
                        onDefesaOutrosChange={handleDefesaOutrosChange}
                        protecaoTexto={protecaoTexto}
                        resistencias={resistencias}
                        onResistenciasChange={handleResistenciasChange}
                        origemEscolhida={origemEscolhida}
                        onTrocarOrigem={() => setModalOrigemAberto(true)}
                    />
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

                <PericiasTable
                    atributos={atributos}
                    salvasPorNome={salvasPorNome}
                    bonusPericias={bonusPoderes.pericias}
                    onRollSkill={rollSkill}
                />

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
                            <CombateTab
                                buscaAtaque={buscaAtaque}
                                onBuscaAtaqueChange={setBuscaAtaque}
                                onNovoAtaque={() => setModalAtaqueAberto(true)}
                                ataquesFiltrados={ataquesFiltrados}
                                ataquesVazio={ataquesCombinados.length === 0}
                                expandidosAtaques={expandidosAtaques}
                                onToggleExpandidoAtaque={toggleExpandidoAtaque}
                                onRollAtaque={rollAtaque}
                                onRemoverAtaque={handleRemoverAtaque}
                                dieSides={dieSides}
                                onDieSidesChange={setDieSides}
                                diceQty={diceQty}
                                onDiceQtyChange={setDiceQty}
                                diceMod={diceMod}
                                onDiceModChange={setDiceMod}
                                onRollSelectedDice={handleRollSelectedDice}
                                rollLog={rollLog}
                            />
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
                                    <button type="button" className="btn-add-item" title="Adicionar item" onClick={() => setModalAberto(true)}>+</button>
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
                                    <TrilhaTab
                                        trilha="Combatente"
                                        nex={nex}
                                        numeroLimpo={{
                                            label: 'Ataque Especial',
                                            texto: ataqueEspecialAtual
                                                ? `até ${ataqueEspecialAtual.pe} PE por +${ataqueEspecialAtual.bonus} (no ataque ou no dano)`
                                                : '—',
                                        }}
                                        catalogoSecundario={OPT.TRILHAS_COMBATENTE}
                                        trilhaSecundariaEscolhida={trilhaCombatenteEscolhida}
                                        onEscolherTrilhaSecundaria={handleEscolherTrilhaCombatente}
                                        poderMarcos={OPT.PODER_COMBATENTE_MARCOS}
                                        poderCatalogo={OPT.PODERES_COMBATENTE}
                                        poderesEscolhidos={poderesCombatenteEscolhidos}
                                        onEscolherPoder={handleEscolherPoderCombatente}
                                    />
                                ) : trilha === 'Especialista' ? (
                                    <TrilhaTab
                                        trilha="Especialista"
                                        nex={nex}
                                        numeroLimpo={{
                                            label: 'Eclético / Perito',
                                            texto: peritoEspecialistaAtual
                                                ? `até ${peritoEspecialistaAtual.pe} PE por +${peritoEspecialistaAtual.dado} numa perícia (Eclético/Perito)`
                                                : '—',
                                        }}
                                        catalogoSecundario={OPT.TRILHAS_ESPECIALISTA}
                                        trilhaSecundariaEscolhida={trilhaEspecialistaEscolhida}
                                        onEscolherTrilhaSecundaria={handleEscolherTrilhaEspecialista}
                                        poderMarcos={OPT.PODER_ESPECIALISTA_MARCOS}
                                        poderCatalogo={OPT.PODERES_ESPECIALISTA}
                                        poderesEscolhidos={poderesEspecialistaEscolhidos}
                                        onEscolherPoder={handleEscolherPoderEspecialista}
                                    />
                                ) : trilha === 'Ocultista' ? (
                                    <TrilhaTab
                                        trilha="Ocultista"
                                        nex={nex}
                                        catalogoSecundario={OPT.TRILHAS_OCULTISTA}
                                        trilhaSecundariaEscolhida={trilhaOcultistaEscolhida}
                                        onEscolherTrilhaSecundaria={handleEscolherTrilhaOcultista}
                                        poderMarcos={OPT.PODER_OCULTISTA_MARCOS}
                                        poderCatalogo={OPT.PODERES_OCULTISTA}
                                        poderesEscolhidos={poderesOcultistaEscolhidos}
                                        onEscolherPoder={handleEscolherPoderOcultista}
                                    />
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

            <AdicionarItemModal
                aberto={modalAberto}
                onFechar={() => setModalAberto(false)}
                onAdicionar={adicionarAoInventario}
                onAdicionarCustom={handleAdicionarItemCustom}
            />

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

            <NovoAtaqueModal
                aberto={modalAtaqueAberto}
                onFechar={() => setModalAtaqueAberto(false)}
                onAdicionar={handleAdicionarAtaque}
            />

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
