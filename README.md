# LearnMate 🎓 — AI Academic Coach

> **AI-Powered Academic Coaching & Personalised Course Pathway**  
> Built with **Python Flask** · **IBM Watsonx.ai** · **IBM Granite models**

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Chat Coach** | Real-time academic coaching powered by IBM Granite via Watsonx.ai |
| 🗺️ **Curriculum Pathway** | AI-generated weekly study plans tailored to your goal & level |
| 🎯 **Goal Tracker** | Add project goals, set deadlines, track progress with visual bars |
| 📱 **Responsive UI** | Clean, modern purple/indigo theme — works on mobile, tablet & desktop |
| 🛡️ **Safety Guardrails** | Built-in AGENT_INSTRUCTIONS with tone, safety, and specialisation rules |

---

## 🏗️ Project Structure

```
LearnMate_Project/
├── app.py                   # Flask app + Watsonx.ai + AGENT_INSTRUCTIONS
├── requirements.txt         # Python dependencies
├── .env                     # 🔒 Secrets (never commit)
├── .gitignore
├── README.md
├── templates/
│   ├── layout.html          # Base layout (navbar, footer)
│   ├── index.html           # Landing / home page
│   ├── chat.html            # AI Coach chat UI
│   ├── pathway.html         # Curriculum pathway builder
│   └── goals.html           # Project goal tracker
└── static/
    ├── css/
    │   └── style.css        # Full design system (purple/indigo theme)
    └── js/
        ├── main.js          # Global UI (nav, toasts)
        ├── chat.js          # Chat interface logic
        ├── pathway.js       # Pathway generator logic
        └── goals.js         # Goal tracker CRUD logic
```

---

## ⚙️ Prerequisites

- Python **3.10+**
- An **IBM Cloud account** with Watsonx.ai access
- IBM Cloud API Key, Watsonx.ai Project ID, and service URL

---

## 🚀 Quick Start

### 1. Clone / navigate to the project

```bash
cd LearnMate_Project
```

### 2. Create a virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure IBM credentials

Edit the **`.env`** file and fill in your real values:

```env
IBM_API_KEY=your_actual_api_key
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_PROJECT_ID=your_project_id
FLASK_SECRET_KEY=some-random-long-string
FLASK_ENV=development
WATSONX_MODEL_ID=ibm/granite-3-3-8b-instruct
```

> **How to find your credentials:**
> - **API Key**: IBM Cloud → Manage → Access (IAM) → API Keys → Create
> - **Project ID**: Watsonx.ai console → Projects → your project → Manage tab → General
> - **URL**: Use the region where your Watsonx.ai instance is deployed  
>   (`us-south`, `eu-de`, `jp-tok`, etc.)

### 5. Run the development server

```bash
python app.py
```

Open your browser at **http://localhost:5000**

---

## 🌐 Deployment

### Option A — Gunicorn (Linux/Mac)

```bash
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

### Option B — IBM Code Engine (recommended for IBM stack)

1. Containerise with the provided `Dockerfile` (see below).
2. Push to IBM Container Registry.
3. Deploy as a Code Engine application.

**Dockerfile (minimal):**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
ENV FLASK_ENV=production
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:8080", "app:app"]
```

### Option C — IBM Cloud Foundry

```bash
# manifest.yml already targets python_buildpack
ibmcloud cf push learnmate
```

### Option D — Render / Railway / Fly.io

Set the environment variables from `.env` in the platform dashboard, then deploy via Git.

---

## 🤖 IBM Watsonx.ai — AGENT_INSTRUCTIONS

The **`AGENT_INSTRUCTIONS`** constant in [`app.py`](app.py) (line ~45) governs everything about
how the Granite model behaves. It covers:

| Section | What it controls |
|---|---|
| **Identity & Tone** | Friendly, encouraging, professional; empathetic to frustration |
| **C Language** | Memory, pointers, structs, safe coding, UB avoidance |
| **Java** | OOP principles, Collections, design patterns, Maven/Gradle |
| **Python DS** | NumPy, Pandas, Sklearn, EDA, PEP 8, Jupyter best practices |
| **Pathway Guidance** | 4–8 week plans with milestones, tasks, resources |
| **Safety Guardrails** | No harmful content, no academic dishonesty, no medical/legal advice |
| **Response Format** | Markdown, ≤600 words, always ends with "Next Step" suggestion |

---

## 🔐 Security Notes

- The `.env` file is in `.gitignore` — **never commit it**.
- Use **IBM Cloud Secrets Manager** or platform-native secrets for production.
- Rotate your API key regularly via IBM Cloud → Manage → Access.
- Consider enabling Flask session encryption with a strong `FLASK_SECRET_KEY`.
- The in-memory goal store resets on server restart — plug in SQLite/PostgreSQL for persistence.

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| Flask | 3.0.3 | Web framework |
| python-dotenv | 1.0.1 | `.env` loader |
| ibm-watsonx-ai | 1.1.2 | IBM Granite AI inference |
| gunicorn | 22.0.0 | WSGI server for production |

---

## 📄 License

MIT License — © 2024 LearnMate  
IBM Watsonx.ai and IBM Granite are trademarks of IBM Corporation.
