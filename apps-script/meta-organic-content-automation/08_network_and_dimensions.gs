function obterDimensoesImagem(bytes, contentType) {
  try {
    const b = bytes.map(v => v < 0 ? v + 256 : v);

    if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
      return { width: lerUInt32BE(b, 16), height: lerUInt32BE(b, 20) };
    }

    if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
      return { width: b[6] | (b[7] << 8), height: b[8] | (b[9] << 8) };
    }

    if (b.length > 4 && b[0] === 0xFF && b[1] === 0xD8) {
      let offset = 2;
      while (offset + 9 < b.length) {
        if (b[offset] !== 0xFF) { offset++; continue; }
        const marker = b[offset + 1];
        if (marker === 0xD8 || marker === 0xD9) { offset += 2; continue; }
        if (offset + 3 >= b.length) break;

        const length = (b[offset + 2] << 8) + b[offset + 3];
        if (length < 2) break;
        const sof = [0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF];
        if (sof.indexOf(marker) !== -1 && offset + 8 < b.length) {
          return {
            height: (b[offset + 5] << 8) + b[offset + 6],
            width: (b[offset + 7] << 8) + b[offset + 8]
          };
        }
        offset += 2 + length;
      }
    }

    if (b.length > 30 && String.fromCharCode(b[0],b[1],b[2],b[3]) === 'RIFF' &&
        String.fromCharCode(b[8],b[9],b[10],b[11]) === 'WEBP') {
      const chunk = String.fromCharCode(b[12],b[13],b[14],b[15]);

      if (chunk === 'VP8X' && b.length >= 30) {
        const width = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
        const height = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
        return { width: width, height: height };
      }

      if (chunk === 'VP8L' && b.length >= 25) {
        const b1 = b[21], b2 = b[22], b3 = b[23], b4 = b[24];
        const width = 1 + (((b2 & 0x3F) << 8) | b1);
        const height = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6));
        return { width: width, height: height };
      }

      if (chunk === 'VP8 ' && b.length >= 30) {
        for (let i = 20; i < Math.min(b.length - 9, 80); i++) {
          if (b[i] === 0x9D && b[i + 1] === 0x01 && b[i + 2] === 0x2A) {
            const width = (b[i + 3] | (b[i + 4] << 8)) & 0x3FFF;
            const height = (b[i + 5] | (b[i + 6] << 8)) & 0x3FFF;
            return { width: width, height: height };
          }
        }
      }
    }
  } catch (erro) {
    Logger.log('Falha ao ler dimensões: ' + erro.message);
  }
  return null;
}

function buscarHtmlSeguro(url, referer) {
  try {
    const resposta = fetchComRetry(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: headersNavegador(referer)
    });

    if (!resposta) return null;
    const code = resposta.getResponseCode();
    if (code < 200 || code >= 300) return null;

    const ct = String(resposta.getHeaders()['Content-Type'] || '').toLowerCase();
    if (ct && ct.indexOf('text/html') === -1 && ct.indexOf('application/xhtml') === -1) return null;
    return resposta.getContentText();
  } catch (erro) {
    Logger.log('HTML indisponível: ' + limitarTexto(erro.message, 100));
    return null;
  }
}

function buscarJsonSeguro(url) {
  try {
    const resposta = fetchComRetry(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LookerImageFetcher/2.0)',
        'Accept': 'application/json,text/plain,*/*'
      }
    });

    if (!resposta) return null;
    const texto = resposta.getContentText();
    if (!texto) return null;
    try { return JSON.parse(texto); }
    catch (erroJson) { return null; }
  } catch (erro) {
    return null;
  }
}

function fetchComRetry(url, options) {
  let ultimoErro = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const resposta = UrlFetchApp.fetch(url, options || {});
      const code = resposta.getResponseCode();
      if ([429,500,502,503,504].indexOf(code) !== -1 && tentativa < 2) {
        Utilities.sleep(700 * Math.pow(2, tentativa) + Math.floor(Math.random() * 300));
        continue;
      }
      return resposta;
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < 2) Utilities.sleep(700 * Math.pow(2, tentativa) + Math.floor(Math.random() * 300));
    }
  }
  if (ultimoErro) throw ultimoErro;
  return null;
}

function headersNavegador(referer) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache'
  };
  if (referer) headers['Referer'] = referer;
  return headers;
}
