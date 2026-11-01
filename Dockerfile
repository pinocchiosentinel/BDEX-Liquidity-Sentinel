FROM node:22-alpine
ENV NODE_ENV=production APP_ENV=testnet-deployment PORT=3000
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY contracts ./contracts
COPY docs ./docs
EXPOSE 3000
USER node
CMD ["npm", "start"]