import { cuid } from '@adonisjs/core/helpers'
import { MultipartFile } from '@adonisjs/core/types/bodyparser'
import drive from '@adonisjs/drive/services/main'
import { column } from '@adonisjs/lucid/orm'
import mime from 'mime'

export class Attachment {
  constructor(file?: MultipartFile) {
    if (file) {
      this.file = file
      this.key = `${cuid()}${file.extname ? '.' + file.extname : ''}`
      this.size = file.size
      this.mime = file.extname ? mime.getType(file.extname) || '' : ''
    }
  }

  public buffer?: Buffer
  private file?: MultipartFile
  public key!: string
  public size!: number
  public mime?: string
  public url?: string

  public toDB() {
    return { key: this.key, size: this.size, mime: this.mime }
  }

  static fromDB(data: { key: string; size: number; mime?: string }) {
    const attachment = new Attachment()
    attachment.key = data.key
    attachment.size = data.size
    attachment.mime = data.mime

    return attachment
  }

  public async populateURL() {
    this.url = await drive.use().getSignedUrl(this.key)
  }

  public serialize() {
    return {
      key: this.key,
      size: this.size,
      mime: this.mime,
      url: this.url,
    }
  }

  public async write() {
    if (this.file) {
      await this.file.moveToDisk(this.key)
    } else if (this.buffer) {
      await drive.use().put(this.key, this.buffer)
    }
  }

  static fromBuffer(data: { key: string; mime?: string; buffer: Buffer }) {
    const attachment = new Attachment()
    attachment.key = data.key
    attachment.size = data.buffer.byteLength
    attachment.mime = data.mime
    attachment.buffer = data.buffer

    return attachment
  }
}

export function attachment() {
  return column({
    prepare: (value: Attachment) => value.toDB(),
    consume: (value: string) =>
      value ? Attachment.fromDB(value as unknown as ReturnType<Attachment['toDB']>) : null,
    serialize: (value: Attachment | null) => {
      return value?.serialize() || null
    },
  })
}

export function autoDeleting<T>(...columns: (keyof T)[]) {
  return async (model: T) => {
    for (const column of columns) {
      await drive.use().delete((model[column] as Attachment).key)
    }
  }
}

export function autoSaving<T>(...columns: (keyof T)[]) {
  return async (model: T) => {
    const original = (model as { $original: any }).$original
    const dirty = (model as { $dirty: any }).$dirty

    for (const column of columns) {
      if (dirty[column]) {
        if (original[column]) {
          await drive.use().delete(original[column].key)
        }

        await (model[column] as Attachment).write()
      }
    }
  }
}
