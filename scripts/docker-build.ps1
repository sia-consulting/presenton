<#
.SYNOPSIS
    PowerShell script to build and run the Presenton Docker container.

.DESCRIPTION
    This script provides options to build the Docker image, run the container,
    or do both. It supports various configuration options through environment
    variables and command-line parameters.

.PARAMETER Build
    Build the Docker image.

.PARAMETER Run
    Run the Docker container.

.PARAMETER Service
    The docker-compose service to use. Options: production, production-gpu, development, development-gpu.
    Default: production

.PARAMETER Port
    The port to expose. Default: 5000

.PARAMETER EnableCodex
    Enable Codex OAuth support by also exposing port 1455.

.PARAMETER Detach
    Run the container in detached mode (background).

.PARAMETER GPU
    Enable GPU support (uses production-gpu or development-gpu service).

.PARAMETER Development
    Use development configuration.

.EXAMPLE
    .\docker-build.ps1 -Build
    Build the Docker image.

.EXAMPLE
    .\docker-build.ps1 -Run
    Run the Docker container.

.EXAMPLE
    .\docker-build.ps1 -Build -Run
    Build and then run the Docker container.

.EXAMPLE
    .\docker-build.ps1 -Run -GPU -EnableCodex
    Run the container with GPU support and Codex OAuth enabled.

.EXAMPLE
    .\docker-build.ps1 -Run -Development
    Run the development container.
#>

param(
    [switch]$Build,
    [switch]$Run,
    [string]$Service = "",
    [int]$Port = 5000,
    [switch]$EnableCodex,
    [switch]$Detach,
    [switch]$GPU,
    [switch]$Development
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Determine the service to use
if ($Service -eq "") {
    if ($Development) {
        $Service = if ($GPU) { "development-gpu" } else { "development" }
    } else {
        $Service = if ($GPU) { "production-gpu" } else { "production" }
    }
}

Write-Host "Presenton Docker Build Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    $null = docker --version
} catch {
    Write-Host "Error: Docker is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    $null = docker info 2>&1
} catch {
    Write-Host "Error: Docker daemon is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop." -ForegroundColor Yellow
    exit 1
}

# Navigate to the repository root (one level up from scripts directory)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

Write-Host "Working directory: $RepoRoot" -ForegroundColor Gray
Write-Host "Service: $Service" -ForegroundColor Gray
Write-Host ""

# Build function
function Build-Container {
    Write-Host "Building Docker image for service: $Service" -ForegroundColor Green
    Write-Host ""
    
    docker-compose build $Service
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Build completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# Run function
function Run-Container {
    Write-Host "Running Docker container for service: $Service" -ForegroundColor Green
    Write-Host "Port: $Port" -ForegroundColor Gray
    if ($EnableCodex) {
        Write-Host "Codex OAuth: Enabled (port 1455)" -ForegroundColor Gray
    }
    Write-Host ""
    
    # Build the docker-compose command
    $composeArgs = @("up")
    
    if ($Detach) {
        $composeArgs += "-d"
    }
    
    $composeArgs += $Service
    
    # Run docker-compose
    docker-compose @composeArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        if ($Detach) {
            Write-Host "Container started successfully in detached mode!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Access Presenton at: http://localhost:$Port" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "To view logs: docker-compose logs -f $Service" -ForegroundColor Gray
            Write-Host "To stop: docker-compose down" -ForegroundColor Gray
        } else {
            Write-Host "Container stopped." -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "Container run failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# Main logic
if (-not $Build -and -not $Run) {
    Write-Host "No action specified. Use -Build, -Run, or both." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Gray
    Write-Host "  .\docker-build.ps1 -Build              # Build the Docker image" -ForegroundColor Gray
    Write-Host "  .\docker-build.ps1 -Run                # Run the container" -ForegroundColor Gray
    Write-Host "  .\docker-build.ps1 -Build -Run         # Build and run" -ForegroundColor Gray
    Write-Host "  .\docker-build.ps1 -Run -GPU           # Run with GPU support" -ForegroundColor Gray
    Write-Host "  .\docker-build.ps1 -Run -Development   # Run development container" -ForegroundColor Gray
    Write-Host "  .\docker-build.ps1 -Run -Detach        # Run in background" -ForegroundColor Gray
    Write-Host "  .\docker-build.ps1 -Run -EnableCodex   # Run with Codex OAuth support" -ForegroundColor Gray
    exit 0
}

if ($Build) {
    Build-Container
}

if ($Run) {
    if ($Build) {
        Write-Host ""
    }
    Run-Container
}
