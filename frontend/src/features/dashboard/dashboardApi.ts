import { api } from '@/app/api';
import type { ApiSuccess } from '@boilerplate/shared';

interface DashboardSummary {
  userCount: number;
  departmentCount: number;
  recentActivity: Array<{ id: string; message: string; createdAt: string }>;
}

export const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    getDashboardSummary: build.query<ApiSuccess<DashboardSummary>, void>({
      query: () => '/dashboard/summary',
      providesTags: ['Dashboard'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
