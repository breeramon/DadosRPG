// ============================================================
// auth.js
//
// Lógica da tela de login/cadastro (index.html). Só essa página usa
// este arquivo — as outras 3 (characters.html, form.html, sheet.html)
// usam javascript/auth-guard.js pra só CHECAR se tem login, não pra
// logar/cadastrar.
// ============================================================

let isSignupMode = false;

function setAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (!msg) {
        el.classList.add('hidden');
        el.textContent = '';
    } else {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function updateAuthModeUI() {
    document.getElementById('btn-auth-submit').textContent = isSignupMode ? 'Criar conta' : 'Entrar';
    document.getElementById('auth-toggle-text').textContent = isSignupMode
        ? 'Já tem conta?'
        : 'Ainda não tem conta?';
    document.getElementById('auth-toggle-link').textContent = isSignupMode ? 'Entrar' : 'Criar conta';
}

// Se o Firebase não carregou (chaves erradas em firebase-config.js, CDN
// bloqueado, sem internet etc.), window.Auth pode nem existir. Em vez de
// travar o app inteiro com um erro críptico, isso vira uma mensagem clara
// na tela de login.
function friendlyAuthError(err) {
    if (window.Auth && typeof window.Auth.friendlyError === 'function') {
        return window.Auth.friendlyError(err);
    }
    return (err && err.message) || 'Não foi possível carregar o Firebase. Veja o GUIA_FIREBASE.md.';
}

function wireAuthScreen() {
    document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        setAuthError(null);
        updateAuthModeUI();
    });

    document.getElementById('form-auth').addEventListener('submit', async (e) => {
        e.preventDefault();
        setAuthError(null);

        if (!window.Auth) {
            setAuthError('Não foi possível carregar o Firebase. Confira javascript/firebase-config.js e o console (F12) — veja o GUIA_FIREBASE.md.');
            return;
        }

        const email = document.getElementById('auth-email').value.trim();
        const senha = document.getElementById('auth-senha').value;
        const submitBtn = document.getElementById('btn-auth-submit');

        submitBtn.disabled = true;
        try {
            if (isSignupMode) {
                await window.Auth.signUp(email, senha);
            } else {
                await window.Auth.signIn(email, senha);
            }
            // Login deu certo -> vai pra lista de personagens. (Não precisa
            // esperar o onChange lá embaixo: já sabemos que funcionou.)
            window.location.href = 'characters.html';
        } catch (err) {
            console.error('[auth] Erro de autenticação:', err);
            setAuthError(friendlyAuthError(err));
            submitBtn.disabled = false;
        }
    });
}

wireAuthScreen();
updateAuthModeUI();

if (window.Auth) {
    // Se já tem sessão salva (usuário voltou pro site logado), pula a
    // tela de login e manda direto pra lista de personagens.
    window.Auth.onChange((user) => {
        if (user) window.location.href = 'characters.html';
    });
} else {
    setAuthError('Não foi possível carregar o Firebase. Confira javascript/firebase-config.js e o console (F12) — veja o GUIA_FIREBASE.md.');
}
