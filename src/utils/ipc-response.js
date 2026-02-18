const ok = (data = {}) => ({ success: true, ...data });
const fail = (error) => ({ success: false, error: typeof error === 'string' ? error : error.message });

module.exports = { ok, fail };
