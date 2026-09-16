// ============================================================
// RequireAuth.jsx
//
// Equivalente em React do antigo javascript/auth-guard.js: envolve
// rotas que exigem login (tudo menos a apresentação e o formulário de
// Login/Cadastro) e manda pra "/login" quem não estiver logado (antes
// mandava pra "/", só que "/" agora é a WelcomePage -- ver App.jsx --
// e quem foi parar aqui direto numa URL protegida já sabe que quer
// logar, não precisa ver a apresentação de novo no meio do caminho).
// Enquanto o Firebase ainda não respondeu se há sessão salva, mostra um
// "Carregando..." simples em vez de decidir cedo demais e piscar a
// tela de login pra quem já estava logado.
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
        return <Navigate to="/login" replace />;
    }

    return <Outlet context={{ user }} />;
}
