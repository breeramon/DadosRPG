// ============================================================
// InventarioTab.jsx
//
// Conteúdo da aba "Inventário" -- barra de carga (com avisos de
// sobrecarga/excesso) e a lista de itens carregados, cada um com
// contador de quantidade, botão de equipar (só armaduras/proteções) e
// remover. Extraído de CharacterSheetPage.jsx -- só existe na Ficha (o
// Formulário de criação não tem inventário).
//
// Props:
//   usados, espacosMax, espacosLimite, estadoCarga -- vêm de OPI.* no
//                        pai (espacosUsados/espacosMaximos/
//                        espacosSobrecarga/estadoCarga em lib/itens.js)
//   inventario           -- array de itens carregados
//   onAbrirModal()        -- botão "+" do cabeçalho (abre AdicionarItemModal)
//   onQtyDelta(index, delta)
//   onEquiparToggle(index)
//   onRemoverItem(index)
//
// Animated List (React Bits, reimplementado em CSS + JS puro): item novo
// entra com um fade+slide sutil (é só a animação de entrada do próprio
// .inventory-item, dispara sozinha quando o nó é criado -- ver
// @keyframes listItemEntrar no index.css). Remover não chama
// onRemoverItem na hora: useListaAnimada primeiro marca o item como
// "saindo" (fade+encolhe) e só depois de a transição terminar chama o
// callback de verdade, pra não sumir seco da lista.
// ============================================================

import useListaAnimada from '@/components/effects/useListaAnimada';

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

export default function InventarioTab({
    usados,
    espacosMax,
    espacosLimite,
    estadoCarga,
    inventario,
    onAbrirModal,
    onQtyDelta,
    onEquiparToggle,
    onRemoverItem,
}) {
    const { estaSaindo, iniciarSaida } = useListaAnimada();

    return (
        <div className="tab-panel-inventario">
            <div className="inventory-section-header">
                <h3>Inventário</h3>
                <button type="button" className="btn-add-item" title="Adicionar item" onClick={onAbrirModal}>+</button>
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
                    <div
                        className={`inventory-item${item.equipado ? ' equipado' : ''}${estaSaindo(index) ? ' inventory-item-saindo' : ''}`}
                        style={{ '--i': index }}
                        key={index}
                    >
                        <span className="inventory-item-nome">{item.nome}</span>
                        <span className="inventory-item-categoria">{item.categoria || 'Personalizado'}</span>
                        <span className="inventory-item-espacos">{item.espacos || 0} esp.</span>
                        <div className="inventory-item-qty">
                            <button type="button" onClick={() => onQtyDelta(index, -1)}>−</button>
                            <span>x{Number(item.quantidade) || 1}</span>
                            <button type="button" onClick={() => onQtyDelta(index, 1)}>+</button>
                        </div>
                        <div className="inventory-item-acoes">
                            {item.grupo === 'protecoes' && (
                                <button
                                    type="button"
                                    className={`btn-equipar${item.equipado ? ' equipado' : ''}`}
                                    onClick={() => onEquiparToggle(index)}
                                >
                                    {item.equipado ? 'Equipado' : 'Equipar'}
                                </button>
                            )}
                            <button
                                type="button"
                                className="modal-item-card-remove"
                                title="Remover item"
                                onClick={() => iniciarSaida(index, () => onRemoverItem(index))}
                            >
                                <TrashIcon />
                            </button>
                        </div>
                        {item.efeito && <span className="inventory-item-efeito">{item.efeito}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
