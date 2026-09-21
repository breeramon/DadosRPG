// ============================================================
// PillNav.jsx
//
// Navegação em formato de "pílula" com um indicador que desliza por
// baixo da aba ativa (React Bits "Pill Nav"/"Dock", reimplementado do
// zero em CSS + JS puro): usada na Ficha (ver CharacterSheetPage.jsx)
// pra trocar entre Combate/Rituais/Inventário/Trilha no lugar do
// antigo sublinhado estático.
//
// Não guarda nenhum estado -- só recebe os itens, qual está ativo e
// avisa o pai quando o usuário clica em outro (mesmo padrão do
// Stepper.jsx nesta mesma pasta). A posição do indicador é só CSS: como
// todas as abas têm a mesma largura (grid de N colunas iguais), dá pra
// calcular a posição dele só com --count (nº de abas) e --index (índice
// da ativa) via transform, sem precisar medir nada com JS/getBoundingClientRect.
//
// Uso: <PillNav
//        items={[{ value: 'combate', label: 'Combate' }, ...]}
//        value={abaAtiva}
//        onChange={setAbaAtiva}
//      />
// ============================================================

export default function PillNav({ items, value, onChange, className = '', ariaLabel }) {
    const indiceAtivo = Math.max(0, items.findIndex(item => item.value === value));

    return (
        <nav
            className={`pill-nav ${className}`}
            role="tablist"
            aria-label={ariaLabel}
            style={{ '--count': items.length }}
        >
            <span className="pill-nav-indicator" style={{ '--index': indiceAtivo }} aria-hidden="true" />
            {items.map(item => (
                <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={item.value === value}
                    className={`pill-nav-btn${item.value === value ? ' active' : ''}`}
                    onClick={() => onChange(item.value)}
                >
                    {item.label}
                </button>
            ))}
        </nav>
    );
}
