# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Set the build-time variable for Vite
ARG VITE_API_URL=http://localhost:3001/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Poświadczenia panelu UI. Domyślne hasło jest wbudowane w client/src/auth;
# te argumenty pozwalają je nadpisać bez ruszania kodu.
# Hash: node scripts/ui-password-hash.cjs <login> <hasło>
ARG VITE_UI_USER=admin
ARG VITE_UI_PASSWORD_HASH=
ARG VITE_UI_IDLE_MINUTES=30
ENV VITE_UI_USER=$VITE_UI_USER
ENV VITE_UI_PASSWORD_HASH=$VITE_UI_PASSWORD_HASH
ENV VITE_UI_IDLE_MINUTES=$VITE_UI_IDLE_MINUTES


RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Add custom nginx config for SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
