#!/bin/bash
# ArchLinux ML Training Environment Setup

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo -e "ArchLinux ML Training Environment Setup"
echo -e "========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Running as root is not recommended${NC}"
    echo ""
fi

# Install system packages
echo -e "${YELLOW}📦 Installing system packages...${NC}"
sudo pacman -Syu --noconfirm
sudo pacman -S --needed --noconfirm \
    nodejs npm python python-pip \
    mongodb redis \
    cuda cudnn nccl \
    base-devel git openssh rsync

echo -e "${GREEN}  ✅ System packages installed${NC}"

# Install pnpm
echo -e "\n${YELLOW}📦 Installing pnpm...${NC}"
if command -v pnpm &> /dev/null; then
    echo -e "${GREEN}  ✅ pnpm already installed${NC}"
else
    sudo npm install -g pnpm
    echo -e "${GREEN}  ✅ pnpm installed${NC}"
fi

# Install PM2
echo -e "\n${YELLOW}⚙️  Installing PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}  ✅ PM2 already installed${NC}"
else
    sudo npm install -g pm2
    echo -e "${GREEN}  ✅ PM2 installed${NC}"
fi

# Setup PM2 startup
echo -e "\n${YELLOW}⚙️  Configuring PM2 startup...${NC}"
pm2 startup systemd -u $USER --hp $HOME | grep -v "PM2" | sudo bash
echo -e "${GREEN}  ✅ PM2 startup configured${NC}"

# Verify CUDA
echo -e "\n${YELLOW}🎮 Verifying CUDA installation...${NC}"
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
    echo -e "${GREEN}  ✅ CUDA/GPU detected${NC}"
else
    echo -e "${RED}  ❌ NVIDIA GPU/drivers not found${NC}"
    echo -e "${YELLOW}     Install NVIDIA drivers and CUDA toolkit${NC}"
fi

# Setup Python virtual environment for ML
echo -e "\n${YELLOW}🐍 Setting up Python ML environment...${NC}"

ML_DIR="$HOME/investment-trading-portfolio/apps/algo-worker/ml"
if [ -d "$ML_DIR" ]; then
    cd "$ML_DIR"
    
    # Create virtual environment
    if [ ! -d ".venv" ]; then
        python -m venv .venv
        echo -e "${GREEN}  ✅ Virtual environment created${NC}"
    else
        echo -e "${GREEN}  ✅ Virtual environment already exists${NC}"
    fi
    
    # Activate and install dependencies
    source .venv/bin/activate
    
    echo -e "${YELLOW}  📥 Installing Python packages...${NC}"
    pip install --upgrade pip
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    pip install -r requirements.txt
    
    # Verify PyTorch CUDA
    echo -e "\n${YELLOW}  🔍 Verifying PyTorch CUDA...${NC}"
    python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
    
    deactivate
    echo -e "${GREEN}  ✅ Python ML environment ready${NC}"
else
    echo -e "${YELLOW}  ⏭️  ML directory not found, skipping Python setup${NC}"
fi

# Configure QuestDB
echo -e "\n${YELLOW}🗄️  Configuring QuestDB...${NC}"
sudo mkdir -p /var/lib/questdb
sudo chown $USER:$USER /var/lib/questdb

# Create QuestDB systemd service
sudo tee /etc/systemd/system/questdb.service > /dev/null <<EOF
[Unit]
Description=QuestDB Time-Series Database
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/lib/questdb
ExecStart=/usr/bin/questdb start
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable questdb
echo -e "${GREEN}  ✅ QuestDB service configured${NC}"

# Configure MongoDB
echo -e "\n${YELLOW}🗄️  Configuring MongoDB...${NC}"
sudo systemctl enable mongodb
sudo systemctl start mongodb

# Edit MongoDB config to bind to all interfaces for cross-machine access
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongodb.conf 2>/dev/null || true
sudo systemctl restart mongodb
echo -e "${GREEN}  ✅ MongoDB configured${NC}"

# Configure Redis
echo -e "\n${YELLOW}🗄️  Configuring Redis...${NC}"
sudo systemctl enable redis
sudo systemctl start redis

# Edit Redis config for persistence and cross-machine access
sudo sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf 2>/dev/null || true
sudo sed -i 's/# requirepass foobared/requirepass trading123/' /etc/redis/redis.conf 2>/dev/null || true
echo "appendonly yes" | sudo tee -a /etc/redis/redis.conf > /dev/null
sudo systemctl restart redis
echo -e "${GREEN}  ✅ Redis configured${NC}"

# Setup SSH for cross-machine communication
echo -e "\n${YELLOW}🔐 Configuring SSH...${NC}"
sudo systemctl enable sshd
sudo systemctl start sshd

if [ ! -f "$HOME/.ssh/id_rsa" ]; then
    ssh-keygen -t rsa -b 4096 -f $HOME/.ssh/id_rsa -N ""
    echo -e "${GREEN}  ✅ SSH key generated${NC}"
    echo -e "${YELLOW}  📋 Copy this public key to Windows machine:${NC}"
    cat $HOME/.ssh/id_rsa.pub
else
    echo -e "${GREEN}  ✅ SSH key already exists${NC}"
fi

# Create backup directories
echo -e "\n${YELLOW}📁 Creating backup directories...${NC}"
mkdir -p $HOME/backups/{questdb,mongodb,redis,models}
echo -e "${GREEN}  ✅ Backup directories created${NC}"

# Configure firewall
echo -e "\n${YELLOW}🔥 Configuring firewall...${NC}"
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=8812/tcp  # QuestDB
    sudo firewall-cmd --permanent --add-port=9000/tcp  # QuestDB UI
    sudo firewall-cmd --permanent --add-port=27017/tcp # MongoDB
    sudo firewall-cmd --permanent --add-port=6379/tcp  # Redis
    sudo firewall-cmd --permanent --add-port=22/tcp    # SSH
    sudo firewall-cmd --reload
    echo -e "${GREEN}  ✅ Firewall configured (firewalld)${NC}"
else
    echo -e "${YELLOW}  ⏭️  firewalld not found, skipping firewall configuration${NC}"
fi

echo -e "\n${BLUE}========================================"
echo -e "${GREEN}✅ ArchLinux setup complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Start databases: sudo systemctl start questdb mongodb redis"
echo -e "  2. Verify setup: bash ./scripts/verify-archlinux-env.sh"
echo -e "  3. Add Windows IP to /etc/hosts for easy access"
echo -e "  4. Copy SSH public key to Windows for passwordless access"
echo -e "  5. Start training: pnpm dev:arch"
echo ""
