// ============================================================
// App.jsx
//
// Define as rotas do app, espelhando as 4 "páginas" da versão vanilla
// (index.html, characters.html, form.html, sheet.html) como rotas de
// uma SPA só. Diferença proposital em relação à versão antiga: o id do
// personagem agora vai na própria URL como parâmetro de rota
// (/sheet/:id) em vez de query string (?id=...) — é o jeito idiomático
// do React Router, e como estamos migrando pra aprender a ferramenta,
// vale seguir a convenção dela em vez de replicar o esquema antigo à
// risca.
// ============================================================

import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import RequireAuth from '@/components/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import CharactersPage from '@/pages/CharactersPage';
import CharacterFormPage from '@/pages/CharacterFormPage';
import CharacterSheetPage from '@/pages/CharacterSheetPage';

// Notificações "toast" (react-hot-toast) — usadas em toda a ficha e no
// formulário pra avisos rápidos e transitórios (item/ritual adicionado,
// ritual duplicado, PE insuficiente pra conjurar, etc). Antes cada tela
// tinha sua própria mensagem de texto embutida no meio do layout, o que
// causava um bug visível: a mensagem ocupava espaço de verdade na
// página (empurrando o conteúdo abaixo dela) só enquanto ficava visível
// por ~2.5s, fazendo os cartões de itens/rituais já adicionados
// "pularem" de posição toda vez que um novo era adicionado. Um toast
// fica fora do fluxo normal da página (position: fixed, numa camada por
// cima de tudo), então o mesmo aviso não empurra mais nada — corrige o
// bug de vez, em vez de só amenizar. zIndex mais alto que o dos modais
// (10000, ver .modal-overlay no index.css) garante que o toast apareça
// por cima mesmo com uma modal aberta (ex: "Você já conhece esse
// ritual" clicando dentro da modal de catálogo).
const TOAST_OPTIONS = {
    duration: 2800,
    style: {
        background: '#1e1e1e',
        color: '#e8d5d5',
        border: '1px solid #3a3a3a',
        borderRadius: '10px',
        boxShadow: '0 0 0 1px #000, 0 6px 20px rgba(0, 0, 0, 0.55)',
        fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
        fontSize: '0.85rem',
        padding: '10px 14px',
    },
    success: {
        iconTheme: { primary: '#66bb6a', secondary: '#1e1e1e' },
        style: { borderColor: '#2e5c2e' },
    },
    error: {
        iconTheme: { primary: '#e53935', secondary: '#1e1e1e' },
        style: { borderColor: '#5c1414' },
    },
};

export default function App() {
    return (
        <>
            <Toaster
                position="top-center"
                toastOptions={TOAST_OPTIONS}
                containerStyle={{ zIndex: 10050 }}
            />
            <Routes>
                <Route path="/" element={<LoginPage />} />

                <Route element={<RequireAuth />}>
                    <Route path="/characters" element={<CharactersPage />} />
                    <Route path="/form" element={<CharacterFormPage />} />
                    <Route path="/form/:id" element={<CharacterFormPage />} />
                    <Route path="/sheet/:id" element={<CharacterSheetPage />} />
                </Route>
            </Routes>
        </>
    );
}
