import { getXsrfToken } from '@/utils';

import type { GzkImageResponse } from '@/types';

const GZK_IMG_MAX_NUM = 9;
const GZK_IMG_MAX_SIZE = 10;
const activeUploads = new Set<Promise<string>>();

class GzkImageUploadError extends Error {
  public constructor(message: string, public readonly code?: string) {
    super(message);
  }

  public get isBindingError(): boolean {
    return this.code === 'not_bound' || this.code === 'invalid_token';
  }
}

const readImageResponse = async <T>(response: Response): Promise<T | undefined> => {
  const message = `Gzk image request failed (HTTP ${response.status})`;
  let result: GzkImageResponse<T> | null;

  try {
    result = (await response.json()) as GzkImageResponse<T> | null;
  } catch {
    throw new GzkImageUploadError(message);
  }

  if (!response.ok || !result?.ok) {
    throw new GzkImageUploadError(message, result?.error);
  }

  return result.data;
};

const checkGzkImageBinding = async (): Promise<void> => {
  const response = await fetch('/api/media/settings', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  const settings = await readImageResponse<{ bound: boolean }>(response);

  if (settings?.bound === false) {
    throw new GzkImageUploadError('ImgURL is not linked', 'not_bound');
  }

  if (settings?.bound !== true) {
    throw new GzkImageUploadError(`Invalid Gzk image settings (HTTP ${response.status})`);
  }
};

const postGzkImage = async (file: File): Promise<string> => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(randomBytes, (byte) => {
    return byte.toString(16).padStart(2, '0');
  }).join('');

  const response = await fetch(`/api/media/uploads/${id}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-XSRFToken': getXsrfToken(),
    },
    body: file,
    signal: AbortSignal.timeout(95_000),
  });

  const data = await readImageResponse<{ url?: string }>(response);
  const url = data?.url;

  if (!url) {
    throw new GzkImageUploadError(`Missing Gzk image URL (HTTP ${response.status})`);
  }

  return url;
};

const uploadGzkImage = async (file: File, queue: AbortController): Promise<string> => {
  const maxConcurrentUploads = matchMedia('(pointer: coarse)').matches ? 1 : 2;

  while (activeUploads.size >= maxConcurrentUploads) {
    queue.signal.throwIfAborted();

    try {
      await Promise.race(activeUploads);
    } catch {
      // 失败的上传也会释放并发名额，继续检查是否可以上传。
    }
  }

  queue.signal.throwIfAborted();

  const upload = postGzkImage(file);
  activeUploads.add(upload);

  try {
    return await upload;
  } catch (error) {
    if (error instanceof GzkImageUploadError && error.isBindingError) {
      queue.abort(error);
    }

    throw error;
  } finally {
    activeUploads.delete(upload);
  }
};

export { checkGzkImageBinding, GZK_IMG_MAX_NUM, GZK_IMG_MAX_SIZE, GzkImageUploadError, uploadGzkImage };
