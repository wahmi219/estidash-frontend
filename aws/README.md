# EstiDash Frontend AWS Deployment

This directory contains scripts for deploying the EstiDash Next.js frontend to AWS.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          AWS EC2 Instance                         │
│                        (54.221.4.168)                            │
│                                                                   │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐  │
│  │  estidash-frontend      │    │   estihub-backend           │  │
│  │  (Port 3000)            │───▶│   (Port 8000)               │  │
│  │  Next.js App            │    │   FastAPI App               │  │
│  └─────────────────────────┘    └─────────────────────────────┘  │
│                                              │                    │
└──────────────────────────────────────────────│────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │  AWS RDS         │
                                    │  PostgreSQL      │
                                    └──────────────────┘
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Docker** installed and running
3. **SSH Key** (`~/.ssh/estihub-key.pem`) with access to EC2 instance
4. **EC2 Security Group** should allow:
   - Port 3000 (frontend)
   - Port 8000 (backend)
   - Port 22 (SSH)

## Quick Deploy

The fastest way to deploy after making code changes:

```bash
# From the web directory
./deploy.sh
```

This will:
1. Build the Docker image with the backend API URL baked in
2. Push to ECR
3. Deploy to EC2
4. Verify the deployment

## Step-by-Step Deployment

### Step 1: Push to ECR

```bash
./aws/deploy-ecr.sh
```

This creates the ECR repository (if needed) and pushes the image.

### Step 2: Deploy to EC2

```bash
./aws/deploy-ec2.sh
```

This pulls the image on EC2 and runs the container.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://54.221.4.168:8000/api/v1` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCOUNT_ID` | AWS account ID | Auto-detected |
| `EC2_IP` | EC2 instance IP | `54.221.4.168` |
| `FRONTEND_PORT` | Port for frontend | `3000` |

### Customizing Deployment

```bash
# Deploy with custom settings
BACKEND_API_URL="http://my-api.com/api/v1" \
EC2_IP="1.2.3.4" \
./deploy.sh
```

## Troubleshooting

### Check container logs

```bash
ssh -i ~/.ssh/estihub-key.pem ec2-user@54.221.4.168 'sudo docker logs estidash-frontend'
```

### Check if containers are running

```bash
ssh -i ~/.ssh/estihub-key.pem ec2-user@54.221.4.168 'sudo docker ps'
```

### Restart containers

```bash
ssh -i ~/.ssh/estihub-key.pem ec2-user@54.221.4.168 'sudo docker restart estidash-frontend'
```

### View both frontend and backend

```bash
# Frontend
curl http://54.221.4.168:3000/

# Backend health
curl http://54.221.4.168:8000/health

# Backend API docs
open http://54.221.4.168:8000/docs
```

## URLs

After successful deployment:

- **Frontend**: http://54.221.4.168:3000
- **Backend API**: http://54.221.4.168:8000
- **API Docs**: http://54.221.4.168:8000/docs
