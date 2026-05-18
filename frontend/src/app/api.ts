import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { setCredentials, clearCredentials } from '@/features/auth/authSlice';
import type { RootState } from './store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, apiCtx, extra) => {
  let result = await rawBaseQuery(args, apiCtx, extra);
  if (result.error?.status === 401) {
    const refreshResult = await rawBaseQuery({ url: '/auth/refresh', method: 'POST', body: {} }, apiCtx, extra);
    if (refreshResult.data && typeof refreshResult.data === 'object') {
      const data = refreshResult.data as { success: boolean; data?: { accessToken: string; user: import('@boilerplate/shared').AuthUser } };
      if (data.success && data.data) {
        apiCtx.dispatch(setCredentials({ accessToken: data.data.accessToken, user: data.data.user }));
        result = await rawBaseQuery(args, apiCtx, extra);
      } else {
        apiCtx.dispatch(clearCredentials());
      }
    } else {
      apiCtx.dispatch(clearCredentials());
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRefresh,
  tagTypes: ['Auth', 'User', 'Employee', 'Department', 'Designation', 'Dashboard', 'Settings'],
  endpoints: () => ({}),
});
