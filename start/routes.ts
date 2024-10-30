/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth_controller')
const ProfilesController = () => import('#controllers/profiles_controller')
const ChatsController = () => import('#controllers/chats_controller')

router
  .group(() => {
    router.post('/register', [AuthController, 'register'])
    router.get('/login', [AuthController, 'login'])
    router.get('/verify', [AuthController, 'verify']).use(middleware.auth({ guards: ['api'] }))
    router.delete('/logout', [AuthController, 'logout']).use(middleware.auth({ guards: ['api'] }))

    //store public key
    router
      .post('/public-key', [AuthController, 'storePublicKey'])
      .use(middleware.auth({ guards: ['api'] }))

    //social auth
    router
      .get('/:provider/callback', [AuthController, 'socialCallback'])
      .where('provider', /github|google/)
    router.get('/:provider', [AuthController, 'social']).where('provider', /github|google/)
  })
  .prefix('/auth')

router
  .group(() => {
    router.put('/avatar', [ProfilesController, 'updateAvatar'])
  })
  .prefix('/profile')
  .use(middleware.auth({ guards: ['api'] }))

router
  .group(() => {
    router.post('/contact/:id', [ChatsController, 'addContact'])
    router.get('/contact', [ChatsController, 'contactList'])
    router.get('/prepare/:id', [ChatsController, 'prepareChat'])
    router.get('/online', [ChatsController, 'onlineUser'])
    router.get('/email/:email', [ChatsController, 'checkEmail'])
    router.put('/receive/:id', [ChatsController, 'receive'])
    router.put('/read/:id/:messageId', [ChatsController, 'readAll'])
    router.put('/read/:id', [ChatsController, 'readAll'])
    router.post('/:id', [ChatsController, 'send'])
    router.get('/', [ChatsController, 'sync'])
  })
  .prefix('/chat')
  .use(middleware.auth({ guards: ['api'] }))
