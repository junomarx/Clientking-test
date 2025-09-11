# Docker Deployment Guide

This guide explains how to deploy the Handyshop Verwaltung application using Docker.

## Quick Start

### 1. Using Docker Compose (Recommended)

1. **Clone and configure:**
   ```bash
   git clone <your-repo>
   cd handyshop-verwaltung
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   ```bash
   # Configure your database and other settings
   DATABASE_URL=postgresql://handyshop:your_password@postgres:5432/handyshop
   SESSION_SECRET=your-very-secure-session-secret-here
   FRONTEND_URL=https://your-domain.com
   # ... other settings
   ```

3. **Deploy:**
   ```bash
   # For fresh installations, run migrations first
   docker-compose -f docker-compose.migration.yml up handyshop-migrate
   
   # Then start the application
   docker-compose up -d
   ```

4. **Access:** Your app will be available at `http://localhost:5000`

### 2. Using External Database

If you have an existing PostgreSQL database:

1. **Configure `.env`:**
   ```bash
   DATABASE_URL=postgresql://user:password@your-db-host:5432/database
   SESSION_SECRET=your-session-secret
   FRONTEND_URL=https://your-domain.com
   ```

2. **Deploy (app only):**
   ```bash
   docker-compose up handyshop-app -d
   ```

### 3. Using Docker Only

```bash
# Build the image
docker build -t handyshop-verwaltung .

# Run the container
docker run -d \
  --name handyshop-app \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e SESSION_SECRET="your-session-secret" \
  -e FRONTEND_URL="https://your-domain.com" \
  handyshop-verwaltung
```

## Configuration

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secure random string for session encryption
- `FRONTEND_URL`: Your app's public URL

### Optional Environment Variables

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email configuration
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`: Object storage configuration
- `PORT`: Server port (default: 5000)

## Production Deployment

### Using Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'
services:
  handyshop-app:
    image: handyshop-verwaltung:latest
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/handyshop
      - SESSION_SECRET_FILE=/run/secrets/session_secret
      - FRONTEND_URL=https://your-domain.com
    secrets:
      - session_secret
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

secrets:
  session_secret:
    external: true
```

Deploy with:
```bash
echo "your-session-secret" | docker secret create session_secret -
docker stack deploy -c docker-stack.yml handyshop
```

### Using Kubernetes

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: handyshop-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: handyshop-app
  template:
    metadata:
      labels:
        app: handyshop-app
    spec:
      containers:
      - name: handyshop-app
        image: handyshop-verwaltung:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: handyshop-secrets
              key: database-url
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: handyshop-secrets
              key: session-secret
        - name: FRONTEND_URL
          value: "https://your-domain.com"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: handyshop-service
spec:
  selector:
    app: handyshop-app
  ports:
  - port: 80
    targetPort: 5000
  type: LoadBalancer
```

## Monitoring and Logs

### View logs:
```bash
docker-compose logs -f handyshop-app
```

### Health check:
```bash
curl http://localhost:5000/api/health
```

### Database operations:
```bash
# Connect to database
docker-compose exec postgres psql -U handyshop -d handyshop

# Backup database
docker-compose exec postgres pg_dump -U handyshop handyshop > backup.sql

# Restore database
docker-compose exec -T postgres psql -U handyshop handyshop < backup.sql
```

## Troubleshooting

### Common Issues

1. **Database connection fails:**
   - Check `DATABASE_URL` format
   - Ensure database is accessible
   - Verify credentials

2. **App won't start:**
   - Check logs: `docker-compose logs handyshop-app`
   - Verify all required environment variables are set
   - Check disk space and memory

3. **Migration fails:**
   - Ensure `DATABASE_URL` is correctly formatted
   - Check migration logs: `docker-compose -f docker-compose.migration.yml logs handyshop-migrate`
   - Verify database is accessible and user has schema creation privileges

4. **Health check fails:**
   - App might be starting up (wait 30-60 seconds)
   - Check if port 5000 is accessible inside container
   - Review application logs

### Performance Optimization

1. **Use multi-stage builds** (already implemented)
2. **Resource limits:**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
       reservations:
         memory: 256M
   ```

3. **Enable HTTP/2 and compression** with reverse proxy (nginx, traefik)

## Security

1. **Use secrets for sensitive data:**
   - Never put passwords in docker-compose.yml
   - Use Docker secrets or Kubernetes secrets

2. **Run as non-root user** (already implemented)

3. **Use specific versions:**
   ```yaml
   image: handyshop-verwaltung:v1.2.3  # Instead of :latest
   ```

4. **Network security:**
   ```yaml
   networks:
     internal:
       driver: bridge
       internal: true  # No external access
   ```