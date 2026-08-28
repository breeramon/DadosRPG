// ============================================================
// CharacterFormPage.jsx
//
// Tela "Criar / Editar Personagem" (equivalente a form.html +
// javascript/character-form.js na versão vanilla). Sem ":id" na rota
// = criando personagem novo; com "/form/:id" = editando (busca os
// dados no Firestore ao carregar).
//
// Sobre o estado das perícias: cada perícia do catálogo guarda
// { treinado, grau, bonusExtra, autoFixo }. "autoFixo" marca as que a
// trilha atual preenche sozinha (ex: Ocultismo/Vontade pro Ocultista,
// ou a escolha de Luta/Pontaria pro Combatente) — controlado por
// aplicarFixasNoEstado, chamada sempre que a trilha ou a escolha do
// par muda (mesma regra da versão vanilla, só que aqui como efeito
// puro em vez de mutação direta do objeto).
// ============================================================

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

// Monta o estado de perícias a partir de um personagem salvo (edição),
// ou o catálogo zerado (criação). Também recupera, quando dá, qual foi
// a escolha original de cada par obrigatório do Combatente.
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

// Porta de aplicarFixasNoEstado (vanilla): garante que as perícias
// automáticas da trilha atual (E da Origem escolhida — ver
// origens.js) estejam marcadas, sem mexer nas escolhidas manualmente.
// Versão pura — devolve um novo estado (e uma nova lista de escolhas,
// com os slots vazios preenchidos) em vez de mutar o de entrada.
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

    const [nome, setNome] = useState('');
    const [trilha, setTrilha] = useState('Ocultista');
    const [nex, setNex] = useState(5);
    const [atributos, setAtributos] = useState(ATRIBUTOS_ZERO);
    const [periciasState, setPericiasState] = useState(catalogoInicial);
    const [combatenteEscolhasFixas, setCombatenteEscolhasFixas] = useState([null, null]);

    // --- Origem (ver src/lib/origens.js) — guarda só o NOME oficial da
    // Origem escolhida (mesmo campo de texto que já existia na ficha,
    // agora preenchido só através da modal de catálogo, nunca digitado
    // à mão). Um personagem salvo antes dessa funcionalidade existir
    // pode ter um texto livre aqui que não bate com nenhuma Origem
    // oficial — nesse caso `origemEscolhida` (useMemo mais abaixo) fica
    // null e a tela mostra esse texto como está, sem nenhuma perícia/
    // poder aplicado, até o jogador escolher uma Origem oficial pra
    // substituir.
    const [origem, setOrigem] = useState('');
    const [modalOrigemAberto, setModalOrigemAberto] = useState(false);

    // --- Rituais conhecidos (mesma ideia da ficha — ver
    // CharacterSheetPage.jsx — só que aqui sem "Conjurar": nesta tela só
    // dá pra escolher quais o personagem já conhece, não gastar PE). ---
    const [rituais, setRituais] = useState([]);
    const [modalRitualAberto, setModalRitualAberto] = useState(false);
    const [expandidosConhecidos, setExpandidosConhecidos] = useState(() => new Set());

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user.uid]);

    // ---------------------------------------------------------------
    // Reenquadra os atributos dentro do que o NEX atual libera (mesma
    // regra de renderAtributosForm): clampa cada um, depois tira ponto
    // do(s) atributo(s) mais alto(s) se a soma passar do total.
    // ---------------------------------------------------------------
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nex, atributos, regraAtributos]);

    // ---------------------------------------------------------------
    // Mantém as perícias automáticas da trilha E da Origem em dia
    // (aplicarFixas) e rebaixa o grau de qualquer perícia treinada
    // cujo grau não seja mais permitido no NEX atual (ex: baixou o NEX
    // de volta pra 30% com uma perícia em "veterano").
    // ---------------------------------------------------------------
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trilha, nex, combatenteEscolhasFixas, periciasState, origem]);

    // ---------------------------------------------------------------
    // Derivados pra exibição
    // ---------------------------------------------------------------
    const nomesFixos = useMemo(() => nomesFixosDe(periciasState), [periciasState]);
    const grausPermitidos = useMemo(() => OP.grausPermitidos(nex), [nex]);
    const grauMaisAlto = grausPermitidos[grausPermitidos.length - 1];
    const quotaLivre = useMemo(() => OP.quotaPericiasLivres(trilha, atributos.int), [trilha, atributos.int]);
    const livresUsadas = useMemo(
        () => Object.entries(periciasState).filter(([nome, st]) => st.treinado && !nomesFixos.includes(nome)).length,
        [periciasState, nomesFixos]
    );
    const cotaEsgotada = livresUsadas >= quotaLivre;
    const regraTrilha = OP.TRILHA_REGRAS[trilha] || OP.TRILHA_REGRAS.Combatente;
    const circuloOcultista = trilha === 'Ocultista' ? OP.circuloRitualLiberado(nex) : 0;
    // null quando `origem` está vazio OU é um texto de personagem
    // antigo que não bate com nenhuma Origem oficial do catálogo (ver
    // comentário no state `origem` acima).
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

    // ---------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------
    const handleAttrChange = useCallback((key, valor) => {
        const v = parseInt(valor, 10);
        setAtributos(prev => ({ ...prev, [key]: Number.isNaN(v) ? 0 : v }));
    }, []);

    const handleAttrStepper = useCallback((key, delta) => {
        setAtributos(prev => ({ ...prev, [key]: (prev[key] || 0) + delta }));
    }, []);

    function handleTrilhaChange(novaTrilha) {
        setTrilha(novaTrilha);
        setCombatenteEscolhasFixas([null, null]); // trilha nova = escolhas antigas não valem mais
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

    // ---------------------------------------------------------------
    // Rituais — mesmo espírito do que já existe na ficha (ver
    // CharacterSheetPage.jsx: adicionarRitual/handleRemoverRitual), só
    // que aqui não salva na hora — fica só no estado local até
    // "Salvar Personagem" (mesmo padrão do resto deste formulário).
    // ---------------------------------------------------------------
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

        return { nome: nome.trim(), trilha, nex, atributos, pericias, origem, rituais };
    }

    async function handleSalvar() {
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
                {/* Caracteres Unicode literais em vez de entidades HTML (&minus;/&plus;)
                    — a tabela de entidades que o JSX decodifica em tempo de build não
                    inclui todos os nomes do HTML5 ("plus" não está nela), então &plus;
                    aparecia como texto cru na tela em vez de virar "+". */}
                <button type="button" className="attr-stepper-btn" onClick={() => handleAttrStepper(key, -1)} title="-1">{'−'}</button>
                <input
                    type="number"
                    className="attr-value-input"
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
                <button type="button" className="btn-action" onClick={handleSalvar} disabled={salvando}>
                    Salvar Personagem
                </button>
            </div>

            <div className="character-form-grid">
                <section className="form-identity-section">
                    <div className="control-group full">
                        <label>Nome do Personagem</label>
                        <input type="text" required value={nome} onChange={e => setNome(e.target.value)} />
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
                    </div>
                </section>

                <section className="form-pericias-section skills-section">
                    <h3>Perícias</h3>
                    <div className="pericias-info">
                        <span>NEX {nex}%</span>
                        <span>Grau máximo liberado: <strong>{OP.GRAU_LABEL[grauMaisAlto]}</strong></span>
                        <span className={cotaEsgotada ? 'pericias-cota-cheia' : ''}>
                            Perícias treinadas à escolha: <strong>{livresUsadas} / {quotaLivre}</strong>
                        </span>
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

                            {/* Perícias treinadas concedidas pela Origem escolhida (ver
                                aplicarFixas/origens.js) — mesmo mecanismo de "autoFixo" das
                                perícias da Trilha, só que com fonte diferente. Sem isto, a
                                perícia ficava marcada como treinada por baixo dos panos (e
                                escondida da lista principal, ver catalogoAgrupado/nomesFixos)
                                sem NENHUMA indicação visual de que isso aconteceu — bug pego
                                em teste antes de entregar. */}
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

                <section className="form-extra-section skills-section">
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
