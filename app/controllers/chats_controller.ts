import type { HttpContext } from '@adonisjs/core/http'
import { ModelObject } from '@adonisjs/lucid/types/model'
import socket from '../services/socket.js'
import { onlineUserValidator, sendValidator } from '../validators/chat.js'
import User from '../models/user.js'
import Chat from '../models/chat.js'
import db from '@adonisjs/lucid/services/db'

export default class ChatsController {
  async onlineUser({ request, auth }: HttpContext) {
    const { search = '' } = await request.validateUsing(onlineUserValidator)

    const users = socket.connectedUser
      .filter(
        (el) =>
          el.user.name.toLowerCase().includes(search.toLowerCase()) && el.user.id !== auth.user!.id
      )
      .map((el) => el.user)

    const returnedUsers: ModelObject[] = []
    for (const user of users) {
      if (returnedUsers.find((el) => el.id === user.id)) continue
      await user.avatar?.populateURL()
      returnedUsers.push(user.serialize())
    }

    return returnedUsers
  }

  async prepareChat({ params, auth }: HttpContext) {
    const user = await User.query().where('id', params.id).preload('publicKey').firstOrFail()
    await user.avatar?.populateURL()

    return {
      ...user.serialize(),
      isOnline: Boolean(socket.connectedUser.find((el) => el.user.id === user.id)),
      inContact: Boolean(
        await auth.user!.related('contacts').query().where('contacts.contact_id', user.id).first()
      ),
    }
  }

  async addContact({ params, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)

    await auth.user!.related('contacts').attach([user.id])

    return user.serialize()
  }

  async contactList({ request, auth }: HttpContext) {
    const { search = '' } = await request.validateUsing(onlineUserValidator)

    const contacts = await auth.user!.related('contacts').query().whereILike('name', `%${search}%`)

    const returnedUsers: ModelObject[] = []
    for (const user of contacts) {
      await user.avatar?.populateURL()

      returnedUsers.push({
        ...user.serialize(),
        isOnline: Boolean(socket.connectedUser.find((el) => el.user.id === user.id)),
      })
    }

    return returnedUsers
  }

  async checkEmail({ params }: HttpContext) {
    const user = await User.findByOrFail('email', params.email.toLowerCase())
    await user.avatar?.populateURL()

    return user.serialize()
  }

  async send({ params, request, auth }: HttpContext) {
    const message = await request.validateUsing(sendValidator)

    const user = await User.findOrFail(params.id)

    const chat = new Chat()
    chat.toId = user.id
    chat.message = message
    chat.status = 'sent'

    await auth.user!.related('outboxes').save(chat)

    return chat.serialize()
  }

  async sync({ auth }: HttpContext) {
    const chatsQuery = Chat.query()
      .where((query) =>
        query.where('chats.from_id', auth.user!.id).orWhere('chats.to_id', auth.user!.id)
      )
      .preload('to')

    if (auth.user!.lastSeenAt) {
      chatsQuery.andWhere('chats.updated_at', '>=', auth.user!.lastSeenAt.toSQL()!)
    }

    const chats = await chatsQuery

    await db.transaction(async (trx) => {
      for (const chat of chats) {
        if (chat.status === 'sent' && chat.toId === auth.user?.id) {
          chat.status = 'received'

          await chat.useTransaction(trx).save()
        }
      }
    })

    return chats.map((item) => item.serialize())
  }

  async receive({ auth, params }: HttpContext) {
    const chat = await auth
      .user!.related('inboxes')
      .query()
      .where('chats.id', params.id)
      .andWhere('chats.status', 'sent')
      .firstOrFail()

    chat.status = 'received'

    await chat.save()

    return chat.serialize()
  }

  async readAll({ auth, params, response }: HttpContext) {
    const inboxes = await auth
      .user!.related('inboxes')
      .query()
      .where('chats.from_id', params.id)
      .andWhere('chats.status', '!=', 'read')

    await db.transaction(async (trx) => {
      for (const inbox of inboxes) {
        inbox.status = 'read'
        await inbox.useTransaction(trx).save()
      }
    })

    return response.ok({})
  }

  async read({ auth, params, response }: HttpContext) {
    const inbox = await auth
      .user!.related('inboxes')
      .query()
      .where('chats.from_id', params.id)
      .where('chats.id', params.messageId)
      .andWhere('chats.status', '!=', 'read')
      .firstOrFail()

    inbox.status = 'read'
    await inbox.save()

    return response.ok({})
  }
}
