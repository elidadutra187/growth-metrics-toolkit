function garantirColunasDaPlataforma(sheet, cfg) {
  const ultimaColuna = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0];

  function achar(nome) {
    const alvo = normalizarHeader(nome);
    for (let i = 0; i < headers.length; i++) {
      if (normalizarHeader(headers[i]) === alvo) return i + 1;
    }
    return 0;
  }

  const link = achar(cfg.linkHeader);
  const imagem = achar(cfg.imagemHeader);
  const arquivo = achar(cfg.arquivoHeader);
  const status = achar(cfg.statusHeader);

  if (!link) throw new Error('Coluna de link não encontrada: "' + cfg.linkHeader + '" na aba "' + sheet.getName() + '".');
  if (!imagem) throw new Error('Coluna existente não encontrada: "' + cfg.imagemHeader + '". O script não criará outra coluna automaticamente.');
  if (!arquivo) throw new Error('Coluna existente não encontrada: "' + cfg.arquivoHeader + '". O script não criará outra coluna automaticamente.');
  if (!status) throw new Error('Coluna existente não encontrada: "' + cfg.statusHeader + '". O script não criará outra coluna automaticamente.');

  return { link: link, imagem: imagem, arquivo: arquivo, status: status };
}

function normalizarHeader(valor) {
  return String(valor || '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]+/g, '');
}

function limparUrlMeta(url) {
  if (!url) return null;
  let texto = String(url)
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002F/gi, '/')
    .replace(/\\u003D/gi, '=')
    .replace(/\\u003F/gi, '?')
    .replace(/\\u003A/gi, ':')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();

  texto = texto.replace(/^https?:\\+\/+/,
    m => m.replace(/\\/g, '/'));
  return texto;
}

function ehAssetGenericoMeta(url) {
  if (!url) return true;
  const t = String(url).toLowerCase();
  const bloqueados = [
    'static.cdninstagram.com','static.xx.fbcdn.net','/rsrc.php','favicon','sprite','glyph','placeholder',
    'instagram_logo','instagram-logo','logo_instagram','instagram_icon','emoji.php','/emoji/','safe_image.php','profile_pic_url'
  ];
  for (let i = 0; i < bloqueados.length; i++) {
    if (t.indexOf(bloqueados[i]) !== -1) return true;
  }
  return false;
}

function pareceMidiaInstagram(url) {
  if (!url || ehAssetGenericoMeta(url)) return false;
  const t = String(url).toLowerCase();
  if (t.indexOf('t51.2885-19') !== -1) return false;
  return t.indexOf('cdninstagram.com') !== -1 || t.indexOf('fbcdn.net') !== -1;
}

function normalizarInstagramUrl(url) {
  const m = String(url || '').match(/https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([^\/?#]+)/i);
  if (!m) return String(url || '').trim();
  const rota = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
  return 'https://www.instagram.com/' + rota + '/' + m[2] + '/';
}

function extrairShortcodeInstagram(url) {
  const m = String(url || '').match(/instagram\.com\/(?:p|reel|reels|tv)\/([^\/?#]+)/i);
  return m ? m[1] : null;
}

function extrairRotaInstagram(url) {
  const m = String(url || '').match(/instagram\.com\/(p|reel|reels|tv)\//i);
  if (!m) return 'p';
  return m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
}

function normalizarFacebookUrl(url) {
  let texto = String(url || '').trim();
  texto = texto.replace(/^https?:\/\/(?:m|web)\.facebook\.com/i, 'https://www.facebook.com');
  texto = texto.split('#')[0];
  const partes = texto.split('?');
  if (partes.length === 1) return texto;

  const base = partes.shift();
  const query = partes.join('?');
  const permitidos = { fbid: true, set: true, type: true, story_fbid: true, id: true };
  const saida = [];

  query.split('&').forEach(par => {
    if (!par) return;
    const pos = par.indexOf('=');
    const chave = decodeURIComponent(pos >= 0 ? par.slice(0, pos) : par);
    const valor = pos >= 0 ? par.slice(pos + 1) : '';
    if (permitidos[chave]) saida.push(chave + '=' + valor);
  });

  return base + (saida.length ? '?' + saida.join('&') : '');
}

function obterIdentificadorMidia(url, plataforma) {
  if (plataforma === 'instagram') {
    return sanitizarNome(extrairShortcodeInstagram(url) || hashCurto(url));
  }

  const t = String(url || '');
  let m = t.match(/\/reel\/([^\/?#]+)/i);
  if (m) return sanitizarNome(m[1]);
  m = t.match(/\/posts\/(pfbid[\w-]+)/i);
  if (m) return sanitizarNome(m[1]);
  m = t.match(/[?&](?:fbid|story_fbid)=([^&#]+)/i);
  if (m) return sanitizarNome(m[1]);
  return sanitizarNome(hashCurto(t));
}

function hashCurto(texto) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    String(texto || ''),
    Utilities.Charset.UTF_8
  );
  return digest.slice(0, 8).map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
}

function sanitizarNome(texto) {
  return String(texto || 'midia').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 100);
}

function extensaoDoBlob(blob) {
  const ct = String(blob.getContentType() || '').toLowerCase();
  if (ct.indexOf('png') !== -1) return '.png';
  if (ct.indexOf('webp') !== -1) return '.webp';
  if (ct.indexOf('gif') !== -1) return '.gif';
  if (ct.indexOf('bmp') !== -1) return '.bmp';
  return '.jpg';
}

function gerarUrlThumbnailDrive(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
}

function extrairIdGoogleDrive(url) {
  if (!url) return null;
  const t = String(url);
  let m = t.match(/[?&]id=([^&]+)/i);
  if (m && m[1]) return m[1];
  m = t.match(/\/file\/d\/([^\/]+)/i);
  if (m && m[1]) return m[1];
  m = t.match(/\/d\/([^\/]+)/i);
  return m && m[1] ? m[1] : null;
}

function obterOuCriarPasta(pastaPai, nome) {
  const it = pastaPai.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return pastaPai.createFolder(nome);
}

function lerUInt32BE(bytes, offset) {
  return (((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
}

function limitarTexto(texto, max) {
  texto = String(texto || '');
  return texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
}

function agendarContinuacao() {
  removerGatilhosContinuacao();
  ScriptApp.newTrigger('continuarProcessamentoAutomatico').timeBased().after(90 * 1000).create();
}

function removerGatilhosContinuacao() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'continuarProcessamentoAutomatico') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
