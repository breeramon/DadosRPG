// ============================================================
// RequireAuth.jsx
//
// Equivalente em React do antigo javascript/auth-guard.js: envolve
// rotas que exigem login (tudo menos a tela de Login/Cadastro) e manda
// pra "/" quem não estiver logado. Enquanto o Firebase ainda não
// respondeu se há sessão salva, mostra um "Carregando..." simples em
// vez de decidir cedo demais e piscar a tela de login pra quem já
// estava logado.
//
// Uso (ver App.jsx):
//   <Route element={<RequireAuth />}>
//     <Route path="/characters" element={<CharactersPage />} />
//     ...
//   </Route>
// ============================================================

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function RequireAuth() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="app-loading">Carregando...</div>;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return <Outlet context={{ user }} />;
}
