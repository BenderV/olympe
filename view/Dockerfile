# PROD

# build stage
FROM node:14 as build-stage
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn
COPY . .

# # add `/usr/src/app/node_modules/.bin` to $PATH
# ENV PATH /usr/src/app/node_modules/.bin:$PATH
RUN yarn build

# production stage
FROM nginx:stable-alpine as production-stage
COPY nginx/nginx.conf /temp/prod.conf
RUN envsubst /app < /temp/prod.conf > /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
