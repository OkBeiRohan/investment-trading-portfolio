#!/bin/bash
# Development Mode - ArchLinux
# Starts ML training environment with GPU monitoring

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo -e "Starting Development Mode (ArchLinux)"
echo -e "========================================${NC}"
echo ""

# Check GPU availability
echo -e "${YELLOW}🎮 Checking GPU...${NC}"
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader
    echo -e "${GREEN}  ✅ GPU available${NC}"
else
    echo -e "${RED}  ❌ NVIDIA GPU not detected${NC}"
    echo -e "${YELLOW}     Training will use CPU (slower)${NC}"
fi

# Check Python virtual environment
ML_DIR="./apps/algo-worker/ml"
if [ -f "$ML_DIR/.venv/bin/activate" ]; then
    echo -e "\n${YELLOW}🐍 Activating Python virtual environment...${NC}"
    source $ML_DIR/.venv/bin/activate
    echo -e "${GREEN}  ✅ Virtual environment activated${NC}"
    
    # Verify PyTorch
    python -c "import torch; print(f'  PyTorch: {torch.__version__}'); print(f'  CUDA: {torch.cuda.is_available()}')"
else
    echo -e "\n${YELLOW}⚠️  Python virtual environment not found${NC}"
    echo -e "   Run: bash ./scripts/setup-archlinux-ml.sh"
fi

# Check databases
echo -e "\n${YELLOW}🗄️  Checking databases...${NC}"

systemctl is-active --quiet questdb && echo -e "${GREEN}  ✅ QuestDB running${NC}" || echo -e "${RED}  ❌ QuestDB not running${NC}"
systemctl is-active --quiet mongodb && echo -e "${GREEN}  ✅ MongoDB running${NC}" || echo -e "${RED}  ❌ MongoDB not running${NC}"
systemctl is-active --quiet redis && echo -e "${GREEN}  ✅ Redis running${NC}" || echo -e "${RED}  ❌ Redis not running${NC}"

# Start development
echo -e "\n${YELLOW}🚀 Starting training pipeline...${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • QuestDB UI:     http://localhost:9000"
echo -e "  • Algo Worker:    http://localhost:3001"
echo -e "  • GPU Monitor:    watch -n 1 nvidia-smi"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start Turborepo in dev mode for training pipeline
pnpm turbo dev --filter=training-pipeline --filter=algo-worker

echo -e "\n${GREEN}✅ Development servers stopped${NC}"
