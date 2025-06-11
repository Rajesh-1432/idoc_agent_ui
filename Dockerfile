FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm run build

FROM node:20-alpine
RUN npm install  -g serve
COPY --from=build /app/dist /app
WORKDIR /app
EXPOSE 3000
CMD ["serve", "-s", ".", "-l", "3004"]