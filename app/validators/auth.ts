import vine from '@vinejs/vine'
import User from '../models/user.js'

vine.convertEmptyStringsToNull = true

export const registerValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .email()
      .unique(async (_db, value) => {
        const user = await User.findBy('email', value.toLowerCase())

        return !Boolean(user)
      }),
    name: vine.string(),
    password: vine.string(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
  })
)

export const publicKeyValidator = vine.compile(
  vine.object({
    public_key: vine.string(),
  })
)
