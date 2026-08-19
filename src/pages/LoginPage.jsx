// ============================================================
// LoginPage.jsx
//
// Tela de login/cadastro (equivalente a index.html + javascript/auth.js
// na versão vanilla). Primeira tela migrada pro React — usa o hook
// useAuth só pra saber se já existe sessão salva (e pular direto pra
// "/characters" nesse caso); o próprio envio do formulário chama
// Auth.signIn/signUp diretamente, igual o antigo auth.js fazia.
// ============================================================

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Auth } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    const [isSignupMode, setIsSignupMode] = useState(false);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState(null);
    const [enviando, setEnviando] = useState(false);

    // Se o Firebase nem inicializou (chaves faltando etc.), Auth.onChange
    // já avisa disso indiretamente chamando com user=null — aqui a gente
    // também escuta erros de inicialização direto pra dar uma mensagem
    // melhor do que "email ou senha incorretos" na primeira tentativa.
    useEffect(() => {
        if (!loading && !user) {
            // Sessão checada, ninguém logado — só garante que o formulário
            // fique visível (nenhuma ação necessária aqui).
        }
    }, [loading, user]);

    function friendlyAuthError(err) {
        if (Auth && typeof Auth.friendlyError === 'function') {
            return Auth.friendlyError(err);
        }
        return (err && err.message) || 'Não foi possível carregar o Firebase. Veja o GUIA_FIREBASE.md.';
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);
        setEnviando(true);
        try {
            if (isSignupMode) {
                await Auth.signUp(email.trim(), senha);
            } else {
                await Auth.signIn(email.trim(), senha);
            }
            navigate('/characters');
        } catch (err) {
            console.error('[auth] Erro de autenticação:', err);
            setErro(friendlyAuthError(err));
            setEnviando(false);
        }
    }

    // Já logado (sessão salva do Firebase) -> pula direto pra lista.
    if (!loading && user) {
        return <Navigate to="/characters" replace />;
    }

    return (
        <div className="screen screen-login">
            <div className="auth-card">
                <h2>Ficha Ordem Paranormal</h2>
                <p className="auth-subtitle">Entre com sua conta para ver seus personagens.</p>

                {erro && <div className="auth-error">{erro}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="control-group full">
                        <label>E-mail</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="control-group full">
                        <label>Senha</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            autoComplete="current-password"
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn-action full" disabled={enviando}>
                        {isSignupMode ? 'Criar conta' : 'Entrar'}
                    </button>
                </form>

                <p className="auth-toggle">
                    <span>{isSignupMode ? 'Já tem conta?' : 'Ainda não tem conta?'}</span>{' '}
                    <a
                        href="#"
                        onClick={e => {
                            e.preventDefault();
                            setErro(null);
                            setIsSignupMode(v => !v);
                        }}
                    >
                        {isSignupMode ? 'Entrar' : 'Criar conta'}
                    </a>
                </p>
            </div>
        </div>
    );
}
