import vine from '@vinejs/vine'

vine.convertEmptyStringsToNull = true

export const updateAvatarValidator = vine.compile(
  vine.object({
    avatar: vine.file({
      size: '10mb',
      extnames: ['jpg', 'png', 'jpeg', 'bmp', 'gif', 'webp'],
    }),
  })
)
