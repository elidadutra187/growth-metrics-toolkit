function reprocessarSomenteFalhas() {
  const empresas = META_IMG_CONFIG.EMPRESAS;

  for (let e = 0; e < empresas.length; e++) {
    const empresa = empresas[e];
    const ss = SpreadsheetApp.openById(empresa.spreadsheetId);
    const sheet = ss.getSheetByName(empresa.aba);
    if (!sheet) continue;

    const plataformas = ['instagram', 'facebook'];
    for (let p = 0; p < plataformas.length; p++) {
      const cfg = empresa.plataformas[plataformas[p]];
      if (!cfg || !cfg.ativo) continue;

      const indices = garantirColunasDaPlataforma(sheet, cfg);
      const ultimaLinha = sheet.getLastRow();
      if (ultimaLinha < 2) continue;

      const range = sheet.getRange(2, indices.status, ultimaLinha - 1, 1);
      const valores = range.getDisplayValues();

      for (let i = 0; i < valores.length; i++) {
        const status = String(valores[i][0] || '');
        if (status && !/^OK\b/i.test(status)) {
          sheet.getRange(i + 2, indices.status).clearContent();
        }
      }
    }
  }

  SpreadsheetApp.flush();
  processarTodasEmpresas();
}

function obterImagemInstagram(linkOriginal) {
  const link = normalizarInstagramUrl(linkOriginal);
  const candidatos = [];
  const codigo = extrairShortcodeInstagram(link);
  const rota = extrairRotaInstagram(link);

  if (codigo && rota === 'p') {
    const mediaUrl = 'https://www.instagram.com/p/' + codigo + '/media/?size=l';
    const direto = baixarImagemValidada(mediaUrl, 'instagram', 'IG_MEDIA_DIRECT', 120);
    if (direto) return direto;
  }

  const oembedUrl = 'https://graph.facebook.com/' + META_IMG_CONFIG.API_VERSION +
    '/instagram_oembed?url=' + encodeURIComponent(link) + '&omitscript=true&maxwidth=658';

  const oembed = buscarJsonSeguro(oembedUrl);
  if (oembed && !oembed.error) {
    if (oembed.thumbnail_url) adicionarCandidato(candidatos, oembed.thumbnail_url, 'IG_OEMBED_THUMB', 110);
    if (oembed.html) {
      extrairCandidatosInstagram(oembed.html, 'IG_OEMBED_HTML', 90).forEach(c => candidatos.push(c));
    }
  }

  if (codigo) {
    const base = 'https://www.instagram.com/' + rota + '/' + codigo + '/';
    const urlsEmbed = [base + 'embed/', base + 'embed/captioned/'];
    for (let i = 0; i < urlsEmbed.length; i++) {
      const htmlEmbed = buscarHtmlSeguro(urlsEmbed[i], 'https://www.instagram.com/');
      if (htmlEmbed) {
        extrairCandidatosInstagram(htmlEmbed, 'IG_EMBED', 100).forEach(c => candidatos.push(c));
      }
    }
  }

  const htmlPost = buscarHtmlSeguro(link, 'https://www.instagram.com/');
  if (htmlPost) {
    extrairCandidatosInstagram(htmlPost, 'IG_PAGE', 70).forEach(c => candidatos.push(c));
  }

  const melhor = selecionarMelhorCandidato(candidatos, 'instagram');
  if (melhor) return melhor;

  const detalhe = oembed && oembed.error
    ? ' | OEMBED ' + limitarTexto(String(oembed.error.message || ''), 80)
    : '';

  return { status: 'SEM IMAGEM PÚBLICA INSTAGRAM' + detalhe };
}

function obterImagemFacebook(linkOriginal) {
  const link = normalizarFacebookUrl(linkOriginal);
  const candidatos = [];
  const ehVideo = /\/reel\/|\/videos\/|fb\.watch\//i.test(link);

  const endpoint = ehVideo ? 'oembed_video' : 'oembed_post';
  const oembedUrl = 'https://graph.facebook.com/' + META_IMG_CONFIG.API_VERSION + '/' + endpoint +
    '?url=' + encodeURIComponent(link) + '&omitscript=true&maxwidth=500';

  const oembed = buscarJsonSeguro(oembedUrl);
  if (oembed && !oembed.error) {
    if (oembed.thumbnail_url) adicionarCandidato(candidatos, oembed.thumbnail_url, 'FB_OEMBED_THUMB', 110);
    if (oembed.html) {
      extrairCandidatosFacebook(oembed.html, 'FB_OEMBED_HTML', 85).forEach(c => candidatos.push(c));
    }
  }

  const plugins = [
    'https://www.facebook.com/plugins/post.php?href=' + encodeURIComponent(link) + '&show_text=true&width=500',
    'https://web.facebook.com/plugins/post.php?href=' + encodeURIComponent(link) + '&show_text=true&width=500'
  ];

  if (ehVideo) {
    plugins.unshift('https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(link) + '&show_text=true&width=500');
  }

  for (let i = 0; i < plugins.length; i++) {
    const htmlPlugin = buscarHtmlSeguro(plugins[i], 'https://www.facebook.com/');
    if (htmlPlugin) {
      extrairCandidatosFacebook(htmlPlugin, 'FB_PLUGIN', 105).forEach(c => candidatos.push(c));
    }
  }

  const htmlPagina = buscarHtmlSeguro(link, 'https://www.facebook.com/');
  if (htmlPagina) {
    extrairCandidatosFacebook(htmlPagina, 'FB_PAGE', 65).forEach(c => candidatos.push(c));
  }

  const melhor = selecionarMelhorCandidato(candidatos, 'facebook');
  if (melhor) return melhor;

  const detalhe = oembed && oembed.error
    ? ' | OEMBED ' + limitarTexto(String(oembed.error.message || ''), 80)
    : '';

  return { status: 'SEM IMAGEM PÚBLICA FACEBOOK' + detalhe };
}

function extrairCandidatosInstagram(html, metodo, prioridadeBase) {
  const lista = [];
  if (!html) return lista;

  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/gi
  ];

  coletarRegexUrls(html, metaPatterns, url => {
    adicionarCandidato(lista, url, metodo + '_META', prioridadeBase + 5);
  });

  const jsonPatterns = [
    /"display_url"\s*:\s*"([^"]+)"/gi,
    /"thumbnail_url"\s*:\s*"([^"]+)"/gi,
    /"thumbnail_src"\s*:\s*"([^"]+)"/gi,
    /"image_url"\s*:\s*"([^"]+)"/gi,
    /"poster"\s*:\s*"([^"]+)"/gi
  ];

  coletarRegexUrls(html, jsonPatterns, url => {
    adicionarCandidato(lista, url, metodo + '_JSON', prioridadeBase + 8);
  });

  coletarImagensHtml(html, url => {
    adicionarCandidato(lista, url, metodo + '_IMG', prioridadeBase);
  });

  const cdnRegex = /https?:(?:\\u002F|\\\/|\/){2}[^"'<>\s]+(?:cdninstagram\.com|fbcdn\.net)[^"'<>\s]*/gi;
  let m;
  while ((m = cdnRegex.exec(html)) !== null) {
    const url = limparUrlMeta(m[0]);
    if (pareceMidiaInstagram(url)) adicionarCandidato(lista, url, metodo + '_CDN', prioridadeBase - 2);
  }

  return lista;
}

function extrairCandidatosFacebook(html, metodo, prioridadeBase) {
  const lista = [];
  if (!html) return lista;

  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/gi
  ];

  coletarRegexUrls(html, metaPatterns, url => {
    adicionarCandidato(lista, url, metodo + '_META', prioridadeBase + 5);
  });

  coletarImagensHtml(html, url => {
    adicionarCandidato(lista, url, metodo + '_IMG', prioridadeBase);
  });

  const bgRegex = /background-image\s*:\s*url\((?:["']?)([^)"']+)(?:["']?)\)/gi;
  let bg;
  while ((bg = bgRegex.exec(html)) !== null) {
    adicionarCandidato(lista, bg[1], metodo + '_BG', prioridadeBase - 2);
  }

  const cdnRegex = /https?:(?:\\u002F|\\\/|\/){2}[^"'<>\s]+(?:fbcdn\.net|fbsbx\.com)[^"'<>\s]*/gi;
  let m;
  while ((m = cdnRegex.exec(html)) !== null) {
    adicionarCandidato(lista, limparUrlMeta(m[0]), metodo + '_CDN', prioridadeBase - 4);
  }

  return lista;
}
