function processarTodasEmpresas() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { Logger.log('Outra execução já está em andamento.'); return; }

  const inicio = Date.now();
  let processados = 0;
  let precisaContinuar = false;

  try {
    const raiz = DriveApp.getFolderById(META_IMG_CONFIG.ROOT_FOLDER_ID);
    const pastaBase = obterOuCriarPasta(raiz, 'Imagens Meta Looker');

    for (let e = 0; e < META_IMG_CONFIG.EMPRESAS.length; e++) {
      const empresa = META_IMG_CONFIG.EMPRESAS[e];
      const ss = SpreadsheetApp.openById(empresa.spreadsheetId);
      const sheet = ss.getSheetByName(empresa.aba);
      if (!sheet) { Logger.log('Aba não encontrada: ' + empresa.nome + ' / ' + empresa.aba); continue; }

      const pastaEmpresa = obterOuCriarPasta(pastaBase, empresa.nome);
      const plataformas = ['instagram', 'facebook'];

      for (let p = 0; p < plataformas.length; p++) {
        const plataforma = plataformas[p];
        const cfg = empresa.plataformas[plataforma];
        if (!cfg || !cfg.ativo) continue;

        const pastaPlataforma = obterOuCriarPasta(pastaEmpresa, plataforma === 'instagram' ? 'Instagram' : 'Facebook');
        const indices = garantirColunasDaPlataforma(sheet, cfg);
        const ultimaLinha = sheet.getLastRow();
        if (ultimaLinha < 2) continue;

        const dados = sheet.getRange(2, 1, ultimaLinha - 1, sheet.getLastColumn()).getDisplayValues();

        for (let i = 0; i < dados.length; i++) {
          if (Date.now() - inicio >= META_IMG_CONFIG.MAX_TEMPO_MS || processados >= META_IMG_CONFIG.MAX_ITENS_POR_EXECUCAO) {
            precisaContinuar = true;
            break;
          }

          const linha = i + 2;
          const link = String(dados[i][indices.link - 1] || '').trim();
          if (!link) continue;

          const imagemAtual = String(dados[i][indices.imagem - 1] || '').trim();
          const arquivoAtual = String(dados[i][indices.arquivo - 1] || '').trim();
          const statusAtual = String(dados[i][indices.status - 1] || '').trim();

          if (!META_IMG_CONFIG.REPROCESSAR_OK && /^OK\b/i.test(statusAtual) && /^https?:\/\//i.test(imagemAtual)) continue;

          processados++;
          const celStatus = sheet.getRange(linha, indices.status);
          celStatus.setValue('PROCESSANDO');
          SpreadsheetApp.flush();

          try {
            Logger.log(empresa.nome + ' | ' + plataforma + ' | linha ' + linha + ' | ' + link);
            const resultado = plataforma === 'instagram' ? obterImagemInstagram(link) : obterImagemFacebook(link);

            if (!resultado || !resultado.blob) {
              if (META_IMG_CONFIG.LIMPAR_IMAGEM_QUANDO_FALHA) {
                sheet.getRange(linha, indices.imagem).clearContent();
                sheet.getRange(linha, indices.arquivo).clearContent();
              }
              celStatus.setValue(resultado && resultado.status ? resultado.status : 'SEM IMAGEM PÚBLICA');
              continue;
            }

            const identificador = obterIdentificadorMidia(link, plataforma);
            const extensao = extensaoDoBlob(resultado.blob);
            const nomeArquivo = empresa.slug + '_' + plataforma + '_' + identificador + extensao;
            resultado.blob.setName(nomeArquivo);

            const arquivoNovo = pastaPlataforma.createFile(resultado.blob);
            try {
              arquivoNovo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } catch (erroCompartilhamento) {
              Logger.log('Aviso compartilhamento: ' + erroCompartilhamento.message);
            }

            const fileId = arquivoNovo.getId();
            const urlLooker = gerarUrlThumbnailDrive(fileId);
            const urlDrive = arquivoNovo.getUrl();

            sheet.getRange(linha, indices.imagem).setValue(urlLooker);
            sheet.getRange(linha, indices.arquivo).setValue(urlDrive);
            celStatus.setValue('OK | ' + resultado.metodo + ' | ' + resultado.largura + 'x' + resultado.altura);

            if (META_IMG_CONFIG.LIXO_ARQUIVO_ANTIGO_APOS_SUCESSO) {
              const idAntigo = extrairIdGoogleDrive(arquivoAtual || imagemAtual);
              if (idAntigo && idAntigo !== fileId) {
                try { DriveApp.getFileById(idAntigo).setTrashed(true); }
                catch (erroLixo) { Logger.log('Arquivo antigo não removido: ' + erroLixo.message); }
              }
            }

            SpreadsheetApp.flush();
          } catch (erroItem) {
            celStatus.setValue('ERRO | ' + limitarTexto(erroItem.message, 180));
            Logger.log('Erro item: ' + erroItem.stack);
          }
        }

        if (precisaContinuar) break;
      }
      if (precisaContinuar) break;
    }

    if (precisaContinuar) {
      agendarContinuacao();
      Logger.log('Execução pausada de forma segura. Continuação agendada.');
    } else {
      removerGatilhosContinuacao();
      Logger.log('PROCESSAMENTO FINALIZADO. Itens processados: ' + processados);
    }
  } finally {
    lock.releaseLock();
  }
}

function continuarProcessamentoAutomatico() {
  removerGatilhosContinuacao();
  processarTodasEmpresas();
}

function criarGatilhoDiario() {
  const handlers = ['atualizacaoDiariaMeta','atualizarEmpresa1Diario','atualizarEmpresa2Diario','atualizarEmpresa3Diario','processarTodasEmpresas'];
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (handlers.indexOf(triggers[i].getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(triggers[i]);
  }

  ScriptApp.newTrigger('atualizarEmpresa1Diario').timeBased().atHour(4).nearMinute(0).everyDays(1).inTimezone(META_API_CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('atualizarEmpresa2Diario').timeBased().atHour(5).nearMinute(0).everyDays(1).inTimezone(META_API_CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('atualizarEmpresa3Diario').timeBased().atHour(6).nearMinute(0).everyDays(1).inTimezone(META_API_CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('processarTodasEmpresas').timeBased().atHour(7).nearMinute(0).everyDays(1).inTimezone(META_API_CONFIG.TIMEZONE).create();

  Logger.log('Gatilhos diários criados: Empresa 1 04:00 | Empresa 2 05:00 | Empresa 3 06:00 | imagens 07:00 (' + META_API_CONFIG.TIMEZONE + ').');
}

function removerGatilhoDiario() {
  const handlers = ['atualizacaoDiariaMeta','atualizarEmpresa1Diario','atualizarEmpresa2Diario','atualizarEmpresa3Diario','processarTodasEmpresas'];
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (handlers.indexOf(triggers[i].getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(triggers[i]);
  }
}
