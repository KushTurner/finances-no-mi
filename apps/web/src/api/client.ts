export type RejectionResponse = {
  detail: string;
};

export async function send(url: string, init?: RequestInit) {
  return fetch(url, init).catch(() => {
    throw new Error('The API could not be reached');
  });
}

export function unexpectedStatus(response: Response) {
  return new Error(`The API responded with status ${response.status}`);
}

export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await send(url, init);
  if (!response.ok) {
    if (response.status === 400) {
      const error = (await response.json()) as RejectionResponse;
      throw new Error(error.detail);
    }
    throw unexpectedStatus(response);
  }
  return response.json() as Promise<T>;
}
