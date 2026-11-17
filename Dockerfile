# 前端生产镜像：Vite 构建产物 + Nginx（Gzip / 静态缓存 / SPA history / HTTPS）
FROM node:22-alpine AS build

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# 自签证书只在演示环境使用；生产环境请把正式证书挂载到 /etc/nginx/certs 覆盖它
FROM nginx:1.27-alpine AS certs
RUN apk add --no-cache openssl \
 && mkdir -p /certs \
 && openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
      -keyout /certs/privkey.pem \
      -out /certs/fullchain.pem \
      -subj "/CN=localhost" \
      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

FROM nginx:1.27-alpine

COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=certs /certs /etc/nginx/certs
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443
