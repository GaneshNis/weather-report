require('dotenv').config();
const express = require('express');
const { Connection, Request } = require('tedious');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors()); // Enable CORS for local development
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Database configuration
const dbConfig = {
    server: process.env.DB_SERVER,
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        },
    },
    options: {
        database: process.env.DB_NAME,
        encrypt: true,
        rowCollectionOnDone: true,
    },
};

// Create a single database connection and handle its lifecycle
let dbConnection = null;

async function initializeDbConnection() {
    return new Promise((resolve, reject) => {
        const connection = new Connection(dbConfig);
        connection.on('connect', (err) => {
            if (err) {
                console.error('Database connection failed:', err);
                return reject(err);
            }
            console.log('Database connection successful.');
            resolve(connection);
        });
        connection.connect();
    });
}

// Function to execute a SQL query and return a promise
function executeQuery(sql, params) {
    return new Promise((resolve, reject) => {
        if (!dbConnection) {
            return reject(new Error('Database connection is not initialized.'));
        }
        
        const request = new Request(sql, (err, rowCount, rows) => {
            if (err) {
                console.error('SQL query execution failed:', err);
                return reject(err);
            }
            resolve({ rowCount, rows });
        });

        if (params) {
            params.forEach(param => {
                request.addParameter(param.name, param.type, param.value);
            });
        }
        dbConnection.execSql(request);
    });
}

// Immediately create the table and initialize the connection
(async () => {
    try {
        dbConnection = await initializeDbConnection();
        const createTableSql = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WeatherNotes' and xtype='U')
            CREATE TABLE WeatherNotes (
                id INT IDENTITY(1,1) PRIMARY KEY,
                note NVARCHAR(MAX) NOT NULL,
                date DATETIME NOT NULL DEFAULT GETDATE()
            )`;
        await executeQuery(createTableSql);
        console.log('Table "WeatherNotes" is ready.');
    } catch (err) {
        console.error('Failed to initialize database:', err);
        // Exit the process if the database cannot be initialized
        process.exit(1); 
    }
})();

// API endpoint to save a new note
app.post('/save', async (req, res) => {
    const { note } = req.body;
    if (!note) {
        return res.status(400).send('Note is required.');
    }

    const sql = `INSERT INTO WeatherNotes (note) VALUES (@note)`;
    const params = [{ name: 'note', type: 'NVarChar', value: note }];

    try {
        await executeQuery(sql, params);
        res.status(201).send('Note saved successfully.');
    } catch (err) {
        res.status(500).send('Server error. Failed to save note.');
    }
});

// API endpoint to get all history
app.get('/history', async (req, res) => {
    const sql = `SELECT * FROM WeatherNotes ORDER BY date DESC`;
    try {
        const { rows } = await executeQuery(sql);
        const history = rows.map(row => {
            const item = {};
            row.forEach(col => {
                item[col.metadata.colName] = col.value;
            });
            return item;
        });
        res.json(history);
    } catch (err) {
        res.status(500).send('Server error. Failed to fetch history.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});