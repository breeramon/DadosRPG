// ============================================================
// AttributePentagram.jsx
//
// Pentagrama ritualístico de Atributos — SVG + anel girando + selo
// central, reaproveitado tanto na tela de Criar/Editar Personagem
// (onde cada ponta tem um stepper +/-) quanto, mais adiante, na Ficha
// (onde cada ponta é um botão de rolar). Recebe a lista de pontas
// pronta (nodes) pra não precisar saber o que cada tela quer colocar
// dentro de cada uma.
//
// gradientId precisa ser único por página quando mais de uma instância
// pudesse coexistir no mesmo documento — na prática cada tela é uma
// rota separada, então isso nunca acontece de verdade, mas mantém o
// hábito defensivo que a versão vanilla já usava (opRitualGlow vs
// opRitualGlowForm).
// ============================================================

export default function AttributePentagram({ gradientId, centerLabel = 'ATRIBUTOS', nodes, className = '' }) {
    return (
        <div className={`pentagram-container ${className}`.trim()}>
            <svg className="pentagram-svg" viewBox="0 0 280 280" aria-hidden="true">
                <defs>
                    <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#3a0d0d" stopOpacity="0.55" />
                        <stop offset="65%" stopColor="#1a0505" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                </defs>

                <circle cx="140" cy="140" r="132" fill={`url(#${gradientId})`} />

                <circle className="op-ring-outer" cx="140" cy="140" r="132" />
                <circle className="op-ring-outer-dash" cx="140" cy="140" r="123" />

                <polygon
                    className="op-pentagram-star"
                    points="140,20 210.53,237.08 25.87,102.92 254.13,102.92 69.47,237.08"
                />

                <circle className="op-ring-inner" cx="140" cy="140" r="120" />

                <g className="op-center-sigil">
                    <circle cx="140" cy="140" r="34" />
                    <line x1="140" y1="116" x2="140" y2="126" />
                    <line x1="140" y1="154" x2="140" y2="164" />
                    <line x1="116" y1="140" x2="126" y2="140" />
                    <line x1="154" y1="140" x2="164" y2="140" />
                    <circle className="op-center-dot" cx="140" cy="140" r="2.5" />
                </g>
            </svg>

            <div className="center-label">{centerLabel}</div>

            {nodes.map(node => (
                <div className={`attr-node ${node.posClass}`} key={node.key}>
                    <span className="attr-label">{node.label}</span>
                    {node.content}
                </div>
            ))}
        </div>
    );
}
