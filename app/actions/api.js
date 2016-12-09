// @flow
import type {State, Action, Dispatch} from '../types'
import type {Params} from '../types/column'
import Pixiv, {normalizeIllusts, parseUrl} from '../util/pixiv'
import {getColumn} from '../reducers'
import {
	addColumnIllusts,
	setPrams,
	nextColumnIllusts,
} from './column'

export const apiRequestSuccess = (response: Object): Action => (
	{type: 'API_REQUEST_SUCCESS', response}
)

const refreshAllColumns = () => {
	return async (dispatch: Dispatch, getState: () => State) => {
		// 全カラムの更新
		for (const column of getState().columns) {
			await dispatch(fetchColumn(column.id, false))
		}
	}
}

export function addBookmark(id: number, isPublic?: bool = true) {
	return async (dispatch: Dispatch): Promise<void> => {
		const restrict = isPublic ? 'public' : 'private'
		await Pixiv.illustBookmarkAdd(id, {restrict})
		await dispatch(refreshAllColumns())
	}
}

function fetchPixiv(columnId: number, params: ?Params) {
	return async (
		dispatch: Dispatch,
		getState: () => State
	): Promise<{response: Object, params: ?Params}> => {
		const column = getColumn(getState(), columnId)
		const opts = {...column.params, ...params}
		const res = await Pixiv.fetch(column.endpoint, {params: opts})

		const nextParams: ?Params = res.nextUrl ? parseUrl(res.nextUrl) : null
		return {
			response: normalizeIllusts(res),
			params: nextParams,
		}
	}
}

export const nextColumnPage = (id: number) => {
	return async (dispatch: Dispatch): Promise<void> => {
		const {response, params} = await dispatch(fetchPixiv(id))
		dispatch(apiRequestSuccess(response))
		dispatch(nextColumnIllusts(id, response.result))
		if (params) {
			dispatch(setPrams(id, params))
		}
	}
}

export const checkColumnUpdate = (id: number) => {
	return async (dispatch: Dispatch, getState: () => State) => {
		const authInfo = Pixiv.authInfo()
		const {auth: {username, password}} = getState()
		if (!authInfo && username && password) {
			await Pixiv.login(username, password)
		}

		const opts = {offset: 0, maxBookmarkId: null}
		const {response} = await dispatch(fetchPixiv(id, opts))
		dispatch(apiRequestSuccess(response))
		dispatch(addColumnIllusts(id, response.result))
	}
}

export function fetchColumn(id: number) {
	return async (dispatch: Dispatch, getState: () => State): Promise<void> => {
		const authInfo = Pixiv.authInfo()
		const {auth: {username, password}} = getState()
		if (!authInfo && username && password) {
			await Pixiv.login(username, password)
		}
		const {response, params} = await dispatch(fetchPixiv(id))
		dispatch(apiRequestSuccess(response))
		dispatch(addColumnIllusts(id, response.result))

		if (params) {
			dispatch(setPrams(id, params))
		}
	}
}
