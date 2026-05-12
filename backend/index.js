const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net'); // The dynamic port module
require('dotenv').config();

const db = require('./db'); 
const authenticateToken = require('./auth'); 

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json()); 

// --- PORT HUNTER FUNCTION ---
const getAvailablePort = () => {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
};

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
    res.json({ status: 'Mini-PaaS API is running smoothly.' });
});

// --- SIGNUP ROUTE ---
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

        const password_hash = await bcrypt.hash(password, 10);
        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, password_hash]
        );
        res.status(201).json({ message: 'User created!', user: newUser.rows[0] });
    } catch (err) {
        console.error(" SIGNUP CRASHED:", err);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

// --- LOGIN ROUTE ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.rows[0].id, username: user.rows[0].username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful!', token: token });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// --- DASHBOARD ROUTE ---
app.get('/dashboard', authenticateToken, async (req, res) => {
    res.json({ message: `Active Environment: ${req.user.username}`, userId: req.user.id });
});

// --- DEPLOYMENT ROUTE ---
app.post('/deploy', authenticateToken, async (req, res) => {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'Repository URL is required' });
     
    try {
        // 1. Get the dynamic port
        const dynamicPort = await getAvailablePort();
        console.log(` HUNTED PORT: ${dynamicPort}`); // This MUST print!

        const scriptPath = path.join(__dirname, '../infrastructure/deploy.sh');
        
        // 2. Pass it to bash as a string
        const deployProcess = spawn('bash', [scriptPath, repoUrl, dynamicPort.toString()]);

        let logOutput = "";

        deployProcess.stdout.on('data', (data) => {
            logOutput += data.toString();
            console.log(`[BUILD]: ${data}`);
        });

        deployProcess.stderr.on('data', (data) => {
            logOutput += data.toString();
            console.error(`[ERROR]: ${data}`);
        });

       deployProcess.on('close', async (code) => { // <-- Note the 'async' added here!
            if (code === 0) {
                try {
                    // Save the successful deployment to the PostgreSQL database
                    const userId = req.user.id; 
                    await db.query(
                        'INSERT INTO deployments (user_id, repo_url, port) VALUES ($1, $2, $3)',
                        [userId, repoUrl, dynamicPort]
                    );

                    res.json({ 
                        message: 'Deployment successful!', 
                        logs: logOutput, 
                        assignedPort: dynamicPort 
                    });
                } catch (dbError) {
                    console.error("Database Save Error:", dbError);
                    res.status(500).json({ error: 'App deployed, but failed to save record.', logs: logOutput });
                }
            } else {
                res.status(500).json({ error: 'Deployment failed', logs: logOutput });
            }
        }); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to allocate network port.' });
    }
});
// --- FETCH DEPLOYMENTS ---
app.get('/deployments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(
            'SELECT repo_url, port, created_at FROM deployments WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch deployment history' });
    }
});

// --- DELETE DEPLOYMENT ---
app.post('/delete-deployment', authenticateToken, async (req, res) => {
    const { repo_url, port } = req.body;
    const userId = req.user.id;

    // 1. Determine the container name (matches our deploy.sh logic)
    const repoName = repo_url.split('/').pop().replace('.git', '').toLowerCase();

    try {
        console.log(` Terminating container: ${repoName} on port ${port}`);

        // 2. Run Docker command to stop and remove the container
        const { exec } = require('child_process');
        exec(`docker rm -f ${repoName}`, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Docker Error: ${stderr}`);
                // We continue anyway in case the container was already gone
            }

            // 3. Remove from Database
            await db.query(
                'DELETE FROM deployments WHERE user_id = $1 AND port = $2',
                [userId, port]
            );

            res.json({ message: `Service ${repoName} terminated and port ${port} freed.` });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to terminate service.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Server is running on port ${PORT}`);
});