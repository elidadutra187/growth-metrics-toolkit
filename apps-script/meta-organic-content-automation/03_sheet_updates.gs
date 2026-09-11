function ordenarAbaPorData_(sheet, colunaData, totalColunas) {
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha <= 2 || colunaData < 1) return;
  sheet.getRange(2, 1, ultimaLinha - 1, totalColunas)
    .sort([{ column: colunaData, ascending: false }]);
}

function atualizarEmpresa1Organic_(empresa, paginas) {
  const pagina = resolverPaginaEmpresa_(empresa, paginas);
  const tokenPagina = pagina.access_token || obterMetaAccessToken_();
  if (!pagina.instagram_business_account || !pagina.instagram_business_account.id) {
    pagina.instagram_business_account = { id: empresa.instagramBusinessId };
  }

  const ss = SpreadsheetApp.openById(empresa.spreadsheetId);
  ss.setSpreadsheetTimeZone(META_ORGANIC_CONFIG.TIMEZONE);
  const sheet = ss.getSheetByName(empresa.aba);
  if (!sheet) throw new Error(empresa.nome + ': aba não encontrada: ' + empresa.aba);

  const ctx = mapaHeadersWb3_(sheet);
  ['Identificação do post', 'Identificação da conta', 'Horário de publicação', 'Link permanente', 'Data',
   'Visualizações', 'Alcance', 'Curtidas', 'Compartilhamentos', 'Seguimentos', 'Comentários', 'Salvamentos']
    .forEach(h => {
      if (idxWb3_(ctx, h) < 0) throw new Error(empresa.nome + ': coluna obrigatória não encontrada: ' + h);
    });

  const lastRow = sheet.getLastRow();
  let linhas = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, ctx.headers.length).getValues() : [];
  const since = dataCorteOrganic_();
  const midias = buscarMidiasInstagramOrganic_(pagina, since);

  const porId = {};
  const porUrl = {};
  linhas.forEach(l => {
    const id = String(getWb3_(l, ctx, 'Identificação do post') || '').trim();
    const url = normalizarUrlChaveOrganic_(getWb3_(l, ctx, 'Link permanente'));
    if (id) porId[id] = l;
    if (url) porUrl[url] = l;
  });

  midias.forEach(media => {
    const data = dataOrganic_(media.timestamp);
    if (!data || data < since) return;
    const chaveUrl = normalizarUrlChaveOrganic_(media.permalink);
    let linha = porId[String(media.id)] || porUrl[chaveUrl];
    if (!linha) {
      linha = new Array(ctx.headers.length).fill('');
      linhas.push(linha);
      porId[String(media.id)] = linha;
      if (chaveUrl) porUrl[chaveUrl] = linha;
    }

    const m = metricasInstagramOrganic_(media, tokenPagina);
    const dt = new Date(media.timestamp);
    const horario = !isNaN(dt) ? Utilities.formatDate(dt, META_ORGANIC_CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm') : '';

    setWb3_(linha, ctx, 'Identificação do post', media.id || '');
    setWb3_(linha, ctx, 'Identificação da conta', empresa.instagramBusinessId || (pagina.instagram_business_account && pagina.instagram_business_account.id) || '');
    setWb3_(linha, ctx, 'Nome de usuário da conta', media.username || '_empresa-1_');
    setWb3_(linha, ctx, 'Nome da conta', 'Empresa 1');
    setWb3_(linha, ctx, 'Descrição', media.caption || '');
    setWb3_(linha, ctx, 'Duração (s)', 0);
    setWb3_(linha, ctx, 'Horário de publicação', horario);
    setWb3_(linha, ctx, 'Link permanente', media.permalink || '');
    setWb3_(linha, ctx, 'Tipo de post', media.media_type === 'VIDEO' || media.media_product_type === 'REELS' ? 'Vídeo do Instagram' : 'Imagem do Instagram');
    setWb3_(linha, ctx, 'Data', data);
    setWb3_(linha, ctx, 'Visualizações', m.visualizacoes);
    setWb3_(linha, ctx, 'Alcance', m.alcance);
    setWb3_(linha, ctx, 'Curtidas', m.curtidas);
    setWb3_(linha, ctx, 'Compartilhamentos', m.compartilhamentos);
    setWb3_(linha, ctx, 'Seguimentos', m.seguimentos);
    setWb3_(linha, ctx, 'Comentários', m.comentarios);
    setWb3_(linha, ctx, 'Salvamentos', m.salvamentos);
  });

  if (linhas.length) {
    const qtdExistentes = Math.max(0, lastRow - 1);
    if (qtdExistentes > 0) {
      sheet.getRange(2, 1, qtdExistentes, ctx.headers.length)
        .setValues(linhas.slice(0, qtdExistentes));
    }
    if (linhas.length > qtdExistentes) {
      const novas = linhas.slice(qtdExistentes);
      const primeiraNova = qtdExistentes + 2;
      garantirLinhasDisponiveis_(sheet, primeiraNova + novas.length - 1);
      copiarFormatoLinhaAnterior_(sheet, primeiraNova, novas.length, ctx.headers.length);
      sheet.getRange(primeiraNova, 1, novas.length, ctx.headers.length).setValues(novas);
    }
  }

  ordenarAbaPorData_(sheet, idxWb3_(ctx, 'Data') + 1, ctx.headers.length);
  sheet.setFrozenRows(1);
  Logger.log(empresa.nome + ' | Instagram atualizado | mídias: ' + midias.length + ' | linhas: ' + linhas.length + ' | ordem: data decrescente');
}
