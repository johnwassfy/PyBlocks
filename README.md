# PyBlocks 🚀

An AI-powered, adaptive learning platform that combines visual block-based programming with traditional Python coding to create an engaging educational experience for young learners.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Environment Configuration](#environment-configuration)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

PyBlocks is a comprehensive educational platform designed to teach programming concepts through an intuitive, gamified interface. The platform features:

- **Visual Block-Based Programming**: Drag-and-drop interface for beginners
- **AI-Powered Feedback**: Real-time code analysis and personalized hints
- **Adaptive Learning**: Intelligent mission recommendations based on student progress
- **Gamification**: XP, levels, badges, and achievement system
- **Progress Tracking**: Comprehensive analytics for both students and educators

## ✨ Features

### For Students
- 🎮 Interactive block-based coding interface
- 🤖 AI-powered chatbot for instant help
- 🏆 Achievement and badge system
- 📊 Visual progress tracking
- 🎯 Adaptive mission difficulty

### For Educators
- 📈 Student analytics dashboard
- 📉 Learning pattern insights
- 🎓 Concept mastery tracking
- 📊 Performance metrics

### Technical Features
- ⚡ Event-driven architecture for scalability
- 🔐 Secure JWT authentication
- 🔄 Real-time code execution and validation
- 📡 RESTful API with comprehensive documentation
- 🎨 Modern, responsive UI

## 💻 System Requirements

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Python**: v3.9 or higher
- **pip**: v21.0 or higher (comes with Python)
- **MongoDB**: v6.0 or higher

### Recommended

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 2GB free space
- **Code Editor**: VS Code (recommended)

### Verify Installation

Check if required software is installed:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Python version
python --version

# Check pip version
pip --version

# Check MongoDB (if installed locally)
mongod --version
```

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/johnwassfy/PyBlocks.git
cd pyblocks
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Install AI Service Dependencies

```bash
cd ai_service
pip install -r requirements.txt
cd ..
```

### 5. Setup MongoDB

**Option A: Local Installation**
- Download and install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
- Start MongoDB service:
  - Windows: MongoDB runs as a service automatically after installation
  - macOS: `brew services start mongodb-community`
  - Linux: `sudo systemctl start mongod`

**Option B: MongoDB Atlas (Cloud - Recommended)**
- Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
- Create a cluster and get your connection string
- No local installation needed!

## 🚀 Running the Application

### Quick Start Guide

**Important**: Make sure MongoDB is running before starting the application!

You need to run **three services** in **separate terminal windows**. Follow these steps in order:

#### Step 1: Start the Backend

Open a terminal and run:

```bash
cd backend
npm run start:dev
```

✅ **Backend running at**: `http://localhost:3001`  
📚 **API Docs**: `http://localhost:3001/api`

#### Step 2: Start the AI Service

Open a **second terminal** and run:

```bash
cd ai_service
python -m uvicorn app.main:app --reload --port 8000
```

**Windows Users**: You can also use the PowerShell script:
```powershell
cd ai_service
.\start_server.ps1
```

✅ **AI Service running at**: `http://localhost:8000`  
📚 **API Docs**: `http://localhost:8000/docs`

#### Step 3: Start the Frontend

Open a **third terminal** and run:

```bash
cd frontend
npm run dev
```

✅ **Frontend running at**: `http://localhost:3000`

#### Step 4: Access the Application

Open your browser and navigate to:

🌐 **http://localhost:3000**

### Verify All Services

Check that all services are responding:

- ✅ **Frontend**: [http://localhost:3000](http://localhost:3000) - Main application
- ✅ **Backend API**: [http://localhost:3001/api](http://localhost:3001/api) - Swagger documentation
- ✅ **AI Service**: [http://localhost:8000/docs](http://localhost:8000/docs) - FastAPI documentation

### Production Build

#### Backend
```bash
cd backend
npm run build
npm run start:prod
```

#### Frontend
```bash
cd frontend
npm run build
npm start
```

#### AI Service
```bash
cd ai_service
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## ⚙️ Environment Configuration

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/pyblocks
# Or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/pyblocks

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRATION=24h

# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### AI Service Configuration

Create a `.env` file in the `ai_service/` directory (copy from `.env.example`):

```env
# Environment Settings
ENVIRONMENT=development
DEBUG=true
HOST=0.0.0.0
PORT=8000

# Backend Integration
BACKEND_URL=http://localhost:3001
BACKEND_API_KEY=  # Optional: Add secure key for API authentication

# Code Execution Settings
CODE_TIMEOUT=5
MAX_OUTPUT_LENGTH=10000
ENABLE_SANDBOXING=true

# AI Provider Configuration
AI_PROVIDER=rule-based  # Options: rule-based, openrouter, openai, anthropic

# OpenRouter Configuration (if using OpenRouter)
# OPENROUTER_API_KEY=your_openrouter_api_key
# OPENROUTER_MODEL=zhipu/glm-4.5-air-4k-free  # Free model option

# OpenAI Configuration (if using OpenAI)
# OPENAI_API_KEY=your_openai_api_key
# OPENAI_MODEL=gpt-4o-mini

# Logging
LOG_LEVEL=INFO
```

### Frontend Configuration

The frontend uses environment variables for API endpoints. Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
```

## 🏗️ Architecture

PyBlocks uses a modern three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js/React)                 │
│  • Blockly workspace • Chat interface • Dashboard • Auth    │
└────────────────┬─────────────────────────────────┬──────────┘
                 │                                 │
                 ↓                                 ↓
┌────────────────────────────────┐   ┌───────────────────────┐
│    Backend (NestJS)            │   │  AI Service (FastAPI) │
│  • REST API                    │←──│  • Code analysis      │
│  • JWT Authentication          │   │  • Feedback engine    │
│  • Event-driven architecture   │   │  • AI integration     │
│  • Progress tracking          │   │  • Validation         │
└────────────┬───────────────────┘   └───────────────────────┘
             │
             ↓
┌────────────────────────────────┐
│      Data Layer                │
│  • MongoDB (Data storage)      │
└────────────────────────────────┘
```

### Key Components

- **Frontend**: React with Next.js, TypeScript, Tailwind CSS, Blockly
- **Backend**: NestJS with TypeScript, MongoDB, Event Emitter
- **AI Service**: FastAPI with Python, AI model integration, Code execution
- **Database**: MongoDB for persistent storage

## 📁 Project Structure

```
pyblocks/
├── frontend/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/                # Next.js app directory (routes)
│   │   ├── components/         # React components
│   │   ├── context/            # React context providers
│   │   ├── services/           # API service clients
│   │   └── hooks/              # Custom React hooks
│   └── public/                 # Static assets
│
├── backend/                     # NestJS backend application
│   ├── src/
│   │   ├── modules/            # Feature modules
│   │   │   ├── auth/           # Authentication
│   │   │   ├── users/          # User management
│   │   │   ├── missions/       # Mission system
│   │   │   ├── submissions/    # Code submissions
│   │   │   ├── gamification/   # XP, levels, badges
│   │   │   ├── achievements/   # Achievement system
│   │   │   ├── progress/       # Progress tracking
│   │   │   ├── adaptivity/     # Adaptive learning
│   │   │   ├── ai/             # AI integration
│   │   │   └── analytics/      # Analytics
│   │   ├── common/             # Shared utilities
│   │   └── config/             # Configuration
│   └── test/                   # E2E tests
│
├── ai_service/                  # Python FastAPI AI service
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── core/               # Core configuration
│   │   ├── models/             # Pydantic models
│   │   └── services/           # Business logic
│   ├── data/                   # Test data and results
│   └── logs/                   # Service logs
│
└── Bachelor_s_Thesis/          # Thesis documentation
    └── sections/                # Thesis chapters
```

## 📚 Documentation

Detailed documentation is available in each service directory:

- **Backend**: [backend/README.md](backend/README.md) - Complete API documentation and architecture
- **AI Service**: [ai_service/README.md](ai_service/README.md) - AI service endpoints and configuration
- **Frontend**: [frontend/README.md](frontend/README.md) - Frontend setup and components

### Additional Resources

- **API Documentation**: Available at `http://localhost:3001/api` when backend is running
- **AI Service API**: Available at `http://localhost:8000/docs` when AI service is running
- **Quick Start Guide**: See [GET_STARTED.md](GET_STARTED.md)
- **Analytics**: See [ai_service/HOW_TO_USE_ANALYTICS.md](ai_service/HOW_TO_USE_ANALYTICS.md)

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

### AI Service Tests

```bash
cd ai_service

# Run comprehensive benchmarks
python comprehensive_benchmark_runner.py

# Run thesis validation
python thesis_data_validation.py
```

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port 3000 (Frontend)
netstat -ano | findstr :3000

# Find process using port 3001 (Backend)
netstat -ano | findstr :3001

# Find process using port 8000 (AI Service)
netstat -ano | findstr :8000

# Kill process by PID
taskkill /PID <PID> /F
```

**MongoDB Connection Failed**
- Verify MongoDB is running:
  - Windows: Check Services for "MongoDB"
  - macOS/Linux: `sudo systemctl status mongod`
- Check connection string in `.env` file
- Ensure database user has proper permissions (for MongoDB Atlas)
- For local MongoDB, default connection is: `mongodb://localhost:27017/pyblocks`

**Module Not Found Errors**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`

**Python Package Issues**
- Upgrade pip: `pip install --upgrade pip`
- Reinstall requirements: `pip install -r requirements.txt --force-reinstall`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of a Bachelor's Thesis and is licensed under [UNLICENSED] - see individual package.json files for details.

## 👨‍💻 Author

**John Wassfy**
- GitHub: [@johnwassfy](https://github.com/johnwassfy)
- Repository: [PyBlocks](https://github.com/johnwassfy/PyBlocks)

## 🙏 Acknowledgments

- GIU (German International University)
- Bachelor's Thesis Project - Semester 7
- All contributors and supporters of this project

---

**Note**: This is an educational platform developed as part of a Bachelor's Thesis. For questions or support, please open an issue on GitHub.
