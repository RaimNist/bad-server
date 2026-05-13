export default function pickAllowedFields<T extends Record<string, unknown>>(
    source: Record<string, unknown>,
    allowedFields: string[]
): Partial<T> {
    return allowedFields.reduce<Partial<T>>((result, field) => {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
            return {
                ...result,
                [field]: source[field],
            }
        }

        return result
    }, {})
}
