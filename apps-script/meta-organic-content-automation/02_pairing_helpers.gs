function localizarOuCriarLinhaOrganic_(linhas, ctx, plataforma, url, data, empresaNome, linhasReservadas) {
  const headerLink = plataforma === 'facebook' ? 'link_facebook' : 'link_instagram';
  const outroLink = plataforma === 'facebook' ? 'link_instagram' : 'link_facebook';
  const chave = normalizarUrlChaveOrganic_(url);
  const reservadas = linhasReservadas || new Set();

  // 1) Sempre prioriza correspondência exata de URL.
  for (let i = 0; i < linhas.length; i++) {
    if (normalizarUrlChaveOrganic_(getOrganic_(linhas[i], ctx, headerLink)) === chave) return linhas[i];
  }

  // 2) Se a outra plataforma já está na linha na mesma data e esta plataforma está vazia,
  // completa a linha em vez de criar outra.
  for (let i = 0; i < linhas.length; i++) {
    if (reservadas.has(linhas[i])) continue;
    if (dataOrganic_(getOrganic_(linhas[i], ctx, 'data_publicacao')) === data &&
        !String(getOrganic_(linhas[i], ctx, headerLink) || '').trim() &&
        String(getOrganic_(linhas[i], ctx, outroLink) || '').trim()) {
      return linhas[i];
    }
  }

  // 3) Compatibilidade com links antigos do Facebook (pfbid) e links numéricos atuais.
  // Quando existe apenas uma candidata não reservada na mesma data, reutiliza a linha.
  const candidatas = [];
  for (let i = 0; i < linhas.length; i++) {
    if (reservadas.has(linhas[i])) continue;
    if (dataOrganic_(getOrganic_(linhas[i], ctx, 'data_publicacao')) === data) candidatas.push(linhas[i]);
  }
  if (candidatas.length === 1) return candidatas[0];

  const nova = new Array(ctx.headers.length).fill('');
  setOrganic_(nova, ctx, 'empresa', empresaNome);
  setOrganic_(nova, ctx, 'data_publicacao', data);
  linhas.push(nova);
  return nova;
}

function timestampOrganicMs_(valor) {
  const d = new Date(valor || '');
  return isNaN(d) ? 0 : d.getTime();
}

/**
 * Pareia Facebook e Instagram antes de gravar na planilha.
 * A Meta pode devolver o mesmo conteúdo com URLs de Facebook diferentes das antigas
 * (por exemplo pfbid -> /PAGE_ID/posts/POST_ID). O Instagram possui permalink estável,
 * então o pareamento por data + horário evita criar uma segunda linha para o mesmo post.
 */
function parearConteudosFbIgOrganic_(postsFb, midiasIg) {
  const usadosFb = new Set();
  const usadosIg = new Set();
  const pares = [];

  const candidatos = [];
  postsFb.forEach((fb, fi) => {
    const dataFb = dataOrganic_(fb.created_time);
    const tFb = timestampOrganicMs_(fb.created_time);
    midiasIg.forEach((ig, ii) => {
      if (dataOrganic_(ig.timestamp) !== dataFb) return;
      const tIg = timestampOrganicMs_(ig.timestamp);
      const diff = (tFb && tIg) ? Math.abs(tFb - tIg) : 999999999;
      candidatos.push({ fi: fi, ii: ii, diff: diff });
    });
  });

  // Greedy pelo menor intervalo de tempo. Em crosspost normal o horário é praticamente igual.
  candidatos.sort((a, b) => a.diff - b.diff);
  candidatos.forEach(c => {
    if (usadosFb.has(c.fi) || usadosIg.has(c.ii)) return;
    usadosFb.add(c.fi);
    usadosIg.add(c.ii);
    pares.push({ facebook: postsFb[c.fi], instagram: midiasIg[c.ii] });
  });

  return {
    pares: pares,
    facebookSemPar: postsFb.filter((_, i) => !usadosFb.has(i)),
    instagramSemPar: midiasIg.filter((_, i) => !usadosIg.has(i))
  };
}

function localizarLinhaDoParOrganic_(linhas, ctx, post, media, empresaNome, reservadas) {
  const chaveFb = normalizarUrlChaveOrganic_(post && (post.permalink_url || ('https://www.facebook.com/' + post.id)));
  const chaveIg = normalizarUrlChaveOrganic_(media && media.permalink);
  const data = dataOrganic_(media && media.timestamp) || dataOrganic_(post && post.created_time);

  // Instagram primeiro: o permalink tende a ser mais estável que o Facebook.
  if (chaveIg) {
    for (let i = 0; i < linhas.length; i++) {
      if (normalizarUrlChaveOrganic_(getOrganic_(linhas[i], ctx, 'link_instagram')) === chaveIg) return linhas[i];
    }
  }

  if (chaveFb) {
    for (let i = 0; i < linhas.length; i++) {
      if (normalizarUrlChaveOrganic_(getOrganic_(linhas[i], ctx, 'link_facebook')) === chaveFb) return linhas[i];
    }
  }

  // Se ainda não existe nenhum dos links, procura uma linha da mesma data que esteja incompleta.
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (reservadas.has(linha)) continue;
    if (dataOrganic_(getOrganic_(linha, ctx, 'data_publicacao')) !== data) continue;
    const fb = String(getOrganic_(linha, ctx, 'link_facebook') || '').trim();
    const ig = String(getOrganic_(linha, ctx, 'link_instagram') || '').trim();
    if (!fb || !ig) return linha;
  }

  const nova = new Array(ctx.headers.length).fill('');
  setOrganic_(nova, ctx, 'empresa', empresaNome);
  setOrganic_(nova, ctx, 'data_publicacao', data);
  linhas.push(nova);
  return nova;
}

function aplicarFacebookOrganic_(linha, ctx, post, m, empresaNome) {
  const data = dataOrganic_(post.created_time);
  setOrganic_(linha, ctx, 'empresa', empresaNome);
  setOrganic_(linha, ctx, 'data_publicacao', data);
  setOrganic_(linha, ctx, 'link_facebook', post.permalink_url || 'https://www.facebook.com/' + post.id);
  setOrganic_(linha, ctx, 'facebook_e_compartilhado', m.compartilhamentos > 0 ? 1 : 0);
  setOrganic_(linha, ctx, 'facebook_visualizacoes', m.visualizacoes);
  setOrganic_(linha, ctx, 'facebook_alcance', m.alcance);
  setOrganic_(linha, ctx, 'FACEBOOK ENGAJAMENTO', m.engajamento);
  setOrganic_(linha, ctx, 'facebook_reacoes_comentarios_e_compartilhamentos', m.interacoes);
  setOrganic_(linha, ctx, 'facebook_reacoes', m.reacoes);
  setOrganic_(linha, ctx, 'facebook_comentarios', m.comentarios);
  setOrganic_(linha, ctx, 'facebook_compartilhamentos', m.compartilhamentos);
  setOrganic_(linha, ctx, 'facebook_total_de_cliques', m.totalCliques);
  setOrganic_(linha, ctx, 'facebook_cliques_no_link', m.cliquesLink);
  setOrganic_(linha, ctx, 'facebook_outros_cliques', m.outrosCliques);
}

function aplicarInstagramOrganic_(linha, ctx, media, m, empresaNome) {
  const data = dataOrganic_(media.timestamp);
  setOrganic_(linha, ctx, 'empresa', empresaNome);
  setOrganic_(linha, ctx, 'data_publicacao', data);
  setOrganic_(linha, ctx, 'link_instagram', media.permalink || '');
  setOrganic_(linha, ctx, 'INSTAGRAM ENGAJAMENTO', m.engajamento);
  setOrganic_(linha, ctx, 'instagram_visualizacoes', m.visualizacoes);
  setOrganic_(linha, ctx, 'instagram_alcance', m.alcance);
  setOrganic_(linha, ctx, 'instagram_curtidas', m.curtidas);
  setOrganic_(linha, ctx, 'instagram_compartilhamentos', m.compartilhamentos);
  setOrganic_(linha, ctx, 'instagram_seguimentos', m.seguimentos);
  setOrganic_(linha, ctx, 'instagram_comentarios', m.comentarios);
  setOrganic_(linha, ctx, 'instagram_salvamentos', m.salvamentos);
}

function normalizarHeaderWb3_(valor) {
  return String(valor || '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function mapaHeadersWb3_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const mapa = {};
  headers.forEach((h, i) => { mapa[normalizarHeaderWb3_(h)] = i; });
  return { headers: headers, mapa: mapa };
}

function idxWb3_(ctx, nome) {
  const k = normalizarHeaderWb3_(nome);
  return Object.prototype.hasOwnProperty.call(ctx.mapa, k) ? ctx.mapa[k] : -1;
}

function setWb3_(linha, ctx, nome, valor) {
  const i = idxWb3_(ctx, nome);
  if (i >= 0) linha[i] = valor;
}

function getWb3_(linha, ctx, nome) {
  const i = idxWb3_(ctx, nome);
  return i >= 0 ? linha[i] : '';
}

function garantirLinhasDisponiveis_(sheet, ultimaLinhaNecessaria) {
  const max = sheet.getMaxRows();
  if (ultimaLinhaNecessaria > max) {
    sheet.insertRowsAfter(max, ultimaLinhaNecessaria - max);
  }
}

function copiarFormatoLinhaAnterior_(sheet, primeiraNovaLinha, quantidade, totalColunas) {
  if (quantidade > 0) garantirLinhasDisponiveis_(sheet, primeiraNovaLinha + quantidade - 1);
  if (quantidade <= 0 || primeiraNovaLinha <= 2) return;
  const origem = sheet.getRange(primeiraNovaLinha - 1, 1, 1, totalColunas);
  for (let i = 0; i < quantidade; i++) {
    origem.copyTo(
      sheet.getRange(primeiraNovaLinha + i, 1, 1, totalColunas),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
  }
}
