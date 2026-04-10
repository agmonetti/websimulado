# ETAPA 1: Construcción (Usamos Node para compilar Vite/React)
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ETAPA 2: Producción (Usamos Nginx para servir la web compilada)
FROM nginx:alpine
# Copiamos la web ya compilada
COPY --from=build /app/dist /usr/share/nginx/html
# Reemplazamos la config de Nginx por la nuestra (el archivo de arriba)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]