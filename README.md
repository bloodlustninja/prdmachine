[README.md](https://github.com/user-attachments/files/33857623/README.md)
Markdown

\# PRDMachine ⚡

> Autonomous, adversarial multi-agent RFC \\\& architecture synthesis engine.



PRDMachine is an engineering orchestration platform designed to transform high-level product and technical requirements into battle-tested System Architecture RFCs (Request for Comments). Utilizing an adversarial consensus loop between specialized LLM agents, it stress-tests distributed systems designs against security vulnerabilities, systemic bottlenecks, and failure modes in real time.



\---



\## 🏛 System Architecture



The core consensus engine coordinates three specialized agents communicating over a Server-Sent Events (SSE) streaming pipeline:



```mermaid

graph TD

\&#x20;   Client\\\[Browser Console / React 19] <-->|SSE Stream / EventSource| API\\\[FastAPI Gateway]

\&#x20;   

\&#x20;   subgraph Consensus Mesh \\\[Adversarial Engine Core]

\&#x20;       API --> Orchestrator\\\[Consensus Orchestrator]

\&#x20;       Orchestrator --> Aegis\\\[Agent: Aegis / System Architect]

\&#x20;       Aegis --> Vortex\\\[Agent: Vortex / Chaos \\\& Failure Modes]

\&#x20;       Vortex --> Sentinel\\\[Agent: Sentinel / Security \\\& Compliance]

\&#x20;       Sentinel -.->|Iterative Refinement| Aegis

\&#x20;   end



\&#x20;   Sentinel --> Storage\\\[(Local State Vault \\\& Cache)]

\&#x20;   Storage --> Client

The Agent Trinity

Aegis (Architect): Synthesizes core service topologies, high-throughput data pipelines, protocol choices, and storage models.



Vortex (Chaos): Analyzes network partitions, split-brain scenarios, cascading backpressure failures, and thundering herds.



Sentinel (Security): Enforces Zero-Trust boundaries, audit ledgers, mTLS requirements, authorization matrices, and regulatory guardrails (HIPAA, GDPR, SOC 2).



🛠 Tech Stack

Frontend: React 19, Vite, Tailwind CSS v4, Lucide Icons, Mermaid.js, React Markdown



Backend: FastAPI, Uvicorn, Server-Sent Events (SSE), Pydantic v2



Orchestration: Multi-round adversarial state machine streaming real-time markdown deltas and reactive SVG topologies



Containerization: Docker, Docker Compose, Multi-stage Nginx builds



🚀 Quickstart

Prerequisites

Python 3.10+



Node.js 18+



Google Gemini API Key



1\\. Backend Service Setup

Bash

cd backend



\\# Create and activate virtual environment

python -m venv .venv



\\# On Windows (PowerShell):

.venv\\\\Scripts\\\\Activate.ps1

\\# On Linux/macOS:

source .venv/bin/activate



\\# Install dependencies

pip install -r requirements.txt



\\# Create environment file

echo GEMINI\\\_API\\\_KEY="your-api-key-here" > .env



\\# Start FastAPI server

uvicorn main:app --reload --port 8000

The backend API will be available at http://localhost:8000. Swagger documentation is accessible at http://localhost:8000/docs.



2\\. Frontend Workstation Setup

Bash

cd frontend



\\# Install packages

npm install



\\# Start Vite dev server

npm run dev

Open http://localhost:5173 in your browser.



📦 Container Deployment (Docker Compose)

Run the entire stack with unified networking and production builds:



Bash

docker compose up --build

Web Console: http://localhost:80



API Documentation: http://localhost:8000/docs



📂 Repository Structure

Plaintext

PRDMachine/

├── backend/

│   ├── app/

│   │   ├── agents/          # Aegis, Vortex, and Sentinel definitions

│   │   ├── orchestrator.py  # Multi-agent state machine \\\& SSE generator

│   │   └── main.py          # FastAPI application \\\& route endpoints

│   ├── requirements.txt

│   └── Dockerfile

├── frontend/

│   ├── src/

│   │   ├── components/      # Mermaid topology viewer \\\& UI modules

│   │   ├── App.jsx          # Dark-mode split-pane workstation

│   │   └── index.css        # Tailwind v4 theme definitions

│   ├── package.json

│   └── Dockerfile

├── docker-compose.yml

└── README.md

📄 License

MIT © bloodlustninja


