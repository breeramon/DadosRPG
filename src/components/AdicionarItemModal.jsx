// ============================================================
// AdicionarItemModal.jsx
//
// Modal "Adicionar Item" da aba Inventário da Ficha -- duas sub-abas:
// "Catálogo" (busca/filtro por grupo em OPI.ITENS_CATALOGO, mesmo
// espírito da RitualCatalogModal.jsx) e "Personalizado" (formulário
// livre pra item que não está no catálogo). Extraída de
// CharacterSheetPage.jsx: todo o estado de UI da modal (aba ativa,
// grupo/busca/cartões expandidos do catálogo, campos do formulário
// personalizado) fica local aqui dentro.
//
// Props:
//   aberto                  -- controla se a modal é renderizada
//   onFechar()                -- chamado ao clicar no X ou apertar Esc
//   onAdicionar(itemCatalogo) -- clicou "+" num item do catálogo; quem
//                               chama decide (empilhar quantidade se já
//                               tiver o item, toast de sucesso etc. --
//                               ver adicionarAoInventario em
//                               CharacterSheetPage.jsx)
//   onAdicionarCustom({ nome, espacos, efeito }) -- submeteu o
//                               formulário "Personalizado" (nome já
//                               validado como não-vazio, espacos já
//                               convertido em número)
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import * as OPI from '@/lib/itens';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

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

export default function AdicionarItemModal({ aberto, onFechar, onAdicionar, onAdicionarCustom }) {
    const [modalTab, setModalTab] = useState('catalogo');
    const [grupoAtivo, setGrupoAtivo] = useState(OPI.GRUPOS[0]?.chave || 'armas');
    const [busca, setBusca] = useState('');
    const [expandidos, setExpandidos] = useState(() => new Set());
    const [customNome, setCustomNome] = useState('');
    const [customEspacos, setCustomEspacos] = useState(1);
    const [customEfeito, setCustomEfeito] = useState('');

    useLockBodyScroll(aberto);

    // Volta pra aba "Catálogo" com busca/expandidos limpos toda vez que
    // reabre -- "grupoAtivo" e os campos do "Personalizado" ficam como
    // estavam (mesmo comportamento de quando isso era só um estado
    // dentro de CharacterSheetPage.jsx).
    useEffect(() => {
        if (!aberto) return;
        setModalTab('catalogo');
        setBusca('');
        setExpandidos(new Set());
    }, [aberto]);

    useEffect(() => {
        if (!aberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') onFechar();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [aberto, onFechar]);

    const cardsFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return OPI.ITENS_CATALOGO.filter(item => {
            if (item.grupo !== grupoAtivo) return false;
            if (termo && !item.nome.toLowerCase().includes(termo)) return false;
            return true;
        });
    }, [grupoAtivo, busca]);

    function toggleExpandido(nome) {
        setExpandidos(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

    function handleAdicionarCustom() {
        const nome = customNome.trim();
        if (!nome) {
            window.alert('Dê um nome para o item personalizado.');
            return;
        }
        const espacos = parseInt(customEspacos, 10) || 0;
        const efeito = customEfeito.trim();
        onAdicionarCustom({ nome, espacos, efeito });
        setCustomNome('');
        setCustomEspacos(1);
        setCustomEfeito('');
    }

    if (!aberto) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <div className="modal-header">
                    <h3>Adicionar Item</h3>
                    <button type="button" className="modal-close" title="Fechar" onClick={onFechar}>&times;</button>
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
                                const cardAberto = expandidos.has(item.nome);
                                return (
                                    <div className={`modal-item-card${cardAberto ? ' expanded' : ''}`} key={item.nome}>
                                        <div
                                            className="modal-item-card-header"
                                            role="button"
                                            tabIndex={0}
                                            aria-expanded={cardAberto}
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
                                                onClick={ev => { ev.stopPropagation(); onAdicionar(item); }}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className={`modal-item-card-body${cardAberto ? '' : ' hidden'}`}>
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
    );
}
