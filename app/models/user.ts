import PublicKey from '#models/public_key'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import hash from '@adonisjs/core/services/hash'
import {
  BaseModel,
  beforeCreate,
  beforeDelete,
  beforeSave,
  column,
  hasMany,
  hasOne,
  manyToMany,
} from '@adonisjs/lucid/orm'
import type { HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'
import { attachment, autoDeleting, type Attachment, autoSaving } from '../utils/attachment.js'
import Chat from '#models/chat'

export default class User extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare name: string

  @column({ serializeAs: null })
  declare password: string

  @attachment()
  declare avatar: Attachment

  @column.dateTime()
  declare lastSeenAt: DateTime

  @hasOne(() => PublicKey)
  declare publicKey: HasOne<typeof PublicKey>

  @manyToMany(() => User, {
    localKey: 'id',
    pivotForeignKey: 'user_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'contact_id',
    pivotTable: 'contacts',
  })
  declare contacts: ManyToMany<typeof User>

  @hasMany(() => Chat, {
    localKey: 'id',
    foreignKey: 'fromId',
  })
  declare outboxes: HasMany<typeof Chat>

  @hasMany(() => Chat, {
    localKey: 'id',
    foreignKey: 'toId',
  })
  declare inboxes: HasMany<typeof Chat>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(user: User) {
    user.id = randomUUID()
  }

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.$dirty.password)
    }

    if (user.$dirty.email) {
      user.email = user.$dirty.email.toLowerCase()
    }
  }

  @beforeDelete()
  static deleteAttachment = autoDeleting<User>('avatar')

  @beforeSave()
  static saveAttachment = autoSaving<User>('avatar')

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
