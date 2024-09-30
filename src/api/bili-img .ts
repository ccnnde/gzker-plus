import type { BiliApiResponse, BiliUploadedImg, BiliUserProfile } from '@/types';

const BASE_URL = 'https://api.bilibili.com/x';

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(BASE_URL + url, {
    credentials: 'include',
    ...init,
  });

  if (!res.ok || res.status !== 200) {
    throw new Error(res.statusText);
  }

  const json: BiliApiResponse<T> = await res.json();

  if (json.code !== 0) {
    throw new Error(json.message);
  }

  return json.data;
};

export const getUserProfile = async (): Promise<BiliUserProfile> => {
  const data = await request<BiliUserProfile>('/space/myinfo');
  return data;
};

export const uploadImg = async (csrf: string, file: File): Promise<BiliUploadedImg> => {
  const formData = new FormData();
  formData.append('biz', 'article');
  formData.append('csrf', csrf);
  formData.append('file_up', file);

  const data = await request<BiliUploadedImg>('/dynamic/feed/draw/upload_bfs', {
    method: 'POST',
    body: formData,
  });

  data.image_url = data.image_url.replace('http', 'https');

  return data;
};
