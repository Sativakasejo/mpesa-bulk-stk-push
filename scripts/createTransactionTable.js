const pool = require('../config/database');

async function createTransactionTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            transaction_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            phone_number VARCHAR(15) NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    try {
        const connection = await pool.getConnection();
        await connection.query(createTableQuery);
        connection.release();
        console.log('Transaction table created successfully.');
    } catch (error) {
        console.error('Error creating transaction table:', error);
    }
}

createTransactionTable();
