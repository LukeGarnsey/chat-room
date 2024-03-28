const express = require("express");
const {Server} = require("socket.io");

const app = express();
const PORT = process.env.PORT | 3001;
const ADMIN = "Admin";

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));



const expressServer = app.listen(PORT, ()=>{
  console.log("server active...");
});

const UsersState = {
  users:[],
  setUsers: function(newUsersArray){
    this.users = newUsersArray
  }
}

const io = new Server(expressServer, {
  cors:{
    origin: process.env.NODE_ENV === "production"?false:['http://localhost:3001', 'http://127.0.0.1:3001']
  }
});

io.on('connection', socket =>{
  console.log(`User ${socket.id} connect`);

  socket.emit('message', buildMsg(ADMIN, "Welcome to Chat Rooms App"));

  socket.on('enterRoom', ({name, room}) =>{
    //leave room if user was in a room
    const prevRoom = getUser(socket.id)?.room;
    if(prevRoom){
      socket.leave(prevRoom);
      io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
    }
    const user = activateUser(socket.id, name, room);
    //Cannot update previous room users list until after the state update in activate user.

    if(prevRoom){
      io.to(prevRoom).emit('userlist', {
        users:getUsersInRoom(prevRoom)
      })
    }

    socket.join(user.room);

    socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room.`))
    //to everyone else
    socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`))

    //update user list form room
    io.to(user.room).emit('userList', {
      users: getUsersInRoom(user.room)
    });    
    io.emit('roomsList', {
      rooms: getAllActiveRooms()
    });
  });

  socket.on('disconnect', ()=>{
    const user = getUser(socket.id);
    userLeavesApp(socket.id);

    if(user){
      io.to(user.room).emit('message', buildMsg(ADMIN,`${user.name} has left the room`));
      io.to(user.room).emit('userList',{
        users:getUsersInRoom(user.room)
      });
      io.emit('roomList', {
        rooms:getAllActiveRooms()
      })
    }
    console.log(`User ${socket.id} disconnect`);
  });
  socket.on('message', ({name, text}) =>{
    const room = getUser(socket.id)?.room;
    if(room){
      io.to(room).emit('message', buildMsg(name, text)); 
    }
  });
  socket.on('activity', ({name})=>{
    const room = getUser(socket.id)?.room;
    if(room){
      socket.broadcast.to(room).emit('activity', name);
    }
  });
});

function buildMsg(name, text){
  return {
    name,
    text,
    time: new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date())
  };
}

function activateUser(id, name, room){
  const user = {id, name, room};
  UsersState.setUsers([
    ...UsersState.users.filter(user=>user.id !== id),
    user
  ])
  return user;
}

function userLeavesApp(id){
  UsersState.setUsers(
    UsersState.users.filter(user => user.id !== id)
  )
}

function getUser(id){
  return UsersState.users.find(user => user.id === id);
}
function getUsersInRoom(room){
  return UsersState.users.filter(user => user.room === room);
}
function getAllActiveRooms(){
  return Array.from(new Set(UsersState.users.map(user => user.room)));
}