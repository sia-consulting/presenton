FROM python:3.11-slim-bookworm

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    nginx \
    curl \
    libreoffice \
    fontconfig \
    chromium \
    zstd


# Install Node.js 20 using NodeSource repository
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs


# Create a working directory
WORKDIR /app  

# Set environment variables
ENV APP_DATA_DIRECTORY=/app_data
ENV TEMP_DIRECTORY=/tmp/presenton
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium


# Install ollama (remove GPU libraries to reduce image size by several GB)
RUN curl -fsSL https://ollama.com/install.sh | sh && \
    rm -rf /usr/local/lib/ollama/cuda* /usr/local/lib/ollama/rocm*

# Install dependencies for FastAPI
RUN pip install alembic aiohttp aiomysql aiosqlite asyncpg fastapi[standard] \
    pathvalidate pdfplumber chromadb sqlmodel \
    anthropic google-genai openai fastmcp dirtyjson \
    opentelemetry-api opentelemetry-sdk \
    opentelemetry-instrumentation-fastapi opentelemetry-instrumentation-httpx \
    opentelemetry-instrumentation-sqlalchemy opentelemetry-instrumentation-logging \
    azure-monitor-opentelemetry-exporter
RUN pip install docling --extra-index-url https://download.pytorch.org/whl/cpu

# Install dependencies for Next.js
WORKDIR /app/servers/nextjs
COPY servers/nextjs/package.json servers/nextjs/package-lock.json ./
RUN npm install


# Copy Next.js app
COPY servers/nextjs/ /app/servers/nextjs/

# Before the Next.js build
ARG NEXT_PUBLIC_AZURE_AD_CLIENT_ID=""
ARG NEXT_PUBLIC_AZURE_AD_TENANT_ID=""

# Build the Next.js app
WORKDIR /app/servers/nextjs
RUN npm run build

WORKDIR /app

# Copy FastAPI
COPY servers/fastapi/ ./servers/fastapi/
COPY start.js LICENSE NOTICE ./

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose the port
EXPOSE 80

# Start the servers
CMD ["node", "/app/start.js"]