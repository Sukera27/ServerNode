import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import fetch from 'node-fetch';

const port = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST'],
}));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

const users = {}; // Mapeo de userId a socketId

io.on('connection', (socket) => {
  console.log('Â¡Un usuario se ha conectado!');

  // Registrar usuario con ID del query
  const userId = socket.handshake.query.userId;
  users[userId] = socket.id;
  console.log(`Usuario ${userId} conectado con el socket ID ${socket.id}`);

  socket.on('disconnect', () => {
    for (const key in users) {
      if (users[key] === socket.id) {
        delete users[key];
        console.log(`Usuario ${key} se ha desconectado`);
        break;
      }
    }
  });

  // Unirse a una sala
  socket.on('join room', ({ senderId, receiverId }) => {
    const roomId = [senderId, receiverId].sort().join('_');
    socket.join(roomId);
    console.log(`Usuario ${senderId} se ha unido a la sala ${roomId}`);
  });

  socket.on('private message', async ({ senderId, receiverId, message }) => {
    console.log(`Mensaje recibido de ${senderId} para ${receiverId}: ${message}`);
    
    // Guardar el mensaje en el microservicio
    try {
      const response = await fetch('http://localhost:8082/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJmYXZvcml0ZUNvbG9yIjoibmF2eSIsInVzZXJJZCI6MiwidXNlcm5hbWUiOiJwYWJsbzEiLCJzdWIiOiJwYWJsbzEiLCJpYXQiOjE3MTYzMDkyNzIsImV4cCI6MTcxNjkxNDA3Mn0.VtQetEclWxk7NqGR09T7lXWyQrAUVi5pzawWi7Cnesw',
        },
        body: JSON.stringify({ contenido: message, destinatarioId: receiverId, userId: senderId }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el mensaje');
      }

      const savedMessage = await response.json();

      const roomId = [senderId, receiverId].sort().join('_');
      io.to(roomId).emit('private message', { senderId, message });
      
    } catch (e) {
      console.error('Error al guardar el mensaje:', e.message);
    }
  });
});

app.use(logger('dev'));

server.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});



/*
import express from 'express'
import logger from 'morgan'
import { Server } from 'socket.io'
import { createServer } from 'http'
import mysql from 'mysql2'
import cors from 'cors'
import fetch from 'node-fetch'

const port = process.env.Port ?? 3000

const app = express()
const server = createServer(app)

// Configuración de CORS para Express
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST'],
}));



// Configuración de CORS para Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

async function getUserIdFromSocket(socket) {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJmYXZvcml0ZUNvbG9yIjoibmF2eSIsInVzZXJJZCI6MiwidXNlcm5hbWUiOiJwYWJsbzEiLCJzdWIiOiJwYWJsbzEiLCJpYXQiOjE3MTU4OTQ5NTAsImV4cCI6MTcxNjQ5OTc1MH0.qATeRTUUPpP-WOzNbuZzhe-RAvyikgPF5df-VgC99w8");

  const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow"
  };

  try {
      const response = await fetch(`http://localhost:8080/api/users/idBySocket/${socket}`, requestOptions);
      const result = await response.text();
      return result;
  } catch (error) {
      console.error(error);
      return null;
  }
}


io.on('connection', async (socket) => {
  console.log('a user has connected!');
  
  const userId = await getUserIdFromSocket(socket)



  fetch(`http://localhost:8080/api/users/infoUser/socket/${userId}/${socket.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  socket.on('disconnect', () => {
    console.log('a user has disconnected');
  });

  fetch(`http://localhost:8080/api/users/infoUser/socket/${userId}/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });











  socket.on('chat message', async (msg) => {
    console.log('Mensaje recibido en el servidor:', msg);
    try {
      const response = await fetch('http://localhost:8082/api/messages/POST', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJmYXZvcml0ZUNvbG9yIjoibmF2eSIsInVzZXJJZCI6MiwidXNlcm5hbWUiOiJwYWJsbzEiLCJzdWIiOiJwYWJsbzEiLCJpYXQiOjE3MTYzMDkyNzIsImV4cCI6MTcxNjkxNDA3Mn0.VtQetEclWxk7NqGR09T7lXWyQrAUVi5pzawWi7Cnesw',
          'Contenido' : `${msg}`,
          'Destinatario' : '1'
        },
        body: JSON.stringify({ contenido: msg }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el mensaje');
      }

      const savedMessage = await response.json();

      
      let recipientResponse = await fetch(`http://localhost:8080/api/users/SocketById/1`);
      const recipient = await recipientResponse.text();

      io.to(recipient).emit('chat message', savedMessage);
    } catch (e) {
      console.error(e);
    }
  });
});


app.use(logger('dev'))

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/build', 'index.html'));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`)
})*/
