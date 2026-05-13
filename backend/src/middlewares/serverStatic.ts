import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import { resolveInside } from '../utils/safePublicPath'

export default function serveStatic(baseDir: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Определяем полный путь к запрашиваемому файлу
        let filePath: string

        try {
            filePath = resolveInside(baseDir, req.path)
        } catch (error) {
            return next()
        }

        // Проверяем, существует ли файл
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // Файл не существует отдаем дальше мидлварам
                return next()
            }
            // Файл существует, отправляем его клиенту
            return res.sendFile(filePath, (sendFileError) => {
                if (sendFileError) {
                    next(sendFileError)
                }
            })
        })
    }
}
