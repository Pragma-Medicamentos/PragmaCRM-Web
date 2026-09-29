# Imagen del dashboard: node compila, nginx sirve el estatico.
# Dokploy construye esto desde git. Ver README seccion "Despliegue".

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Las VITE_* se hornean en el bundle al compilar, asi que tienen que llegar
# como build args. Cambiar cualquiera de estas obliga a un redeploy.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG VITE_API_KEY
ARG VITE_UPLOAD_MAX_FILE_SIZE_MB=100
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL \
    VITE_API_KEY=$VITE_API_KEY \
    VITE_UPLOAD_MAX_FILE_SIZE_MB=$VITE_UPLOAD_MAX_FILE_SIZE_MB \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Sin este chequeo el build "funciona" y sale un bundle apuntando a
# localhost:3000 que solo se descubre abriendo el sitio en el navegador.
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
 && test -n "$VITE_API_URL" && test -n "$VITE_API_KEY" \
 || (echo "ERROR: faltan build args VITE_*. Ver README seccion Despliegue." && exit 1)

RUN npm run build


FROM nginx:1.27-alpine AS runtime

# Un ARG no cruza el FROM: hay que redeclarar los dos que la CSP necesita.
ARG VITE_SUPABASE_URL
ARG VITE_API_URL

# Origenes a los que el navegador tiene permitido hacer fetch (connect-src).
ENV CSP_CONNECT_SRC="$VITE_SUPABASE_URL $VITE_API_URL"

# El entrypoint de la imagen oficial corre envsubst sobre /etc/nginx/templates.
# Sin el filtro tambien vaciaria $uri, $host y demas variables de nginx.
ENV NGINX_ENVSUBST_FILTER=CSP_

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
