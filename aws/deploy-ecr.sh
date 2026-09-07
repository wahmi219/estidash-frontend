#!/bin/bash

# ============================================
# AWS ECR Deployment Script for EstiDash Frontend
# Builds and pushes Docker image to ECR
# ============================================

set -e

# Configuration - Update these values
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REPOSITORY="${ECR_REPOSITORY:-estidash-frontend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.production}"

# Backend API URL for the frontend to connect to
BACKEND_API_URL="${BACKEND_API_URL:-http://54.221.4.168:8000/api/v1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   EstiDash Frontend ECR Deployment Script${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Validate AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Validate Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Get AWS Account ID if not set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Error: Could not get AWS Account ID. Check AWS credentials.${NC}"
    exit 1
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  AWS Region:       $AWS_REGION"
echo "  AWS Account:      $AWS_ACCOUNT_ID"
echo "  ECR Repository:   $ECR_REPOSITORY"
echo "  Image Tag:        $IMAGE_TAG"
echo "  Image URI:        $IMAGE_URI"
echo "  Backend API URL:  $BACKEND_API_URL"
echo ""

# Step 1: Create ECR repository if it doesn't exist
echo -e "${YELLOW}Step 1: Checking ECR repository...${NC}"
if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" &> /dev/null; then
    echo "Creating ECR repository: $ECR_REPOSITORY"
    aws ecr create-repository \
        --repository-name "$ECR_REPOSITORY" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 \
        --tags Key=Project,Value=EstiDash Key=Environment,Value=production
    echo -e "${GREEN}✓ Repository created${NC}"
else
    echo -e "${GREEN}✓ Repository already exists${NC}"
fi

# Step 2: Authenticate Docker to ECR
echo -e "${YELLOW}Step 2: Authenticating Docker to ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$ECR_REGISTRY"
echo -e "${GREEN}✓ Docker authenticated to ECR${NC}"

# Step 3: Build Docker image
echo -e "${YELLOW}Step 3: Building Docker image...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

docker build \
    -t "$ECR_REPOSITORY:$IMAGE_TAG" \
    -f "$DOCKERFILE" \
    --build-arg NEXT_PUBLIC_API_URL="$BACKEND_API_URL" \
    --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
    --platform linux/amd64 \
    .

echo -e "${GREEN}✓ Docker image built${NC}"

# Step 4: Tag image for ECR
echo -e "${YELLOW}Step 4: Tagging image for ECR...${NC}"
docker tag "$ECR_REPOSITORY:$IMAGE_TAG" "$IMAGE_URI"
echo -e "${GREEN}✓ Image tagged: $IMAGE_URI${NC}"

# Step 5: Push image to ECR
echo -e "${YELLOW}Step 5: Pushing image to ECR...${NC}"
docker push "$IMAGE_URI"
echo -e "${GREEN}✓ Image pushed to ECR${NC}"

# Step 6: Output image digest
echo ""
echo -e "${YELLOW}Step 6: Getting image digest...${NC}"
IMAGE_DIGEST=$(aws ecr describe-images \
    --repository-name "$ECR_REPOSITORY" \
    --region "$AWS_REGION" \
    --image-ids imageTag="$IMAGE_TAG" \
    --query 'imageDetails[0].imageDigest' \
    --output text)

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   ECR Push Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Image URI:    ${GREEN}$IMAGE_URI${NC}"
echo -e "Image Digest: ${GREEN}$IMAGE_DIGEST${NC}"
echo ""
echo "To deploy to EC2, run:"
echo "  ./aws/deploy-ec2.sh"
echo ""
