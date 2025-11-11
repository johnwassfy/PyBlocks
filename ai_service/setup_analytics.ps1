# 📦 Analytics System Setup Script
# Run this to install all required dependencies

Write-Host "📊 PyBlocks Analytics System Setup" -ForegroundColor Cyan
Write-Host "=" * 60

# Check Python installation
Write-Host "`n1️⃣ Checking Python installation..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Python found" -ForegroundColor Green

# Check MongoDB
Write-Host "`n2️⃣ Checking MongoDB connection..." -ForegroundColor Yellow
$mongoTest = mongo --eval "db.version()" --quiet 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB not running. Start it with: net start MongoDB" -ForegroundColor Yellow
}

# Install Python packages
Write-Host "`n3️⃣ Installing Python analytics packages..." -ForegroundColor Yellow
pip install pandas pymongo numpy matplotlib seaborn plotly jupyter ipykernel notebook openpyxl xlsxwriter scipy scikit-learn

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python packages installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install packages. Check your internet connection." -ForegroundColor Red
    exit 1
}

# Create directories
Write-Host "`n4️⃣ Creating data directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "data" | Out-Null
New-Item -ItemType Directory -Force -Path "data/analytics_export" | Out-Null
New-Item -ItemType Directory -Force -Path "data/analytics_export/figures" | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

# Test MongoDB connection
Write-Host "`n5️⃣ Testing MongoDB connection..." -ForegroundColor Yellow
$testScript = @"
from pymongo import MongoClient
try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
    client.server_info()
    print('✅ MongoDB connection successful')
except Exception as e:
    print(f'❌ MongoDB connection failed: {e}')
"@

echo $testScript | python

Write-Host "`n" + "=" * 60
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=" * 60
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Ensure MongoDB is running"
Write-Host "  2. Start your backend (npm run start:dev)"
Write-Host "  3. Start your AI service (python -m uvicorn app.main:app --reload)"
Write-Host "  4. Let students use the platform"
Write-Host "  5. Run analytics: python analytics_extractor.py"
Write-Host "  6. Generate visualizations: python visualization_notebook.py"
Write-Host ""
Write-Host "📖 Read ANALYTICS_README.md for detailed instructions" -ForegroundColor Yellow
Write-Host ""
