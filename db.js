const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

async function criarTabela() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS animais (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            especie VARCHAR(30) NOT NULL,
            idade VARCHAR(50),
            sexo VARCHAR(20),
            porte VARCHAR(30),
            descricao TEXT,
            foto VARCHAR(255),
            adotado BOOLEAN DEFAULT FALSE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Tabela animais criada com sucesso!');
}

module.exports = pool;
module.exports.criarTabela = criarTabela;