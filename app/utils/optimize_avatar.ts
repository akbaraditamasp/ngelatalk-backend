import sharp from 'sharp'

export default async function optimizeAvatar(input: Parameters<typeof sharp>[0]) {
  return await sharp(input).resize(400, 400, { fit: 'cover' }).jpeg({ quality: 95 }).toBuffer()
}
