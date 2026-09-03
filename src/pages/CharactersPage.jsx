import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Auth, Characters } from '@/services/firebase';

export default function CharactersPage() {
    const { user } = useOutletContext();
    const navigate = useNavigate();

    const [personagens, setPersonagens] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [personagemParaExcluir, setPersonagemParaExcluir] = useState(null);
    const [confirmText, setConfirmText] = useState('');

    const carregarPersonagens = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const lista = await Characters.list(user.uid);
            setPersonagens(lista);
        } catch (err) {
            console.error('[characters-list] Erro ao listar personagens:', err);
            setErro('Não foi possível carregar seus personagens: ' + (err.message || err));
        } finally {
            setCarregando(false);
        }
    }, [user.uid]);

    useEffect(() => {
        carregarPersonagens();
    }, [carregarPersonagens]);

    function pedirExclusao(personagem) {
        setPersonagemParaExcluir(personagem);
        setConfirmText('');
    }

    function fecharModalExcluir() {
        setPersonagemParaExcluir(null);
        setConfirmText('');
    }

    async function confirmarExclusao() {
        const personagem = personagemParaExcluir;
        if (!personagem) return;
        try {
            await Characters.remove(user.uid, personagem.id);
            fecharModalExcluir();
            toast.success(`"${personagem.nome || 'Personagem'}" foi excluído.`);
            await carregarPersonagens();
        } catch (err) {
            console.error('[characters-list] Erro ao excluir personagem:', err);
            toast.error('Não foi possível excluir: ' + (err.message || err));
        }
    }

    // Fecha a modal de exclusão com Esc, mesmo padrão das modais da ficha
    // (ver fecharModal/fecharModalRituais/fecharModalAtaque em
    // CharacterSheetPage.jsx).
    useEffect(() => {
        if (!personagemParaExcluir) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') fecharModalExcluir();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [personagemParaExcluir]);

    async function handleLogout() {
        await Auth.signOut();
        navigate('/');
    }

    return (
        <div className="screen screen-characters">
            <div className="characters-panel">
                <div className="characters-header">
                    <h2>Meus Personagens</h2>
                    <div className="characters-header-actions">
                        <button className="btn-action" onClick={() => navigate('/form')}>
                            + Novo Personagem
                        </button>
                        <button className="btn-secondary" onClick={handleLogout}>Sair</button>
                    </div>
                </div>
                {carregando && (
                    <div className="characters-empty">Carregando personagens...</div>
                )}

                {erro && <div className="characters-empty characters-erro">{erro}</div>}

                {!erro && !carregando && personagens.length === 0 && (
                    <div className="characters-empty">
                        Você ainda não criou nenhum personagem.
                    </div>
                )}

                <div className="characters-list">
                    {personagens.map(personagem => {
                        const nex = Number(personagem.nex) || 5;
                        return (
                            <div className="character-card" key={personagem.id}>
                                <div className="character-card-info">
                                    <strong>{personagem.nome || '(sem nome)'}</strong>
                                    <span className="character-card-trilha">
                                        {personagem.trilha || ''} • NEX {nex}%
                                    </span>
                                </div>
                                <div className="character-card-actions">
                                    <button
                                        className="btn-action"
                                        onClick={() => navigate(`/sheet/${encodeURIComponent(personagem.id)}`)}
                                    >
                                        Abrir
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => navigate(`/form/${encodeURIComponent(personagem.id)}`)}
                                    >
                                        Editar
                                    </button>
                                    <button className="btn-danger" onClick={() => pedirExclusao(personagem)}>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {personagemParaExcluir && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-danger">
                        <div className="modal-header">
                            <h3>Excluir personagem</h3>
                            <button type="button" className="modal-close" title="Fechar" onClick={fecharModalExcluir}>&times;</button>
                        </div>

                        <p className="modal-confirm-text">
                            Isso vai excluir <strong>{personagemParaExcluir.nome || '(sem nome)'}</strong> pra
                            sempre, junto com atributos, perícias, itens e rituais dele — não dá pra desfazer.
                        </p>

                        {personagemParaExcluir.nome ? (
                            <div className="control-group full">
                                <label>Digite "{personagemParaExcluir.nome}" pra confirmar</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder={personagemParaExcluir.nome}
                                />
                            </div>
                        ) : null}

                        <div className="modal-item-actions">
                            <button type="button" className="btn-secondary" onClick={fecharModalExcluir}>Cancelar</button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={!!personagemParaExcluir.nome && confirmText.trim() !== personagemParaExcluir.nome.trim()}
                                onClick={confirmarExclusao}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
