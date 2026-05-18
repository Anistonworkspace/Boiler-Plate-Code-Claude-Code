import { api } from '@/app/api';
import type { AuthUser, LoginRequest, LoginResponse, ApiSuccess } from '@boilerplate/shared';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<ApiSuccess<LoginResponse>, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    logout: build.mutation<ApiSuccess<{ loggedOut: boolean }>, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Auth', 'User', 'Dashboard'],
    }),
    me: build.query<ApiSuccess<{ user: AuthUser }>, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useLogoutMutation, useMeQuery } = authApi;
