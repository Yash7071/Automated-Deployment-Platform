// --- GLOBAL SELECTORS ---
// We grab these once at the top to use throughout the script
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const deployForm = document.getElementById('deploy-form');
const dashboardContainer = document.getElementById('dashboard-container');

// --- 1. LOGIN LOGIC ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('error-message');
        const spinner = document.getElementById('spinner');
        const btnText = document.getElementById('btn-text');
        const submitBtn = document.getElementById('submit-btn');

        // Reset UI State
        if (errorDiv) errorDiv.style.display = 'none';
        if (submitBtn) submitBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        if (btnText) btnText.textContent = 'Authenticating...';

        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store the JWT pass in the browser's local storage
                localStorage.setItem('token', data.token);
                window.location.href = 'dashboard.html';
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (err) {
            // Revert UI on error
            if (submitBtn) submitBtn.disabled = false;
            if (spinner) spinner.style.display = 'none';
            if (btnText) btnText.textContent = 'Initialize Session';
            
            if (errorDiv) {
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            }
        }
    });
}

// --- 2. SIGNUP LOGIC ---
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorDiv = document.getElementById('signup-error-message');
        const submitBtn = document.getElementById('signup-submit-btn');
        const btnText = document.getElementById('signup-btn-text');

        if (submitBtn) submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Provisioning...';

        try {
            const response = await fetch('http://localhost:5000/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                if (btnText) btnText.textContent = 'Account Created!';
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            } else {
                throw new Error(data.error || 'Signup failed');
            }
        } catch (err) {
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.textContent = 'Create Account';
            if (errorDiv) {
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            }
        }
    });
}

// --- 3. DASHBOARD INITIALIZATION ---
if (dashboardContainer) {
    const token = localStorage.getItem('token');

    // Kick out unauthenticated users
    if (!token) {
        window.location.href = 'index.html';
    }

    // Verify token with backend and get user info
    fetch('http://localhost:5000/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        } else {
            const welcome = document.getElementById('welcome-message');
            if (welcome) welcome.textContent = data.message;
        }
    })
    .catch(err => console.error("Dashboard verify error:", err));

    // Handle Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }
}

// --- 4. DEPLOYMENT ENGINE LOGIC ---
if (deployForm) {
    deployForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const repoUrl = document.getElementById('repo-url').value;
        const deployBtn = document.getElementById('deploy-btn');
        const terminal = document.getElementById('terminal-output');
        const token = localStorage.getItem('token');

        // UI Feedback
        if (deployBtn) deployBtn.disabled = true;
        if (deployBtn) deployBtn.textContent = 'Building...';
        if (terminal) {
            terminal.innerHTML += `<br><span style="color: #60a5fa;">> Initializing build for: ${repoUrl}</span><br>`;
            terminal.scrollTop = terminal.scrollHeight;
        }

        try {
            const response = await fetch('http://localhost:5000/deploy', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ repoUrl })
            });

            const data = await response.json();
            const formattedLogs = data.logs ? data.logs.replace(/\n/g, '<br>') : 'No logs generated.';

            if (response.ok) {
                if (terminal) terminal.innerHTML += `<span style="color: #10b981;">${formattedLogs}</span><br><span style="color: #10b981; font-weight: bold;">> Success: Image built!</span><br>`;
            } else {
                if (terminal) terminal.innerHTML += `<span style="color: #ef4444;">${formattedLogs}</span><br><span style="color: #ef4444; font-weight: bold;">> Deployment Failed.</span><br>`;
            }
        } catch (err) {
            if (terminal) terminal.innerHTML += `<br><span style="color: #ef4444;">> Error: Engine connection refused.</span><br>`;
        } finally {
            if (deployBtn) deployBtn.disabled = false;
            if (deployBtn) deployBtn.textContent = 'Deploy Container';
            if (terminal) terminal.scrollTop = terminal.scrollHeight;
        }
    });
}
async function loadDeployments() {
    const token = localStorage.getItem('token');
    const list = document.getElementById('services-list');
    if (!list) return;

    try {
        const response = await fetch('http://localhost:5000/deployments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Check if the server actually sent a successful response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Server Error");
        }

        const deployments = await response.json();
        console.log("📦 Data received:", deployments);

        if (!deployments || deployments.length === 0) {
            list.innerHTML = '<li style="color: #94a3b8; list-style:none;">No services deployed yet.</li>';
            return;
        }

        // Generate the list safely
        list.innerHTML = deployments.map(d => {
    const rawUrl = d.repo_url || "Unknown App";
    const appName = rawUrl.split('/').pop().replace('.git', '');
    const port = d.port || "???";

    return `
        <li style="margin-bottom: 15px; border-bottom: 1px solid #334155; padding-bottom: 10px; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: #f8fafc; font-size: 1rem;"> ${appName}</strong><br>
                <a href="http://localhost:${port}" target="_blank" style="color: #60a5fa; text-decoration: none; font-size: 0.9em;">
                    🔗 Port: ${port}
                </a>
            </div>
            <button onclick="deleteService('${rawUrl}', ${port})" 
                    style="background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                Stop & Delete
            </button>
        </li>
    `;
}).join('');

    } catch (err) {
        console.error(" UI Update Failed:", err);
        list.innerHTML = `<li style="color: #ef4444; list-style:none;">Error loading services. Check backend.</li>`;
    }
}
// Call this function when the dashboard loads
if (document.getElementById('dashboard-container')) {
    console.log(" Dashboard detected, loading deployments...");
    loadDeployments();
}
async function deleteService(repoUrl, port) {
    if (!confirm(`Are you sure you want to stop the service on port ${port}?`)) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('http://localhost:5000/delete-deployment', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ repo_url: repoUrl, port: port })
        });

        if (response.ok) {
            alert("Service terminated successfully.");
            loadDeployments(); // Refresh the list automatically!
        } else {
            alert("Failed to delete service.");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}