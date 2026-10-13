var e={id:`l12-docker`,moduleId:`m12-2`,title:`Containers e Docker`,titleEn:`Containers and Docker`,summary:`Imagens, containers, Dockerfile, camadas, volumes e por que "funciona na minha máquina" deixou de ser desculpa.`,minutes:40,objectives:[`Diferenciar container de máquina virtual`,`Escrever um Dockerfile eficiente`,`Usar volumes, portas e variáveis de ambiente`,`Orquestrar serviços com Docker Compose`],skills:[`devops-containers`],terms:[{pt:`contêiner`,en:`container`,def:`Processo isolado com seu próprio sistema de arquivos, rede e limites.`},{pt:`imagem`,en:`image`,def:`Modelo imutável a partir do qual containers são criados.`},{pt:`camada`,en:`layer`,def:`Cada instrução do Dockerfile gera uma camada cacheável.`},{pt:`volume`,en:`volume`,def:`Armazenamento que persiste além do ciclo de vida do container.`},{pt:`registro`,en:`registry`,def:`Repositório de imagens (Docker Hub, GHCR).`},{pt:`orquestração`,en:`orchestration`,def:`Gerenciar muitos containers: Compose, Kubernetes.`}],references:[`docker-docs`,`twelve-factor`,`kubernetes-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um **{{container|container}}** empacota o programa **com tudo de que precisa** (bibliotecas, runtime, configuração) e roda isolado, usando recursos do **kernel do host** (namespaces e cgroups do Linux). Diferente de uma máquina virtual, não há um sistema operacional inteiro por instância — por isso containers sobem em segundos.`}]},{stage:`explicacao`,blocks:[{type:`code`,lang:`text`,code:`# Dockerfile — API Python
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt   # camada cacheada se requirements não mudar
COPY . .
RUN useradd --create-home app
USER app                                             # não rode como root
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,runnable:!1,caption:`A ordem importa: copie primeiro o que muda pouco (dependências) para aproveitar o cache de camadas.`},{type:`code`,lang:`bash`,code:`docker build -t minha-api .
docker run -p 8000:8000 -e DATABASE_URL=... minha-api
docker ps
docker logs -f <id>`,runnable:!1},{type:`md`,text:"**Docker Compose** descreve vários serviços (API + banco + cache) num `compose.yaml` e sobe tudo com `docker compose up`.\n\n**Boas práticas**: imagens pequenas (`-slim`, multi-stage builds), usuário não-root, `.dockerignore`, segredos por variáveis de ambiente ou *secrets* (nunca na imagem), uma responsabilidade por container, versões fixas."},{type:`table`,head:[``,`Máquina virtual`,`Container`],rows:[[`Isolamento`,`hardware virtual + SO completo`,`processos isolados no mesmo kernel`],[`Inicialização`,`minutos`,`segundos`],[`Tamanho`,`GB`,`MB`],[`Uso típico`,`SOs diferentes, isolamento forte`,`empacotar e escalar aplicações`]]}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`text`,code:`# compose.yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://app:app@db:5432/app
    depends_on: [db]
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    volumes: ["dados:/var/lib/postgresql/data"]
volumes:
  dados:`,runnable:!1,caption:`API + PostgreSQL com dados persistidos num volume.`}]},{stage:`codigo`,blocks:[{type:`md`,text:"Esta própria plataforma inclui um `Dockerfile` multi-stage na raiz do repositório: o primeiro estágio compila o front-end, o segundo leva só o necessário para rodar a API, com usuário não-root."}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e12-docker-1`,kind:`mcq`,prompt:"Toda vez que você muda uma linha de código, o `docker build` reinstala todas as dependências. Qual a causa provável?",difficulty:`intermediario`,skills:[`devops-containers`],hints:[`Cada instrução gera uma camada; se uma camada muda, todas as seguintes são refeitas.`],explanation:"Provavelmente `COPY . .` vem antes do `RUN pip install`. Copie primeiro só o `requirements.txt`, instale, e depois copie o resto.",options:[{text:`COPY . . vem antes da instalação das dependências, invalidando o cache`,correct:!0,feedback:`Isso: reordene as instruções.`},{text:`O Docker não tem cache`,feedback:`Tem: cache de camadas.`},{text:`Falta EXPOSE`,feedback:`EXPOSE é só documentação de portas.`},{text:`A imagem base é slim`,feedback:`slim não afeta o cache.`}]}},{type:`exercise`,exercise:{id:`e12-docker-2`,kind:`mcq`,prompt:`Você removeu o container do PostgreSQL e os dados sumiram. Como evitar?`,difficulty:`facil`,skills:[`devops-containers`],hints:[`O sistema de arquivos do container é descartável.`],explanation:`Monte um **volume** em /var/lib/postgresql/data: ele persiste independentemente do container.`,options:[{text:`Usar um volume para o diretório de dados`,correct:!0,feedback:`Isso.`},{text:`Nunca parar o container`,feedback:`Frágil: qualquer atualização perderia os dados.`},{text:`Copiar os dados para dentro da imagem`,feedback:`Imagens são imutáveis e não devem conter dados de produção.`},{text:`Usar EXPOSE 5432`,feedback:`Não tem relação com persistência.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e12-docker-desafio`,kind:`code`,lang:`python`,prompt:'Escreva `auditar_dockerfile(texto)` que devolve uma lista de avisos (strings, na ordem): `"rode como usuário não-root"` se não houver instrução `USER`; `"fixe a versão da imagem base"` se o `FROM` usar `:latest` ou não tiver tag; `"copie dependências antes do código"` se um `COPY . .` aparecer antes de um `RUN pip install`.',difficulty:`avancado`,skills:[`devops-containers`,`prog-strings`],hints:[`Separe em linhas, ignore vazias e comentários, e olhe a primeira palavra (instrução).`,"Guarde o índice da primeira linha `COPY . .` e da primeira `RUN pip install`."],explanation:`Linters reais de Dockerfile (como o hadolint) funcionam assim: regras simples aplicadas a cada instrução.`,starter:`def auditar_dockerfile(texto):
    return []
`,solution:`def auditar_dockerfile(texto):
    linhas = [l.strip() for l in texto.splitlines() if l.strip() and not l.strip().startswith("#")]
    avisos = []
    if not any(l.upper().startswith("USER ") for l in linhas):
        avisos.append("rode como usuário não-root")
    for l in linhas:
        if l.upper().startswith("FROM "):
            imagem = l.split()[1]
            if ":" not in imagem or imagem.endswith(":latest"):
                avisos.append("fixe a versão da imagem base")
            break
    copy_all = next((i for i, l in enumerate(linhas) if l == "COPY . ."), None)
    pip = next((i for i, l in enumerate(linhas) if l.startswith("RUN pip install")), None)
    if copy_all is not None and pip is not None and copy_all < pip:
        avisos.append("copie dependências antes do código")
    return avisos`,tests:[{name:`Dockerfile ruim`,code:`df = "FROM python\\nCOPY . .\\nRUN pip install -r requirements.txt\\nCMD [\\"python\\", \\"app.py\\"]"
assert auditar_dockerfile(df) == ["rode como usuário não-root", "fixe a versão da imagem base", "copie dependências antes do código"]`},{name:`Dockerfile bom`,code:`df = "# api\\nFROM python:3.13-slim\\nCOPY requirements.txt .\\nRUN pip install -r requirements.txt\\nCOPY . .\\nUSER app"
assert auditar_dockerfile(df) == []`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**API REST (parte 4)**: containerize sua API com um Dockerfile multi-stage, adicione um `compose.yaml` com PostgreSQL e faça a CI construir a imagem a cada push."},{type:`project`,projectId:`p5-api`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Container: processo isolado, compartilha o kernel; imagem: modelo imutável.
- Cache de camadas: dependências antes do código.
- Volumes persistem dados; variáveis de ambiente configuram.
- Não rode como root; fixe versões.`}]}],cards:[{id:`l12-docker#1`,front:`Container × VM?`,back:`Container isola processos no mesmo kernel (leve); VM virtualiza hardware com um SO completo (pesada).`},{id:`l12-docker#2`,front:`Como persistir dados de um container?`,back:`Com volumes.`}]};export{e as default};
//# sourceMappingURL=l12-docker-QkPEm_N_.js.map