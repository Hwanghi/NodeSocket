const axios = require('axios');

module.exports = (io) => {
  const room = io.of('/room');
  const chat = io.of('/chat');

  room.on('connection', (socket) => {
    console.log('room 입장' + socket.id);
    socket.on('disconnect', () => {
      console.log('room 퇴장');
    });
  });

  chat.on('connection', (socket) => {
    console.log('chat 입장');
    // You can use the express session in Socket with this
    const req = socket.handshake;
    
    // Let's extract a room ID in url and use it for join
    const { headers: { referer } } = socket.request;
    const roomId = referer
      .split('/')[referer.split('/').length - 1]
      .replace(/\?.+/, '');
    socket.join(roomId);

    // Chat is server-side socket
    // So, you can use the adapter and rooms(Map)
    // To get values in Map, use 'get' method with a key
    const connectedPeople = chat.adapter.rooms.get(roomId);
    socket.to(roomId).emit('join', {
      user: 'system',
      chat: `${req.session.color}님이 입장하셨습니다. 접속인원: ${connectedPeople.size}`,
    });

    socket.on('disconnect', (reason) => {
      console.log('chat 퇴장');
      socket.leave(roomId);
      const currentRoom = chat.adapter.rooms.get(roomId);
      const userCount = currentRoom ? currentRoom.size : 0;
      if (userCount === 0) {
        axios.delete(`http://localhost:8005/room/${roomId}`)
          .then(() => {
            console.log('방 제거 요청 성공');
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        socket.to(roomId).emit('exit', {
          user: 'system',
          chat: `${req.session.color}님이 퇴장하셨습니다.`,
        });
      }
    });
  });
};