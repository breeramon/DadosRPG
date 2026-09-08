// ============================================================
// RitualTab.jsx
//
// Conteúdo da aba "Rituais" -- a lista de rituais já conhecidos pelo
// personagem (cartão expansível com estatísticas, igual ao padrão dos
// cartões de item/ataque), com o aviso de círculo liberado pelo NEX
// (só pra Ocultista) e o botão "+" que abre o RitualCatalogModal.
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
//   trilha, nex          -- só pro aviso de círculo liberado (Ocultista)
//   rituais              -- array dos rituais já conhecidos
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
import { elementoSlug, subtituloRitual, statsDoRitual, TrashIcon } from '@/components/RitualCatalogModal';

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
    expandidos,
    onToggleExpandido,
    onAbrirModal,
    onRemoverRitual,
    onConjurar,
}) {
    const circuloLiberado = trilha === 'Ocultista' ? OP.circuloRitualLiberado(nex) : 0;
    const quotaEsgotada = rituais.length >= quota;

    return (
        <div className="tab-panel-rituais">
            <div className="rituals-section-header">
                <h3>{titulo}</h3>
                <button type="button" className="btn-add-item" title="Adicionar ritual" onClick={onAbrirModal}>+</button>
            </div>

            <div className="rituals-nex-info">
                {trilha === 'Ocultista' && (
                    <span>
                        Seu NEX libera até o{' '}
                        <strong>{circuloLiberado > 0 ? `${circuloLiberado}º círculo` : 'nenhum círculo ainda'}</strong>.
                    </span>
                )}
                <span className={quotaEsgotada ? 'rituais-cota-cheia' : ''}>
                    Rituais conhecidos: <strong>{rituais.length} / {quota}</strong>
                </span>
            </div>

            <div className="rituals-list">
                {rituais.length === 0 && (
                    <div className="inventory-empty">Nenhum ritual conhecido ainda.</div>
                )}
                {rituais.map((ritual, index) => {
                    const aberto = expandidos.has(ritual.nome);
                    const custo = OPR.CUSTO_PE_POR_CIRCULO[ritual.circulo] || 0;
                    return (
                        <div className={`modal-item-card ritual-card elemento-${elementoSlug(ritual.elemento)}${aberto ? ' expanded' : ''}`} key={ritual.nome}>
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
                                        <span className="modal-item-card-nome">{ritual.nome}</span>
                                        <span className={`modal-item-card-badge badge-elemento-${elementoSlug(ritual.elemento)}`}>{ritual.elemento}</span>
                                        <span className="modal-item-card-badge badge-circulo">{ritual.circulo}º círc.</span>
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
                                    <button
                                        type="button"
                                        className="modal-item-card-remove"
                                        title="Esquecer ritual"
                                        onClick={ev => { ev.stopPropagation(); onRemoverRitual(index); }}
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
    );
}
