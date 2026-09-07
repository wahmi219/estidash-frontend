#!/bin/bash

# ============================================
# AWS EC2 Deployment Script for EstiDash Frontend
# Deploys container from ECR to EC2 instance
# ============================================

set -e

# Configuration - Update these values
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REPOSITORY="${ECR_REPOSITORY:-estidash-frontend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
EC2_IP="${EC2_IP:-54.221.4.168}"  # Same EC2 as backend, or use a different one
SSH_KEY="${SSH_KEY:-$HOME/.ssh/estihub-key.pem}"
CONTAINER_NAME="estidash-frontend"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# Backend API URL (should match what was used during build)
BACKEND_API_URL="${BACKEND_API_URL:-http://54.221.4.168:8000/api/v1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   EstiDash Frontend EC2 Deployment Script${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ec2-ip)
            EC2_IP="$2"
            shift 2
            ;;
        --ssh-key)
            SSH_KEY="$2"
            shift 2
            ;;
        --port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  EC2 IP:         $EC2_IP"
echo "  Image URI:      $IMAGE_URI"
echo "  Container Name: $CONTAINER_NAME"
echo "  Frontend Port:  $FRONTEND_PORT"
echo "  Backend API:    $BACKEND_API_URL"
echo ""

# Deploy to EC2 via SSH
echo -e "${YELLOW}Deploying to EC2...${NC}"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ec2-user@"$EC2_IP" << ENDSSH
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | \
        sudo docker login --username AWS --password-stdin ${ECR_REGISTRY}
    
    # Pull latest image
    echo "Pulling image: ${IMAGE_URI}"
    sudo docker pull ${IMAGE_URI}
    
    # Stop and remove existing container
    echo "Stopping existing container..."
    sudo docker stop ${CONTAINER_NAME} 2>/dev/null || true
    sudo docker rm ${CONTAINER_NAME} 2>/dev/null || true
    
    # Run new container
    echo "Starting new container..."
    sudo docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${FRONTEND_PORT}:3000 \
        -e NODE_ENV=production \
        -e NEXT_PUBLIC_API_URL="${BACKEND_API_URL}" \
        ${IMAGE_URI}
    
    # Wait and verify
    sleep 10
    sudo docker ps | grep ${CONTAINER_NAME}
    
    # Show logs
    echo "Container logs:"
    sudo docker logs --tail 20 ${CONTAINER_NAME}
    
    # Cleanup old images
    sudo docker image prune -f
ENDSSH

echo -e "${GREEN}✓ Deployed to EC2${NC}"

# Verify deployment
echo ""
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 5
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://${EC2_IP}:${FRONTEND_PORT}/ 2>/dev/null || echo "failed")

if [ "$HEALTH" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP 200)${NC}"
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}   🎉 Deployment Successful!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "Frontend: ${GREEN}http://${EC2_IP}:${FRONTEND_PORT}${NC}"
    echo -e "Backend:  ${GREEN}http://${EC2_IP}:8000${NC}"
    echo -e "API Docs: ${GREEN}http://${EC2_IP}:8000/docs${NC}"
else
    echo -e "${YELLOW}⚠ Health check returned: $HEALTH${NC}"
    echo "The app might still be starting up. Check logs:"
    echo "  ssh -i ${SSH_KEY} ec2-user@${EC2_IP} 'sudo docker logs ${CONTAINER_NAME}'"
fi

echo ""
