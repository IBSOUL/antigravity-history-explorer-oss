# Build stage
FROM node:20-slim as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage
FROM nginx:alpine
# Copia o build
COPY --from=builder /app/dist /usr/share/nginx/html
# Configura porta padrão
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
