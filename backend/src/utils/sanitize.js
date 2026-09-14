const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAGS = /<\/?[^>]+>/g;

const stripHtml = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(CONTROL_CHARS, '').replace(HTML_TAGS, '').replace(/[<>]/g, '').trim();
};

module.exports = { stripHtml };
