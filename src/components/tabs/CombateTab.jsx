// ============================================================
// CombateTab.jsx
//
// Conteúdo da aba "Combate" da Ficha (.tab-panel-combate): lista de
// ataques (filtro por nome, cartões expansíveis, rolar dano, remover),
// a Rolagem Personalizada (dN + quantidade + bônus) e o log de
// rolagens da sessão. Extraído de CharacterSheetPage.jsx -- componente
// "burro", todo o estado (busca, cartões expandidos, dN/qtd/bônus
// selecionados, o log em si) continua vivendo no pai.
//
// Props:
//   buscaAtaque, onBuscaAtaqueChange(valor)
//   onNovoAtaque()                       -- abre a NovoAtaqueModal
//   ataquesFiltrados                     -- já filtrados por buscaAtaque
//   ataquesVazio                         -- true se não há NENHUM ataque
//                                           cadastrado (manual + automático
//                                           de arma equipada), pra decidir
//                                           qual mensagem de lista vazia
//                                           mostrar
//   expandidosAtaques, onToggleExpandidoAtaque(nome)
//   onRollAtaque(ataque), onRemoverAtaque(ataque)
//   dieSides, onDieSidesChange(valor)
//   diceQty, onDiceQtyChange(valor)
//   diceMod, onDiceModChange(valor)
//   onRollSelectedDice()
//   rollLog                              -- histórico de rolagens (ver
//                                           logMessage em CharacterSheetPage.jsx)
//   desabilitarRolagem                   -- true enquanto já existe uma
//                                           rolagem em andamento na caixa
//                                           de dados (ver "rolando" em
//                                           useDiceBox.js) -- só um
//                                           rolamento por vez evita que a
//                                           lib 3D receba dois .roll()
//                                           sobrepostos e "quebre" à toa
// ============================================================

import GlitchText from '@/components/effects/GlitchText';
import DecryptedText from '@/components/effects/DecryptedText';

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

function DiceIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="8" cy="16" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
        </svg>
    );
}

export default function CombateTab({
    buscaAtaque, onBuscaAtaqueChange,
    onNovoAtaque,
    ataquesFiltrados, ataquesVazio,
    expandidosAtaques, onToggleExpandidoAtaque,
    onRollAtaque, onRemoverAtaque,
    dieSides, onDieSidesChange,
    diceQty, onDiceQtyChange,
    diceMod, onDiceModChange,
    onRollSelectedDice,
    rollLog,
    desabilitarRolagem = false,
}) {
    return (
        <div className="tab-panel-combate">
            <div className="ataques-section-header">
                <input
                    type="text"
                    className="modal-search-input tab-filter-input"
                    placeholder="Filtrar ataques..."
                    value={buscaAtaque}
                    onChange={e => onBuscaAtaqueChange(e.target.value)}
                />
                <button type="button" className="btn-add-item" title="Novo ataque" onClick={onNovoAtaque}>+</button>
            </div>

            <div className="ataques-list">
                {ataquesFiltrados.length === 0 && (
                    <div className="inventory-empty">
                        {ataquesVazio ? 'Nenhum ataque cadastrado ainda.' : 'Nenhum ataque encontrado.'}
                    </div>
                )}
                {ataquesFiltrados.map((ataque, index) => {
                    const aberto = expandidosAtaques.has(ataque.nome);
                    return (
                        <div className={`modal-item-card ataque-card${aberto ? ' expanded' : ''}`} key={`${ataque.nome}-${index}`}>
                            <div
                                className="modal-item-card-header"
                                role="button"
                                tabIndex={0}
                                aria-expanded={aberto}
                                aria-label={`Detalhes de ${ataque.nome}`}
                                onClick={() => onToggleExpandidoAtaque(ataque.nome)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpandidoAtaque(ataque.nome); } }}
                            >
                                <span className="modal-item-card-chevron">▶</span>
                                <div className="modal-item-card-info">
                                    <div className="modal-item-card-title-row">
                                        <span className="modal-item-card-nome">{ataque.nome}</span>
                                        {ataque.dano && <span className="modal-item-card-badge">Dano: {ataque.dano}</span>}
                                        {ataque.critico && <span className="modal-item-card-badge">Crítico: {ataque.critico}</span>}
                                        {ataque.auto && (
                                            <span className="modal-item-card-badge badge-auto" title="Gerado automaticamente a partir da arma no Inventário">
                                                Inventário
                                            </span>
                                        )}
                                    </div>
                                    {ataque.alcance && <div className="modal-item-card-sub">Alcance {ataque.alcance}</div>}
                                </div>
                                <div className="ataque-card-actions">
                                    <button
                                        type="button"
                                        className="btn-roll-icon"
                                        disabled={desabilitarRolagem}
                                        title={desabilitarRolagem ? 'Aguarde a rolagem atual terminar' : 'Rolar dano'}
                                        aria-label={desabilitarRolagem ? 'Aguarde a rolagem atual terminar' : 'Rolar dano'}
                                        onClick={ev => { ev.stopPropagation(); onRollAtaque(ataque); }}
                                    >
                                        <DiceIcon />
                                    </button>
                                    {!ataque.auto && (
                                        <button
                                            type="button"
                                            className="modal-item-card-remove"
                                            title="Remover ataque"
                                            onClick={ev => { ev.stopPropagation(); onRemoverAtaque(ataque); }}
                                        >
                                            <TrashIcon />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {ataque.observacoes && (
                                <div className={`modal-item-card-body${aberto ? '' : ' hidden'}`}>
                                    <div className="modal-item-card-efeito">{ataque.observacoes}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="custom-roller">
                <h3>Rolagem Personalizada</h3>

                <div className="dice-type-selector">
                    {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                        <button
                            key={sides}
                            className={`die-btn${dieSides === sides ? ' active' : ''}`}
                            onClick={() => onDieSidesChange(sides)}
                        >
                            d{sides}
                        </button>
                    ))}
                </div>

                <div className="dice-controls">
                    <div className="control-group">
                        <label>Qtd.</label>
                        <input type="number" min={1} value={diceQty} onChange={e => onDiceQtyChange(e.target.value)} />
                    </div>
                    <div className="control-group">
                        <label>Bônus</label>
                        <input type="number" value={diceMod} onChange={e => onDiceModChange(e.target.value)} />
                    </div>
                    <button
                        className="btn-action"
                        onClick={onRollSelectedDice}
                        disabled={desabilitarRolagem}
                        title={desabilitarRolagem ? 'Aguarde a rolagem atual terminar' : undefined}
                    >
                        ROLAR
                    </button>
                </div>
            </div>

            <div className="log-container">
                {rollLog.length === 0 ? (
                    <div className="log-entry system-msg">Sessão iniciada.</div>
                ) : (
                    rollLog.map(entry => entry.system ? (
                        <div className="log-entry system-msg" key={entry.id}>{entry.title}</div>
                    ) : (
                        <div
                            className={`log-entry${entry.type === 'crit' ? ' crit-success' : ''}${entry.type === 'fail' ? ' crit-fail' : ''}`}
                            key={entry.id}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{entry.title}</div>
                            <div style={{ color: '#aaa', fontSize: '0.85em' }}>{entry.details}</div>
                            <div className="result-highlight">
                                {/* Acerto crítico ganha o "glitch" (GlitchText.jsx);
                                    falha crítica ganha a "decodificação" (DecryptedText.jsx)
                                    -- cada tipo de crítico com sua própria linguagem visual.
                                    Resultado normal continua como texto simples. */}
                                {entry.type === 'crit' && <GlitchText variant="success">{entry.result}</GlitchText>}
                                {entry.type === 'fail' && <DecryptedText text={entry.result} />}
                                {entry.type !== 'crit' && entry.type !== 'fail' && entry.result}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
