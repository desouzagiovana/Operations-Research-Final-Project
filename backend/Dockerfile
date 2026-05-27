
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Instala as dependências do projeto
RUN npm install

# Copia o restante do código do back-end
COPY . .

# Expõe a porta padrão do NestJS
EXPOSE 3000

# Comando para rodar em modo de desenvolvimento 
CMD ["npm", "run", "start:dev"]