// ============================================================
// RitualTab.jsx
//
// Conteúdo da aba "Rituais" -- a lista de rituais já conhecidos pelo
// personagem (cartão expansível com estatísticas, igual ao padrão dos
// cartões de item/ataque), com o aviso de círculo liberado pelo NEX
// (pras 3 trilhas -- ver RitualCatalogModal.jsx) e o botão "+" que
// abre o RitualCatalogModal.
//
// Extraído de CharacterSheetPage.jsx (que tinha essa lista MAIS uma
// cópia inteira duplicada do RitualCatalogModal só pra si) e
// CharacterFormPage.jsx (que já usava o RitualCatalogModal
// compartilhado pro modal, mas tinha sua própria cópia -- sem os
// atributos de acessibilidade -- dessa lista). A extração aproveitou
// pra:
//   1. Fazer a Ficha usar o mesmo <RitualCatalogModal> do Formulário
//      em vez de manter ~140 linhas de modal duplicada (o modal já
//      cuida do próprio reset de filtros/scroll/Esc sozinho).
//   2. Levar os atributos de acessibilidade do cartão (role, tabIndex,
//      aria-expanded, aria-label, onKeyDown) -- que só existiam na
//      Ficha -- também pro Formulário.
//   3. Unificar o texto do aviso de círculo liberado pelo NEX (a Ficha
//      e o Formulário tinham frases diferentes pra dizer a mesma
//      coisa) usando a mesma frase que o RitualCatalogModal já mostra.
//
// Props:
//   titulo              -- "Rituais Conhecidos" (Ficha) ou "Rituais"
//                          (Formulário), texto do cabeçalho
//   trilha, nex          -- pro aviso de círculo liberado (pras 3
//                          trilhas)
//   rituais              -- array dos rituais já conhecidos (contam
//                          pra cota -- ver quota/quotaDetalhe)
//   quota                -- total de rituais que a cota permite (ver
//                          quotaRituais no pai, soma de
//                          quotaBaseRituaisOcultista +
//                          quotaExtraAprenderRitual +
//                          quotaBonusGraduado em lib/trilhas.js)
//   quotaDetalhe          -- string opcional pro tooltip explicando de
//                          onde vem cada parte da cota (o pai já monta
//                          o texto, igual à cota de perícias)
//   automaticos           -- array de rituais concedidos automaticamente
//                          por poder de sub-trilha (ver
//                          rituaisAutomaticosSubTrilha em lib/trilhas.js
//                          + ritualPorNome em lib/rituais.js) -- entram
//                          na lista igual aos outros, com um selo
//                          "Automático" e sem botão de remover (não
//                          contam pra cota, então não afetam
//                          quotaEsgotada nem o "X / Y" do cabeçalho)
//   expandidos           -- Set com os nomes dos cartões abertos
//   onToggleExpandido(nome)
//   onAbrirModal()       -- chamado pelo botão "+" do cabeçalho
//   onRemoverRitual(index)
//   onConjurar(ritual)   -- opcional; só a Ficha passa (o Formulário
//                          não tem PE/Determinação pra gastar durante a
//                          criação do personagem) -- quando ausente, o
//                          botão "Conjurar" simplesmente não aparece
// ============================================================

import * as OP from '@/lib/pericias';
import * as OPR from '@/lib/rituais';
import { elementoSlug, subtituloRitual, statsDoRitual, TrashIcon } from '@/components/modal/RitualCatalogModal';
import useListaAnimada from '@/components/effects/useListaAnimada';
import ShinyText from '@/components/effects/ShinyText';

function RitualSparkIcon() {
    return (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none" aria-hidden="true">
            <path d="M12 3L14.1 9.9L21 12L14.1 14.1L12 21L9.9 14.1L3 12L9.9 9.9Z" />
        </svg>
    );
}

export default function RitualTab({
    titulo,
    trilha,
    nex,
    rituais,
    quota,
    quotaDetalhe,
    automaticos = [],
    expandidos,
    onToggleExpandido,
    onAbrirModal,
    onRemoverRitual,
    onConjurar,
}) {
    const { estaSaindo, iniciarSaida } = useListaAnimada();
    const circuloLiberado = OP.circuloRitualLiberado(nex);
    const quotaEsgotada = rituais.length >= quota;
    // Lista combinada só pra exibição: os automáticos entram junto dos
    // rituais "de verdade" na mesma lista visual, mas sem um índice no
    // array `rituais` (não fazem parte dele) -- por isso index fica
    // null e o botão de remover não aparece pra eles.
    const listaExibida = [
        ...rituais.map((ritual, index) => ({ ritual, index, automatico: false })),
        ...automaticos.map(ritual => ({ ritual, index: null, automatico: true })),
    ];

    return (
        <div className="tab-panel-rituais">
            <div className="rituals-section-header">
                <h3>{titulo}</h3>
                <button type="button" className="btn-add-item" title="Adicionar ritual" onClick={onAbrirModal}>+</button>
            </div>

            <div className="rituals-nex-info">
                <span>
                    Seu NEX libera até o{' '}
                    <strong>{circuloLiberado > 0 ? `${circuloLiberado}º círculo` : 'nenhum círculo ainda'}</strong>.
                </span>
                <span className={quotaEsgotada ? 'rituais-cota-cheia' : ''} title={quotaDetalhe}>
                    Rituais conhecidos: <strong>{rituais.length} / {quota}</strong>
                </span>
                {quota === 0 && (
                    <span className="rituals-quota-hint">
                        (escolha o poder "Aprender Ritual"{trilha === 'Ocultista' ? ', ou aumente o NEX,' : ''} pra desbloquear)
                    </span>
                )}
            </div>

            <div className="rituals-list">
                {listaExibida.length === 0 && (
                    <div className="inventory-empty">Nenhum ritual conhecido ainda.</div>
                )}
                {listaExibida.map(({ ritual, index, automatico }, posicao) => {
                    const aberto = expandidos.has(ritual.nome);
                    const custo = OPR.CUSTO_PE_POR_CIRCULO[ritual.circulo] || 0;
                    const saindo = estaSaindo(ritual.nome);
                    return (
                        <div
                            className={`modal-item-card ritual-card elemento-${elementoSlug(ritual.elemento)}${aberto ? ' expanded ritual-card-eletrico' : ''}${saindo ? ' ritual-card-saindo' : ''}`}
                            style={{ '--i': posicao }}
                            key={ritual.nome}
                        >
                            <div
                                className="modal-item-card-header"
                                role="button"
                                tabIndex={0}
                                aria-expanded={aberto}
                                aria-label={`Detalhes de ${ritual.nome}`}
                                onClick={() => onToggleExpandido(ritual.nome)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpandido(ritual.nome); } }}
                            >
                                <span className="modal-item-card-chevron">▶</span>
                                <div className="modal-item-card-info">
                                    <div className="modal-item-card-title-row">
                                        <span className="modal-item-card-nome"><ShinyText>{ritual.nome}</ShinyText></span>
                                        <span className={`modal-item-card-badge badge-elemento-${elementoSlug(ritual.elemento)}`}>{ritual.elemento}</span>
                                        <span className="modal-item-card-badge badge-circulo">{ritual.circulo}º círc.</span>
                                        {automatico && (
                                            <span className="modal-item-card-badge badge-auto" title="Concedido automaticamente por um poder de sub-trilha — não conta na sua cota de rituais conhecidos">
                                                Automático
                                            </span>
                                        )}
                                    </div>
                                    <div className="modal-item-card-sub">{subtituloRitual(ritual)}</div>
                                </div>
                                <div className="ataque-card-actions">
                                    {onConjurar && (
                                        <button
                                            type="button"
                                            className="btn-conjurar"
                                            title={`Conjurar (-${custo} PE)`}
                                            onClick={ev => { ev.stopPropagation(); onConjurar(ritual); }}
                                        >
                                            <RitualSparkIcon />
                                            Conjurar
                                        </button>
                                    )}
                                    {!automatico && (
                                        <button
                                            type="button"
                                            className="modal-item-card-remove"
                                            title="Esquecer ritual"
                                            onClick={ev => { ev.stopPropagation(); iniciarSaida(ritual.nome, () => onRemoverRitual(index)); }}
                                        >
                                            <TrashIcon />
                                        </button>
                                    )}
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
    );
}
