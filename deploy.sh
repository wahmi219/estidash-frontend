#!/bin/bash

# ============================================
# EstiDash Frontend Quick Deploy Script
# Run this whenever you make code changes
# Environment variables fetched from SSM Parameter Store
# ============================================

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="200159633115"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPOSITORY="estidash-frontend"
IMAGE_TAG="${1:-latest}"
EC2_IP="54.221.4.168"
SSH_KEY="$HOME/.ssh/estihub-key.pem"
CONTAINER_NAME="estidash-frontend"
FRONTEND_PORT="3000"
SSM_PREFIX="/estihub/production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   EstiDash Frontend Deployment Script${NC}"
echo -e "${GREEN}   (Using SSM Parameter Store for config)${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Fetch Backend API URL from SSM (or use default)
# MSYS_NO_PATHCONV=1 prevents Git Bash on Windows from mangling the /estihub/... path
echo -e "${YELLOW}Fetching configuration from SSM...${NC}"
BACKEND_API_URL=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
    --name "${SSM_PREFIX}/FRONTEND_API_URL" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "https://estihub.nexlabai.com/api/v1")
echo -e "${GREEN}✓ Backend API URL: ${BACKEND_API_URL}${NC}"

# Step 1: Build Docker image
echo -e "${YELLOW}Step 1/4: Building Docker image...${NC}"
docker build \
    -f Dockerfile.production \
    -t ${ECR_REPOSITORY}:${IMAGE_TAG} \
    --build-arg NEXT_PUBLIC_API_URL="${BACKEND_API_URL}" \
    --platform linux/amd64 \
    .
echo -e "${GREEN}✓ Image built${NC}"

# Step 2: Login to ECR
echo -e "${YELLOW}Step 2/4: Authenticating to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${ECR_REGISTRY}
echo -e "${GREEN}✓ Logged in to ECR${NC}"

# Step 3: Create ECR repo if not exists, then push
echo -e "${YELLOW}Step 3/4: Pushing image to ECR...${NC}"
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} --no-cli-pager 2>/dev/null || \
    aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION} --no-cli-pager

docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
echo -e "${GREEN}✓ Image pushed to ECR${NC}"

# Step 4: Deploy to EC2
echo -e "${YELLOW}Step 4/4: Deploying to EC2...${NC}"
ssh -o StrictHostKeyChecking=no -i ${SSH_KEY} ec2-user@${EC2_IP} << 'ENDSSH'
    set -e
    
    AWS_REGION="us-east-1"
    ECR_REGISTRY="200159633115.dkr.ecr.us-east-1.amazonaws.com"
    ECR_REPOSITORY="estidash-frontend"
    IMAGE_TAG="latest"
    CONTAINER_NAME="estidash-frontend"
    FRONTEND_PORT="3000"
    
    echo "=== Logging into ECR ==="
    aws ecr get-login-password --region ${AWS_REGION} | \
        sudo docker login --username AWS --password-stdin ${ECR_REGISTRY}
    
    echo "=== Pulling latest image ==="
    sudo docker pull ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
    
    echo "=== Stopping existing container ==="
    sudo docker stop ${CONTAINER_NAME} 2>/dev/null || true
    sudo docker rm ${CONTAINER_NAME} 2>/dev/null || true
    
    echo "=== Starting new container ==="
    sudo docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${FRONTEND_PORT}:3000 \
        -e NODE_ENV=production \
        --log-driver=awslogs \
        --log-opt awslogs-region=us-east-1 \
        --log-opt awslogs-group=/estihub/frontend \
        --log-opt awslogs-stream=frontend-$(date +%Y%m%d) \
        --log-opt awslogs-create-group=true \
        ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
    
    echo "=== Waiting for startup ==="
    sleep 10
    
    echo "=== Container status ==="
    sudo docker ps | grep ${CONTAINER_NAME}
    
    echo "=== Container logs ==="
    sudo docker logs --tail 20 ${CONTAINER_NAME}
    
    echo "=== Cleanup old images ==="
    sudo docker image prune -f
ENDSSH

echo -e "${GREEN}✓ Deployed to EC2${NC}"

# Verify deployment
echo ""
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 5
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://${EC2_IP}:${FRONTEND_PORT}/ 2>/dev/null || echo "failed")

if [ "$HEALTH" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}   🎉 Deployment Successful!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "Frontend: ${GREEN}http://${EC2_IP}:${FRONTEND_PORT}${NC}"
    echo -e "Backend:  ${GREEN}http://${EC2_IP}:8000${NC}"
    echo -e "API Docs: ${GREEN}http://${EC2_IP}:8000/docs${NC}"
else
    echo -e "${YELLOW}⚠ Health check returned: $HEALTH. The app may still be starting.${NC}"
    echo "  Check logs: ssh -i ${SSH_KEY} ec2-user@${EC2_IP} 'sudo docker logs ${CONTAINER_NAME}'"
fi

echo ""

