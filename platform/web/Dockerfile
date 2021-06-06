FROM node:14-alpine AS builder

WORKDIR /src
ENV NODE_ENV production

# Only copy package.json and package-lock.json so
# that npm install can be cached
COPY package.json package-lock.json ./

# Install NodeJS dependencies
RUN apk add --no-cache python3 make gcc g++ musl-dev git \
  && npm ci --production

COPY . .

RUN npm run proto \
  && npm run build

# Production container
FROM nginx:alpine

# Copy the built files
COPY --from=builder /src/build /usr/share/nginx/html
COPY ./docker/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
