FROM node:14-alpine

WORKDIR /src
ENV NODE_ENV production

# Only copy package.json and package-lock.json so
# that npm install can be cached
COPY package.json package-lock.json ./

# Install NodeJS dependencies
RUN npm ci --production

COPY . .

ENTRYPOINT ["node", "index.js"]
