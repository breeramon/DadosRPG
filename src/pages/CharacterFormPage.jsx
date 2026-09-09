import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Characters } from '@/services/firebase';
import AttributePentagram from '@/components/AttributePentagram';
import RitualCatalogModal from '@/components/RitualCatalogModal';
import RitualTab from '@/components/RitualTab';
import OrigemCatalogModal from '@/components/OrigemCatalogModal';
import TrilhaPanel from '@/components/TrilhaPanel';
import * as OP from '@/lib/pericias';
import * as OPR from '@/lib/rituais';
import { origemPorNome } from '@/lib/origens';
import * as OPT from '@/lib/trilhas';

const ATRIBUTOS = [
    { key: 'agi', label: 'AGI', nome: 'Agilidade', posClass: 'pos-agi' },
    { key: 'int', label: 'INT', nome: 'Intelecto', posClass: 'pos-int' },
    { key: 'vig', label: 'VIG', nome: 'Vigor', posClass: 'pos-vig' },
    { key: 'pre', label: 'PRE', nome: 'Presença', posClass: 'pos-pre' },
    { key: 'for', label: 'FOR', nome: 'Força', posClass: 'pos-for' },
];

const ATRIBUTOS_ZERO = { agi: 0, int: 0, vig: 0, pre: 0, for: 0 };

// NEX (Nível de Exposição) sobe de 5 em 5, de 5% até 95%, com 99% como
// marco final especial (não é múltiplo de 5 -- ver OP.clampNex em
// pericias.js, que arredonda qualquer valor pro múltiplo de 5 mais
// próximo e trata 99 como teto). Antes era um <input type="number">
// com step={5}; virou <select> pra deixar essas opções explícitas em
// vez de depender do usuário acertar o passo com as setinhas.
const NEX_OPCOES = [...Array.from({ length: 19 }, (_, i) => (i + 1) * 5), 99];

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
    // circuloOcultista (aviso de círculo de rituais liberado por NEX)
    // agora é calculado dentro do RitualTab.jsx / RitualCatalogModal.jsx.
    // slotsPoderX / trilhaXInfo (Combatente/Especialista/Ocultista) não
    // moram mais aqui -- viraram cálculo interno do TrilhaTab.jsx, que
    // recebe só nex/catalogoSecundario/trilhaSecundariaEscolhida.
    const ataqueEspecialAtual = useMemo(() => OPT.ataqueEspecialMaximo(nex), [nex]);
    const peritoEspecialistaAtual = useMemo(() => OPT.peritoEspecialistaMaximo(nex), [nex]);

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

    // Quota de QUANTIDADE de rituais conhecidos: base "Escolhido pelo
    // Outro Lado" (só Ocultista, 3/4/5 por NEX 5/10/15 -- ver
    // quotaBaseRituaisOcultista em trilhas.js) + o poder repetível
    // "Aprender Ritual" (Intelecto x2 por vez escolhido, disponível nas
    // 3 trilhas -- é o único jeito de Combatente/Especialista terem
    // acesso a rituais) + o bônus da trilha secundária Graduado
    // (Saber Ampliado/Grimório Ritualístico -- ver quotaBonusGraduado
    // em trilhas.js).
    const quotaRituais = useMemo(
        () =>
            (trilha === 'Ocultista' ? OPT.quotaBaseRituaisOcultista(nex) : 0) +
            OPT.quotaExtraAprenderRitual({
                poderesCombatenteEscolhidos,
                poderesEspecialistaEscolhidos,
                poderesOcultistaEscolhidos,
                intelecto: atributos.int,
            }) +
            OPT.quotaBonusGraduado({ trilha, trilhaOcultistaEscolhida, nex, intelecto: atributos.int }),
        [trilha, nex, poderesCombatenteEscolhidos, poderesEspecialistaEscolhidos, poderesOcultistaEscolhidos, trilhaOcultistaEscolhida, atributos.int]
    );
    const quotaRituaisEsgotada = rituais.length >= quotaRituais;

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

    const pentagramNodes = ATRIBUTOS.map(({ key, label, nome, posClass }) => ({
        key,
        label,
        posClass,
        content: (
            <div className="attr-stepper">
                <button type="button" className="attr-stepper-btn" aria-label={`Diminuir ${nome} em 1`} onClick={() => handleAttrStepper(key, -1)} title="-1">{'−'}</button>
                <input
                    type="number"
                    className={`attr-value-input${atributosForaDoLimite.some(a => a.key === key) ? ' attr-value-input-erro' : ''}`}
                    value={atributos[key]}
                    onChange={e => handleAttrChange(key, e.target.value)}
                />
                <button type="button" className="attr-stepper-btn" aria-label={`Aumentar ${nome} em 1`} onClick={() => handleAttrStepper(key, 1)} title="+1">+</button>
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
                            <label htmlFor="form-nex-select">NEX (Nível de Exposição)</label>
                            <select
                                id="form-nex-select"
                                value={nex}
                                onChange={e => handleNexChange(e.target.value)}
                            >
                                {NEX_OPCOES.map(valor => (
                                    <option key={valor} value={valor}>{valor}%</option>
                                ))}
                            </select>
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
                            <RitualTab
                                titulo="Rituais"
                                trilha={trilha}
                                nex={nex}
                                rituais={rituais}
                                quota={quotaRituais}
                                expandidos={expandidosConhecidos}
                                onToggleExpandido={toggleExpandidoConhecido}
                                onAbrirModal={() => setModalRitualAberto(true)}
                                onRemoverRitual={handleRemoverRitual}
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
                                idPrefix="form-"
                            />
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
                quotaEsgotada={quotaRituaisEsgotada}
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
