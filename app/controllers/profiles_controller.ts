import type { HttpContext } from '@adonisjs/core/http'
import { updateAvatarValidator } from '../validators/profile.js'
import { Attachment } from '../utils/attachment.js'
import { cuid } from '@adonisjs/core/helpers'
import optimizeAvatar from '../utils/optimize_avatar.js'

export default class ProfilesController {
  async updateAvatar({ request, auth }: HttpContext) {
    const { avatar } = await request.validateUsing(updateAvatarValidator)

    const optimizedAvatar = await optimizeAvatar(avatar.tmpPath)

    const user = auth.user!
    user.avatar = Attachment.fromBuffer({
      key: `${cuid()}.jpg`,
      mime: 'image/jpeg',
      buffer: optimizedAvatar,
    })

    await user.save()
    await user.avatar?.populateURL()

    return user.serialize()
  }
}
