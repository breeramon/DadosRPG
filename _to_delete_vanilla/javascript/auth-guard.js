// ============================================================
// auth-guard.js
//
// Usado por toda página que exige login (characters.html, form.html,
// sheet.html — mas NÃO index.html, que é a própria tela de login).
// Antes, numa SPA só, o app-ui.js verificava o login uma vez e trocava
// de "tela" via JS; agora que cada uma é uma página HTML de verdade,
// cada uma precisa checar o login de novo ao carregar (o Firebase
// mantém a sessão salva no navegador, então isso é rápido e não pede
// senha de novo — só confirma que a sessão ainda é válida).
//
// window.requireAuth(callback) chama callback(user) se estiver logado;
// senão manda direto pra index.html (a tela de login).
// ============================================================

window.requireAuth = function requireAuth(callback) {
    if (!window.Auth) {
        // firebase.js não conseguiu nem carregar o SDK (sem internet, CDN
        // bloqueado, chaves erradas em firebase-config.js etc.) — manda pra
        // tela de login, que sabe mostrar essa mensagem de erro.
        window.location.href = 'index.html';
        return;
    }
    window.Auth.onChange(user => {
        if (user) {
            callback(user);
        } else {
            window.location.href = 'index.html';
        }
    });
};
