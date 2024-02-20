import type { SMApiResponse, SMUploadedImg, SMUserProfile } from '@/types';

const BASE_URL = 'https://sm.ms/api/v2'; // SM.MS API Doc https://doc.sm.ms

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(BASE_URL + url, init);

  if (!res.ok || res.status !== 200) {
    throw new Error(res.statusText);
  }

  const json = (await res.json()) as SMApiResponse<T>;

  if (!json.success) {
    // 若上传了重复图片，则直接返回该图片地址
    if (json.code === 'image_repeated' && json.images) {
      const data = {
        url: json.images,
      };

      return data as T;
    }

    throw new Error(json.message);
  }

  return json.data;
};

/**
 * 上传图片最大大小（MB）
 */
export const IMG_MAX_SIZE = 5;

/**
 * 同时上传的最大图片数
 */
export const IMG_MAX_NUM = 10;

export const getUserProfile = async (apiKey: string): Promise<SMUserProfile> => {
  const data = await request<SMUserProfile>('/profile', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
    },
  });

  return data;
};

export const uploadImg = async (apiKey: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('smfile', file);

  const data = await request<SMUploadedImg>('/upload', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
    },
    body: formData,
  });

  return data.url;
};
