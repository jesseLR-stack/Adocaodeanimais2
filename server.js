const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

const pastaUploads = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
}

const armazenamento = multer.diskStorage({
    destination: (req, file, cb) => cb(null, pastaUploads),
    filename: (req, file, cb) => {
        const nome = Date.now() + path.extname(file.originalname);
        cb(null, nome);
    }
});

const upload = multer({
    storage: armazenamento,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Envie somente imagens.'));
        }
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 4
    }
}));

function verificarLogin(req, res, next) {
    if (req.session.admin) return next();
    return res.status(401).json({ erro: 'Faça login primeiro.' });
}

// Páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/animais', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'animais.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/painel', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin');
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Login
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;

    if (
        usuario === process.env.ADMIN_USER &&
        senha === process.env.ADMIN_PASSWORD
    ) {
        req.session.admin = true;
        return res.json({ sucesso: true });
    }

    res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
});

app.post('/api/logout', verificarLogin, (req, res) => {
    req.session.destroy(() => {
        res.json({ sucesso: true });
    });
});

// Listagem pública
app.get('/api/animais', async (req, res) => {
    try {
        const [animais] = await db.query(
            'SELECT * FROM animais WHERE adotado = FALSE ORDER BY criado_em DESC'
        );
        res.json(animais);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar animais.' });
    }
});

// Listagem administrativa
app.get('/api/admin/animais', verificarLogin, async (req, res) => {
    try {
        const [animais] = await db.query(
            'SELECT * FROM animais ORDER BY criado_em DESC'
        );
        res.json(animais);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar animais.' });
    }
});

// Cadastrar animal
app.post('/api/admin/animais', verificarLogin, upload.single('foto'), async (req, res) => {
    try {
        const { nome, especie, idade, sexo, porte, descricao } = req.body;
        const foto = req.file ? '/uploads/' + req.file.filename : null;

        if (!nome || !especie) {
            return res.status(400).json({ erro: 'Nome e espécie são obrigatórios.' });
        }

        await db.query(
            `INSERT INTO animais
            (nome, especie, idade, sexo, porte, descricao, foto)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nome, especie, idade, sexo, porte, descricao, foto]
        );

        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao cadastrar animal.' });
    }
});

// Editar animal
app.put('/api/admin/animais/:id', verificarLogin, upload.single('foto'), async (req, res) => {
    try {
        const { nome, especie, idade, sexo, porte, descricao } = req.body;
        const foto = req.file ? '/uploads/' + req.file.filename : null;

        await db.query(
            `UPDATE animais SET
            nome = ?, especie = ?, idade = ?, sexo = ?,
            porte = ?, descricao = ?, foto = COALESCE(?, foto)
            WHERE id = ?`,
            [nome, especie, idade, sexo, porte, descricao, foto, req.params.id]
        );

        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao editar animal.' });
    }
});

// Marcar como adotado ou disponível
app.patch('/api/admin/animais/:id/adocao', verificarLogin, async (req, res) => {
    try {
        await db.query(
            'UPDATE animais SET adotado = ? WHERE id = ?',
            [req.body.adotado, req.params.id]
        );
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao atualizar adoção.' });
    }
});

// Excluir animal
app.delete('/api/admin/animais/:id', verificarLogin, async (req, res) => {
    try {
        await db.query('DELETE FROM animais WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao excluir animal.' });
    }
});

// Inicialização
async function iniciar() {
    try {
        await db.query('SELECT 1');
        console.log('Conexão com MySQL realizada com sucesso!');

        await db.criarTabela();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (erro) {
        console.error('Erro ao iniciar:', erro.message);
    }
}

iniciar();