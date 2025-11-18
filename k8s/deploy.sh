#!/bin/bash

# Apricode Exchange - Kubernetes Deployment Script
# This script deploys the entire application to Kubernetes

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install it first."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

check_secret() {
    log_info "Checking if secrets are configured..."
    
    if [ ! -f "base/secret.yaml" ]; then
        log_error "Secret file not found!"
        log_warning "Please create base/secret.yaml from base/secret.yaml.template"
        log_info "Run: cp base/secret.yaml.template base/secret.yaml"
        log_info "Then edit base/secret.yaml with your actual credentials"
        exit 1
    fi
    
    # Check if secret still has CHANGE_ME values
    if grep -q "CHANGE_ME" base/secret.yaml; then
        log_error "Secret file contains CHANGE_ME values!"
        log_warning "Please update base/secret.yaml with actual credentials"
        exit 1
    fi
    
    log_success "Secrets are configured"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    
    # Namespace
    log_info "Creating namespace..."
    kubectl apply -f base/namespace.yaml
    
    # ConfigMap
    log_info "Creating ConfigMap..."
    kubectl apply -f base/configmap.yaml
    
    # Secrets
    log_info "Creating Secrets..."
    kubectl apply -f base/secret.yaml
    
    # PostgreSQL
    log_info "Deploying PostgreSQL..."
    kubectl apply -f base/postgres.yaml
    
    # Redis
    log_info "Deploying Redis..."
    kubectl apply -f base/redis.yaml
    
    log_success "Infrastructure deployed"
}

wait_for_databases() {
    log_info "Waiting for databases to be ready..."
    
    log_info "Waiting for PostgreSQL..."
    kubectl wait --for=condition=ready pod -l app=postgres -n apricode-exchange --timeout=300s
    
    log_info "Waiting for Redis..."
    kubectl wait --for=condition=ready pod -l app=redis -n apricode-exchange --timeout=300s
    
    log_success "Databases are ready"
}

deploy_application() {
    log_info "Deploying application..."
    
    # Application Deployment
    log_info "Creating application deployment..."
    kubectl apply -f base/app-deployment.yaml
    
    # HPA
    log_info "Creating HPA (autoscaling)..."
    kubectl apply -f base/hpa.yaml
    
    # Ingress
    log_info "Creating Ingress..."
    kubectl apply -f base/ingress.yaml
    
    # CronJobs
    log_info "Creating CronJobs..."
    kubectl apply -f base/cronjobs.yaml
    
    log_success "Application deployed"
}

check_deployment() {
    log_info "Checking deployment status..."
    
    echo ""
    log_info "Pods:"
    kubectl get pods -n apricode-exchange
    
    echo ""
    log_info "Services:"
    kubectl get svc -n apricode-exchange
    
    echo ""
    log_info "Ingress:"
    kubectl get ingress -n apricode-exchange
    
    echo ""
    log_info "HPA:"
    kubectl get hpa -n apricode-exchange
}

show_logs() {
    echo ""
    log_info "Application logs (last 50 lines):"
    kubectl logs -n apricode-exchange deployment/apricode-app --tail=50 || true
}

show_next_steps() {
    echo ""
    echo "════════════════════════════════════════════════════════"
    log_success "Deployment completed!"
    echo "════════════════════════════════════════════════════════"
    echo ""
    log_info "Next steps:"
    echo ""
    echo "1. Check pod status:"
    echo "   kubectl get pods -n apricode-exchange"
    echo ""
    echo "2. View application logs:"
    echo "   kubectl logs -f deployment/apricode-app -n apricode-exchange"
    echo ""
    echo "3. Check ingress IP:"
    echo "   kubectl get ingress -n apricode-exchange"
    echo ""
    echo "4. Access application:"
    echo "   https://app.bitflow.biz (configure DNS first)"
    echo ""
    echo "5. Monitor with k9s (if installed):"
    echo "   k9s -n apricode-exchange"
    echo ""
    echo "════════════════════════════════════════════════════════"
}

# Main execution
main() {
    echo "════════════════════════════════════════════════════════"
    echo "   🚀 Apricode Exchange - Kubernetes Deployment"
    echo "════════════════════════════════════════════════════════"
    echo ""
    
    # Check if we're in the right directory
    if [ ! -f "base/namespace.yaml" ]; then
        log_error "Please run this script from the k8s/ directory"
        exit 1
    fi
    
    check_dependencies
    check_secret
    
    echo ""
    log_warning "This will deploy Apricode Exchange to your Kubernetes cluster"
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
    
    echo ""
    deploy_infrastructure
    wait_for_databases
    deploy_application
    
    echo ""
    log_info "Waiting for application to be ready..."
    sleep 10
    
    check_deployment
    show_logs
    show_next_steps
}

# Run main function
main

