import vine from '@vinejs/vine'

vine.convertEmptyStringsToNull = true

export const onlineUserValidator = vine.compile(
  vine.object({
    search: vine.string().optional(),
  })
)
export const sendValidator = vine.compile(
  vine.object({
    transferKey: vine.string(),
    iv: vine.string(),
    message: vine.string(),
  })
)
