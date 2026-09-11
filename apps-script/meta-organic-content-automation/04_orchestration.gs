function atualizarInsightsConteudoEmpresa_(empresa, paginas) {
  if (empresa.tipo === 'instagram_only') {
    return atualizarEmpresa1Organic_(empresa, paginas);
  }

  const pagina = resolverPaginaEmpresa_(empresa, paginas);
  const tokenPagina = pagina.access_token || obterMetaAccessToken_();
  const ss = SpreadsheetApp.openById(empresa.spreadsheetId);
  ss.setSpreadsheetTimeZone(META_ORGANIC_CONFIG.TIMEZONE);
  const sheet = ss.getSheetByName(empresa.aba);
  if (!sheet) throw new Error(empresa.nome + ': aba não encontrada: ' + empresa.aba);

  const ctx = mapaHeadersOrganic_(sheet);
  exigirHeadersOrganic_(ctx, empresa);
  const lastRow = sheet.getLastRow();
  let linhas = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, ctx.headers.length).getValues()
    : [];
  const since = dataCorteOrganic_();

  const postsFb = buscarPostsFacebookOrganic_(pagina, since)
    .filter(post => {
      const d = dataOrganic_(post.created_time);
      return d && d >= since;
    });
  const midiasIg = buscarMidiasInstagramOrganic_(pagina, since)
    .filter(media => {
      const d = dataOrganic_(media.timestamp);
      return d && d >= since;
    });

  const pareamento = parearConteudosFbIgOrganic_(postsFb, midiasIg);
  const reservadas = new Set();

  pareamento.pares.forEach(par => {
    const linha = localizarLinhaDoParOrganic_(linhas, ctx, par.facebook, par.instagram, empresa.nome, reservadas);
    reservadas.add(linha);

    const mFb = metricasFacebookOrganic_(par.facebook, tokenPagina);
    aplicarFacebookOrganic_(linha, ctx, par.facebook, mFb, empresa.nome);

    const mIg = metricasInstagramOrganic_(par.instagram, tokenPagina);
    aplicarInstagramOrganic_(linha, ctx, par.instagram, mIg, empresa.nome);
  });

  pareamento.facebookSemPar.forEach(post => {
    const data = dataOrganic_(post.created_time);
    const url = post.permalink_url || ('https://www.facebook.com/' + post.id);
    const linha = localizarOuCriarLinhaOrganic_(linhas, ctx, 'facebook', url, data, empresa.nome, reservadas);
    reservadas.add(linha);
    const m = metricasFacebookOrganic_(post, tokenPagina);
    aplicarFacebookOrganic_(linha, ctx, post, m, empresa.nome);
  });

  pareamento.instagramSemPar.forEach(media => {
    const data = dataOrganic_(media.timestamp);
    const linha = localizarOuCriarLinhaOrganic_(linhas, ctx, 'instagram', media.permalink, data, empresa.nome, reservadas);
    reservadas.add(linha);
    const m = metricasInstagramOrganic_(media, tokenPagina);
    aplicarInstagramOrganic_(linha, ctx, media, m, empresa.nome);
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

  ordenarAbaPorData_(sheet, indiceHeaderOrganic_(ctx, 'data_publicacao') + 1, ctx.headers.length);
  sheet.setFrozenRows(1);

  Logger.log(
    empresa.nome + ' | orgânico atualizado | FB: ' + postsFb.length +
    ' | IG: ' + midiasIg.length +
    ' | pares FB/IG: ' + pareamento.pares.length +
    ' | FB sem par: ' + pareamento.facebookSemPar.length +
    ' | IG sem par: ' + pareamento.instagramSemPar.length +
    ' | linhas: ' + linhas.length +
    ' | ordem: data decrescente'
  );
}

function atualizarInsightsConteudoMeta() {
  const paginas = descobrirPaginasMeta_();
  const erros = [];

  META_ORGANIC_CONFIG.EMPRESAS.forEach(empresa => {
    try { atualizarInsightsConteudoEmpresa_(empresa, paginas); }
    catch (e) {
      erros.push(empresa.nome + ': ' + e.message);
      Logger.log('ERRO ORGÂNICO | ' + empresa.nome + ' | ' + e.stack);
    }
  });

  if (erros.length) throw new Error('Falha nos insights orgânicos: ' + erros.join(' || '));
}

function executarOrganicEmpresaPorIndice_(indice) {
  const empresa = META_ORGANIC_CONFIG.EMPRESAS[indice];
  if (!empresa) throw new Error('Empresa orgânica inexistente no índice ' + indice);
  const paginas = descobrirPaginasMeta_();
  atualizarInsightsConteudoEmpresa_(empresa, paginas);
}

function atualizarEmpresa1Diario() { executarOrganicEmpresaPorIndice_(0); }
function atualizarEmpresa2Diario() { executarOrganicEmpresaPorIndice_(1); }
function atualizarEmpresa3Diario() { executarOrganicEmpresaPorIndice_(2); }

function removerGatilhosHandler_(handler) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
  });
}

function agendarExecucaoUnica_(handler, atrasoMs) {
  removerGatilhosHandler_(handler);
  ScriptApp.newTrigger(handler).timeBased().after(atrasoMs).create();
}

function atualizacaoDiariaMeta() {
  agendarExecucaoUnica_('atualizarEmpresa1Diario', 60 * 1000);
  agendarExecucaoUnica_('atualizarEmpresa2Diario', 3 * 60 * 1000);
  agendarExecucaoUnica_('atualizarEmpresa3Diario', 6 * 60 * 1000);
  agendarExecucaoUnica_('processarTodasEmpresas', 12 * 60 * 1000);
  Logger.log('Pipeline diário agendado: Empresa 1 -> Empresa 2 -> Empresa 3 -> imagens.');
}

function instalarAutomacaoMeta() {
  criarGatilhoDiario();
  Logger.log('Automação instalada com horários separados para reduzir timeout e concorrência.');
}
