'use strict';

const files = document.querySelector('#files');
const drop = document.querySelector('#drop');
const status = document.querySelector('#status');
const errors = document.querySelector('#errors');
const results = document.querySelector('#results');
const messages = document.querySelector('#messages');
const message = document.querySelector('#message');
const count = document.querySelector('#count');
const emails = [];
const pending = [];
let importing = false;
let selected = 0;

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function address(value) {
  if (!value) return '';
  if (value.group) return value.name + ': ' + value.group.map(address).join(', ');
  return value.name && value.address ? value.name + ' <' + value.address + '>' : value.address || value.name || '';
}

function htmlText(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script,style,head,template,title,noscript').forEach(node => node.remove());
  template.content.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  template.content.querySelectorAll('p,div,li,blockquote,tr,h1,h2,h3,h4,h5,h6').forEach(node => node.append('\n'));
  return template.content.textContent.trim().replace(/\n{3,}/g, '\n\n');
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = name.replace(/[\\/]/g, '_');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function showMessage() {
  const email = emails[selected];
  const fields = element('dl');
  for (const [label, value] of [
    ['De', email.remitente], ['Para', email.destinatarios.join(', ')],
    ['CC', email.cc.join(', ')], ['Fecha', email.fecha], ['Archivo', email.archivo]
  ]) {
    if (value) fields.append(element('dt', label), element('dd', value));
  }
  message.replaceChildren(element('h3', email.asunto || '(Sin asunto)'), fields,
    element('p', email.cuerpo || '(Sin texto en el mensaje)', 'body'));

  if (email.adjuntos.length) {
    const list = element('ul', undefined, 'attachments');
    for (const attachment of email.adjuntos) {
      const item = element('li');
      const button = element('button', attachment.nombre);
      button.addEventListener('click', () => {
        download(new Blob([attachment.contenido], {type: 'application/octet-stream'}), attachment.nombre);
      });
      item.append(button, ' · ' + new Intl.NumberFormat('es').format(attachment.bytes) + ' bytes');
      list.append(item);
    }
    message.append(element('h4', 'Adjuntos'), list);
  }
  Array.from(messages.children).forEach((button, index) => {
    button.setAttribute('aria-current', String(index === selected));
  });
}

function render() {
  count.textContent = '(' + emails.length + ')';
  results.hidden = !emails.length;
  messages.replaceChildren();
  message.replaceChildren();
  for (const [index, email] of emails.entries()) {
    const button = element('button', email.asunto || email.archivo);
    button.addEventListener('click', () => {
      selected = index;
      showMessage();
    });
    messages.append(button);
  }
  if (emails.length) showMessage();
}

async function readEmail(file) {
  if (!/\.eml$/i.test(file.name)) throw new Error('Selecciona un archivo .eml.');
  if (!file.size) throw new Error('El archivo está vacío.');
  if (file.size > 25000000) throw new Error('El archivo supera los 25 MB.');
  const parsed = await PostalMime.parse(await file.arrayBuffer());
  if (!parsed.headers.some(header => /^(from|to|date|subject|message-id|mime-version|content-type|received)$/.test(header.key))) {
    throw new Error('El archivo no contiene encabezados de correo reconocibles.');
  }
  return {
    archivo: file.name,
    asunto: parsed.subject || '',
    remitente: address(parsed.from),
    destinatarios: (parsed.to || []).map(address),
    cc: (parsed.cc || []).map(address),
    fecha: parsed.date || '',
    idMensaje: parsed.messageId || '',
    cuerpo: parsed.text?.trim() || htmlText(parsed.html || ''),
    adjuntos: parsed.attachments.map((part, index) => ({
      nombre: part.filename || 'adjunto-' + (index + 1),
      tipo: part.mimeType,
      bytes: part.content.byteLength,
      contenido: part.content
    }))
  };
}

async function importFiles(list) {
  pending.push(...list);
  if (importing || !pending.length) return;
  importing = true;
  document.querySelector('#clear').disabled = true;
  errors.replaceChildren();
  errors.hidden = true;
  while (pending.length) {
    const file = pending.shift();
    status.textContent = 'Leyendo ' + file.name + '…';
    try {
      emails.push(await readEmail(file));
    } catch (error) {
      errors.append(element('li', file.name + ' — ' + error.message));
      errors.hidden = false;
    }
  }
  importing = false;
  document.querySelector('#clear').disabled = false;
  render();
  status.textContent = emails.length
    ? emails.length + (emails.length === 1 ? ' correo disponible.' : ' correos disponibles.')
    : 'No se pudo extraer ningún correo.';
}

files.addEventListener('change', () => {
  void importFiles(Array.from(files.files));
  files.value = '';
});

window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
drop.addEventListener('dragover', () => drop.classList.add('active'));
drop.addEventListener('dragleave', event => {
  if (!drop.contains(event.relatedTarget)) drop.classList.remove('active');
});
drop.addEventListener('drop', event => {
  drop.classList.remove('active');
  void importFiles(Array.from(event.dataTransfer.files));
});

document.querySelector('#clear').addEventListener('click', () => {
  emails.length = 0;
  selected = 0;
  errors.replaceChildren();
  errors.hidden = true;
  status.textContent = 'Correos eliminados de la vista.';
  render();
  files.focus();
});

document.querySelector('#export').addEventListener('click', () => {
  const data = emails.map(email => ({
    ...email,
    adjuntos: email.adjuntos.map(({nombre, tipo, bytes}) => ({nombre, tipo, bytes}))
  }));
  download(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}), 'correos.json');
});
