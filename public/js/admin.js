const formulario = document.getElementById('form-animal');
const lista = document.getElementById('lista-admin');

function escapar(texto) {
    return String(texto || '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// Carregar animais
async function carregarAnimais() {
    const resposta = await fetch('/api/admin/animais');

    if (resposta.status === 401) {
        window.location.href = '/admin';
        return;
    }

    const animais = await resposta.json();

    lista.innerHTML = '';

    animais.forEach(animal => {
        lista.innerHTML += `
            <article class="animal-admin">
                ${animal.foto ? `<img src="${escapar(animal.foto)}" width="120" alt="Foto de ${escapar(animal.nome)}">` : ''}
                <h3>${escapar(animal.nome)}</h3>
                <p>${escapar(animal.especie)} | ${escapar(animal.idade)}</p>
                <p>Status: ${animal.adotado ? 'Adotado' : 'Disponível'}</p>

                <button onclick="editarAnimal(${animal.id})">Editar</button>
                <button onclick="alternarAdocao(${animal.id}, ${!animal.adotado})">
                    ${animal.adotado ? 'Marcar disponível' : 'Marcar adotado'}
                </button>
                <button onclick="excluirAnimal(${animal.id})">Excluir</button>
            </article>
        `;
    });
}

// Cadastrar ou editar
formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const id = document.getElementById('animal-id').value;
    const dados = new FormData(formulario);

    const url = id
        ? `/api/admin/animais/${id}`
        : '/api/admin/animais';

    const metodo = id ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
        method: metodo,
        body: dados
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
        alert(resultado.erro || 'Erro ao salvar animal.');
        return;
    }

    alert('Animal salvo com sucesso!');
    limparFormulario();
    carregarAnimais();
});

// Preparar edição
async function editarAnimal(id) {
    const resposta = await fetch('/api/admin/animais');
    const animais = await resposta.json();

    const animal = animais.find(item => item.id === id);

    if (!animal) return;

    document.getElementById('animal-id').value = animal.id;

    formulario.elements.nome.value = animal.nome;
    formulario.elements.especie.value = animal.especie;
    formulario.elements.idade.value = animal.idade || '';
    formulario.elements.sexo.value = animal.sexo || '';
    formulario.elements.porte.value = animal.porte || '';
    formulario.elements.descricao.value = animal.descricao || '';

    document.getElementById('botao-salvar').textContent = 'Salvar alterações';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Limpar formulário
function limparFormulario() {
    formulario.reset();
    document.getElementById('animal-id').value = '';
    document.getElementById('botao-salvar').textContent = 'Cadastrar animal';
}

// Marcar adoção
async function alternarAdocao(id, adotado) {
    const resposta = await fetch(`/api/admin/animais/${id}/adocao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adotado })
    });

    if (resposta.ok) carregarAnimais();
    else alert('Não foi possível atualizar o status.');
}

// Excluir
async function excluirAnimal(id) {
    if (!confirm('Deseja realmente excluir este animal?')) return;

    const resposta = await fetch(`/api/admin/animais/${id}`, {
        method: 'DELETE'
    });

    if (resposta.ok) {
        carregarAnimais();
    } else {
        alert('Erro ao excluir animal.');
    }
}

// Sair
async function sair() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/admin';
}

carregarAnimais();