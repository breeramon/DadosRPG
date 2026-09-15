import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Characters } from '@/services/firebase';
import AttributePentagram from '@/components/AttributePentagram';
import { useDiceBox } from '@/hooks/useDiceBox';
import { useDicePreferences } from '@/hooks/useDicePreferences';
import { useAtalhosPreferences } from '@/hooks/useAtalhosPreferences';
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
import TrilhaPanel from '@/components/TrilhaPanel';
import InventarioTab from '@/components/InventarioTab';
import RitualTab from '@/components/RitualTab';
import RitualCatalogModal from '@/components/RitualCatalogModal';

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

// elementoSlug/subtituloRitual/statsDoRitual (helpers de exibição de
// ritual) saíram daqui -- agora vivem em RitualCatalogModal.jsx (que já
// os exportava pro Formulário usar) e são importados de lá também por
// RitualTab.jsx.
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
    // Última perícia rolada (nome + dados de atributo + bônus já
    // somado) -- guardada só pra alimentar o atalho de teclado "R"
    // (repetir), ver useAtalhosPreferences/handleKeyDown mais abaixo.
    // Não é persistida: reseta ao trocar de ficha/recarregar a página.
    const [ultimaPericia, setUltimaPericia] = useState(null);

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

    // --- Modal "Adicionar Ritual" -- desde a extração do RitualTab.jsx
    // e do compartilhamento do RitualCatalogModal.jsx (mesmo usado pelo
    // Formulário), o filtro/busca/expansão dos cartões DENTRO da modal
    // viraram estado interno dela; aqui só sobra se está aberta e o Set
    // de expandidos da lista de "Rituais Conhecidos" (que é outra
    // coisa -- fica na aba, não na modal). ---
    const [modalRitualAberto, setModalRitualAberto] = useState(false);
    const [expandidosConhecidos, setExpandidosConhecidos] = useState(() => new Set());

    // --- Rolagem personalizada ---
    const [dieSides, setDieSides] = useState(20);
    const [diceQty, setDiceQty] = useState(1);
    const [diceMod, setDiceMod] = useState(0);

    const { rollDiceAnimated, animacao3dPronta, updateDiceTheme, rolando } = useDiceBox('#dice-box');

    // --- Tema/cor dos dados (preferência da conta, ver DiceThemeModal) ---
    const { prefs: dicePrefs, carregado: dicePrefsCarregado, salvar: salvarDicePrefs } = useDicePreferences(user.uid);
    const [modalTemaDadoAberto, setModalTemaDadoAberto] = useState(false);

    // --- Atalhos de teclado pra rolagem (R = repetir última perícia,
    // Espaço = 1d20 avulso) -- preferência da conta, desativada por
    // padrão até o usuário ligar no botão abaixo da caixa de dados.
    const { ativos: atalhosAtivos, carregado: atalhosCarregado, salvar: salvarAtalhos } = useAtalhosPreferences(user.uid);

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

    async function handleToggleAtalhos() {
        const novo = !atalhosAtivos;
        try {
            await salvarAtalhos(novo);
            toast.success(novo
                ? 'Atalhos de teclado ativados — R repete a última perícia, Espaço rola 1d20.'
                : 'Atalhos de teclado desativados.');
        } catch {
            toast.error('Não foi possível salvar a preferência de atalhos agora.');
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
        setUltimaPericia({ skillName, attrDice, bonus });
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
        // Antes só marcava 'crit' (dado 20) e nunca 'fail' (dado 1) -- por
        // isso o Decrypted Text não aparecia em falhas críticas de perícia
        // (só funcionava no pentagrama/1d20 avulso, que já tinham esse
        // check). Mesmo padrão usado em rollSystemDice/rollD20Rapido.
        let type = 'normal';
        if (bestDie === 20) type = 'crit';
        if (bestDie === 1) type = 'fail';
        logMessage(skillName, details, total, type);
    }

    // Atalho "R": refaz a última perícia rolada (mesmo atributo/bônus
    // de então) -- se nenhuma perícia foi rolada ainda nesta sessão,
    // avisa em vez de tentar rolar algo inexistente.
    function repetirUltimaPericia() {
        if (!ultimaPericia) {
            toast.error('Nenhuma perícia foi rolada ainda nesta sessão.');
            return;
        }
        rollSkill(ultimaPericia.skillName, ultimaPericia.attrDice, ultimaPericia.bonus);
    }

    // Atalho "Espaço": rola um 1d20 avulso, sem bônus -- não mexe na
    // rolagem personalizada (dieSides/diceQty/diceMod) da aba Combate.
    async function rollD20Rapido() {
        const rolls = await rollDice(1, 20);
        const resultado = rolls[0];
        const type = resultado === 20 ? 'crit' : (resultado === 1 ? 'fail' : 'normal');
        logMessage('1d20 (atalho)', `[${resultado}]`, resultado, type);
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
    // Atalhos de teclado (R = repetir última perícia, Espaço = 1d20)
    // ---------------------------------------------------------------
    // Só liga o listener global quando a preferência está ativa --
    // enquanto desativada (padrão), nenhuma tecla é interceptada.
    // Triplo bloqueio: nunca dispara (1) enquanto o foco estiver num
    // campo editável (input/textarea/select/contenteditable), (2)
    // enquanto qualquer modal estiver aberta (".modal-overlay" é a
    // marcação genérica usada por todas as modais desta ficha), ou (3)
    // enquanto já existe uma rolagem em andamento na caixa de dados
    // ("rolando", de useDiceBox.js) -- sem esse terceiro bloqueio, os
    // atalhos "furavam" a trava de rolagem única que já existe nos
    // botões (.attr-btn/.btn-roll-skill/etc ficam com disabled=
    // {rolando}, mas o teclado ignorava esse estado e conseguia
    // disparar um novo rollDiceAnimated() por cima do que já estava
    // rolando).
    useEffect(() => {
        if (!atalhosAtivos) return;

        function focoEmCampoEditavel() {
            const el = document.activeElement;
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
        }

        function handleKeyDown(e) {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            if (focoEmCampoEditavel()) return;
            if (document.querySelector('.modal-overlay')) return;
            if (rolando) return;

            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                repetirUltimaPericia();
            } else if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                rollD20Rapido();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [atalhosAtivos, ultimaPericia, rolando]);

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
    const resistenciasEquip = useMemo(() => OPI.resistenciasDoInventario(inventario), [inventario]);
    const resistenciasAutomaticas = useMemo(() => {
        const mapa = { ...bonusPoderes.resistencias };
        for (const [tipo, valor] of Object.entries(resistenciasEquip)) {
            mapa[tipo] = (mapa[tipo] || 0) + valor;
        }
        return Object.entries(mapa)
            .filter(([, valor]) => valor > 0)
            .map(([tipo, valor]) => ({ tipo, valor }))
            .sort((a, b) => a.tipo.localeCompare(b.tipo, 'pt-BR'));
    }, [bonusPoderes.resistencias, resistenciasEquip]);

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

    // Recebe { nome, espacos, efeito, tipoMecanico, ... } já validados
    // (nome não vazio, espacos já numérico) de AdicionarItemModal.jsx --
    // decide o `grupo`/campos extras conforme tipoMecanico e como
    // persistir, e avisa o usuário.
    function handleAdicionarItemCustom({
        nome, espacos, efeito, tipoMecanico,
        dano, critico, tipoDano, alcance,
        tipoProtecao, defesaBonus, resistencias: resistenciasItem,
    }) {
        let novoItem = { nome, categoria: 'Personalizado', espacos, efeito, quantidade: 1, equipado: false, custom: true };
        if (tipoMecanico === 'arma') {
            novoItem = { ...novoItem, grupo: 'armas', dano, critico, tipoDano, alcance };
        } else if (tipoMecanico === 'protecao') {
            novoItem = {
                ...novoItem,
                grupo: 'protecoes',
                tipoProtecao: tipoProtecao || 'corpo',
                defesaBonus: Number(defesaBonus) || 0,
                resistencias: resistenciasItem || [],
            };
        }
        atualizarInventario([...inventario, novoItem]);
        toast.success(`"${nome}" adicionado ao inventário.`);
    }

    // ---------------------------------------------------------------
    // Rituais
    // ---------------------------------------------------------------

    // circuloLiberado (só pro aviso de círculo liberado por NEX,
    // Ocultista) agora é calculado dentro do RitualTab.jsx e do
    // RitualCatalogModal.jsx, que já recebem trilha/nex.
    //
    // Quota de QUANTIDADE de rituais conhecidos: base "Escolhido pelo
    // Outro Lado" (só Ocultista, 3/4/5 por NEX 5/10/15 -- ver
    // quotaBaseRituaisOcultista em trilhas.js) + o poder repetível
    // "Aprender Ritual" (Intelecto x2 por vez escolhido, disponível nas
    // 3 trilhas -- é o único jeito de Combatente/Especialista terem
    // acesso a rituais) + o bônus da trilha secundária Graduado
    // (Saber Ampliado/Grimório Ritualístico -- ver quotaBonusGraduado
    // em trilhas.js). Combina os três numa cota só que a modal e a
    // lista usam pra saber quando bloquear novas adições -- e monta um
    // texto de tooltip (quotaRituaisDetalhe) explicando de onde vem
    // cada parte, igual à cota de perícias no Formulário.
    const { quotaRituais, quotaRituaisDetalhe } = useMemo(() => {
        const base = trilha === 'Ocultista' ? OPT.quotaBaseRituaisOcultista(nex) : 0;
        const aprender = OPT.quotaExtraAprenderRitual({
            poderesCombatenteEscolhidos,
            poderesEspecialistaEscolhidos,
            poderesOcultistaEscolhidos,
            intelecto: atributos.int,
        });
        const graduado = OPT.quotaBonusGraduado({ trilha, trilhaOcultistaEscolhida, nex, intelecto: atributos.int });
        const partes = [];
        if (trilha === 'Ocultista') partes.push(`Escolhido pelo Outro Lado: ${base}`);
        if (aprender > 0) partes.push(`Aprender Ritual: +${aprender}`);
        if (graduado > 0) partes.push(`Graduado: +${graduado}`);
        return {
            quotaRituais: base + aprender + graduado,
            quotaRituaisDetalhe: partes.length ? partes.join(' · ') : undefined,
        };
    }, [trilha, nex, poderesCombatenteEscolhidos, poderesEspecialistaEscolhidos, poderesOcultistaEscolhidos, trilhaOcultistaEscolhida, atributos.int]);
    const quotaRituaisEsgotada = rituais.length >= quotaRituais;

    // Rituais de assinatura concedidos automaticamente por poder de
    // sub-trilha do Ocultista (ex: "Conhecendo o Medo" no Graduado,
    // NEX 99% -- ver rituaisAutomaticosSubTrilha em trilhas.js). Não
    // entram no array `rituais` (não são "escolhidos" pelo jogador) e
    // não contam na cota -- só aparecem já prontos na lista (ver
    // RitualTab.jsx) e são tratados como "já conhecidos" na modal do
    // catálogo (ver rituaisConhecidos logo abaixo), pra não dar pra
    // adicionar de novo por engano.
    const rituaisAutomaticos = useMemo(
        () =>
            OPT.rituaisAutomaticosSubTrilha({ trilha, trilhaOcultistaEscolhida, nex })
                .map(OPR.ritualPorNome)
                .filter(Boolean),
        [trilha, trilhaOcultistaEscolhida, nex]
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
        // Mesma checagem que já vira o selo "NEX insuficiente" e desabilita
        // o "+" dentro do RitualCatalogModal -- repetida aqui como
        // segunda linha de defesa (igual ao "já conhece" acima), já que
        // onAdicionar é a única porta de entrada real pra essa lista.
        if (trilha === 'Ocultista') {
            const liberado = OP.circuloRitualLiberado(nex);
            if (catalogRitual.circulo > liberado) {
                toast.error(`Seu NEX só libera até o ${liberado}º círculo — "${catalogRitual.nome}" é ${catalogRitual.circulo}º.`);
                return;
            }
        }
        if (quotaRituaisEsgotada) {
            toast.error(`Você atingiu seu limite de ${quotaRituais} ritual(is) conhecido(s).`);
            return;
        }
        atualizarRituais([...rituais, { ...catalogRitual }]);
        toast.success(`"${catalogRitual.nome}" adicionado aos rituais.`);
    }

    // abrirModalRituais/fecharModalRituais, o handler de Esc e o filtro
    // de cardsFiltradosRituais saíram daqui -- o RitualCatalogModal.jsx
    // compartilhado com o Formulário já cuida disso tudo sozinho
    // (reset de filtros ao abrir, Esc pra fechar, trava de scroll).
    function toggleExpandidoConhecido(nome) {
        setExpandidosConhecidos(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

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

    const pentagramNodes = OP.ATRIBUTOS.map(({ key, nome, label, posClass }) => {
        const valor = Number(atributos[key]) || 0;
        return {
            key,
            label,
            posClass,
            content: (
                <button
                    className="attr-btn"
                    onClick={() => rollSystemDice(nome, valor)}
                    disabled={rolando}
                    title={rolando ? 'Aguarde a rolagem atual terminar' : undefined}
                >
                    {valor}
                </button>
            ),
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
                        resistenciasAutomaticas={resistenciasAutomaticas}
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

                    <div className="atalhos-toggle-row">
                        <button
                            type="button"
                            className="atalhos-toggle"
                            aria-pressed={atalhosAtivos}
                            disabled={!atalhosCarregado}
                            title="R = repetir a última perícia rolada · Espaço = rolar 1d20 avulso (não dispara enquanto você digita ou com alguma modal aberta)"
                            onClick={handleToggleAtalhos}
                        >
                            {atalhosAtivos ? '− Desativar atalhos (R / Espaço)' : '+ Ativar atalhos de rolagem (R / Espaço)'}
                        </button>
                    </div>
                </section>

                <PericiasTable
                    atributos={atributos}
                    salvasPorNome={salvasPorNome}
                    bonusPericias={bonusPoderes.pericias}
                    onRollSkill={rollSkill}
                    desabilitarRolagem={rolando}
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
                                desabilitarRolagem={rolando}
                            />
                        )}

                        {abaAtiva === 'rituais' && (
                            <RitualTab
                                titulo="Rituais Conhecidos"
                                trilha={trilha}
                                nex={nex}
                                rituais={rituais}
                                quota={quotaRituais}
                                quotaDetalhe={quotaRituaisDetalhe}
                                automaticos={rituaisAutomaticos}
                                expandidos={expandidosConhecidos}
                                onToggleExpandido={toggleExpandidoConhecido}
                                onAbrirModal={() => setModalRitualAberto(true)}
                                onRemoverRitual={handleRemoverRitual}
                                onConjurar={conjurarRitual}
                            />
                        )}

                        {abaAtiva === 'inventario' && (
                            <InventarioTab
                                usados={usados}
                                espacosMax={espacosMax}
                                espacosLimite={espacosLimite}
                                estadoCarga={estadoCarga}
                                inventario={inventario}
                                onAbrirModal={() => setModalAberto(true)}
                                onQtyDelta={handleQtyDelta}
                                onEquiparToggle={handleEquiparToggle}
                                onRemoverItem={handleRemoverItem}
                            />
                        )}

                        {abaAtiva === 'trilha' && (
                            <TrilhaPanel
                                trilha={trilha}
                                nex={nex}
                                ataqueEspecialAtual={ataqueEspecialAtual}
                                peritoEspecialistaAtual={peritoEspecialistaAtual}
                                trilhaCombatenteEscolhida={trilhaCombatenteEscolhida}
                                onEscolherTrilhaCombatente={handleEscolherTrilhaCombatente}
                                poderesCombatenteEscolhidos={poderesCombatenteEscolhidos}
                                onEscolherPoderCombatente={handleEscolherPoderCombatente}
                                trilhaEspecialistaEscolhida={trilhaEspecialistaEscolhida}
                                onEscolherTrilhaEspecialista={handleEscolherTrilhaEspecialista}
                                poderesEspecialistaEscolhidos={poderesEspecialistaEscolhidos}
                                onEscolherPoderEspecialista={handleEscolherPoderEspecialista}
                                trilhaOcultistaEscolhida={trilhaOcultistaEscolhida}
                                onEscolherTrilhaOcultista={handleEscolherTrilhaOcultista}
                                poderesOcultistaEscolhidos={poderesOcultistaEscolhidos}
                                onEscolherPoderOcultista={handleEscolherPoderOcultista}
                            />
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

            <RitualCatalogModal
                aberto={modalRitualAberto}
                onFechar={() => setModalRitualAberto(false)}
                trilha={trilha}
                nex={nex}
                rituaisConhecidos={[...rituais, ...rituaisAutomaticos]}
                quotaEsgotada={quotaRituaisEsgotada}
                onAdicionar={adicionarRitual}
            />

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
