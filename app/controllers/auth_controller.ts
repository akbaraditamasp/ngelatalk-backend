import { cuid } from '@adonisjs/core/helpers'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import User from '../models/user.js'
import { loginValidator, publicKeyValidator, registerValidator } from '../validators/auth.js'
import { Attachment } from '../utils/attachment.js'
import axios from 'axios'
import optimizeAvatar from '../utils/optimize_avatar.js'

export default class AuthController {
  async register({ request }: HttpContext) {
    const { name, email, password } = await registerValidator.validate(request.all())

    const user = new User()
    user.name = name
    user.email = email
    user.password = password

    await user.save()

    return {
      ...user.serialize(),
      token: (await User.accessTokens.create(user)).value!.release(),
    }
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = await loginValidator.validate(request.all())

    try {
      const user = await User.findByOrFail('email', email.toLowerCase())

      if (!(await hash.verify(user.password, password))) {
        throw new Error()
      }

      return {
        ...user.serialize(),
        token: (await User.accessTokens.create(user)).value!.release(),
      }
    } catch (e) {
      return response.unauthorized()
    }
  }

  async verify({ auth }: HttpContext) {
    await auth.user!.avatar?.populateURL()
    return auth.user!.serialize()
  }

  async logout({ auth }: HttpContext) {
    await User.accessTokens.delete(auth.user!, auth.user!.currentAccessToken.identifier)

    return auth.user!.serialize()
  }

  async social({ ally, params }: HttpContext) {
    const auth = ally.use(params.provider as 'google' | 'github')

    return {
      redirect_uri: await auth.getRedirectUrl(),
    }
  }

  async socialCallback({ ally, params }: HttpContext) {
    const auth = await ally.use(params.provider as 'google' | 'github').user()

    let avatar: Attachment | undefined = undefined

    try {
      const rawAvatar = await axios
        .get(auth.avatarUrl, { responseType: 'arraybuffer' })
        .then(({ data }) => data)

      avatar = Attachment.fromBuffer({
        key: `${cuid()}.jpg`,
        mime: 'image/jpeg',
        buffer: await optimizeAvatar(Buffer.from(rawAvatar)),
      })
    } catch (e) {}

    const user = await User.firstOrCreate(
      {
        email: auth.email.toLowerCase(),
      },
      {
        email: auth.email,
        name: auth.name,
        password: cuid(),
        avatar,
      }
    )

    return {
      ...user.serialize(),
      token: (await User.accessTokens.create(user)).value!.release(),
    }
  }

  async storePublicKey({ auth, request }: HttpContext) {
    const { public_key: key } = await publicKeyValidator.validate(request.all())

    const publicKey = await auth.user!.related('publicKey').updateOrCreate({}, { key })

    return {
      ...publicKey.serialize(),
    }
  }
}
