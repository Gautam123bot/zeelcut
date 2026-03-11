FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# RUN npm 
RUN npm install

COPY . .

RUN npm run build

# Expose port
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]