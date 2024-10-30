import User from '#models/user'
import { Server, Socket } from 'socket.io'
import server from '@adonisjs/core/services/server'

function socket() {
  const connectedUser: {
    user: User
    socket: Socket
  }[] = []
  let io: Server | null = null

  const boot = () => {
    if (io) return

    io = new Server(server.getNodeServer(), {
      cors: {
        origin: '*',
      },
    })
  }

  return Object.assign(() => io!, { boot, connectedUser })
}

export default socket()
