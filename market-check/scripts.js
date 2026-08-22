(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwbPdGIZ28Jjm6zYP25jo-P1Sgll2ndMkTqQz7q8YO_XlXapU3blPVpS1lO4B_Em-QA/exec';
  const form = document.getElementById('market-form');
  const button = document.getElementById('submit-button');
  const status = document.getElementById('submit-status');
  const completion = document.getElementById('completion');
  const errorMap = { salonName: 'salonName', name: 'name', email: 'email', emailConfirmation: 'emailConfirmation', phone: 'phone', contactTime: 'contactTime', privacyConsent: 'privacyConsent', otherInterest: 'otherInterest' };

  document.getElementById('form-loaded-at').value = String(Date.now());
  setTrackingParameters();

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.id === 'interest-other-toggle') toggleOtherInterest();
    clearError(input.name || input.id);
    if (input.name === 'email' || input.name === 'emailConfirmation') clearError('emailConfirmation');
  });
  form.addEventListener('input', event => clearError(event.target.name || event.target.id));

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearAllErrors();
    const payload = serialize();
    const errors = validate(payload);
    if (Object.keys(errors).length) return showErrors(errors);
    setSending(true);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ payload: JSON.stringify(payload) })
    })
      .then(response => {
        if (!response.ok) throw new Error('Submission failed');
        return response.json();
      })
      .then(response => {
        if (response && response.success) return showCompletion();
        setSending(false);
        showErrors((response && response.fieldErrors) || { form: (response && response.message) || '送信中に問題が発生しました。恐れ入りますが、少し時間をおいて再度お試しください。' });
      })
      .catch(() => {
        setSending(false);
        showErrors({ form: '送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。' });
      });
  });

  function setTrackingParameters() {
    const apply = parameters => {
      const get = name => parameters && parameters[name] ? String(Array.isArray(parameters[name]) ? parameters[name][0] : parameters[name]) : '';
      document.getElementById('source').value = get('source');
      document.getElementById('salon-identifier').value = get('salon');
      document.getElementById('campaign').value = get('campaign');
    };
    const local = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    apply(local);
  }

  function toggleOtherInterest() {
    const enabled = document.getElementById('interest-other-toggle').checked;
    document.getElementById('other-interest-wrap').hidden = !enabled;
    if (!enabled) document.getElementById('otherInterest').value = '';
  }

  function serialize() {
    const value = name => (form.elements[name] ? String(form.elements[name].value || '').trim() : '');
    const selected = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
    return {
      customerAge: selected('customerAge')[0] || '', regularCustomers: selected('regularCustomers')[0] || '',
      familyConsultation: selected('familyConsultation')[0] || '', homeCareGuidance: selected('homeCareGuidance')[0] || '',
      interests: selected('interests'), otherInterest: value('otherInterest'), salonName: value('salonName'), name: value('name'),
      email: value('email'), emailConfirmation: value('emailConfirmation'), phone: value('phone'), contactTime: value('contactTime'),
      message: value('message'), privacyConsent: form.elements.privacyConsent.checked, website: value('website'),
      formLoadedAt: value('formLoadedAt'), source: value('source'), salonIdentifier: value('salonIdentifier'), campaign: value('campaign'), userAgent: navigator.userAgent
    };
  }

  function validate(data) {
    const errors = {};
    ['customerAge', 'regularCustomers', 'familyConsultation', 'homeCareGuidance'].forEach(key => { if (!data[key]) errors[key] = '選択肢から1つお選びください。'; });
    if (!data.interests.length) errors.interests = '質問5を1つ以上お選びください。';
    if (data.interests.includes('その他') && !data.otherInterest) errors.otherInterest = '「その他」の内容をご入力ください。';
    if (!data.salonName) errors.salonName = 'サロン名を入力してください。';
    if (!data.name) errors.name = 'お名前を入力してください。';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'メールアドレスを入力してください。';
    if (data.email !== data.emailConfirmation) errors.emailConfirmation = '確認用メールアドレスが一致していません。';
    const phone = data.phone.replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)).replace(/[\s－ー―‐-]/g, '');
    if (!/^0\d{9,10}$/.test(phone)) errors.phone = '電話番号をご確認ください。';
    if (!data.contactTime) errors.contactTime = '連絡しやすい時間帯を選択してください。';
    if (!data.privacyConsent) errors.privacyConsent = 'プライバシーポリシーへの同意が必要です。';
    return errors;
  }

  function showErrors(errors) {
    const firstKey = Object.keys(errors)[0];
    Object.entries(errors).forEach(([key, message]) => {
      const error = document.getElementById(`${key}-error`);
      if (error) error.textContent = message;
      const field = document.querySelector(`[data-field="${key}"]`) || document.querySelector(`[data-field="${errorMap[key] || key}"]`);
      if (field) field.dataset.invalid = 'true';
    });
    const first = document.querySelector(`[data-field="${firstKey}"]`) || document.getElementById(`${firstKey}-error`);
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const target = first.querySelector('input, textarea, select');
      if (target) setTimeout(() => target.focus(), 400);
    }
  }

  function clearError(key) {
    const targetKey = key === 'interests' ? 'interests' : (errorMap[key] || key);
    const error = document.getElementById(`${targetKey}-error`);
    if (error) error.textContent = '';
    const field = document.querySelector(`[data-field="${targetKey}"]`);
    if (field) delete field.dataset.invalid;
  }

  function clearAllErrors() {
    document.querySelectorAll('.field-error').forEach(element => element.textContent = '');
    document.querySelectorAll('[data-invalid]').forEach(element => delete element.dataset.invalid);
  }

  function setSending(sending) {
    button.disabled = sending;
    button.querySelector('.button-label').innerHTML = sending ? '送信しています…' : '<span class="button-number">5</span>つの回答を送る';
    status.textContent = sending ? '送信中です。しばらくお待ちください。' : '';
  }

  function showCompletion() {
    form.hidden = true;
    completion.hidden = false;
    completion.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
