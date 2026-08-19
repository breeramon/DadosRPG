// ============================================================
// useAuth.js
//
// Hook que expõe o estado de login atual (usuário do Firebase, ou
// null) pro resto do app. Substitui o antigo window.requireAuth
// (auth-guard.js) — em vez de cada página checar sozinha e redirecionar
// na mão, os componentes só leem { user, loading } e o RequireAuth
// (ver src/components/RequireAuth.jsx) cuida do redirecionamento.
//
// "loading" fica true até a primeira resposta do Firebase sobre a
// sessão (rápido, mas assíncrono) — evita um "flash" de tela de login
// pra quem já está logado.
// ============================================================

import { useEffect, useState } from 'react';
import { Auth } from '@/services/firebase';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = Auth.onChange(u => {
            setUser(u);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    return { user, loading };
}
