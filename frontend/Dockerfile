FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expõe a porta padrão do Vite
EXPOSE 5173

# Comando para rodar o servidor de desenvolvimento do Vite
CMD ["npm", "run", "dev", "--", "--host"]