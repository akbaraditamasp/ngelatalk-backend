import app from '@adonisjs/core/services/app'
import socket from '../app/services/socket.js'
import axios from 'axios'
import env from '#start/env'
import User from '../app/models/user.js'
import { Socket } from 'socket.io'
import { DateTime } from 'luxon'

app.ready(() => {
  socket.boot()

  socket().use(async (conn, next) => {
    const { token } = conn.handshake?.auth || {}

    try {
      const { id } = await axios
        .get(`http://${env.get('HOST')}:${env.get('PORT')}/auth/verify`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then(({ data }) => data)

      const user = await User.findOrFail(id)

      socket.connectedUser.push({
        user,
        socket: conn,
      })

      next()
    } catch (e) {
      next(new Error('Unauthorized'))
    }
  })

  socket().on('connection', (conn: Socket) => {
    const registryIndex = socket.connectedUser.findIndex((el) => el.socket.id === conn.id)!
    const registry = socket.connectedUser[registryIndex]

    conn.on('disconnect', async () => {
      registry.user.lastSeenAt = DateTime.now()
      await registry.user.save()

      socket.connectedUser.splice(registryIndex, 1)
    })
  })
})
