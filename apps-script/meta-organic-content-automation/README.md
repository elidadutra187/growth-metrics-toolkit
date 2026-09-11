# Meta Organic Content Automation — Google Apps Script

Template público e sanitizado para automatizar a coleta de conteúdo orgânico do Facebook e Instagram via Meta Graph API, atualizar Google Sheets e organizar imagens no Google Drive.

## O que faz

- atualiza métricas orgânicas de Facebook e Instagram;
- identifica novas publicações e adiciona registros sem duplicar conteúdo já existente;
- faz pareamento entre posts de Facebook e Instagram;
- mantém links, métricas e imagens na mesma linha;
- ordena as planilhas por data de publicação, da mais recente para a mais antiga;
- processa imagens em execução separada para reduzir timeout;
- cria gatilhos diários separados por empresa;
- não inclui rotinas de Meta Ads.

## Segurança

Este diretório **não contém** tokens, IDs reais de páginas, IDs de Instagram Business, IDs de planilhas, IDs de pastas do Drive ou nomes de clientes.

Antes de usar, substitua no código apenas os placeholders que começam com `COLOQUE_` e os nomes genéricos de abas.

Nunca publique tokens de acesso, App Secret ou credenciais reais em repositórios públicos.

## Configuração esperada

Preencha no código:

```text
COLOQUE_SEU_TOKEN_META_AQUI
COLOQUE_ID_DA_PASTA_RAIZ_DO_DRIVE
COLOQUE_ID_PLANILHA_EMPRESA_1
COLOQUE_ID_PLANILHA_EMPRESA_2
COLOQUE_ID_PLANILHA_EMPRESA_3
COLOQUE_PAGE_ID_EMPRESA_1
COLOQUE_PAGE_ID_EMPRESA_2
COLOQUE_PAGE_ID_EMPRESA_3
COLOQUE_IG_BUSINESS_ID_EMPRESA_1
COLOQUE_IG_BUSINESS_ID_EMPRESA_2
COLOQUE_IG_BUSINESS_ID_EMPRESA_3
ABA_EMPRESA_1
ABA_EMPRESA_2
ABA_EMPRESA_3
```

Os cabeçalhos das planilhas devem ser ajustados no bloco de configuração conforme a estrutura usada em cada projeto.

## Arquivos

Os arquivos `.gs` foram separados por responsabilidade para facilitar manutenção no Google Apps Script:

- `01_config_organic.gs` — configuração sanitizada, Meta Graph API e métricas;
- `02_pairing_helpers.gs` — pareamento FB/IG e helpers de planilha;
- `03_sheet_updates.gs` — atualização da empresa com estrutura Instagram-only e ordenação;
- `04_orchestration.gs` — atualização multiempresa e orquestração;
- `05_image_pipeline.gs` — processamento de imagens e gatilhos;
- `06_image_resolvers.gs` — resolução de imagens públicas de Facebook/Instagram;
- `07_image_candidates.gs` — seleção e validação de candidatos de imagem;
- `08_network_and_dimensions.gs` — fetch/retry e leitura de dimensões;
- `09_utilities.gs` — normalização de URLs, Drive e utilitários.

No Apps Script, todos os arquivos `.gs` pertencem ao mesmo projeto e compartilham o mesmo escopo global.

## Agendamento padrão

```text
Empresa 1 -> 04:00
Empresa 2 -> 05:00
Empresa 3 -> 06:00
Imagens   -> 07:00
```

Execute `instalarAutomacaoMeta()` uma vez para criar os gatilhos.

## Observação sobre credenciais

O template mantém um placeholder no código apenas para demonstrar onde a credencial é usada. Em produção, prefira armazenar o token em `PropertiesService` ou outro mecanismo privado e nunca comitar o valor real.
