// ============================================================
// LoginPage.jsx
//
// Tela de login/cadastro — usa o hook useAuth só pra saber se já existe sessão salva
//  (e pular direto pra "/characters" nesse caso); o próprio envio do formulário chama
// Auth.signIn/signUp diretamente, igual o antigo auth.js fazia.
//
// ============================================================

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Auth } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';

// Ícone do "selo" no topo do card — símbolo abstrato (círculo + marcações),
// sem nenhum significado religioso específico, só clima de RPG/oculto.
function SeloIcon() {
    return (
        <svg className="auth-selo-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="24" cy="24" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="24" cy="24" r="1.8" fill="currentColor" />
            <path d="M24 2.5V9M24 39V45.5M2.5 24H9M39 24H45.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M9.5 9.5L13.7 13.7M34.3 34.3L38.5 38.5M9.5 38.5L13.7 34.3M34.3 13.7L38.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M6.6 6.8C3.9 8.6 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.5 4.9-1.3M9.9 5.2A11.4 11.4 0 0 1 12 5c6.5 0 10 7 10 7s-.8 1.6-2.3 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function LoginPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    const [isSignupMode, setIsSignupMode] = useState(false);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erro, setErro] = useState(null);
    const [enviando, setEnviando] = useState(false);

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

    function alternarModo() {
        setErro(null);
        setIsSignupMode(v => !v);
    }

    // Já logado (sessão salva do Firebase) -> pula direto pra lista.
    if (!loading && user) {
        return <Navigate to="/characters" replace />;
    }

    return (
        <div className="screen screen-login">
            {/* Fundo decorativo: névoa + brilhos suaves, tema Ordem Paranormal.
                Puramente visual (aria-hidden), não afeta leiaute nem foco. */}
            <div className="login-bg" aria-hidden="true">
                <div className="login-bg-glow login-bg-glow-1" />
                <div className="login-bg-glow login-bg-glow-2" />
                <div className="login-bg-stars" />
                <div className="login-bg-vignette" />
            </div>

            <div className="auth-card">
                <SeloIcon />
                <h2>Ficha Ordem Paranormal</h2>
                <p className="auth-subtitle" key={`subtitle-${isSignupMode}`}>
                    {isSignupMode
                        ? 'Crie sua conta para começar a jogar.'
                        : 'Entre com sua conta para ver seus personagens.'}
                </p>

                {erro && (
                    <div className="auth-error" role="alert" aria-live="assertive" key={erro}>
                        {erro}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="control-group full">
                        <label htmlFor="login-email">E-mail</label>
                        <input
                            id="login-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="control-group full">
                        <label htmlFor="login-senha">Senha</label>
                        <div className="password-field">
                            <input
                                id="login-senha"
                                type={mostrarSenha ? 'text' : 'password'}
                                required
                                minLength={6}
                                autoComplete={isSignupMode ? 'new-password' : 'current-password'}
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setMostrarSenha(v => !v)}
                                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                                aria-pressed={mostrarSenha}
                                tabIndex={0}
                            >
                                {mostrarSenha ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {isSignupMode && (
                            <span className="form-hint">Mínimo de 6 caracteres.</span>
                        )}
                    </div>
                    <button type="submit" className="btn-action full" disabled={enviando} aria-busy={enviando}>
                        {enviando && <span className="btn-spinner" />}
                        <span key={`btn-${isSignupMode}`}>
                            {isSignupMode ? 'Criar conta' : 'Entrar'}
                        </span>
                    </button>
                </form>

                <p className="auth-toggle">
                    <span>{isSignupMode ? 'Já tem conta?' : 'Ainda não tem conta?'}</span>{' '}
                    <a href="#" onClick={e => { e.preventDefault(); alternarModo(); }}>
                        {isSignupMode ? 'Entrar' : 'Criar conta'}
                    </a>
                </p>
            </div>
        </div>
    );
}
