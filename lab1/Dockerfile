# Frontend dependencies
FROM node:22.23.3-alpine3.24 AS frontend-deps

WORKDIR /app/frontend

COPY lab11/package*.json ./
RUN npm ci --legacy-peer-deps


# Frontend build
FROM node:22.23.3-alpine3.24 AS frontend-build

WORKDIR /app/frontend

COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY lab11/ ./

ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build


# Backend dependencies
FROM node:22.23.3-alpine3.24 AS backend-deps

WORKDIR /app/backend

COPY backend_lab11/package*.json ./
RUN npm ci --omit=dev


# Production
FROM node:22.23.3-alpine3.24 AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5002

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend_lab11/ ./backend/
COPY --from=frontend-build /app/frontend/build ./frontend/build

USER node

EXPOSE 5002

CMD ["node", "backend/server.js"]