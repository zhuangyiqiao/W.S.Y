import { API_BASE_URL } from './config.js';

async function parseJsonResponse(res) {
  return res.json().catch(() => ({}));
}

export async function fetchCheckinsRequest() {
  const res = await fetch(`${API_BASE_URL}/checkins`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(data.error || '读取打卡数据失败');
  }

  return data;
}

export async function submitCheckinRequest(payload) {
  const res = await fetch(`${API_BASE_URL}/checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(data.error || '提交失败');
  }

  return data;
}

export async function updateCheckinRequest(recordId, payload) {
  const res = await fetch(`${API_BASE_URL}/checkin/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(data.error || '更新失败');
  }

  return data;
}

export async function deleteCheckinRequest(recordId) {
  const res = await fetch(`${API_BASE_URL}/checkin/${recordId}`, {
    method: 'DELETE'
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(data.error || '删除失败');
  }

  return data;
}
