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
//   onAdicionarCustom({ nome, espacos, efeito, tipoMecanico, ... }) --
//                               submeteu o formulário "Personalizado"
//                               (nome já validado como não-vazio,
//                               espacos já convertido em número).
//                               tipoMecanico é 'geral' | 'arma' | 'protecao'
//                               -- decide o resto das chaves do objeto:
//                               'arma' manda dano/critico/tipoDano/alcance
//                               (mesmos campos que um item de OPI.ITENS_CATALOGO
//                               do grupo 'armas' -- viram um ataque automático,
//                               ver ataquesAutomaticos em CharacterSheetPage.jsx);
//                               'protecao' manda tipoProtecao/defesaBonus/
//                               resistencias (mesmos campos de um item do
//                               grupo 'protecoes' -- entram em
//                               OPI.defesaDoInventario/resistenciasDoInventario
//                               quando equipada, e ganha o botão "Equipar" em
//                               InventarioTab.jsx só por ter esse grupo).
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import * as OPI from '@/lib/itens';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

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
        if (Array.isArray(item.resistencias) && item.resistencias.length > 0) {
            stats.push({ label: 'Resistência', valor: item.resistencias.map(r => `${r.tipo} ${r.valor}`).join(', ') });
        }
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
    const [customTipoMecanico, setCustomTipoMecanico] = useState('geral'); // 'geral' | 'arma' | 'protecao'
    const [customDanoQtd, setCustomDanoQtd] = useState(1);
    const [customDanoDado, setCustomDanoDado] = useState(6);
    const [customCritico, setCustomCritico] = useState('');
    const [customTipoDano, setCustomTipoDano] = useState(OPI.TIPOS_DANO_PRESET[0]);
    const [customAlcance, setCustomAlcance] = useState(OPI.ALCANCES_PRESET[0]);
    const [customTipoProtecao, setCustomTipoProtecao] = useState('corpo');
    const [customDefesaBonus, setCustomDefesaBonus] = useState(0);
    const [customResistencias, setCustomResistencias] = useState([]); // [{ tipo, valor }]

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

    function adicionarLinhaResistencia() {
        setCustomResistencias(prev => [...prev, { tipo: '', valor: 1 }]);
    }

    function atualizarLinhaResistencia(index, campo, valor) {
        setCustomResistencias(prev => prev.map((r, i) => (i === index ? { ...r, [campo]: valor } : r)));
    }

    function removerLinhaResistencia(index) {
        setCustomResistencias(prev => prev.filter((_, i) => i !== index));
    }

    function handleAdicionarCustom() {
        const nome = customNome.trim();
        if (!nome) {
            window.alert('Dê um nome para o item personalizado.');
            return;
        }
        const espacos = parseInt(customEspacos, 10) || 0;
        const efeito = customEfeito.trim();
        const payload = { nome, espacos, efeito, tipoMecanico: customTipoMecanico };

        if (customTipoMecanico === 'arma') {
            payload.dano = `${customDanoQtd}d${customDanoDado}`;
            payload.critico = customCritico.trim();
            payload.tipoDano = customTipoDano;
            payload.alcance = customAlcance;
        } else if (customTipoMecanico === 'protecao') {
            payload.tipoProtecao = customTipoProtecao;
            payload.defesaBonus = parseInt(customDefesaBonus, 10) || 0;
            payload.resistencias = customResistencias
                .map(r => ({ tipo: r.tipo.trim(), valor: parseInt(r.valor, 10) || 0 }))
                .filter(r => r.tipo && r.valor > 0);
        }

        onAdicionarCustom(payload);
        setCustomNome('');
        setCustomEspacos(1);
        setCustomEfeito('');
        setCustomTipoMecanico('geral');
        setCustomDanoQtd(1);
        setCustomDanoDado(6);
        setCustomCritico('');
        setCustomTipoDano(OPI.TIPOS_DANO_PRESET[0]);
        setCustomAlcance(OPI.ALCANCES_PRESET[0]);
        setCustomTipoProtecao('corpo');
        setCustomDefesaBonus(0);
        setCustomResistencias([]);
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
                            <label htmlFor="custom-tipo-mecanico">Tipo do item</label>
                            <select
                                id="custom-tipo-mecanico"
                                value={customTipoMecanico}
                                onChange={e => setCustomTipoMecanico(e.target.value)}
                            >
                                <option value="geral">Sem efeito mecânico (Geral)</option>
                                <option value="arma">Arma (causa dano)</option>
                                <option value="protecao">Proteção (equipável — defesa/resistência)</option>
                            </select>
                        </div>

                        {customTipoMecanico === 'arma' && (
                            <div className="ataque-form-row">
                                <div className="control-group">
                                    <label htmlFor="custom-dano-qtd">Dano</label>
                                    <div className="dano-preset-row">
                                        <select
                                            id="custom-dano-qtd"
                                            value={customDanoQtd}
                                            onChange={e => setCustomDanoQtd(Number(e.target.value))}
                                        >
                                            {OPI.QUANTIDADES_DANO_PRESET.map(qtd => (
                                                <option key={qtd} value={qtd}>{qtd}</option>
                                            ))}
                                        </select>
                                        <span className="dano-preset-d">d</span>
                                        <select
                                            aria-label="Lados do dado de dano"
                                            value={customDanoDado}
                                            onChange={e => setCustomDanoDado(Number(e.target.value))}
                                        >
                                            {OPI.DADOS_PRESET.map(lados => (
                                                <option key={lados} value={lados}>{lados}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="control-group">
                                    <label>Crítico</label>
                                    <input type="text" placeholder="Ex: 19-20/×2" value={customCritico} onChange={e => setCustomCritico(e.target.value)} />
                                </div>
                                <div className="control-group">
                                    <label htmlFor="custom-tipo-dano">Tipo de dano</label>
                                    <select
                                        id="custom-tipo-dano"
                                        value={customTipoDano}
                                        onChange={e => setCustomTipoDano(e.target.value)}
                                    >
                                        {OPI.TIPOS_DANO_PRESET.map(tipo => (
                                            <option key={tipo} value={tipo}>{tipo}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="control-group">
                                    <label htmlFor="custom-alcance">Alcance</label>
                                    <select
                                        id="custom-alcance"
                                        value={customAlcance}
                                        onChange={e => setCustomAlcance(e.target.value)}
                                    >
                                        {OPI.ALCANCES_PRESET.map(alcance => (
                                            <option key={alcance} value={alcance}>{alcance}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {customTipoMecanico === 'protecao' && (
                            <>
                                <div className="ataque-form-row">
                                    <div className="control-group">
                                        <label htmlFor="custom-tipo-protecao">Tipo de proteção</label>
                                        <select
                                            id="custom-tipo-protecao"
                                            value={customTipoProtecao}
                                            onChange={e => setCustomTipoProtecao(e.target.value)}
                                        >
                                            <option value="corpo">Corpo (colete, armadura...)</option>
                                            <option value="escudo">Escudo</option>
                                        </select>
                                    </div>
                                    <div className="control-group">
                                        <label>Bônus de Defesa</label>
                                        <input type="number" min={0} value={customDefesaBonus} onChange={e => setCustomDefesaBonus(e.target.value)} />
                                    </div>
                                </div>

                                <div className="control-group full">
                                    <label>Resistências concedidas (quando equipado)</label>
                                    {customResistencias.length === 0 && (
                                        <p className="resistencias-form-vazio">Nenhuma ainda — opcional, só some se o item realmente reduzir dano de algum tipo.</p>
                                    )}
                                    {customResistencias.map((r, index) => (
                                        <div className="resistencia-form-row" key={index}>
                                            <input
                                                type="text"
                                                placeholder="Tipo (ex: Fogo, Balístico, Conhecimento...)"
                                                value={r.tipo}
                                                onChange={e => atualizarLinhaResistencia(index, 'tipo', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                className="resistencia-form-valor"
                                                value={r.valor}
                                                onChange={e => atualizarLinhaResistencia(index, 'valor', e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="modal-item-card-remove"
                                                title="Remover esta resistência"
                                                onClick={() => removerLinhaResistencia(index)}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn-add-resistencia" onClick={adicionarLinhaResistencia}>
                                        + Adicionar resistência
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="control-group full">
                            <label>Espaços ocupados</label>
                            <input type="number" min={0} value={customEspacos} onChange={e => setCustomEspacos(e.target.value)} />
                        </div>
                        <div className="control-group full">
                            <label>Descrição / efeito (opcional)</label>
                            <textarea rows={3} placeholder="Pra que serve, restrições, fluff..." value={customEfeito} onChange={e => setCustomEfeito(e.target.value)}></textarea>
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
