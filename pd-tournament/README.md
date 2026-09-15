# Torneo del Dilema del Prisionero

Aplicación web para jugar un torneo del **Dilema del Prisionero iterado** entre
un grupo de amigos, en tiempo real y sin necesidad de cuentas: se crea una
sala, se comparte un código o enlace corto, y se juega desde el móvil.

El proyecto tiene dos partes independientes:

```
pd-tournament/
├── server/   # Node.js + Express + Socket.IO — estado del torneo en memoria
└── client/   # React + Vite — interfaz, estilo ilustración editorial
```

No hay base de datos: el estado de cada sala vive en memoria del servidor
mientras dura la sesión, tal y como pide un torneo casual entre amigos.

## Cómo funciona (resumen del flujo)

1. Alguien crea una sala y recibe un código corto (`AB3F9`) y un enlace
   (`/room/AB3F9`) para compartir por WhatsApp.
2. El resto se une con el código/enlace, elige nombre y avatar, y espera en
   la sala.
3. El anfitrión configura el torneo (rondas aleatorias u ocultas — por
   defecto entre 5 y 8 para evitar el problema de la "última ronda
   conocida" —, matriz de puntuación, tiempo por decisión, ruido de
   comunicación) y lo inicia.
4. El servidor decide automáticamente el formato:
   - **2–6 jugadores**: liga todos-contra-todos.
   - **7+ jugadores**: grupos de 4–5 + eliminatorias entre los mejores de
     cada grupo, para que nadie juegue más de ~5-7 partidas.
5. Antes de cada partida hay una fase de "fanfarronería" (mensajes de
   intención no vinculantes) y luego se juega ronda a ronda, con revelado
   simultáneo animado.
6. Quien no está jugando puede ver en directo cualquier partida en curso
   (modo espectador).
7. Al terminar, hay un podio y una tarjeta descargable estilo "Wrapped" por
   jugador, con apodos inspirados en las categorías de Axelrod (más noble,
   más indulgente, más justiciero/a, más impredecible) además de las
   estadísticas simples (más traidor/a, más cooperador/a, mejor racha).

La lógica de emparejamientos (`server/src/tournament.js`) y la de una
partida (`server/src/game.js`) están separadas del resto para poder añadir
otras variantes de teoría de juegos más adelante sin tocar la capa de
sockets.

## Requisitos

- Node.js 18 o superior
- npm

## Desarrollo local

Se necesitan dos terminales (servidor y cliente).

### 1. Servidor

```bash
cd pd-tournament/server
npm install
cp .env.example .env   # opcional, los valores por defecto ya sirven en local
npm run dev
```

El servidor arranca en `http://localhost:4000` (configurable con `PORT`).

Puedes comprobar que la lógica del torneo funciona de extremo a extremo sin
abrir el navegador con:

```bash
npm run smoke-test              # simula un torneo de 4 jugadores por socket
E2E_N=9 npm run smoke-test      # simula uno de 9 (fase de grupos + bracket)
```

### 2. Cliente

```bash
cd pd-tournament/client
npm install
cp .env.example .env   # ajusta VITE_SERVER_URL si el servidor no está en localhost:4000
npm run dev
```

Abre `http://localhost:5173`, crea una sala y comparte el enlace con otras
pestañas/dispositivos en tu misma red (usando tu IP local en lugar de
`localhost` si pruebas desde el móvil).

## Desplegar para compartir con tus amigos

Necesitas desplegar el servidor (soporta WebSockets) y el cliente (estático)
por separado.

### Servidor → Render (o cualquier host con Node persistente)

1. Crea un nuevo **Web Service** en [Render](https://render.com) apuntando a
   este repositorio, con **Root Directory** = `pd-tournament/server`.
2. Build command: `npm install` — Start command: `npm start`.
3. Variables de entorno:
   - `CLIENT_ORIGIN` → la URL pública de tu cliente (p. ej.
     `https://tu-torneo.vercel.app`). Puedes poner varias separadas por coma.
   - `PORT` la define Render automáticamente.
4. Despliega y copia la URL pública (`https://tu-servidor.onrender.com`).

Cualquier otro proveedor que ejecute un proceso Node de larga duración con
WebSockets (Railway, Fly.io, un VPS con PM2…) sirve igual: el servidor es un
`server.listen()` estándar de Express + Socket.IO.

### Cliente → Vercel (recomendado)

1. Importa el repositorio en [Vercel](https://vercel.com) con **Root
   Directory** = `pd-tournament/client` (framework preset: Vite).
2. Variable de entorno `VITE_SERVER_URL` → la URL del servidor desplegado en
   el paso anterior.
3. Despliega. Vercel gestiona automáticamente que cualquier ruta (incluidas
   `/room/AB3F9`) sirva `index.html`, necesario para el enrutado del lado
   del cliente.
4. Comparte la URL de Vercel — ese es el enlace que se manda por WhatsApp.

### Alternativa: publicar el cliente en GitHub Pages

Este repositorio ya es un sitio de GitHub Pages, así que también puedes
compilar el cliente ahí (en una subruta, sin tocar el resto del sitio):

```bash
cd pd-tournament/client
npm run build -- --base=/pd-tournament/
```

Sube el contenido de `dist/` a una carpeta `pd-tournament/` servida por
Pages. Como Pages no reescribe rutas desconocidas hacia `index.html`,
copiar `dist/index.html` también como `dist/404.html` antes de subirlo hace
que las URLs tipo `/pd-tournament/room/AB3F9` sigan funcionando al recargar
o compartirse directamente. Vercel evita tener que hacer este ajuste, por
eso es la opción recomendada.

## Configuración disponible para el anfitrión

- **Duración del enfrentamiento**: aleatoria y oculta (rango configurable,
  por defecto 5–8 rondas) o fija y conocida por todos.
- **Matriz de puntuación**: editable para cada combinación de
  cooperar/traicionar.
- **Tiempo por decisión** y **tiempo de fanfarronería** antes de cada
  partida.
- **Ruido de comunicación**: con una probabilidad configurable, una
  decisión se invierte antes de anotarse, simulando un malentendido. Se
  avisa a los jugadores de que está activo, pero no cuándo ocurre.

## Notas de diseño

- Sin cuentas: cada jugador tiene un `sessionToken` guardado en
  `localStorage` por sala, que permite reconectar sin perder el sitio en el
  torneo si se recarga la página o se pierde la conexión a mitad de
  partida.
- Las eliminatorias no permiten empates: si una partida de bracket termina
  en tablas, se juega una ronda extra de "muerte súbita" hasta que haya
  ganador/a.
- El estilo visual sigue la línea editorial de TED-Ed pero con paleta fría
  (azul petróleo, pizarra, verde azulado sobre hueso), con textura de grano
  sutil, contorno fino y transiciones suaves en vez de efectos "gamer".
