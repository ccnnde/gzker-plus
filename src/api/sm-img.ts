import type { SMApiResponse, SMUploadedImg, SMUsage, SMUserProfile } from '@/types';

const BASE_URL = 'https://s.ee/api/v1'; // S.EE API Doc https://s.ee/docs/developers/

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(BASE_URL + url, init);
  const json = (await res.json()) as SMApiResponse<T>;

  if (!res.ok || res.status !== 200) {
    throw new Error(`${res.status} ${json.message}`);
  }

  if (json.code !== 200) {
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
export const IMG_MAX_NUM = 5;

export const getUserProfile = async (apiKey: string): Promise<SMUserProfile> => {
  const data = await request<SMUserProfile>('/profile', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
    },
  });

  return data;
};

export const getUsage = async (apiKey: string): Promise<SMUsage> => {
  const data = await request<SMUsage>('/usage', {
    method: 'GET',
    headers: {
      Authorization: apiKey,
    },
  });

  return data;
};

export const uploadImg = async (apiKey: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('smfile', file);

  const data = await request<SMUploadedImg>('/file/upload', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
    },
    body: formData,
  });

  return data.url;
};
