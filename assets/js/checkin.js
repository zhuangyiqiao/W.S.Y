import { MAX_EVIDENCE_FILE_SIZE } from './config.js';
import { formatFileSize, readFileAsDataURL } from './utils.js';
import { setSubmitLoading, showToast } from './render.js';
import { submitCheckinRequest } from './api.js';

export function selectType(btn) {
  document.querySelectorAll('.type-btn').forEach(button => button.classList.remove('selected'));
  btn.classList.add('selected');
}

export function getSelectedType() {
  const selected = document.querySelector('.type-btn.selected');
  return selected ? selected.dataset.type : '';
}

export function validatePayload(payload) {
  if (!payload.user) return '请选择用户';
  if (!payload.date) return '请选择日期';
  if (!payload.type) return '请选择打卡类型';

  if (
    payload.type !== '饮食稳定' &&
    payload.type !== '经期无暴食' &&
    payload.type !== '补卡'
  ) {
    if (payload.duration === null || Number.isNaN(payload.duration)) {
      return '请输入运动时长';
    }
    if (payload.duration < 0) {
      return '运动时长不能小于 0';
    }
  }

  return '';
}

export function handleEvidenceFileChange() {
  const input = document.getElementById('evidence-file-input');
  const meta = document.getElementById('evidence-file-meta');
  const file = input?.files?.[0];

  if (!meta) return;

  if (!file) {
    meta.textContent = '未选择附件';
    return;
  }

  meta.textContent = `已选择：${file.name} · ${formatFileSize(file.size)}`;
}

export async function submitCheckin() {
  const fileInput = document.getElementById('evidence-file-input');
  const selectedFile = fileInput?.files?.[0] || null;

  const payload = {
    user: document.getElementById('user-select')?.value || '',
    date: document.getElementById('date-input')?.value || '',
    type: getSelectedType(),
    duration: document.getElementById('duration-input')?.value
      ? Number(document.getElementById('duration-input').value)
      : null,
    steps: document.getElementById('steps-input')?.value
      ? Number(document.getElementById('steps-input').value)
      : null,
    evidence: '',
    weight: document.getElementById('weight-input')?.value
      ? Number(document.getElementById('weight-input').value)
      : null,
    note: document.getElementById('note-input')?.value?.trim() || ''
  };

  const error = validatePayload(payload);
  if (error) {
    showToast(`[ ${error} ]`, 2200);
    return;
  }

  try {
    setSubmitLoading(true);

    if (selectedFile) {
      if (selectedFile.size > MAX_EVIDENCE_FILE_SIZE) {
        throw new Error('附件不能超过 2MB');
      }

      const dataUrl = await readFileAsDataURL(selectedFile);
      payload.evidence = {
        mode: 'embedded_file',
        filename: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        size: selectedFile.size,
        dataUrl
      };
    }

    await submitCheckinRequest(payload);

    showToast('[ 打卡提交成功 ]');

    document.getElementById('duration-input').value = '';
    document.getElementById('steps-input').value = '';
    document.getElementById('weight-input').value = '';
    document.getElementById('note-input').value = '';

    if (fileInput) {
      fileInput.value = '';
    }

    const meta = document.getElementById('evidence-file-meta');
    if (meta) {
      meta.textContent = '未选择附件';
    }

    const firstTypeBtn = document.querySelector('.type-btn[data-type="健身房"]');
    if (firstTypeBtn) {
      document.querySelectorAll('.type-btn').forEach(button => button.classList.remove('selected'));
      firstTypeBtn.classList.add('selected');
    }

    window.dispatchEvent(new CustomEvent('checkin:submitted'));
  } catch (err) {
    console.error(err);
    showToast(`[ ${err.message || '提交失败，请稍后再试'} ]`, 3000);
  } finally {
    setSubmitLoading(false);
  }
}
