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
    origin: process.env.NODE_ENV === "production"?false:['http://localhost:5500', 'http://127.0.0.1:5500']
  }
});

io.on('connection', socket =>{
  socket.emit('message', "Welcome to Chat Rooms App");

  socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)}: connected}`);
  socket.on('message', `User ${socket.id.substring(0, 5)}: ${data}`);
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