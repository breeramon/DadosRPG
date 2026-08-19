// ============================================================
// character-sheet.js
//
// Lógica de "página" da ficha (sheet.html): lê o "?id=" da URL, busca o
// personagem no Firestore e entrega pra window.loadCharacterIntoSheet
// (definida em script.js, que cuida de desenhar a ficha em si — dados,
// perícias, vida/determinação/defesa, inventário). Requer login (ver
// javascript/auth-guard.js).
// ============================================================

let currentUser = null;
let currentCharacter = null;

function wireStaticButtons() {
    document.getElementById('btn-voltar-lista').addEventListener('click', () => {
        window.location.href = 'characters.html';
    });
    document.getElementById('btn-editar-personagem').addEventListener('click', () => {
        if (currentCharacter) window.location.href = `form.html?id=${encodeURIComponent(currentCharacter.id)}`;
    });
}

wireStaticButtons();
window.requireAuth(async (user) => {
    currentUser = user;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        window.location.href = 'characters.html';
        return;
    }

    try {
        const personagem = await window.Characters.get(currentUser.uid, id);
        if (!personagem) {
            alert('Esse personagem não existe (ou já foi excluído).');
            window.location.href = 'characters.html';
            return;
        }
        currentCharacter = personagem;

        window.loadCharacterIntoSheet(personagem, {
            // Deixa a ficha salvar vida/determinação/defesa/inventário direto
            // no Firestore (sem passar pelo formulário de edição), mantendo
            // `currentCharacter` atualizado também.
            onSaveVitais: async (campos) => {
                Object.assign(currentCharacter, campos);
                try {
                    await window.Characters.update(currentUser.uid, currentCharacter.id, campos);
                } catch (err) {
                    console.error('[character-sheet] Erro ao salvar vida/determinação/defesa/inventário:', err);
                }
            },
        });
    } catch (err) {
        console.error('[character-sheet] Erro ao carregar personagem:', err);
        alert('Não foi possível carregar o personagem: ' + (err.message || err));
        window.location.href = 'characters.html';
    }
});
