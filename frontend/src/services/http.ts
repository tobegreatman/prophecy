import axios from 'axios';

import type { ApiEnvelope } from '../types/lottery';

export const http = axios.create({
  baseURL: '/',
  timeout: 12000
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? '请求失败';
    return Promise.reject(new Error(message));
  }
);

export async function unwrapResponse<T>(request: Promise<{ data: ApiEnvelope<T> }>) {
  const response = await request;
  if (response.data.code !== 0) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}
