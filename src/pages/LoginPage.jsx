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

// Ícone do "selo" -- símbolo abstrato (círculo + marcações), sem nenhum
// significado religioso específico, só clima de RPG/oculto. Recebe
// className de fora porque agora tem dois usos bem diferentes: pequeno
// (não usado mais aqui, mas fica flexível) e grande como "marca d'água"
// no painel de identidade (ver .auth-selo-panel-mark).
function SeloIcon({ className = 'auth-selo-icon' }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
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

// Logo oficial do Google ("G" colorido) -- as cores seguem as diretrizes
// de marca do Google para botões de login, por isso não usam
// currentColor/variáveis do tema como os outros ícones daqui.
function GoogleIcon() {
    return (
        <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5Z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7Z" />
            <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.6 2.5-7.6 2.5-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44Z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.6 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5Z" />
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
    const [enviandoGoogle, setEnviandoGoogle] = useState(false);

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

    async function handleGoogleSignIn() {
        setErro(null);
        setEnviandoGoogle(true);
        try {
            await Auth.signInWithGoogle();
            navigate('/characters');
        } catch (err) {
            // Usuário fechando o popup de propósito não é bem um "erro" --
            // não precisa poluir a tela com mensagem nesse caso.
            if (err && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                console.error('[auth] Erro no login com Google:', err);
                setErro(friendlyAuthError(err));
            }
            setEnviandoGoogle(false);
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

            {/* Dois painéis lado a lado (identidade/selo + formulário) que
                trocam de lado ao alternar Entrar/Criar conta -- ver
                .auth-selo-panel/.auth-form-panel no index.css. Abaixo de
                760px eles empilham (ver a mesma media query). */}
            <div className="auth-split">
                <div className={`auth-selo-panel ${isSignupMode ? 'auth-selo-panel--right' : 'auth-selo-panel--left'}`}>
                    <SeloIcon className="auth-selo-panel-mark" />
                    <div className="auth-selo-panel-static">
                        <h1>Ficha Ordem Paranormal</h1>
                    </div>
                    <div className="auth-selo-panel-content" key={`selo-${isSignupMode}`}>
                        <h3>{isSignupMode ? 'Já tem conta?' : 'Ainda não tem conta?'}</h3>
                        <p>{isSignupMode ? 'Entre para ver seus personagens.' : 'Crie a sua para começar a jogar.'}</p>
                        <button type="button" className="auth-selo-panel-btn" onClick={alternarModo}>
                            {isSignupMode ? 'Entrar' : 'Criar conta'}
                        </button>
                    </div>
                </div>

                <div className={`auth-form-panel ${isSignupMode ? 'auth-form-panel--left' : 'auth-form-panel--right'}`}>
                    <div className="auth-form-panel-inner" key={`form-${isSignupMode}`}>
                        <h2>{isSignupMode ? 'Criar conta' : 'Entrar'}</h2>
                        <p className="auth-subtitle">
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
                            <button type="submit" className="btn-action full" disabled={enviando || enviandoGoogle} aria-busy={enviando}>
                                {enviando && <span className="btn-spinner" />}
                                <span key={`btn-${isSignupMode}`}>
                                    {isSignupMode ? 'Criar conta' : 'Entrar'}
                                </span>
                            </button>
                        </form>

                        <div className="auth-divider"><span>ou</span></div>

                        <button
                            type="button"
                            className="btn-google full"
                            onClick={handleGoogleSignIn}
                            disabled={enviando || enviandoGoogle}
                            aria-busy={enviandoGoogle}
                        >
                            {enviandoGoogle ? <span className="btn-spinner btn-spinner-dark" /> : <GoogleIcon />}
                            {isSignupMode ? 'Criar conta com o Google' : 'Entrar com o Google'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
