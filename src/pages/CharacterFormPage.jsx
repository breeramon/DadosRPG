import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Characters } from '@/services/firebase';
import AttributePentagram from '@/components/AttributePentagram';
import RitualCatalogModal, { elementoSlug, subtituloRitual, statsDoRitual, TrashIcon } from '@/components/RitualCatalogModal';
import OrigemCatalogModal from '@/components/OrigemCatalogModal';
import * as OP from '@/lib/pericias';
import * as OPR from '@/lib/rituais';
import { origemPorNome } from '@/lib/origens';
import * as OPT from '@/lib/trilhas';

const ATRIBUTOS = [
    { key: 'agi', label: 'AGI', posClass: 'pos-agi' },
    { key: 'int', label: 'INT', posClass: 'pos-int' },
    { key: 'vig', label: 'VIG', posClass: 'pos-vig' },
    { key: 'pre', label: 'PRE', posClass: 'pos-pre' },
    { key: 'for', label: 'FOR', posClass: 'pos-for' },
];

const ATRIBUTOS_ZERO = { agi: 0, int: 0, vig: 0, pre: 0, for: 0 };

function catalogoInicial() {
    const estado = {};
    OP.PERICIAS_CATALOGO.forEach(p => {
        estado[p.nome] = { treinado: false, grau: 'treinado', bonusExtra: 0, autoFixo: false };
    });
    return estado;
}

function periciasStateApartirDoPersonagem(personagem) {
    const estado = catalogoInicial();
    const escolhas = [null, null];
    if (personagem && Array.isArray(personagem.pericias)) {
        personagem.pericias.forEach(p => {
            const alvo = estado[p.nome];
            if (!alvo) return; // perícia salva não bate com o catálogo atual (dado antigo)
            const grau = p.grau || OP.grauApartirDoBonus(p.bonus);
            alvo.treinado = true;
            alvo.grau = grau;
            alvo.bonusExtra = (typeof p.bonusExtra === 'number')
                ? p.bonusExtra
                : Math.max(0, (Number(p.bonus) || 0) - (OP.GRAU_BONUS[grau] || 0));

            const trilha = personagem.trilha || 'Ocultista';
            const regra = OP.TRILHA_REGRAS[trilha];
            if (regra && regra.gruposFixos.length) {
                regra.gruposFixos.forEach((grupo, i) => {
                    if (grupo.includes(p.nome)) escolhas[i] = p.nome;
                });
            }
        });
    }
    return { estado, escolhas };
}

function aplicarFixas(periciasState, trilha, combatenteEscolhasFixas, origemNome) {
    const regra = OP.TRILHA_REGRAS[trilha] || OP.TRILHA_REGRAS.Combatente;
    const desejado = new Set(regra.fixasSimples);
    const origemAtual = origemPorNome(origemNome);
    if (origemAtual) {
        origemAtual.periciasTreinadas.forEach(nome => desejado.add(nome));
    }
    const escolhas = [...combatenteEscolhasFixas];
    let escolhasMudou = false;

    regra.gruposFixos.forEach((grupo, i) => {
        if (!escolhas[i] || !grupo.includes(escolhas[i])) {
            escolhas[i] = grupo[0];
            escolhasMudou = true;
        }
        desejado.add(escolhas[i]);
    });

    let mudou = false;
    const next = { ...periciasState };
    Object.entries(next).forEach(([nome, st]) => {
        if (st.autoFixo && !desejado.has(nome)) {
            next[nome] = { ...st, treinado: false, autoFixo: false };
            mudou = true;
        }
    });
    desejado.forEach(nome => {
        const st = next[nome];
        if (!st) return;
        if (!st.treinado || !st.autoFixo || !st.grau) {
            next[nome] = { ...st, treinado: true, autoFixo: true, grau: st.grau || 'treinado' };
            mudou = true;
        }
    });

    return { periciasState: mudou ? next : periciasState, combatenteEscolhasFixas: escolhasMudou ? escolhas : combatenteEscolhasFixas, mudou, escolhasMudou };
}

function nomesFixosDe(periciasState) {
    return Object.entries(periciasState).filter(([, st]) => st.autoFixo).map(([nome]) => nome);
}

export default function CharacterFormPage() {
    const { id } = useParams();
    const { user } = useOutletContext();
    const navigate = useNavigate();

    const [carregando, setCarregando] = useState(!!id);
    const [salvando, setSalvando] = useState(false);
    const [tentouSalvar, setTentouSalvar] = useState(false);

    const [nome, setNome] = useState('');
    const [trilha, setTrilha] = useState('Ocultista');
    const [nex, setNex] = useState(5);
    const [atributos, setAtributos] = useState(ATRIBUTOS_ZERO);
    const [periciasState, setPericiasState] = useState(catalogoInicial);
    const [combatenteEscolhasFixas, setCombatenteEscolhasFixas] = useState([null, null]);
    const [origem, setOrigem] = useState('');
    const [modalOrigemAberto, setModalOrigemAberto] = useState(false);
    const [rituais, setRituais] = useState([]);
    const [modalRitualAberto, setModalRitualAberto] = useState(false);
    const [expandidosConhecidos, setExpandidosConhecidos] = useState(() => new Set());
    const [trilhaCombatenteEscolhida, setTrilhaCombatenteEscolhida] = useState('');
    const [poderesCombatenteEscolhidos, setPoderesCombatenteEscolhidos] = useState([]);
    const [trilhaEspecialistaEscolhida, setTrilhaEspecialistaEscolhida] = useState('');
    const [poderesEspecialistaEscolhidos, setPoderesEspecialistaEscolhidos] = useState([]);
    const [trilhaOcultistaEscolhida, setTrilhaOcultistaEscolhida] = useState('');
    const [poderesOcultistaEscolhidos, setPoderesOcultistaEscolhidos] = useState([]);
    const [abaAtiva, setAbaAtiva] = useState('rituais');

    // ---------------------------------------------------------------
    // Carrega o personagem (edição) ou reseta pros padrões (criação).
    // ---------------------------------------------------------------
    useEffect(() => {
        let cancelado = false;

        if (!id) {
            setNome('');
            setTrilha('Ocultista');
            setNex(5);
            setAtributos(ATRIBUTOS_ZERO);
            const { estado, escolhas } = periciasStateApartirDoPersonagem(null);
            setPericiasState(estado);
            setCombatenteEscolhasFixas(escolhas);
            setOrigem('');
            setRituais([]);
            setTrilhaCombatenteEscolhida('');
            setPoderesCombatenteEscolhidos([]);
            setTrilhaEspecialistaEscolhida('');
            setPoderesEspecialistaEscolhidos([]);
            setTrilhaOcultistaEscolhida('');
            setPoderesOcultistaEscolhidos([]);
            setCarregando(false);
            return;
        }

        setCarregando(true);
        Characters.get(user.uid, id)
            .then(personagem => {
                if (cancelado) return;
                if (!personagem) {
                    window.alert('Esse personagem não existe (ou já foi excluído).');
                    navigate('/characters');
                    return;
                }
                setNome(personagem.nome || '');
                setTrilha(personagem.trilha || 'Ocultista');
                setNex(Number(personagem.nex) || 5);
                const atrs = personagem.atributos || {};
                setAtributos({
                    agi: Number(atrs.agi) || 0,
                    int: Number(atrs.int) || 0,
                    vig: Number(atrs.vig) || 0,
                    pre: Number(atrs.pre) || 0,
                    for: Number(atrs.for) || 0,
                });
                const { estado, escolhas } = periciasStateApartirDoPersonagem(personagem);
                setPericiasState(estado);
                setCombatenteEscolhasFixas(escolhas);
                setOrigem(personagem.origem || '');
                setRituais(Array.isArray(personagem.rituais) ? personagem.rituais : []);
                setTrilhaCombatenteEscolhida(personagem.trilhaCombatenteEscolhida || '');
                setPoderesCombatenteEscolhidos(Array.isArray(personagem.poderesCombatenteEscolhidos) ? personagem.poderesCombatenteEscolhidos : []);
                setTrilhaEspecialistaEscolhida(personagem.trilhaEspecialistaEscolhida || '');
                setPoderesEspecialistaEscolhidos(Array.isArray(personagem.poderesEspecialistaEscolhidos) ? personagem.poderesEspecialistaEscolhidos : []);
                setTrilhaOcultistaEscolhida(personagem.trilhaOcultistaEscolhida || '');
                setPoderesOcultistaEscolhidos(Array.isArray(personagem.poderesOcultistaEscolhidos) ? personagem.poderesOcultistaEscolhidos : []);
            })
            .catch(err => {
                console.error('[character-form] Erro ao carregar personagem pra edição:', err);
                window.alert('Não foi possível carregar o personagem: ' + (err.message || err));
                navigate('/characters');
            })
            .finally(() => {
                if (!cancelado) setCarregando(false);
            });

        return () => { cancelado = true; };
    }, [id, user.uid]);

    const regraAtributos = useMemo(() => OP.pontosAtributoPorNex(nex), [nex]);

    useEffect(() => {
        const regra = regraAtributos;
        const clamped = {};
        ATRIBUTOS.forEach(({ key }) => {
            let v = atributos[key];
            if (Number.isNaN(v)) v = regra.minPorAtributo;
            clamped[key] = Math.max(regra.minPorAtributo, Math.min(regra.maxPorAtributo, v));
        });
        let soma = ATRIBUTOS.reduce((acc, { key }) => acc + clamped[key], 0);
        let guarda = 0;
        while (soma > regra.total && guarda < 100) {
            guarda++;
            let maiorKey = null, maiorVal = regra.minPorAtributo;
            ATRIBUTOS.forEach(({ key }) => {
                if (clamped[key] > maiorVal) { maiorVal = clamped[key]; maiorKey = key; }
            });
            if (!maiorKey) break;
            clamped[maiorKey] -= 1;
            soma -= 1;
        }
        const mudou = ATRIBUTOS.some(({ key }) => clamped[key] !== atributos[key]);
        if (mudou) setAtributos(clamped);
    }, [nex, atributos, regraAtributos]);

    const atributosForaDoLimite = useMemo(
        () => ATRIBUTOS.filter(({ key }) => {
            const v = atributos[key] || 0;
            return v < regraAtributos.minPorAtributo || v > regraAtributos.maxPorAtributo;
        }),
        [atributos, regraAtributos]
    );
    const somaAtributosAtual = useMemo(
        () => ATRIBUTOS.reduce((acc, { key }) => acc + (atributos[key] || 0), 0),
        [atributos]
    );
    const somaAtributosExcedida = somaAtributosAtual > regraAtributos.total;

    useEffect(() => {
        const { periciasState: proximo, combatenteEscolhasFixas: proximasEscolhas, mudou, escolhasMudou } =
            aplicarFixas(periciasState, trilha, combatenteEscolhasFixas, origem);
        if (escolhasMudou) setCombatenteEscolhasFixas(proximasEscolhas);
        if (mudou) {
            setPericiasState(proximo);
            return;
        }

        const grausOk = OP.grausPermitidos(nex);
        const grauMaisAlto = grausOk[grausOk.length - 1];
        let rebaixou = false;
        const rebaixado = { ...periciasState };
        Object.entries(rebaixado).forEach(([nome, st]) => {
            if (st.treinado && !grausOk.includes(st.grau)) {
                rebaixado[nome] = { ...st, grau: grauMaisAlto };
                rebaixou = true;
            }
        });
        if (rebaixou) setPericiasState(rebaixado);
    }, [trilha, nex, combatenteEscolhasFixas, periciasState, origem]);

    const nomesFixos = useMemo(() => nomesFixosDe(periciasState), [periciasState]);
    const grausPermitidos = useMemo(() => OP.grausPermitidos(nex), [nex]);
    const grauMaisAlto = grausPermitidos[grausPermitidos.length - 1];
    // Treinamento em Perícia (poder repetível das 3 trilhas, ver
    // quotaExtraTreinamentoPericia em trilhas.js) soma perícias treinadas
    // extras à cota livre normal (trilha + Intelecto) — cada escolha do
    // poder libera mais 2 perícias, além das já contadas por quotaPericiasLivres.
    const quotaTreinamentoPericia = useMemo(
        () => OPT.quotaExtraTreinamentoPericia({
            poderesCombatenteEscolhidos,
            poderesEspecialistaEscolhidos,
            poderesOcultistaEscolhidos,
        }),
        [poderesCombatenteEscolhidos, poderesEspecialistaEscolhidos, poderesOcultistaEscolhidos]
    );
    const quotaBasePericias = useMemo(() => OP.quotaPericiasLivres(trilha, atributos.int), [trilha, atributos.int]);
    const quotaLivre = quotaBasePericias + quotaTreinamentoPericia;
    const livresUsadas = useMemo(
        () => Object.entries(periciasState).filter(([nome, st]) => st.treinado && !nomesFixos.includes(nome)).length,
        [periciasState, nomesFixos]
    );
    const cotaEsgotada = livresUsadas >= quotaLivre;
    const quotaLivreExcedida = livresUsadas > quotaLivre;
    const regraTrilha = OP.TRILHA_REGRAS[trilha] || OP.TRILHA_REGRAS.Combatente;
    const circuloOcultista = trilha === 'Ocultista' ? OP.circuloRitualLiberado(nex) : 0;
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

    const origemEscolhida = useMemo(() => origemPorNome(origem), [origem]);

    function handleEscolherOrigem(origemDoCatalogo) {
        setOrigem(origemDoCatalogo.nome);
        setModalOrigemAberto(false);
        toast.success(`Origem "${origemDoCatalogo.nome}" escolhida.`);
    }

    const catalogoAgrupado = useMemo(() => {
        return ATRIBUTOS.map(({ key, label }) => ({
            key,
            label,
            itens: OP.PERICIAS_CATALOGO.filter(p => p.atributo === key && !nomesFixos.includes(p.nome)),
        })).filter(grupo => grupo.itens.length);
    }, [nomesFixos]);

    const handleAttrChange = useCallback((key, valor) => {
        const v = parseInt(valor, 10);
        setAtributos(prev => ({ ...prev, [key]: Number.isNaN(v) ? 0 : v }));
    }, []);

    const handleAttrStepper = useCallback((key, delta) => {
        setAtributos(prev => ({ ...prev, [key]: (prev[key] || 0) + delta }));
    }, []);

    function handleTrilhaChange(novaTrilha) {
        setTrilha(novaTrilha);
        setCombatenteEscolhasFixas([null, null]);
        setTrilhaCombatenteEscolhida('');
        setPoderesCombatenteEscolhidos([]);
        setTrilhaEspecialistaEscolhida('');
        setPoderesEspecialistaEscolhidos([]);
        setTrilhaOcultistaEscolhida('');
        setPoderesOcultistaEscolhidos([]);
    }
    function handleEscolherTrilhaCombatente(nomeTrilha) {
        setTrilhaCombatenteEscolhida(nomeTrilha);
    }
    function handleEscolherPoderCombatente(indice, nomePoder) {
        setPoderesCombatenteEscolhidos(prev => {
            const novo = [...prev];
            novo[indice] = nomePoder;
            return novo;
        });
    }
    function handleEscolherTrilhaEspecialista(nomeTrilha) {
        setTrilhaEspecialistaEscolhida(nomeTrilha);
    }
    function handleEscolherPoderEspecialista(indice, nomePoder) {
        setPoderesEspecialistaEscolhidos(prev => {
            const novo = [...prev];
            novo[indice] = nomePoder;
            return novo;
        });
    }
    function handleEscolherTrilhaOcultista(nomeTrilha) {
        setTrilhaOcultistaEscolhida(nomeTrilha);
    }
    function handleEscolherPoderOcultista(indice, nomePoder) {
        setPoderesOcultistaEscolhidos(prev => {
            const novo = [...prev];
            novo[indice] = nomePoder;
            return novo;
        });
    }

    function handleNexChange(valor) {
        setNex(OP.clampNex(valor));
    }

    function handleGrupoFixoChange(i, novoNome) {
        setCombatenteEscolhasFixas(prev => {
            const next = [...prev];
            next[i] = novoNome;
            return next;
        });
    }

    function handleCheckboxToggle(nomePericia) {
        setPericiasState(prev => {
            const st = prev[nomePericia];
            const novoTreinado = !st.treinado;
            return {
                ...prev,
                [nomePericia]: { ...st, treinado: novoTreinado, grau: novoTreinado ? 'treinado' : st.grau },
            };
        });
    }

    function handleGrauChange(nomePericia, novoGrau) {
        setPericiasState(prev => ({ ...prev, [nomePericia]: { ...prev[nomePericia], grau: novoGrau } }));
    }

    function handleBonusChange(nomePericia, valor) {
        const v = parseInt(valor, 10) || 0;
        setPericiasState(prev => ({ ...prev, [nomePericia]: { ...prev[nomePericia], bonusExtra: v } }));
    }

    function adicionarRitual(catalogRitual) {
        if (rituais.some(r => r.nome === catalogRitual.nome)) {
            toast.error(`Você já conhece "${catalogRitual.nome}".`);
            return;
        }
        setRituais(prev => [...prev, { ...catalogRitual }]);
        toast.success(`"${catalogRitual.nome}" adicionado aos rituais.`);
    }

    function handleRemoverRitual(index) {
        setRituais(prev => prev.filter((_, i) => i !== index));
    }

    function toggleExpandidoConhecido(nome) {
        setExpandidosConhecidos(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

    function validarECollectar() {
        if (!nome.trim()) {
            toast.error('Dê um nome para o personagem.');
            return null;
        }

        const somaAtributos = ATRIBUTOS.reduce((acc, { key }) => acc + (atributos[key] || 0), 0);
        const atributoForaDoLimite = ATRIBUTOS.find(({ key }) => {
            const v = atributos[key] || 0;
            return v < regraAtributos.minPorAtributo || v > regraAtributos.maxPorAtributo;
        });
        if (atributoForaDoLimite) {
            toast.error(`${atributoForaDoLimite.label} está fora do limite permitido pelo NEX ${nex}% (entre ${regraAtributos.minPorAtributo} e ${regraAtributos.maxPorAtributo}).`);
            return null;
        }
        if (somaAtributos > regraAtributos.total) {
            toast.error(`Esse personagem tem ${somaAtributos} pontos de atributo distribuídos, mas o NEX ${nex}% só libera ${regraAtributos.total}. Ajuste os atributos antes de salvar.`);
            return null;
        }

        if (livresUsadas > quotaLivre) {
            toast.error(`Esse personagem tem ${livresUsadas} perícias treinadas à escolha, mas o NEX ${nex}% só permite ${quotaLivre}. Desmarque algumas perícias ou aumente o NEX.`);
            return null;
        }

        const pericias = OP.PERICIAS_CATALOGO
            .filter(p => periciasState[p.nome] && periciasState[p.nome].treinado)
            .map(p => {
                const st = periciasState[p.nome];
                const bonus = OP.GRAU_BONUS[st.grau] + (Number(st.bonusExtra) || 0);
                return { nome: p.nome, atributo: p.atributo, treinado: true, grau: st.grau, bonusExtra: Number(st.bonusExtra) || 0, bonus };
            });

        return { nome: nome.trim(), trilha, nex, atributos, pericias, origem, rituais, trilhaCombatenteEscolhida, poderesCombatenteEscolhidos, trilhaEspecialistaEscolhida, poderesEspecialistaEscolhidos, trilhaOcultistaEscolhida, poderesOcultistaEscolhidos };
    }

    async function handleSalvar() {
        setTentouSalvar(true);
        const dados = validarECollectar();
        if (!dados) return;

        setSalvando(true);
        try {
            if (id) {
                await Characters.update(user.uid, id, dados);
            } else {
                await Characters.create(user.uid, dados);
            }
            navigate('/characters');
        } catch (err) {
            console.error('[character-form] Erro ao salvar personagem:', err);
            toast.error('Não foi possível salvar: ' + (err.message || err));
            setSalvando(false);
        }
    }

    if (carregando) {
        return <div className="app-loading">Carregando...</div>;
    }

    const pentagramNodes = ATRIBUTOS.map(({ key, label, posClass }) => ({
        key,
        label,
        posClass,
        content: (
            <div className="attr-stepper">
                <button type="button" className="attr-stepper-btn" onClick={() => handleAttrStepper(key, -1)} title="-1">{'−'}</button>
                <input
                    type="number"
                    className={`attr-value-input${atributosForaDoLimite.some(a => a.key === key) ? ' attr-value-input-erro' : ''}`}
                    value={atributos[key]}
                    onChange={e => handleAttrChange(key, e.target.value)}
                />
                <button type="button" className="attr-stepper-btn" onClick={() => handleAttrStepper(key, 1)} title="+1">+</button>
            </div>
        ),
    }));

    return (
        <div className="screen screen-form">
            <div className="sheet-topbar">
                <button type="button" className="btn-secondary" onClick={() => navigate('/characters')}>&larr; Cancelar</button>
                <div className="sheet-topbar-title">
                    <span>{id ? 'Editar Personagem' : 'Novo Personagem'}</span>
                </div>
                <button
                    type="button"
                    className={`btn-action${salvando ? ' btn-action-busy' : ''}`}
                    onClick={handleSalvar}
                    disabled={salvando}
                    aria-busy={salvando}
                >
                    {salvando && <span className="btn-spinner" />}
                    <span>{salvando ? 'Salvando...' : 'Salvar Personagem'}</span>
                </button>
            </div>

            <div className="character-form-grid">
                <section className="form-identity-section">
                    <div className="control-group full">
                        <label>Nome do Personagem</label>
                        <input
                            type="text"
                            required
                            className={tentouSalvar && !nome.trim() ? 'input-erro' : ''}
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                        />
                        {tentouSalvar && !nome.trim() && (
                            <span className="form-field-erro">Dê um nome pro personagem.</span>
                        )}
                    </div>

                    <div className="control-group full">
                        <label>Origem</label>
                        <div className="origem-resumo">
                            {origemEscolhida ? (
                                <>
                                    <div className="origem-resumo-header">
                                        <span className="origem-resumo-nome">{origemEscolhida.nome}</span>
                                        <button type="button" className="btn-secondary" onClick={() => setModalOrigemAberto(true)}>Trocar Origem</button>
                                    </div>
                                    <div className="origem-resumo-descricao">{origemEscolhida.descricao}</div>
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
                                </>
                            ) : (
                                <div className="origem-resumo-header">
                                    <span className="origem-resumo-vazio">
                                        {origem
                                            ? `Origem salva ("${origem}") não corresponde a nenhuma Origem oficial do catálogo — escolha uma pra liberar Perícias Treinadas e Poder de Origem.`
                                            : 'Nenhuma Origem escolhida ainda.'}
                                    </span>
                                    <button type="button" className="btn-action" onClick={() => setModalOrigemAberto(true)}>Escolher Origem</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-trilha-nex-grid">
                        <div className="control-group full">
                            <label>Trilha</label>
                            <select value={trilha} onChange={e => handleTrilhaChange(e.target.value)}>
                                <option value="Ocultista">Ocultista</option>
                                <option value="Combatente">Combatente</option>
                                <option value="Especialista">Especialista</option>
                            </select>
                        </div>

                        <div className="control-group full">
                            <label>NEX (Nível de Exposição)</label>
                            <input
                                type="number"
                                min={5}
                                max={99}
                                step={5}
                                value={nex}
                                onChange={e => setNex(parseInt(e.target.value, 10) || 5)}
                                onBlur={e => handleNexChange(e.target.value)}
                            />
                        </div>
                    </div>

                    <h3>Atributos</h3>

                    <AttributePentagram gradientId="opRitualGlowForm" nodes={pentagramNodes} className="form-pentagram" />

                    <div className="atributos-info">
                        <span>Pontos de atributo: <strong className={ATRIBUTOS.reduce((acc, { key }) => acc + atributos[key], 0) > regraAtributos.total ? 'atributos-erro' : ''}>
                            {ATRIBUTOS.reduce((acc, { key }) => acc + atributos[key], 0)} / {regraAtributos.total}
                        </strong></span>
                        <span>Máximo por atributo neste NEX: <strong>{regraAtributos.maxPorAtributo}</strong> (mínimo 0)</span>
                        {regraAtributos.extrapolado && (
                            <div className="atributos-aviso">
                                NEX acima de 5%: total e máximo ampliados por uma extensão não-oficial das regras
                                (ver comentário em src/lib/pericias.js) — ajuste com seu mestre se preferir outra convenção.
                            </div>
                        )}
                        {somaAtributosExcedida && (
                            <div className="info-aviso-erro">
                                Você distribuiu {somaAtributosAtual} pontos, mas o NEX {nex}% só libera {regraAtributos.total} — tire pontos de algum atributo antes de salvar.
                            </div>
                        )}
                        {atributosForaDoLimite.length > 0 && (
                            <div className="info-aviso-erro">
                                {atributosForaDoLimite.map(a => a.label).join(', ')} fora do limite permitido (entre {regraAtributos.minPorAtributo} e {regraAtributos.maxPorAtributo}).
                            </div>
                        )}
                    </div>
                </section>

                <section className="form-pericias-section skills-section">
                    <h3>Perícias</h3>
                    <div className="pericias-info">
                        <span>NEX {nex}%</span>
                        <span>Grau máximo liberado: <strong>{OP.GRAU_LABEL[grauMaisAlto]}</strong></span>
                        <span
                            className={cotaEsgotada ? 'pericias-cota-cheia' : ''}
                            title={quotaTreinamentoPericia ? `Base (trilha + Intelecto): ${quotaBasePericias} · Treinamento em Perícia: +${quotaTreinamentoPericia}` : undefined}
                        >
                            Perícias treinadas à escolha: <strong>{livresUsadas} / {quotaLivre}</strong>
                        </span>
                        {quotaLivreExcedida && (
                            <div className="info-aviso-erro">
                                Desmarque {livresUsadas - quotaLivre} perícia(s) treinada(s) à escolha — o NEX {nex}% atual só permite {quotaLivre}.
                            </div>
                        )}
                    </div>

                    {(regraTrilha.fixasSimples.length > 0 || regraTrilha.gruposFixos.length > 0 || (origemEscolhida?.periciasTreinadas.length > 0)) && (
                        <div className="pericias-fixas">
                            <div className="pericias-fixas-titulo">Perícias automáticas da trilha</div>

                            {regraTrilha.fixasSimples.map(nomePericia => {
                                const catalogo = OP.PERICIAS_CATALOGO.find(p => p.nome === nomePericia);
                                return (
                                    <div className="pericia-fixa-item" key={nomePericia}>
                                        {nomePericia} ({(catalogo?.atributo || '').toUpperCase()}) — automática
                                    </div>
                                );
                            })}

                            {origemEscolhida?.periciasTreinadas.map(nomePericia => {
                                const catalogo = OP.PERICIAS_CATALOGO.find(p => p.nome === nomePericia);
                                return (
                                    <div className="pericia-fixa-item pericia-fixa-origem" key={`origem-${nomePericia}`}>
                                        {nomePericia} ({(catalogo?.atributo || '').toUpperCase()}) — automática (Origem: {origemEscolhida.nome})
                                    </div>
                                );
                            })}

                            {regraTrilha.gruposFixos.map((grupo, i) => (
                                <div className="pericia-fixa-grupo" key={i}>
                                    <label>Escolha: {grupo.join(' ou ')}</label>
                                    <select
                                        value={combatenteEscolhasFixas[i] || grupo[0]}
                                        onChange={e => handleGrupoFixoChange(i, e.target.value)}
                                    >
                                        {grupo.map(nomePericia => (
                                            <option value={nomePericia} key={nomePericia}>{nomePericia}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="form-pericias-catalogo">
                        {catalogoAgrupado.map(grupo => (
                            <div className="pericias-catalogo-grupo" key={grupo.key}>
                                <div className="pericias-catalogo-grupo-titulo">{grupo.label}</div>
                                {grupo.itens.map(p => {
                                    const st = periciasState[p.nome];
                                    return (
                                        <div className="pericia-catalogo-row" key={p.nome}>
                                            <label className="pericia-catalogo-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={st.treinado}
                                                    disabled={!st.treinado && cotaEsgotada}
                                                    onChange={() => handleCheckboxToggle(p.nome)}
                                                />
                                                {' ' + p.nome}
                                            </label>

                                            {st.treinado && (
                                                <>
                                                    <select
                                                        className="pericia-catalogo-grau"
                                                        value={st.grau}
                                                        onChange={e => handleGrauChange(p.nome, e.target.value)}
                                                    >
                                                        {grausPermitidos.map(g => (
                                                            <option value={g} key={g}>{OP.GRAU_LABEL[g]} (+{OP.GRAU_BONUS[g]})</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="pericia-catalogo-bonus-extra"
                                                        title="Bônus extra (equipamento, talento, etc)"
                                                        value={st.bonusExtra || 0}
                                                        onChange={e => handleBonusChange(p.nome, e.target.value)}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="sheet-tabs-section">
                    <nav className="sheet-tabs-nav">
                        <button
                            type="button"
                            className={`sheet-tab-btn${abaAtiva === 'rituais' ? ' active' : ''}`}
                            onClick={() => setAbaAtiva('rituais')}
                        >
                            Rituais
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
                        {abaAtiva === 'rituais' && (
                            <div className="tab-panel-rituais">
                                <div className="rituals-section-header">
                                    <h3>Rituais</h3>
                                    <button type="button" className="btn-add-item" title="Adicionar ritual" onClick={() => setModalRitualAberto(true)}>+</button>
                                </div>

                                {trilha === 'Ocultista' && (
                                    <div className="rituais-info">
                                        {circuloOcultista > 0
                                            ? `Círculo de Rituais liberado neste NEX: até o ${circuloOcultista}º círculo.`
                                            : 'NEX ainda não libera nenhum círculo de rituais.'}
                                    </div>
                                )}

                                <div className="rituals-list">
                                    {rituais.length === 0 && (
                                        <div className="inventory-empty">Nenhum ritual conhecido ainda.</div>
                                    )}
                                    {rituais.map((ritual, index) => {
                                        const aberto = expandidosConhecidos.has(ritual.nome);
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
                                            <label htmlFor="form-trilha-combatente-select">Trilha de Combatente</label>
                                            <select
                                                id="form-trilha-combatente-select"
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
                                                        <label htmlFor={`form-poder-combatente-${indice}`}>
                                                            Poder {indice + 1} <small>(NEX {OPT.PODER_COMBATENTE_MARCOS[indice]}%)</small>
                                                        </label>
                                                        <select
                                                            id={`form-poder-combatente-${indice}`}
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
                                            <label htmlFor="form-trilha-especialista-select">Trilha de Especialista</label>
                                            <select
                                                id="form-trilha-especialista-select"
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
                                                        <label htmlFor={`form-poder-especialista-${indice}`}>
                                                            Poder {indice + 1} <small>(NEX {OPT.PODER_ESPECIALISTA_MARCOS[indice]}%)</small>
                                                        </label>
                                                        <select
                                                            id={`form-poder-especialista-${indice}`}
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
                                            <label htmlFor="form-trilha-ocultista-select">Trilha de Ocultista</label>
                                            <select
                                                id="form-trilha-ocultista-select"
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
                                                        <label htmlFor={`form-poder-ocultista-${indice}`}>
                                                            Poder {indice + 1} <small>(NEX {OPT.PODER_OCULTISTA_MARCOS[indice]}%)</small>
                                                        </label>
                                                        <select
                                                            id={`form-poder-ocultista-${indice}`}
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
                                        Poderes de trilha para {trilha || 'essa trilha'} ainda não foram modelados
                                        nesta ficha.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <RitualCatalogModal
                aberto={modalRitualAberto}
                onFechar={() => setModalRitualAberto(false)}
                trilha={trilha}
                nex={nex}
                rituaisConhecidos={rituais}
                onAdicionar={adicionarRitual}
            />

            <OrigemCatalogModal
                aberto={modalOrigemAberto}
                onFechar={() => setModalOrigemAberto(false)}
                origemAtual={origem}
                onEscolher={handleEscolherOrigem}
            />
        </div>
    );
}
