import { ordersActions, ordersSelector } from '@slices/orders'
import { useActionCreators, useDispatch, useSelector } from '@store/hooks'
import { StatusType } from '@types'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiltersOrder } from '../../services/slice/orders/type'
import { fetchOrdersWithFilters } from '../../services/slice/orders/thunk'
import { AppRoute } from '../../utils/constants'
import Filter from '../filter'
import { FieldOption, FilterValues } from '../filter/helpers/types'
import styles from './admin.module.scss'
import { ordersFilterFields } from './helpers/ordersFilterFields'

const isFieldOption = (value: unknown): value is FieldOption =>
    value !== null && typeof value === 'object' && 'value' in value

export default function AdminFilterOrders() {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [_, setSearchParams] = useSearchParams()

    const { updateFilter, clearFilters } = useActionCreators(ordersActions)
    const filterOrderOption = useSelector(ordersSelector.selectFilterOption)

    const handleFilter = (filters: FilterValues) => {
        const status = isFieldOption(filters.status)
            ? filters.status.value
            : filters.status
        const { status: _status, ...restFilters } = filters

        dispatch(
            updateFilter({
                ...restFilters,
                status: String(status) as StatusType | '',
            } as Partial<FiltersOrder>)
        )
        const queryParams: { [key: string]: string } = {}
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                queryParams[key] =
                    typeof value === 'object'
                        ? String(value.value)
                        : value.toString()
            }
        })
        setSearchParams(queryParams)
        navigate(
            `${AppRoute.AdminOrders}?${new URLSearchParams(queryParams).toString()}`
        )
    }

    const handleClearFilters = () => {
        dispatch(clearFilters())
        setSearchParams({})
        dispatch(fetchOrdersWithFilters({}))
        navigate(AppRoute.AdminOrders)
    }

    return (
        <>
            <h2 className={styles.admin__title}>Фильтры</h2>
            <Filter
                fields={ordersFilterFields}
                onFilter={handleFilter}
                onClear={handleClearFilters}
                defaultValue={filterOrderOption}
            />
        </>
    )
}
