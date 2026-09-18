// ============================================================
// ShinyText.jsx
//
// Um brilho passa pelo texto em loop (React Bits "Shiny Text",
// reimplementado em CSS puro -- gradiente de texto animado via
// background-clip: text, mesma técnica do "glare" já usado em
// .btn-action::after, só que aplicada ao texto em vez de um botão por
// cima. Zero dependência nova).
//
// Puramente decorativo -- usado no título da tela de boas-vindas e no
// nome dos rituais conhecidos (ver WelcomePage.jsx / RitualTab.jsx),
// pra dar um ar "mágico" sem precisar de nenhuma lib de animação. Some
// sozinho com prefers-reduced-motion (ver index.css) -- volta a ser
// texto normal, sem o gradiente.
//
// Uso: <h1><ShinyText>Ficha Ordem Paranormal</ShinyText></h1>
// ============================================================

export default function ShinyText({ children, className = '' }) {
    return <span className={`shiny-text${className ? ' ' + className : ''}`}>{children}</span>;
}
