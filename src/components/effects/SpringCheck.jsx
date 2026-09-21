// ============================================================
// SpringCheck.jsx
//
// Checkbox com animação elástica ao marcar (React Bits "Spring
// Check", reimplementado do zero em CSS + JS puro): o "check" entra
// com um leve exagero de escala (cubic-bezier com overshoot) em vez
// de só aparecer/desaparecer, dando uma resposta mais satisfatória ao
// marcar uma perícia como treinada no formulário (ver
// CharacterFormPage.jsx).
//
// Continua sendo um <input type="checkbox"> de verdade por baixo
// (só visualmente escondido, ver .spring-check input no index.css) --
// teclado, leitor de tela e :focus-visible funcionam exatamente como
// um checkbox nativo; só a caixinha e o "V" são desenhados por cima
// com CSS puro reagindo ao :checked dele via seletor irmão (~).
//
// Uso: <SpringCheck checked={st.treinado} onChange={...} label={p.nome} />
// ============================================================

export default function SpringCheck({ checked, onChange, disabled, label, className = '' }) {
    return (
        <label className={`spring-check ${className}`}>
            <input
                type="checkbox"
                checked={!!checked}
                disabled={disabled}
                onChange={onChange}
            />
            <span className="spring-check-box" aria-hidden="true">
                <svg className="spring-check-tick" viewBox="0 0 16 16">
                    <path d="M3 8.5L6.2 11.5L13 4.5" />
                </svg>
            </span>
            {label != null && <span className="spring-check-label">{label}</span>}
        </label>
    );
}
