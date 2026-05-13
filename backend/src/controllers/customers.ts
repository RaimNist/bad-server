import { NextFunction, Request, Response } from 'express'
import { FilterQuery } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'
import pickAllowedFields from '../utils/pickAllowedFields'
import escapeRegExp from '../utils/escapeRegExp'

const normalizeSearch = (search: unknown) =>
    escapeRegExp(String(search).slice(0, 100))

const normalizeLimit = (limit: unknown) => {
    const parsedLimit = Number(limit)
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
        return 10
    }
    return Math.min(Math.floor(parsedLimit), 10)
}

const normalizePage = (page: unknown) => {
    const parsedPage = Number(page)
    if (!Number.isFinite(parsedPage) || parsedPage < 1) {
        return 1
    }
    return Math.floor(parsedPage)
}

const normalizeNumber = (value: unknown) => {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : null
}

const customerSortFields = new Set([
    'createdAt',
    'lastOrderDate',
    'totalAmount',
    'orderCount',
    'name',
])

const hasNestedQueryValue = (query: Request['query']) =>
    Object.values(query).some(
        (value) => typeof value === 'object' && value !== null
    )

// TODO: Добавить guard admin
// eslint-disable-next-line max-len
// Get GET /customers?page=2&limit=5&sort=totalAmount&order=desc&registrationDateFrom=2023-01-01&registrationDateTo=2023-12-31&lastOrderDateFrom=2023-01-01&lastOrderDateTo=2023-12-31&totalAmountFrom=100&totalAmountTo=1000&orderCountFrom=1&orderCountTo=10
export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (hasNestedQueryValue(req.query)) {
            return next(new BadRequestError('РќРµРІР°Р»РёРґРЅС‹Рµ РїР°СЂР°РјРµС‚СЂС‹ Р·Р°РїСЂРѕСЃР°'))
        }

        const {
            page = 1,
            limit = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
            search,
        } = req.query

        const filters: FilterQuery<Partial<IUser>> = {}
        const currentPage = normalizePage(page)
        const pageSize = normalizeLimit(limit)

        if (registrationDateFrom) {
            filters.createdAt = {
                ...filters.createdAt,
                $gte: new Date(registrationDateFrom as string),
            }
        }

        if (registrationDateTo) {
            const endOfDay = new Date(registrationDateTo as string)
            endOfDay.setHours(23, 59, 59, 999)
            filters.createdAt = {
                ...filters.createdAt,
                $lte: endOfDay,
            }
        }

        if (lastOrderDateFrom) {
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $gte: new Date(lastOrderDateFrom as string),
            }
        }

        if (lastOrderDateTo) {
            const endOfDay = new Date(lastOrderDateTo as string)
            endOfDay.setHours(23, 59, 59, 999)
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $lte: endOfDay,
            }
        }

        if (totalAmountFrom) {
            const totalAmountFromValue = normalizeNumber(totalAmountFrom)
            if (totalAmountFromValue === null) {
                return next(new BadRequestError('РќРµРІР°Р»РёРґРЅР°СЏ СЃСѓРјРјР°'))
            }
            filters.totalAmount = {
                ...filters.totalAmount,
                $gte: totalAmountFromValue,
            }
        }

        if (totalAmountTo) {
            const totalAmountToValue = normalizeNumber(totalAmountTo)
            if (totalAmountToValue === null) {
                return next(new BadRequestError('РќРµРІР°Р»РёРґРЅР°СЏ СЃСѓРјРјР°'))
            }
            filters.totalAmount = {
                ...filters.totalAmount,
                $lte: totalAmountToValue,
            }
        }

        if (orderCountFrom) {
            const orderCountFromValue = normalizeNumber(orderCountFrom)
            if (orderCountFromValue === null) {
                return next(new BadRequestError('РќРµРІР°Р»РёРґРЅРѕРµ С‡РёСЃР»Рѕ Р·Р°РєР°Р·РѕРІ'))
            }
            filters.orderCount = {
                ...filters.orderCount,
                $gte: orderCountFromValue,
            }
        }

        if (orderCountTo) {
            const orderCountToValue = normalizeNumber(orderCountTo)
            if (orderCountToValue === null) {
                return next(new BadRequestError('РќРµРІР°Р»РёРґРЅРѕРµ С‡РёСЃР»Рѕ Р·Р°РєР°Р·РѕРІ'))
            }
            filters.orderCount = {
                ...filters.orderCount,
                $lte: orderCountToValue,
            }
        }

        if (search) {
            const searchRegex = new RegExp(normalizeSearch(search), 'i')
            const orders = await Order.find(
                {
                    $or: [{ deliveryAddress: searchRegex }],
                },
                '_id'
            )

            const orderIds = orders.map((order) => order._id)

            filters.$or = [
                { name: searchRegex },
                { lastOrder: { $in: orderIds } },
            ]
        }

        const sort: { [key: string]: any } = {}

        if (
            typeof sortField === 'string' &&
            customerSortFields.has(sortField) &&
            sortOrder
        ) {
            sort[sortField as string] = sortOrder === 'desc' ? -1 : 1
        }

        const options = {
            sort,
            skip: (currentPage - 1) * pageSize,
            limit: pageSize,
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / pageSize)

        res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage,
                pageSize,
            },
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Get /customers/:id
export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(req.params.id).populate([
            'orders',
            'lastOrder',
        ])
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Patch /customers/:id
export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const updateData = pickAllowedFields(req.body, [
            'email',
            'name',
            'phone',
        ])
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])
        res.status(200).json(updatedUser)
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Delete /customers/:id
export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.status(200).json(deletedUser)
    } catch (error) {
        next(error)
    }
}
