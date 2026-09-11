/**
 * TEMPLATE PÚBLICO SANITIZADO
 * Nenhum token, ID de conta, ID de planilha, nome de cliente ou pasta real está incluído.
 * Preencha apenas os placeholders COLOQUE_* antes de usar em um projeto privado.
 */

/**
 * META ORGÂNICO + IMAGENS — TEMPLATE MULTIEMPRESA — PAREAMENTO FB/IG + ORDENAÇÃO
 * REGRA DE PLANILHA: usar EXATAMENTE as abas e colunas já existentes.
 * - não cria colunas
 * - não cria abas
 * - ordena as linhas pela data de publicação (mais recente primeiro)
 * - atualiza métricas nas linhas existentes
 * - acrescenta novas publicações somente no final
 * - preserva links/imagens/arquivos do Drive já existentes
 */

const META_IMG_CONFIG = {
  ROOT_FOLDER_ID: 'COLOQUE_ID_DA_PASTA_RAIZ_DO_DRIVE',
  API_VERSION: 'v26.0',
  MAX_ITENS_POR_EXECUCAO: 24,
  MAX_TEMPO_MS: 5 * 60 * 1000,
  MAX_CANDIDATOS: 16,
  MIN_BYTES: 12000,
  REPROCESSAR_OK: false,
  LIXO_ARQUIVO_ANTIGO_APOS_SUCESSO: false,
  LIMPAR_IMAGEM_QUANDO_FALHA: true,

  EMPRESAS: [
    {
      nome: 'Empresa 1',
      slug: 'empresa-1',
      spreadsheetId: 'COLOQUE_ID_PLANILHA_EMPRESA_1',
      aba: 'ABA_EMPRESA_1',
      plataformas: {
        instagram: {
          ativo: true,
          linkHeader: 'Link permanente',
          imagemHeader: 'Imagem',
          arquivoHeader: 'Arquivo Drive',
          statusHeader: 'Status Imagem'
        },
        facebook: { ativo: false }
      }
    },
    {
      nome: 'Empresa 2',
      slug: 'empresa-2',
      spreadsheetId: 'COLOQUE_ID_PLANILHA_EMPRESA_2',
      aba: 'ABA_EMPRESA_2',
      plataformas: {
        instagram: {
          ativo: true,
          linkHeader: 'link_instagram',
          imagemHeader: 'imagem_instagram',
          arquivoHeader: 'arquivo_instagram_drive',
          statusHeader: 'status_imagem_instagram'
        },
        facebook: {
          ativo: true,
          linkHeader: 'link_facebook',
          imagemHeader: 'imagem_facebook',
          arquivoHeader: 'arquivo_facebook_drive',
          statusHeader: 'status_imagem_facebook'
        }
      }
    },
    {
      nome: 'Empresa 3',
      slug: 'empresa-3',
      spreadsheetId: 'COLOQUE_ID_PLANILHA_EMPRESA_3',
      aba: 'ABA_EMPRESA_3',
      plataformas: {
        instagram: {
          ativo: true,
          linkHeader: 'link_instagram',
          imagemHeader: 'imagem_instagram',
          arquivoHeader: 'arquivo_instagram_drive',
          statusHeader: 'status_imagem_instagram'
        },
        facebook: {
          ativo: true,
          linkHeader: 'link_facebook',
          imagemHeader: 'imagem_facebook',
          arquivoHeader: 'arquivo_facebook_drive',
          statusHeader: 'status_imagem_facebook'
        }
      }
    }
  ]
};

const META_ORGANIC_CONFIG = {
  TIMEZONE: 'America/Sao_Paulo',
  JANELA_REPROCESSAMENTO_DIAS: 60,
  LIMITE_PAGINACAO: 100,
  EMPRESAS: [
    {
      nome: 'Empresa 1',
      tipo: 'instagram_only',
      spreadsheetId: 'COLOQUE_ID_PLANILHA_EMPRESA_1',
      aba: 'ABA_EMPRESA_1',
      pageId: 'COLOQUE_PAGE_ID_EMPRESA_1',
      instagramBusinessId: 'COLOQUE_IG_BUSINESS_ID_EMPRESA_1',
      aliasesPagina: ['empresa 1']
    },
    {
      nome: 'Empresa 2',
      tipo: 'meta_completo',
      spreadsheetId: 'COLOQUE_ID_PLANILHA_EMPRESA_2',
      aba: 'ABA_EMPRESA_2',
      pageId: 'COLOQUE_PAGE_ID_EMPRESA_2',
      instagramBusinessId: 'COLOQUE_IG_BUSINESS_ID_EMPRESA_2',
      aliasesPagina: ['empresa 2']
    },
    {
      nome: 'Empresa 3',
      tipo: 'meta_completo',
      spreadsheetId: 'COLOQUE_ID_PLANILHA_EMPRESA_3',
      aba: 'ABA_EMPRESA_3',
      pageId: 'COLOQUE_PAGE_ID_EMPRESA_3',
      instagramBusinessId: 'COLOQUE_IG_BUSINESS_ID_EMPRESA_3',
      aliasesPagina: ['empresa 3']
    }
  ]
};


// API Meta usada SOMENTE para insights orgânicos de conteúdo.
// Não há qualquer rotina de Meta Ads neste arquivo.
const META_API_CONFIG = {
  API_VERSION: META_IMG_CONFIG.API_VERSION || 'v25.0',
  ACCESS_TOKEN: 'COLOQUE_SEU_TOKEN_META_AQUI',
  TIMEZONE: 'America/Sao_Paulo'
};

function obterMetaAccessToken_() {
  const token = String(META_API_CONFIG.ACCESS_TOKEN || '').trim();
  if (!token) throw new Error('Token da Meta não configurado em META_API_CONFIG.ACCESS_TOKEN.');
  return token;
}

function metaApiGetComToken_(endpoint, params, token) {
  params = Object.assign({}, params || {});
  params.access_token = token || obterMetaAccessToken_();

  const query = Object.keys(params)
    .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])))
    .join('&');

  const url = 'https://graph.facebook.com/' + META_API_CONFIG.API_VERSION + '/' +
    String(endpoint).replace(/^\/+/, '') + (query ? '?' + query : '');

  const resp = fetchComRetry(url, {
    method: 'get', muteHttpExceptions: true, followRedirects: true,
    headers: { Accept: 'application/json' }
  });

  const code = resp ? resp.getResponseCode() : 0;
  const texto = resp ? resp.getContentText() : '';
  let json = {};
  try { json = texto ? JSON.parse(texto) : {}; }
  catch (e) { throw new Error('Meta API orgânica retornou JSON inválido. HTTP ' + code); }

  if (code < 200 || code >= 300 || json.error) {
    const err = json.error || {};
    throw new Error('Meta API orgânica HTTP ' + code + ' | ' + (err.message || texto) +
      (err.code ? ' | code ' + err.code : '') +
      (err.error_subcode ? ' | subcode ' + err.error_subcode : ''));
  }
  return json;
}

function metaApiGetOpcionalComToken_(endpoint, params, token) {
  try { return metaApiGetComToken_(endpoint, params, token); }
  catch (e) {
    Logger.log('MÉTRICA ORGÂNICA INDISPONÍVEL | ' + endpoint + ' | ' + e.message);
    return null;
  }
}

function metaApiGetTodasPaginasComToken_(endpoint, params, token) {
  let json = metaApiGetComToken_(endpoint, params, token);
  let dados = Array.isArray(json.data) ? json.data.slice() : [];
  let next = json && json.paging && json.paging.next ? json.paging.next : null;
  let paginas = 1;

  while (next && paginas < 100) {
    const resp = fetchComRetry(next, { method: 'get', muteHttpExceptions: true, followRedirects: true });
    const code = resp.getResponseCode();
    const texto = resp.getContentText();
    const prox = JSON.parse(texto || '{}');
    if (code < 200 || code >= 300 || prox.error) {
      const err = prox.error || {};
      throw new Error('Meta API orgânica paginação HTTP ' + code + ' | ' + (err.message || texto));
    }
    if (Array.isArray(prox.data)) dados = dados.concat(prox.data);
    next = prox.paging && prox.paging.next ? prox.paging.next : null;
    paginas++;
  }
  return dados;
}

function normalizarNomeOrganic_(valor) {
  return String(valor || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizarUrlChaveOrganic_(url) {
  let t = String(url || '').trim();
  if (!t) return '';
  t = t.replace(/^https?:\/\/(?:www\.)?/i, '');
  t = t.split('#')[0].split('?')[0].replace(/\/+$/, '');
  return t;
}

function descobrirPaginasMeta_() {
  const paginas = metaApiGetTodasPaginasComToken_('me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    limit: 100
  }, obterMetaAccessToken_());

  if (!paginas.length) {
    throw new Error(
      'Nenhuma Página do Facebook foi retornada pelo token. Para atualizar insights orgânicos, ' +
      'o token precisa ter acesso às Páginas e permissões de leitura/insights, além do Instagram profissional vinculado.'
    );
  }
  return paginas;
}

function resolverPaginaEmpresa_(empresa, paginas) {
  // Prioriza o ID fixo da Página para evitar erro por variação de nome.
  if (empresa.pageId) {
    const porId = paginas.find(p => String(p.id) === String(empresa.pageId));
    if (porId) {
      if ((!porId.instagram_business_account || !porId.instagram_business_account.id) && empresa.instagramBusinessId) {
        porId.instagram_business_account = { id: empresa.instagramBusinessId };
      }
      return porId;
    }
  }

  const aliases = (empresa.aliasesPagina || []).map(normalizarNomeOrganic_);
  const candidatas = paginas.map(p => {
    const nome = normalizarNomeOrganic_(p.name);
    let score = 0;
    aliases.forEach(a => { if (a && nome.indexOf(a) !== -1) score++; });
    return { pagina: p, score: score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (!candidatas.length) {
    throw new Error('Página não localizada para ' + empresa.nome + '. Disponíveis: ' +
      paginas.map(p => p.name + ' (' + p.id + ')').join(' | '));
  }
  const pagina = candidatas[0].pagina;
  if ((!pagina.instagram_business_account || !pagina.instagram_business_account.id) && empresa.instagramBusinessId) {
    pagina.instagram_business_account = { id: empresa.instagramBusinessId };
  }
  return pagina;
}

function mapaHeadersOrganic_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const mapa = {};
  headers.forEach((h, i) => { mapa[normalizarHeader(h)] = i; });
  return { headers: headers, mapa: mapa };
}

function indiceHeaderOrganic_(ctx, nome) {
  const chave = normalizarHeader(nome);
  return Object.prototype.hasOwnProperty.call(ctx.mapa, chave) ? ctx.mapa[chave] : -1;
}

function exigirHeadersOrganic_(ctx, empresa) {
  ['empresa', 'data_publicacao', 'link_facebook', 'link_instagram'].forEach(nome => {
    if (indiceHeaderOrganic_(ctx, nome) < 0) {
      throw new Error(empresa.nome + ': coluna obrigatória não encontrada: ' + nome +
        '. O script não criará colunas automaticamente.');
    }
  });
}

function setOrganic_(linha, ctx, header, valor) {
  const i = indiceHeaderOrganic_(ctx, header);
  if (i >= 0) linha[i] = valor;
}

function getOrganic_(linha, ctx, header) {
  const i = indiceHeaderOrganic_(ctx, header);
  return i >= 0 ? linha[i] : '';
}

function dataOrganic_(valor) {
  if (valor instanceof Date && !isNaN(valor)) {
    return Utilities.formatDate(valor, META_ORGANIC_CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }
  const t = String(valor || '').trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return br[3] + '-' + br[2] + '-' + br[1];
  return '';
}

function dataCorteOrganic_() {
  const d = new Date();
  d.setDate(d.getDate() - META_ORGANIC_CONFIG.JANELA_REPROCESSAMENTO_DIAS);
  return Utilities.formatDate(d, META_ORGANIC_CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function valorInsight_(json) {
  if (!json || !Array.isArray(json.data) || !json.data.length) return 0;
  const item = json.data[0] || {};
  let v = 0;
  if (Array.isArray(item.values) && item.values.length) v = item.values[item.values.length - 1].value;
  else if (item.values !== undefined) v = item.values;
  else if (item.value !== undefined) v = item.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return Number(v);
  return v || 0;
}

function obterInsightIndividual_(id, metric, token) {
  const j = metaApiGetOpcionalComToken_(id + '/insights', { metric: metric }, token);
  return valorInsight_(j);
}

function extrairLinkClicksFacebook_(valor) {
  if (!valor || typeof valor !== 'object') return 0;
  let total = 0;
  Object.keys(valor).forEach(k => {
    const nk = normalizarNomeOrganic_(k);
    if (nk.indexOf('link') !== -1) total += Number(valor[k] || 0);
  });
  return total;
}

function buscarPostsFacebookOrganic_(pagina, since) {
  return metaApiGetTodasPaginasComToken_(pagina.id + '/published_posts', {
    fields: 'id,created_time,permalink_url,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)',
    since: since + 'T00:00:00',
    limit: 100
  }, pagina.access_token || obterMetaAccessToken_());
}

function buscarMidiasInstagramOrganic_(pagina, since) {
  const ig = pagina.instagram_business_account;
  if (!ig || !ig.id) {
    throw new Error('A Página ' + pagina.name + ' não retornou instagram_business_account. ' +
      'Verifique se o Instagram profissional está vinculado à Página e se o token tem permissões de Instagram Insights.');
  }

  const todas = metaApiGetTodasPaginasComToken_(ig.id + '/media', {
    fields: 'id,timestamp,permalink,media_type,media_product_type,caption,username,like_count,comments_count',
    limit: 100
  }, pagina.access_token || obterMetaAccessToken_());

  return todas.filter(m => dataOrganic_(m.timestamp) >= since);
}

function metricasFacebookOrganic_(post, token) {
  // Graph API v26: as métricas antigas post_impressions, post_impressions_unique
  // e post_engaged_users foram descontinuadas. Usamos a família Media View.
  const views = Number(obterInsightIndividual_(post.id, 'post_media_view', token) || 0);
  const reach = Number(obterInsightIndividual_(post.id, 'post_total_media_view_unique', token) || 0);

  // Cliques continuam sendo consultados separadamente; se a Meta não devolver
  // algum deles para um tipo específico de publicação, o helper retorna 0 sem interromper a rotina.
  const clicks = Number(obterInsightIndividual_(post.id, 'post_clicks', token) || 0);
  const byType = obterInsightIndividual_(post.id, 'post_clicks_by_type', token);
  const linkClicks = extrairLinkClicksFacebook_(byType);

  const reactions = Number(post.reactions && post.reactions.summary ? post.reactions.summary.total_count : 0) || 0;
  const comments = Number(post.comments && post.comments.summary ? post.comments.summary.total_count : 0) || 0;
  const shares = Number(post.shares ? post.shares.count : 0) || 0;
  const interactions = reactions + comments + shares;

  // A antiga métrica post_engaged_users não existe mais na v26. Para manter a coluna
  // FACEBOOK ENGAJAMENTO útil, registramos interações + cliques disponíveis.
  const engagement = interactions + clicks;

  return {
    visualizacoes: views,
    alcance: reach,
    engajamento: engagement,
    interacoes: interactions,
    reacoes: reactions,
    comentarios: comments,
    compartilhamentos: shares,
    totalCliques: clicks,
    cliquesLink: linkClicks,
    outrosCliques: Math.max(0, clicks - linkClicks)
  };
}

function metricasInstagramOrganic_(media, token) {
  const views = Number(obterInsightIndividual_(media.id, 'views', token) ||
    obterInsightIndividual_(media.id, 'impressions', token) || 0);
  const reach = Number(obterInsightIndividual_(media.id, 'reach', token) || 0);
  const saved = Number(obterInsightIndividual_(media.id, 'saved', token) || 0);
  const shares = Number(obterInsightIndividual_(media.id, 'shares', token) || 0);

  // A Meta não disponibiliza `follows` de forma consistente por mídia na Graph API v26.
  // Alguns Reels também retornam erro #100. Para a automação diária ser estável,
  // não consultamos essa métrica por publicação; a coluna existente permanece com 0.
  const follows = 0;

  const totalInteractions = Number(obterInsightIndividual_(media.id, 'total_interactions', token) || 0);
  const likes = Number(media.like_count || 0);
  const comments = Number(media.comments_count || 0);

  return {
    visualizacoes: views,
    alcance: reach,
    curtidas: likes,
    compartilhamentos: shares,
    seguimentos: follows,
    comentarios: comments,
    salvamentos: saved,
    engajamento: totalInteractions || (likes + comments + shares + saved)
  };
}
