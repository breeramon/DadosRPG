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
import RequireAuth from '@/components/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import CharactersPage from '@/pages/CharactersPage';
import CharacterFormPage from '@/pages/CharacterFormPage';
import CharacterSheetPage from '@/pages/CharacterSheetPage';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
                <Route path="/characters" element={<CharactersPage />} />
                <Route path="/form" element={<CharacterFormPage />} />
                <Route path="/form/:id" element={<CharacterFormPage />} />
                <Route path="/sheet/:id" element={<CharacterSheetPage />} />
            </Route>
        </Routes>
    );
}
