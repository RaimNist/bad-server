import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { mkdirSync } from 'fs'
import { extname, join } from 'path'
import crypto from 'crypto'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const storage = multer.diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        const destinationPath = join(
            __dirname,
            process.env.UPLOAD_PATH_TEMP
                ? `../public/${process.env.UPLOAD_PATH_TEMP}`
                : '../public'
        )

        mkdirSync(destinationPath, { recursive: true })

        cb(null, destinationPath)
    },

    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        const extension = extname(file.originalname).toLowerCase()
        cb(null, `${crypto.randomUUID()}${extension}`)
    },
})

const types = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp']
const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    const extension = extname(file.originalname).toLowerCase()

    if (!types.includes(file.mimetype) || !extensions.includes(extension)) {
        return cb(null, false)
    }

    return cb(null, true)
}

export default multer({
    storage,
    fileFilter,
    limits: {
        fieldSize: 2 * 1024,
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
})
