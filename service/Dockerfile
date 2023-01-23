FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn

COPY . .
RUN yarn build

EXPOSE 5001
CMD ["yarn", "start:prod"]
