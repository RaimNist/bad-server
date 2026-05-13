import { existsSync, mkdirSync, rename } from 'fs'
import { basename } from 'path'
import { resolveInside } from './safePublicPath'

function movingFile(imagePath: string, from: string, to: string) {
    const fileName = basename(imagePath)
    const imagePathTemp = resolveInside(from, fileName)
    const imagePathPermanent = resolveInside(to, fileName)

    mkdirSync(to, { recursive: true })
    if (!existsSync(imagePathTemp)) {
        throw new Error('Ошибка при сохранении файла')
    }

    rename(imagePathTemp, imagePathPermanent, (err) => {
        if (err) {
            throw new Error('Ошибка при сохранении файла')
        }
    })
}

export default movingFile
