# GitHub Actions - Deploy Automático no Easypanel

Este workflow realiza deploy automático no Easypanel sempre que há um push na branch `main`.

## 🔧 Configuração

### 1. Adicionar Secret no GitHub

1. Acesse seu repositório no GitHub: https://github.com/voacatofe/sienge-financial
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Configure:
   - **Name**: `EASYPANEL_DEPLOY_URL`
   - **Value**: `http://147.93.15.121:3000/api/compose/deploy/32f491a0c748026896056b0851f49ce8483501882d1035ab`
5. Clique em **Add secret**

### 2. Verificar Configuração

O workflow está em `.github/workflows/deploy.yml` e será executado automaticamente:
- ✅ Sempre que você fizer `git push` para a branch `main`
- ✅ Manualmente através da interface do GitHub (aba Actions)

## 🚀 Como Funciona

### Fluxo Automático

```
git commit -m "feat: nova funcionalidade"
     ↓
git push origin main
     ↓
GitHub Actions detecta push
     ↓
Workflow "Deploy to Easypanel" inicia
     ↓
Faz POST para URL do Easypanel
     ↓
Easypanel recebe webhook
     ↓
Easypanel faz git pull
     ↓
Easypanel faz rebuild dos containers
     ↓
Deploy completo! ✅
```

### Deploy Manual

1. Acesse: https://github.com/voacatofe/sienge-financial/actions
2. Selecione **Deploy to Easypanel** no menu lateral
3. Clique em **Run workflow**
4. Selecione branch `main`
5. Clique em **Run workflow**

## 📊 Monitorar Deploy

### No GitHub

1. Acesse: https://github.com/voacatofe/sienge-financial/actions
2. Veja o status do último workflow
3. Clique no workflow para ver logs detalhados

### No Easypanel

1. Acesse seu Easypanel: http://147.93.15.121:3000
2. Vá na aplicação `sienge-financial`
3. Verifique na aba **Deployments** o status
4. Acompanhe logs na aba **Logs**

## 🔍 Troubleshooting

### Erro: "404 Not Found"

**Causa**: URL de deploy incorreta ou secret não configurado
**Solução**:
1. Verifique se o secret `EASYPANEL_DEPLOY_URL` está configurado
2. Confirme que a URL está correta no Easypanel

### Erro: "403 Forbidden"

**Causa**: Token de deploy inválido ou expirado
**Solução**:
1. No Easypanel, vá em Settings da aplicação
2. Gere nova URL de deploy webhook
3. Atualize o secret no GitHub

### Deploy não é triggered

**Causa**: Branch incorreta ou workflow desabilitado
**Solução**:
1. Verifique se está fazendo push para `main`
2. Confirme que o workflow está em `.github/workflows/deploy.yml`
3. Verifique se Actions está habilitado no repositório

## ⚙️ Personalização

### Modificar quando deploy acontece

Edite `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main      # Deploy em push para main
      - develop   # Deploy em push para develop
    paths-ignore:
      - 'README.md'  # Ignora mudanças em README
      - 'docs/**'    # Ignora mudanças em docs
```

### Adicionar notificações

```yaml
- name: 📧 Notify on Slack
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"✅ Deploy to Easypanel completed!"}'
```

### Adicionar validação antes do deploy

```yaml
jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          pip install -r requirements.txt
          pytest

  deploy:
    name: Deploy to Easypanel
    needs: test  # Só faz deploy se tests passarem
    runs-on: ubuntu-latest
    # ... resto do workflow
```

## 🔐 Segurança

### ✅ Boas Práticas

- ✅ URL de deploy armazenada como secret (não exposta no código)
- ✅ Webhook URL única e não-guessável
- ✅ Deploy apenas da branch `main` (proteger outras branches)

### ⚠️ Recomendações

1. **Proteja a branch main**:
   - Settings → Branches → Add rule
   - Require pull request before merging
   - Require status checks to pass

2. **Rotacione URL do webhook periodicamente**:
   - Gere nova URL no Easypanel a cada 3-6 meses
   - Atualize o secret no GitHub

3. **Monitore deployments**:
   - Configure notificações para deployments falhados
   - Revise logs regularmente

## 📝 Exemplo de Uso Completo

```bash
# 1. Fazer mudanças no código
git add .
git commit -m "feat: adicionar nova funcionalidade"

# 2. Push para GitHub
git push origin main

# 3. GitHub Actions detecta automaticamente e faz deploy
# Você receberá email de notificação (se configurado)

# 4. Verificar deploy
# - GitHub: https://github.com/voacatofe/sienge-financial/actions
# - Easypanel: http://147.93.15.121:3000
```

## 🎯 Resultado

Com essa configuração, você tem **CI/CD totalmente automatizado**:

```
Código Local → GitHub → GitHub Actions → Easypanel → Produção
```

**Zero comandos manuais necessários após o push!** 🚀