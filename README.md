# Dockerize express app

Este repositorio es un recurso del tutorial de [Despliegue de Aplicaciones con Docker Compose](), donde se encuentra la base teórica. En este tutorial seguiremos un ejemplo práctico que tiene como resultado una aplicación web con express contenerizada.

### 1. Aplicaciones de ejemplo
Para este ejemplo vamos a utilizar dos aplicaciones de ejemplo:
- `Servidor web`: Una API REST, en nodejs, que nos permite consultar el estado de una base de datos de coches.
- `Base de datos`: Una base de datos MySQL que contiene la tabla con información sobre coches.

Dentro de este repositorio, tenemos un servidor en express que maneja la base de datos mencionada. La implementación de este servidor no es importante, lo que sí es importante es el uso de variables de entorno en lugar de variables fijas:
```javascript	
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'cars'
});
```
El nombre de estas variables de entorno es importante ya que deben coincidir en la definición del parámetro `environment` del fichero, en el fichero `docker-compose.yml`.

Por otro lado, tenemos un contenedor de base de datos MySQL que debe contener una base de datos `cars` y una tabla `cars` con los siguientes campos:
- `id`: Clave primaria de tipo entero
- `name`: Nombre del coche
- `model`: Modelo del coche
- `price`: Precio del coche

Para ello, al dockerizar la aplicación necesitaremos un fichero `SQL` que sirva de entrypoint. Este fichero contendrá la creación de la base de la tabla coches y la configuración inicial de la BBDD:
```sql
-- Creación de base de datos (si no existe)
CREATE DATABASE IF NOT EXISTS cars;
USE cars;

-- Creación de la tabla cars
CREATE TABLE IF NOT EXISTS cars (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  PRIMARY KEY (id)
);

-- Carga inicial de la aplicación
INSERT INTO cars (name, model, price) VALUES
('Audi', 'A4', 30000),
('BMW', 'X5', 50000),
('Mercedes', 'C200', 40000);
```

Si no seguir el proceso de creación de imágenes docker podéis utilizar la imágen pública `nicolaemolnar/dockerize-node` para el servidor web y `mysql:5.7` para la base de datos, y pasar directamente al paso 4.

### 2. Contenerización con Docker
Ahora que ya tenemos la aplicación lista para desplegar, necesitamos crear las imágenes que contengan, por separado, el servicio web y la base de datos. Para ello, vamos a crear un fichero `Dockerfile` para cada servicio.

Para dockerizar el servicio web, creamos un fichero `Dockerfile` en el directorio `dockerizeNode` con el siguiente contenido:
```dockerfile
FROM node:12.18.3-alpine3.9
WORKDIR /app
COPY src/ /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```
Con el que copiaremos el código fuente de la carpeta `src` al contenedor, instalaremos sus depencias y ejecutaremos el servicio web. Ya tenemos listo el Dockerfile, ahora sólo necesitamos crear la imagen con el comando:
```bash
docker build -t dockerize-node .
```
Donde el parámetro `-t` define el tag de la imagen, que nos sirve a nosotros y a otros contenedores para identificar la imagen que hemos creado. En el ejemplo, el `.` se refiere a la ruta actual, si quisieramos utilizar algún otro directorio, deberíamos indicar su ruta.

Podemos comprobar que la imagen se ha creado correctamente con el comando:
```bash
docker images
```

Por otro lado, para dockerizar la base de datos, no es necesaria una imagen Docker personalizada, ya que con la imagen `mysql:5.7` podemos desplegar la base de datos, definiendo las variables de entorno necesarias. Esto lo haremos en el paso 4.

### 3. Subir imagenes a un registro
Ahora que ya tenemos creada la imagen en nuestro equipo, necesitamos subirla a un registro para poder desplegarla en un servidor. Para ello, vamos a utilizar el registro de Docker Hub, que es un registro público de imágenes Docker.

Necesitamos crear una cuenta en [Docker Hub](https://hub.docker.com/) y crear un repositorio público en la sección [Repositories](https://hub.docker.com/repositories) con el nombre `dockerize-node`.

Una vez creado el repositorio, podemos subir la imagen a Docker Hub con el comando:
```bash
docker tag dockerize-node <username>/dockerize-node
docker push <username>/dockerize-node
```
Donde `<username>` corresponde a vuestro nombre de usuario de DockerHub o el registro utilizado. Sin embargo, antes de ejecutar el comando `docker push`, necesitamos iniciar sesión en Docker Hub con el comando:
```bash
docker login
```
Que nos solicitará el nombre de usuario y contraseña con los que nos hemos registrado en la plataforma. Una vez logados, en mi caso, ejecuto:
```bash
docker tag dockerize-node nicolaemolnar/dockerize-node
docker push nicolaemolnar/dockerize-node
```
Y ya tenemos la imagen subida a Docker Hub. Si no especificamos ninguna etiqueta en los comandos anteriores, se establece la etiqueta `latest`, pero podemos versionar nuestras imágenes con los comandos:
```bash
docker tag dockerize-node <username>/dockerize-node:<version>
docker push <username>/dockerize-node:<version>
```

### 4. Fichero de despliegue
Llegados a este punto tenemos todas las imágenes necesarias en el registro y podemos desplegarlas con docker-compose. Para ello, vamos a crear un fichero `docker-compose.yml` en el directorio `dockerizeNode` con el siguiente contenido:
```yaml
version: '3.7'
services:
  web:
    image: nicolaemolnar/dockerize-node
    ports:
      - 3000:3000
    environment:
      DB_HOST: db
      DB_USER: admin
      DB_PASSWORD: 1234
      DB_NAME: cars
    networks:
      - backend
  db:
    image: mysql:5.7
    ports:
      - 3306:3306
    environment:
      MYSQL_ROOT_PASSWORD: 1234
      MYSQL_DATABASE: cars
      MYSQL_USER: admin
      MYSQL_PASSWORD: 1234
    volumes:
      - ./db/entrypoint.sql:/docker-entrypoint-initdb.d/entrypoint.sql
    networks:
      - backend
networks:
  backend:
    driver: bridge
```
Este fichero define dos servicios, uno para el servicio web y otro para la base de datos. En el servicio web, definimos la imagen que vamos a utilizar, las variables de entorno necesarias para la conexión con la base de datos y el puerto que va a exponer al host. 

Por otro lado, en el servicio de la base de datos, definimos la imagen que vamos a utilizar, las variables de entorno necesarias para la creación de la base de datos y el puerto que va a utilizar. Además, definimos un volumen que contiene el fichero `entrypoint.sql` que creamos en el paso 1. Este fichero se ejecutará automáticamente al iniciar el contenedor de la base de datos y creará la base de datos y la tabla necesarias.

Por último, definimos una red interna para que los contenedores puedan comunicarse entre ellos. Observa que la variable de entorno `DB_HOST` del servicio `web` tiene un nombre y no una dirección IP. Esto se debe a que Docker crea un DNS interno para que los contenedores puedan comunicarse entre ellos utilizando los nombres de los servicios definidos en el fichero `docker-compose.yml`, evitando tener que ir cambiando las direcciones IP cada vez que se crea un nuevo contenedor.

### 6. Despliegue
Para desplegar la aplicación, sólo necesitamos ejecutar el comando:
```bash
docker-compose up -d
```
> NOTA: Si la imagen `mysql:5.7` no existe en nuestro equipo este comando tardará más de lo normal ya que tiene que descargar la imagen del registro.

Y si todo ha ido bien, ya podemos acceder a la aplicación en el puerto 3000 de nuestro servidor. Para comprobar que todo funciona correctamente, podemos ejecutar el comando:
```bash
docker-compose ps
```
Que nos mostrará los contenedores que se han creado y su estado.

Para utilizar nuestra nueva aplicación podemos utilizar el comando `curl` o [Postman](https://www.postman.com/). Por ejemplo, podemos usar `curl` para enumerar todos los coches:
```bash
curl localhost:3000/api/cars
```
Obtener sólo uno:
```bash
curl localhost:3000/api/cars/1
```
Y crear uno nuevo por el verbo `POST`:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"name":"Ford","model":"Focus","price":15000}' localhost:3000/api/cars
```
Por último, para finalizar el despliegue, ejecutamos el comando:
```bash
docker-compose down
```