var e={id:`l9-sockets`,moduleId:`m9-3`,title:`Sockets, protocolos de aplicação e servidores concorrentes`,titleEn:`Sockets, application protocols and concurrent servers`,summary:`A API de sockets, por que TCP entrega um fluxo de bytes (e não mensagens), como desenhar um protocolo simples e como um servidor atende muitos clientes.`,minutes:50,objectives:[`Descrever o ciclo de vida de um socket TCP no servidor e no cliente`,`Explicar por que é preciso enquadrar mensagens num fluxo TCP`,`Implementar o enquadramento por delimitador e por tamanho`,`Comparar threads, processos e E/S assíncrona num servidor`],skills:[`redes-sockets`],terms:[{pt:`soquete`,en:`socket`,def:`Ponto de comunicação de um processo na rede: IP + porta + protocolo.`},{pt:`escutar`,en:`listen`,def:`Pôr o socket do servidor à espera de conexões.`},{pt:`aceitar`,en:`accept`,def:`Pegar a próxima conexão da fila, gerando um socket para conversar com aquele cliente.`},{pt:`fluxo de bytes`,en:`byte stream`,def:`Sequência contínua de bytes, sem fronteiras de mensagem.`},{pt:`enquadramento`,en:`framing`,def:`Regra para saber onde cada mensagem começa e termina.`},{pt:`E/S assíncrona`,en:`asynchronous I/O`,def:`Uma thread atende muitas conexões, trocando de tarefa enquanto espera a rede.`},{pt:`balanceador de carga`,en:`load balancer`,def:`Distribui requisições entre várias instâncias do servidor.`}],references:[`kurose-ross`,`python-docs`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um **socket** é a "tomada" que um programa usa para falar pela rede. No TCP, o servidor **escuta** numa porta e **aceita** conexões; cada conexão vira um canal confiável e ordenado de **bytes**. Atenção ao detalhe que derruba muita gente: TCP entrega um **fluxo**, não mensagens. Duas mensagens enviadas podem chegar coladas, ou uma pode chegar em pedaços.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:'### Ciclo de vida\n\n**Servidor**: `socket()` → `bind(("0.0.0.0", 9000))` → `listen()` → em laço: `accept()` → `recv()`/`send()` → `close()`.\n**Cliente**: `socket()` → `connect(("servidor", 9000))` → `send()`/`recv()` → `close()`.\n\n### Enquadramento (framing)\n\nComo o TCP não marca fronteiras, o **protocolo de aplicação** precisa marcar:\n\n- **Delimitador**: cada mensagem termina com `\\n` (protocolos de texto como SMTP, Redis e o HTTP/1.1 nos cabeçalhos).\n- **Prefixo de tamanho**: 4 bytes dizendo o tamanho, depois o conteúdo (protocolos binários, HTTP/2).\n\nO receptor acumula os bytes num **buffer** e só entrega uma mensagem quando ela está completa.\n\n### Muitos clientes ao mesmo tempo\n\n- **Uma thread (ou processo) por conexão**: simples, mas milhares de conexões custam muita memória.\n- **E/S assíncrona** (`asyncio`, Node.js): uma thread com um *event loop* atende milhares de conexões, desde que nenhum handler bloqueie.\n- Em produção, um **proxy reverso / balanceador** (Nginx, HAProxy, o da nuvem) recebe as conexões e distribui entre várias instâncias.\n\n**WebSockets** começam como uma requisição HTTP e viram um canal bidirecional, com enquadramento próprio: é como chats e jogos no navegador conversam em tempo real.'}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`# servidor_eco.py — rode no seu computador (o navegador não abre sockets TCP)
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", 9000))
    srv.listen()
    print("escutando na porta 9000")
    while True:
        conn, endereco = srv.accept()
        with conn:
            print("conexão de", endereco)
            while dados := conn.recv(1024):     # b"" significa: o cliente fechou
                conn.sendall(dados.upper())`,runnable:!1,caption:`Teste com: nc 127.0.0.1 9000 (ou um cliente Python). Este servidor atende um cliente por vez: abra dois terminais e veja o segundo esperar.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# Simulando o que o TCP pode fazer com duas mensagens: juntar e fatiar.
enviado = b"ola\\nmundo\\n"
pedacos_recebidos = [b"o", b"la\\nmu", b"ndo\\n"]

buffer = b""
for pedaco in pedacos_recebidos:
    buffer += pedaco
    while b"\\n" in buffer:
        linha, buffer = buffer.split(b"\\n", 1)
        print("mensagem completa:", linha.decode())
print("sobrou no buffer:", buffer)`,runnable:!0},{type:`code`,lang:`python`,code:`# O mesmo servidor de eco com asyncio: atende vários clientes numa thread só.
import asyncio

async def atender(reader, writer):
    while linha := await reader.readline():      # enquadramento por \\n
        writer.write(linha.upper())
        await writer.drain()
    writer.close()

async def main():
    servidor = await asyncio.start_server(atender, "127.0.0.1", 9000)
    async with servidor:
        await servidor.serve_forever()

asyncio.run(main())`,runnable:!1,caption:`Rode localmente. Note o await: enquanto um cliente não manda nada, o event loop atende os outros.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e9-sock-0`,kind:`mcq`,prompt:'O cliente envia `send(b"oi")` e depois `send(b"tchau")`. O que o servidor pode receber no primeiro `recv(1024)`?',difficulty:`facil`,skills:[`redes-sockets`],hints:[`TCP garante ordem e integridade dos bytes. Ele garante fronteiras de mensagem?`],explanation:'Qualquer prefixo do fluxo: `b"oi"`, `b"oitchau"`, `b"o"`, etc. TCP é um fluxo de bytes; quem define as mensagens é o protocolo da aplicação.',options:[{text:`Sempre exatamente b"oi"`,feedback:`TCP não preserva fronteiras de send().`},{text:`Qualquer prefixo de b"oitchau", como b"oi", b"oitchau" ou b"o"`,correct:!0,feedback:`Isso: por isso existe o enquadramento.`},{text:`b"tchau" pode chegar antes de b"oi"`,feedback:`TCP garante a ordem dos bytes.`},{text:`Os bytes podem chegar corrompidos`,feedback:`TCP detecta erros e retransmite.`}]}},{type:`exercise`,exercise:{id:`e9-sock-1`,kind:`code`,lang:`python`,prompt:"Implemente `LeitorDeLinhas`, que recebe pedaços de bytes como chegariam de `recv()`:\n`alimentar(dados)` devolve a **lista de linhas completas** (strings sem o `\\n`, decodificadas em UTF-8) que ficaram prontas com esses dados,\nguardando o resto para a próxima chamada.",difficulty:`intermediario`,skills:[`redes-sockets`],hints:[`Guarde um buffer de bytes no objeto.`,`Enquanto houver b"\\n" no buffer, separe uma linha.`,`Decodifique só linhas completas: um caractere UTF-8 pode vir partido entre dois pedaços.`],explanation:`Essa classe é o coração de qualquer servidor de protocolo de texto. Decodificar só a linha completa evita quebrar caracteres multibyte (como "ç") que chegaram divididos.`,starter:`class LeitorDeLinhas:
    def __init__(self):
        self.buffer = b""

    def alimentar(self, dados):
        return []
`,solution:`class LeitorDeLinhas:
    def __init__(self):
        self.buffer = b""

    def alimentar(self, dados):
        self.buffer += dados
        linhas = []
        while b"\\n" in self.buffer:
            linha, self.buffer = self.buffer.split(b"\\n", 1)
            linhas.append(linha.decode("utf-8"))
        return linhas`,tests:[{name:`pedaços`,code:`l = LeitorDeLinhas()
assert l.alimentar(b"o") == []
assert l.alimentar(b"la\\nmu") == ["ola"]
assert l.alimentar(b"ndo\\n") == ["mundo"]`},{name:`várias de uma vez`,code:`assert LeitorDeLinhas().alimentar(b"a\\nb\\nc") == ["a", "b"]`},{name:`utf-8 partido`,code:`l = LeitorDeLinhas()
d = "ação\\n".encode()
assert l.alimentar(d[:2]) == []
assert l.alimentar(d[2:]) == ["ação"]`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e9-sock-desafio`,kind:`code`,lang:`python`,prompt:"Protocolos binários usam **prefixo de tamanho**. Escreva:\n\n- `empacotar(texto)`: devolve 4 bytes com o tamanho do texto em UTF-8 (big-endian, sem sinal) seguidos dos bytes do texto;\n- `desempacotar(buffer)`: recebe bytes acumulados e devolve `(mensagens, resto)`, onde `mensagens` é a lista de textos completos e `resto` são os bytes que ainda não formam uma mensagem.",difficulty:`desafio`,skills:[`redes-sockets`],hints:[`int.to_bytes(4, "big") e int.from_bytes(b, "big") convertem entre inteiro e bytes.`,`Só dá para ler o tamanho se houver pelo menos 4 bytes; só dá para ler a mensagem se houver 4 + tamanho bytes.`],explanation:`Prefixo de tamanho evita ter de "escapar" o delimitador dentro do conteúdo e permite saber de antemão quanto ler. Em servidores reais, limite o tamanho máximo aceito: senão um cliente manda "4 GB" no prefixo e esgota sua memória.`,starter:`def empacotar(texto):
    pass

def desempacotar(buffer):
    return [], buffer
`,solution:`def empacotar(texto):
    dados = texto.encode("utf-8")
    return len(dados).to_bytes(4, "big") + dados

def desempacotar(buffer):
    mensagens = []
    while len(buffer) >= 4:
        n = int.from_bytes(buffer[:4], "big")
        if len(buffer) < 4 + n:
            break
        mensagens.append(buffer[4:4 + n].decode("utf-8"))
        buffer = buffer[4 + n:]
    return mensagens, buffer`,tests:[{name:`empacotar`,code:`assert empacotar("oi") == b"\\x00\\x00\\x00\\x02oi"`},{name:`ida e volta`,code:`b = empacotar("olá") + empacotar("") + empacotar("mundo")
assert desempacotar(b) == (["olá", "", "mundo"], b"")`},{name:`mensagem incompleta`,code:`b = empacotar("abc") + empacotar("defgh")[:6]
m, r = desempacotar(b)
assert m == ["abc"] and r == empacotar("defgh")[:6]`}]}}]},{stage:`projeto`,blocks:[{type:`project`,projectId:`p8-chat`},{type:`md`,text:"No **chat em rede**, use o `LeitorDeLinhas` (ou o prefixo de tamanho) para separar mensagens, atenda vários clientes com `asyncio` e envie cada mensagem para todos os conectados (*broadcast*). Trate o cliente que desconecta no meio de uma mensagem."}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Servidor: bind → listen → accept; cliente: connect.
- TCP = fluxo de bytes ordenado e confiável, **sem fronteiras de mensagem**.
- Enquadramento por delimitador ou por prefixo de tamanho; buffer até a mensagem estar completa.
- Concorrência: thread por conexão, ou E/S assíncrona com event loop.`}]}],cards:[{id:`l9-sockets#1`,front:`TCP preserva as fronteiras de cada send()?`,back:`Não. Ele entrega um fluxo de bytes; a aplicação precisa enquadrar as mensagens.`},{id:`l9-sockets#2`,front:`Duas formas de enquadrar mensagens?`,back:`Delimitador (ex.: \\n) ou prefixo com o tamanho.`},{id:`l9-sockets#3`,front:`O que accept() devolve?`,back:`Um novo socket para conversar com aquele cliente, mais o endereço dele.`},{id:`l9-sockets#4`,front:`Vantagem da E/S assíncrona num servidor?`,back:`Uma thread atende muitas conexões, porque não fica parada esperando a rede.`}]};export{e as default};
//# sourceMappingURL=l9-sockets-XeUevIaE.js.map