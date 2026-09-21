// ============================================================
// TrueFocus.jsx
//
// Moldura de "foco de câmera" que fecha rápido nos quatro cantos ao
// aparecer na tela (React Bits "True Focus", reimplementado do zero
// em CSS + JS puro): usado no selo de NEX do topo da Ficha (ver
// .sheet-character-nex em CharacterSheetPage.jsx) pra chamar atenção
// pro valor mais importante da tela assim que ela carrega -- os
// quatro cantinhos entram de fora pra dentro e "travam" no lugar,
// como uma câmera focando.
//
// Puramente decorativo (aria-hidden nos próprios cantos) -- não altera
// o conteúdo nem precisa de nenhum estado; a animação dispara sozinha
// quando o componente monta (mesma ideia do .auth-selo-panel-content
// com fadeIn, só que com um efeito diferente).
//
// Uso: <TrueFocus><span className="sheet-character-nex">NEX 20%</span></TrueFocus>
// ============================================================

export default function TrueFocus({ children, className = '' }) {
    return (
        <span className={`true-focus ${className}`}>
            <span className="true-focus-corner true-focus-corner-tl" aria-hidden="true" />
            <span className="true-focus-corner true-focus-corner-tr" aria-hidden="true" />
            <span className="true-focus-corner true-focus-corner-bl" aria-hidden="true" />
            <span className="true-focus-corner true-focus-corner-br" aria-hidden="true" />
            <span className="true-focus-content">{children}</span>
        </span>
    );
}
