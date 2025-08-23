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

const getImgSize = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
      });
    };

    img.src = URL.createObjectURL(file);
  });
};

export const getUserProfile = async (): Promise<BiliUserProfile> => {
  const data = await request<BiliUserProfile>('/space/myinfo');
  return data;
};

export const uploadImg = async (csrf: string, file: File): Promise<BiliUploadedImg> => {
  const formData = new FormData();
  formData.append('bucket', 'openplatform');
  formData.append('csrf', csrf);
  formData.append('file', file);

  const data = await request<BiliUploadedImg>('/upload/web/image', {
    method: 'POST',
    body: formData,
  });

  const { width, height } = await getImgSize(file);
  data.location = data.location.replace('http', 'https');
  data.image_width = width;
  data.image_height = height;
  data.img_size = file.size / 1000; // 兼容使用旧接口上传至 BiliBili 图床时，记录的图片 size 值为图片字节数除以 1000 的情况

  return data;
};
