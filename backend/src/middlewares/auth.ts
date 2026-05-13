import { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { Model, Types } from 'mongoose'
import { ACCESS_TOKEN } from '../config'
import ForbiddenError from '../errors/forbidden-error'
import NotFoundError from '../errors/not-found-error'
import UnauthorizedError from '../errors/unauthorized-error'
import UserModel, { Role } from '../models/user'

const auth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Invalid token'))
    }

    try {
        const [, accessToken] = authHeader.split(' ')
        const payload = jwt.verify(
            accessToken,
            ACCESS_TOKEN.secret
        ) as JwtPayload

        const user = await UserModel.findOne(
            {
                _id: new Types.ObjectId(payload.sub),
            },
            { password: 0, salt: 0 }
        )

        if (!user) {
            return next(new ForbiddenError('Access denied'))
        }

        res.locals.user = user
        return next()
    } catch (error) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Token expired'))
        }
        return next(new UnauthorizedError('Authorization required'))
    }
}

export function roleGuardMiddleware(...roles: Role[]) {
    return (_req: Request, res: Response, next: NextFunction) => {
        if (!res.locals.user) {
            return next(new UnauthorizedError('Authorization required'))
        }

        const hasAccess = roles.some((role) =>
            res.locals.user.roles.includes(role)
        )

        if (!hasAccess) {
            return next(new ForbiddenError('Access denied'))
        }

        return next()
    }
}

export function currentUserAccessMiddleware<T>(
    model: Model<T>,
    idProperty: string,
    userProperty: keyof T
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params[idProperty]

        if (!res.locals.user) {
            return next(new UnauthorizedError('Authorization required'))
        }

        if (res.locals.user.roles.includes(Role.Admin)) {
            return next()
        }

        const entity = await model.findById(id)

        if (!entity) {
            return next(new NotFoundError('Not found'))
        }

        const userEntityId = entity[userProperty] as Types.ObjectId
        const hasAccess = new Types.ObjectId(res.locals.user.id).equals(
            userEntityId
        )

        if (!hasAccess) {
            return next(new ForbiddenError('Access denied'))
        }

        return next()
    }
}

export default auth
