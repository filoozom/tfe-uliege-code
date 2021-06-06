FROM node:14-alpine

WORKDIR /src
ENV NODE_ENV production

# Only copy package.json and package-lock.json so
# that npm install can be cached
COPY package.json package-lock.json ./

# Add dependencies to run and build npm packages
RUN apk add --no-cache libc6-compat \
  && ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2 \
  && apk add --no-cache --virtual .build-deps python3 make gcc g++ musl-dev \
  && npm ci --production \
  && apk del .build-deps

COPY . .

# Generate the Protocol Buffers code
RUN npm run proto

# Default ports
EXPOSE 12300 23400 34500

ENTRYPOINT ["node", "index.js"]
