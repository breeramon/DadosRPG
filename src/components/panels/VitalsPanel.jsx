// ============================================================
// VitalsPanel.jsx
//
// Bloco de recursos da Ficha (.vitals-block): barras de Vida/PE/
// Sanidade com os steppers -5/-1/+1/+5, Defesa (com a fórmula
// detalhada), Proteção equipada + campo de Resistências, e o resumo
// da Origem escolhida. Extraído de CharacterSheetPage.jsx -- é puro
// "burro" (não guarda nenhum estado, só mostra valores e repassa
// cliques pros callbacks que o pai decide o que fazer, inclusive
// persistir no Firestore via salvarCampos).
//
// Os números atuais de Vida/PE/Sanidade passam por CountUp.jsx (React
// Bits, adaptado) -- ao clicar +/-, o número conta suavemente até o
// valor novo em vez de trocar seco. Só o "atual" anima; o "máximo" (que
// só muda por causa de trilha/atributo, não pelos steppers daqui)
// continua texto simples.
//
// Quando um vital cai pra 25% do máximo ou menos, a barra ganha uma
// borda pulsante vermelha (.vital-bar--critical, React Bits "Border
// Glow" adaptado em CSS puro -- ver index.css) -- chama atenção pro
// personagem em risco sem precisar reparar no número dentro da barra.
// 25% é o mesmo patamar usado informalmente em RPGs pra "sangrando"/
// crítico; vale ajustar se um dia isso virar regra oficial da mesa.
//
// Props:
//   vidaAtual, vidaMax, onAjustarVida(delta)
//   detAtual, detMax, peFlash, onAjustarDet(delta)      -- peFlash vira
//     key da barra de PE só pra disparar de novo a animação de "gastou
//     PE" (ver .pe-spent-flash no index.css) a cada mudança
//   sanidadeAtiva, sanidadeAtual, sanidadeMax, onAjustarSanidade(delta),
//     onAlternarSanidade()                              -- Sanidade é
//     opcional (mesas sem o recurso podem ocultar)
//   defesaTotal, bonusDefesaPoder                        -- bônus de
//     poder de trilha já somado em defesaTotal; só entra aqui de novo
//     pro tooltip explicar de onde veio o número
//   defesaEquip, defesaOutros, onDefesaOutrosChange(valor)
//   protecaoTexto
//   resistenciasAutomaticas -- array [{ tipo, valor }] já somado (poder
//     de trilha + proteção equipada, ver resistenciasAutomaticas em
//     CharacterSheetPage.jsx) -- só leitura, mostrado como "chips".
//   resistencias, onResistenciasChange(valor) -- campo de texto livre à
//     parte, pra resistência que não vem de poder/item (ex: dada pelo
//     mestre numa cena, ou de uma regra que a ficha ainda não modela).
//   origemEscolhida, onTrocarOrigem()                    -- abre a
//     modal de Origem (ver OrigemCatalogModal.jsx)
// ============================================================

import CountUp from '@/components/effects/CountUp';

export default function VitalsPanel({
    vidaAtual, vidaMax, onAjustarVida,
    detAtual, detMax, peFlash, onAjustarDet,
    sanidadeAtiva, sanidadeAtual, sanidadeMax, onAjustarSanidade, onAlternarSanidade,
    defesaTotal, bonusDefesaPoder,
    defesaEquip, defesaOutros, onDefesaOutrosChange,
    protecaoTexto,
    resistenciasAutomaticas = [],
    resistencias, onResistenciasChange,
    origemEscolhida, onTrocarOrigem,
}) {
    const vidaCritica = vidaMax > 0 && vidaAtual / vidaMax <= 0.25;
    const detCritico = detMax > 0 && detAtual / detMax <= 0.25;
    const sanidadeCritica = sanidadeMax > 0 && sanidadeAtual / sanidadeMax <= 0.25;

    return (
        <div className="vitals-block">
            <div className="vital-row">
                <div className="vital-label">VIDA</div>
                <div className="vital-bar-wrap">
                    <button className="vital-btn" title="-5" aria-label="Diminuir vida em 5" onClick={() => onAjustarVida(-5)}>«</button>
                    <button className="vital-btn" title="-1" aria-label="Diminuir vida em 1" onClick={() => onAjustarVida(-1)}>‹</button>
                    <div className={`vital-bar vida-bar${vidaCritica ? ' vital-bar--critical' : ''}`}>
                        <div className="vital-bar-fill vida-fill" style={{ width: `${vidaMax > 0 ? Math.max(0, Math.min(100, (vidaAtual / vidaMax) * 100)) : 0}%` }}></div>
                        <span className="vital-bar-text"><CountUp value={vidaAtual} /> / {vidaMax}</span>
                    </div>
                    <button className="vital-btn" title="+1" aria-label="Aumentar vida em 1" onClick={() => onAjustarVida(1)}>&rsaquo;</button>
                    <button className="vital-btn" title="+5" aria-label="Aumentar vida em 5" onClick={() => onAjustarVida(5)}>&raquo;</button>
                </div>
            </div>

            <div className="vital-row">
                <div className="vital-label">PE <small className="vital-label-sub">Pontos de Esforço</small></div>
                <div className="vital-bar-wrap">
                    <button className="vital-btn" title="-5" aria-label="Diminuir PE em 5" onClick={() => onAjustarDet(-5)}>«</button>
                    <button className="vital-btn" title="-1" aria-label="Diminuir PE em 1" onClick={() => onAjustarDet(-1)}>‹</button>
                    <div key={peFlash} className={`vital-bar det-bar${peFlash > 0 ? ' pe-spent-flash' : ''}${detCritico ? ' vital-bar--critical' : ''}`}>
                        <div className="vital-bar-fill det-fill" style={{ width: `${detMax > 0 ? Math.max(0, Math.min(100, (detAtual / detMax) * 100)) : 0}%` }}></div>
                        <span className="vital-bar-text"><CountUp value={detAtual} /> / {detMax}</span>
                    </div>
                    <button className="vital-btn" title="+1" aria-label="Aumentar PE em 1" onClick={() => onAjustarDet(1)}>&rsaquo;</button>
                    <button className="vital-btn" title="+5" aria-label="Aumentar PE em 5" onClick={() => onAjustarDet(5)}>&raquo;</button>
                </div>
            </div>

            {sanidadeAtiva && (
                <div className="vital-row">
                    <div className="vital-label">SANIDADE <small className="vital-label-sub">SAN</small></div>
                    <div className="vital-bar-wrap">
                        <button className="vital-btn" title="-5" aria-label="Diminuir sanidade em 5" onClick={() => onAjustarSanidade(-5)}>«</button>
                        <button className="vital-btn" title="-1" aria-label="Diminuir sanidade em 1" onClick={() => onAjustarSanidade(-1)}>‹</button>
                        <div className={`vital-bar san-bar${sanidadeCritica ? ' vital-bar--critical' : ''}`}>
                            <div className="vital-bar-fill san-fill" style={{ width: `${sanidadeMax > 0 ? Math.max(0, Math.min(100, (sanidadeAtual / sanidadeMax) * 100)) : 0}%` }}></div>
                            <span className="vital-bar-text"><CountUp value={sanidadeAtual} /> / {sanidadeMax}</span>
                        </div>
                        <button className="vital-btn" title="+1" aria-label="Aumentar sanidade em 1" onClick={() => onAjustarSanidade(1)}>&rsaquo;</button>
                        <button className="vital-btn" title="+5" aria-label="Aumentar sanidade em 5" onClick={() => onAjustarSanidade(5)}>&raquo;</button>
                    </div>
                </div>
            )}

            <div className="vital-sanidade-toggle-row">
                <button
                    type="button"
                    className="vital-sanidade-toggle"
                    onClick={onAlternarSanidade}
                    aria-pressed={sanidadeAtiva}
                    aria-label={sanidadeAtiva ? 'Ocultar recurso de Sanidade desta ficha' : 'Ativar recurso de Sanidade nesta ficha'}
                    title={sanidadeAtiva ? 'Ocultar Sanidade' : 'Ativar Sanidade'}
                >
                    {sanidadeAtiva ? '− Ocultar Sanidade' : '+ Ativar Sanidade'}
                </button>
            </div>

            <div className="defesa-row">
                <div className="defesa-box">
                    <span className="defesa-label">DEFESA</span>
                    <span
                        className="defesa-total"
                        title={bonusDefesaPoder ? `Inclui +${bonusDefesaPoder} de poder de trilha` : undefined}
                    >
                        {defesaTotal}
                    </span>
                </div>
                <div className="defesa-formula">
                    10 + AGI +
                    <span className="defesa-input defesa-equip-readonly" title="Vem da proteção equipada no Inventário">{defesaEquip}</span>
                    <small>equip.</small> +
                    <input
                        type="number"
                        className="defesa-input"
                        value={defesaOutros}
                        title="Outros bônus (talentos, condições)"
                        onChange={e => onDefesaOutrosChange(e.target.value)}
                    />
                    <small>outros</small>
                </div>
            </div>

            <div className="protecao-resistencias-block">
                <div className="identity-field">
                    <span className="identity-field-label">Proteção</span>
                    <span className="identity-field-value" title="Vem da proteção equipada no Inventário">{protecaoTexto}</span>
                </div>
                <div className="identity-field">
                    <span className="identity-field-label">Resistências (poder / equipamento)</span>
                    {resistenciasAutomaticas.length > 0 ? (
                        <div className="resistencias-chips">
                            {resistenciasAutomaticas.map(({ tipo, valor }) => (
                                <span className="resistencia-chip" key={tipo} title={`+${valor} de resistência a ${tipo}`}>
                                    {tipo} <strong>+{valor}</strong>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="identity-field-value resistencias-vazio">Nenhuma no momento</span>
                    )}
                </div>
                <div className="identity-field">
                    <label className="identity-field-label" htmlFor="campo-resistencias">Resistências extras (manual)</label>
                    <input
                        id="campo-resistencias"
                        type="text"
                        placeholder="Ex: resistência dada pelo mestre numa cena"
                        value={resistencias}
                        onChange={e => onResistenciasChange(e.target.value)}
                    />
                </div>
            </div>

            {origemEscolhida && (
                <div className="origem-resumo">
                    <div className="origem-resumo-header">
                        <span className="origem-resumo-nome">{origemEscolhida.nome}</span>
                        <button type="button" className="btn-secondary" onClick={onTrocarOrigem}>Trocar Origem</button>
                    </div>
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
                </div>
            )}
        </div>
    );
}
