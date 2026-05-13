import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import csrf from 'csurf'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import { apiLimiter } from './middlewares/rate-limit'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()
const csrfProtection = csrf({ cookie: true })

app.use(cookieParser())

app.use(cors())
// app.use(cors({ origin: ORIGIN_ALLOW, credentials: true }));
// app.use(express.static(path.join(__dirname, 'public')));

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: true, limit: '100kb' }))
app.use(json({ limit: '100kb' }))

app.options('*', cors())
app.get('/csrf-token', csrfProtection, (req, res) => {
    res.send(req.csrfToken())
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
