import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import Tokens from 'csrf'
import 'dotenv/config'
import express, { NextFunction, Request, Response, json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import { apiLimiter } from './middlewares/rate-limit'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()
const tokens = new Tokens()
const csrfCookieName = '_csrf'
const csrfFieldName = '_csrf'
const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
}

const getCsrfToken = (req: Request, res: Response) => {
    const secret = req.cookies[csrfCookieName] || tokens.secretSync()
    res.cookie(csrfCookieName, secret, {
        httpOnly: true,
        sameSite: 'lax',
    })
    return tokens.create(secret)
}

const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
    }

    const secret = req.cookies[csrfCookieName]
    const token =
        req.header('CSRF-Token') ||
        req.header('X-CSRF-Token') ||
        req.header('X-XSRF-Token') ||
        req.body?.[csrfFieldName] ||
        req.query?.[csrfFieldName]

    if (typeof token !== 'string' || !secret || !tokens.verify(secret, token)) {
        return res.status(403).json({ message: 'Invalid CSRF token' })
    }

    return next()
}

app.use(cookieParser())

app.use(cors(corsOptions))
// app.use(cors({ origin: ORIGIN_ALLOW, credentials: true }));
// app.use(express.static(path.join(__dirname, 'public')));

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: true, limit: '100kb' }))
app.use(json({ limit: '100kb' }))

app.options('*', cors(corsOptions))
app.get(['/csrf-token', '/api/csrf-token'], csrfProtection, (req, res) => {
    res.send(getCsrfToken(req, res))
})
app.get(['/auth/csrf-token', '/api/auth/csrf-token'], csrfProtection, (req, res) => {
    res.json({ csrfToken: getCsrfToken(req, res) })
})
app.use(csrfProtection)
app.use(apiLimiter)
app.use(routes)
app.use(errors())
app.use(errorHandler)

// eslint-disable-next-line no-console

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
