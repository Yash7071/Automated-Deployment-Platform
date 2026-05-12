# 🚀 Mini-PaaS: Automated Containerized Deployment Engine

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Docker](https://img.shields.io/badge/Docker-Engine-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-blue)

A lightweight, **Zero-Configuration Platform-as-a-Service (PaaS)** that bridges the gap between manual Docker CLI operations and complex enterprise orchestrators. Designed for rapid prototyping, this engine automates the entire deployment lifecycle—from cloning a Git repository to exposing a live container on a dynamically hunted port.

## ✨ Key Features

* **🔗 Automated Git-to-URL Pipeline:** Submit a public GitHub URL, and the engine autonomously handles cloning, building, and deployment.
* **🎯 Dynamic Port Allocation:** A custom "Port Hunter" algorithm recursively scans the host network to assign available ports (starting at 8080), completely eliminating `EADDRINUSE` network collisions.
* **📜 Real-Time Build Telemetry:** Asynchronous HTTP polling streams `stdout` and `stderr` from backend child processes directly to the browser UI.
* **🛡 Multi-Tenant Isolation:** Secure JWT authentication and isolated host workspaces for each deployment prevent source-code cross-contamination.
* **♻️ Resource Teardown:** One-click termination stops the Docker container and flushes mapped database states in a single synchronized transaction.

## 🛠 Core Technology Stack

* **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Zero client-side build steps)
* **Orchestration / API:** Node.js, Express.js
* **Infrastructure Engine:** Docker Daemon, System-level Bash Scripting (`deploy.sh`)
* **State Management:** PostgreSQL
* **Security:** Bcrypt (Password Hashing), JSON Web Tokens (Stateless Sessions)

## 🏗 System Architecture

The platform operates on a decoupled 3-tier architecture. The Node.js backend acts as the orchestrator, securely receiving Git URLs, sanitizing inputs, and spawning child processes. These child processes execute bash scripts that interface directly with the host's Docker Engine to build and run the containers.

## 🚀 Getting Started

Follow these steps to set up and run the Mini-PaaS platform on your local machine or server.

### Prerequisites
* Linux-based OS (Ubuntu or WSL2 recommended for native Bash execution)
* Node.js (v18 or higher)
* PostgreSQL
* Docker Engine (Must be active and running)

### 1. Database Setup
Create a PostgreSQL database and initialize the schema. Log into your PostgreSQL terminal and run:

    CREATE DATABASE minipaas_db;
    \c minipaas_db;

*Note: Run the SQL commands found in `/database/schema.sql` to create your tables.*

### 2. Project Installation
Clone the repository and install dependencies:

    git clone https://github.com/abkumar/mini-paas.git
    cd mini-paas/backend
    npm install

### 3. Environment Variables
Create a `.env` file in the `backend/` directory with the following keys:

    DB_USER=your_postgres_user
    DB_PASSWORD=your_postgres_password
    DB_NAME=minipaas_db
    DB_PORT=5432
    JWT_SECRET=your_super_secret_jwt_key

### 4. Start the Engine
Grant execution permissions to the deployment script and start the Node.js server:

    chmod +x infrastructure/deploy.sh
    npm start

### 5. Access the Dashboard
Open `index.html` (located in the `frontend/` folder) in any modern web browser. Create an account, log in, and paste a GitHub URL (containing a root `Dockerfile`) to deploy your first container!

## 🧹 System Teardown (Admin)
To perform a hard reset and clear all ephemeral environments from the host, run these commands in your host terminal:

    # Stop and remove all Docker containers
    docker stop $(docker ps -aq) && docker rm $(docker ps -aq)

    # Clear temporary workspaces
    rm -rf /tmp/mini-paas-builds/*

## 🚧 Roadmap & Future Scope
- [ ] **Reverse Proxy Integration:** Automated Nginx routing for clean subdomain access (e.g., `app.minipaas.local`).
- [ ] **Resource Limiting:** Enforce Docker Control Groups (`--memory`, `--cpus`) to prevent host exhaustion.
- [ ] **Persistent Volumes:** Support for localized Docker volume mounting for stateful databases.

## 📄 License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---
**Author:** Abhishek  
*Cloud-focused Computer Science undergraduate specializing in DevOps, AWS, and automation.*
