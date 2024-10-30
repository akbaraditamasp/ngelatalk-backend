import { BaseModel, afterSave, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from './user.js'
import socket from '../services/socket.js'

export default class Chat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fromId: string

  @column()
  declare toId: string

  @column()
  declare message: {
    transferKey: string
    iv: string
    message: string
  }

  @column()
  declare status: 'sent' | 'received' | 'read'

  @belongsTo(() => User, {
    foreignKey: 'toId',
  })
  declare to: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @afterSave()
  static sendEvent(chat: Chat) {
    const tos = socket.connectedUser.filter((el) => el.user.id === chat.toId)
    const froms = socket.connectedUser.filter((el) => el.user.id === chat.fromId)

    for (const to of tos) {
      to.socket.emit('chat', chat.serialize())
    }

    if (chat.status !== 'sent') {
      for (const from of froms) {
        from.socket.emit('chat', chat.serialize())
      }
    }
  }
}
