import { API_BASE_URL } from './config.js';

export async function submitCheckinRequest(payload) {
  const res = await fetch(`${API_BASE_URL}/checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || '提交失败');
  }

  return data;
}
