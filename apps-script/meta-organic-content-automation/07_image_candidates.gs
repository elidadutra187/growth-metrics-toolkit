function coletarRegexUrls(html, patterns, callback) {
  for (let p = 0; p < patterns.length; p++) {
    const regex = patterns[p];
    let match;
    while ((match = regex.exec(html)) !== null) callback(match[1]);
  }
}

function coletarImagensHtml(html, callback) {
  const srcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = srcRegex.exec(html)) !== null) callback(m[1]);

  const srcsetRegex = /<img[^>]+srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRegex.exec(html)) !== null) {
    const partes = String(m[1]).split(',');
    for (let i = 0; i < partes.length; i++) {
      const url = partes[i].trim().split(/\s+/)[0];
      if (url) callback(url);
    }
  }
}

function adicionarCandidato(lista, url, metodo, prioridade) {
  url = limparUrlMeta(url);
  if (!url || !/^https?:\/\//i.test(url)) return;
  if (ehAssetGenericoMeta(url)) return;

  for (let i = 0; i < lista.length; i++) {
    if (lista[i].url === url) {
      if (prioridade > lista[i].prioridade) {
        lista[i].prioridade = prioridade;
        lista[i].metodo = metodo;
      }
      return;
    }
  }

  lista.push({ url: url, metodo: metodo, prioridade: prioridade || 0 });
}

function selecionarMelhorCandidato(candidatos, plataforma) {
  if (!candidatos || !candidatos.length) return null;
  candidatos.sort((a, b) => b.prioridade - a.prioridade);
  const limite = Math.min(candidatos.length, META_IMG_CONFIG.MAX_CANDIDATOS);
  let melhor = null;

  for (let i = 0; i < limite; i++) {
    const c = candidatos[i];
    const resultado = baixarImagemValidada(c.url, plataforma, c.metodo, c.prioridade);
    if (!resultado) continue;

    const area = resultado.largura * resultado.altura;
    const score = (c.prioridade * 10000000) + Math.min(area, 6000000);
    resultado.score = score;
    if (!melhor || score > melhor.score) melhor = resultado;
    if (c.prioridade >= 100 && area >= 700000) break;
  }

  return melhor;
}

function baixarImagemValidada(url, plataforma, metodo, prioridade) {
  if (!url || ehAssetGenericoMeta(url)) return null;

  try {
    const resposta = fetchComRetry(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: headersNavegador(plataforma === 'instagram' ? 'https://www.instagram.com/' : 'https://www.facebook.com/')
    });

    if (!resposta || resposta.getResponseCode() !== 200) return null;
    const blob = resposta.getBlob();
    const contentType = String(blob.getContentType() || '').toLowerCase();
    if (!contentType.startsWith('image/')) return null;

    const bytes = blob.getBytes();
    if (bytes.length < META_IMG_CONFIG.MIN_BYTES) return null;

    const dimensoes = obterDimensoesImagem(bytes, contentType);
    if (!dimensoes || !dimensoes.width || !dimensoes.height) return null;
    if (!dimensoesValidas(dimensoes.width, dimensoes.height, plataforma, url)) return null;

    return {
      blob: blob,
      urlOrigem: url,
      metodo: metodo || 'DIRETO',
      prioridade: prioridade || 0,
      largura: dimensoes.width,
      altura: dimensoes.height
    };
  } catch (erro) {
    Logger.log('Candidato rejeitado: ' + limitarTexto(String(erro.message || erro), 120));
    return null;
  }
}

function dimensoesValidas(width, height, plataforma, url) {
  const area = width * height;
  const maior = Math.max(width, height);
  const menor = Math.min(width, height);
  const texto = String(url || '').toLowerCase();

  if (plataforma === 'instagram') {
    if (texto.includes('t51.2885-19')) return false;
    if (texto.includes('profile_pic')) return false;
    if (maior < 500 || menor < 280 || area < 180000) return false;
    if (width <= 400 && height <= 400) return false;
  } else {
    if (maior < 450 || menor < 180 || area < 120000) return false;
    if (width <= 360 && height <= 360) return false;
  }

  return true;
}
