import { resolve, sep } from 'path'

export function resolveInside(baseDir: string, filePath: string) {
    const resolvedBase = resolve(baseDir)
    const resolvedPath = resolve(resolvedBase, `.${filePath}`)

    if (
        resolvedPath !== resolvedBase &&
        !resolvedPath.startsWith(`${resolvedBase}${sep}`)
    ) {
        throw new Error('Invalid file path')
    }

    return resolvedPath
}

export function publicDir() {
    return resolve(__dirname, '../public')
}
