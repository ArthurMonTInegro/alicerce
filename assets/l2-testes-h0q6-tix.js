var e={id:`l2-testes`,moduleId:`m2-5`,title:`Testes automatizados`,titleEn:`Automated testing`,summary:`assert, testes de unidade, unittest/pytest, casos de borda e TDD.`,minutes:30,objectives:[`Escrever testes de unidade com assert`,`Organizar testes com unittest ou pytest`,`Escolher bons casos de teste (classes de equivalência e bordas)`,`Praticar o ciclo TDD`],skills:[`py-testes`],terms:[{pt:`teste de unidade`,en:`unit test`,def:`Teste de uma pequena parte isolada do código (uma função).`},{pt:`asserção`,en:`assertion`,def:`Afirmação que deve ser verdadeira; se não for, o teste falha.`,example:`AssertionError: expected 5, got 4`},{pt:`caso de teste`,en:`test case`,def:`Uma entrada com o resultado esperado.`},{pt:`desenvolvimento guiado por testes`,en:`test-driven development (TDD)`,def:`Escrever o teste antes do código: red → green → refactor.`},{pt:`regressão`,en:`regression`,def:`Bug que volta depois de corrigido; testes previnem.`}],references:[`python-docs`,`pytest-docs`,`swe-at-google`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um **teste automatizado** é código que verifica outro código. Em vez de testar manualmente toda vez, você escreve uma vez e roda sempre. Todos os exercícios do Alicerce são corrigidos assim — agora você vai escrever os seus.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Como escolher casos de teste**:

- **Caso típico**: uma entrada comum.
- **Bordas**: vazio, zero, um elemento, o máximo, valores iguais.
- **Classes de equivalência**: se positivos se comportam igual, um positivo representa todos; teste um de cada classe (negativo, zero, positivo).
- **Entradas inválidas**: o que deve acontecer? Uma exceção?

**TDD (Test-Driven Development)** em 3 passos: 🔴 escreva um teste que falha → 🟢 escreva o mínimo de código para passar → 🔵 refatore com segurança.

Em projetos reais, use **pytest** (\`pip install pytest\`, funções \`test_*\`, roda com \`pytest\`) ou **unittest** (biblioteca padrão).`},{type:`code`,lang:`python`,runnable:!1,code:`# tests/test_texto.py  — rode com: pytest
from texto import eh_palindromo

def test_palindromo_simples():
    assert eh_palindromo("arara")

def test_ignora_maiusculas_e_espacos():
    assert eh_palindromo("Ame a ema")

def test_nao_palindromo():
    assert not eh_palindromo("python")`,caption:`Estilo pytest: funções que começam com test_ e usam assert.`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`import unittest

def desconto(preco, pct):
    if not 0 <= pct <= 100:
        raise ValueError("percentual inválido")
    return round(preco * (1 - pct / 100), 2)

class TestDesconto(unittest.TestCase):
    def test_tipico(self):
        self.assertEqual(desconto(100, 10), 90)

    def test_bordas(self):
        self.assertEqual(desconto(100, 0), 100)
        self.assertEqual(desconto(100, 100), 0)

    def test_invalido(self):
        with self.assertRaises(ValueError):
            desconto(100, 150)

unittest.main(argv=["x"], exit=False, verbosity=2)`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`md`,text:`Agora inverta os papéis: **você** escreve os testes. No próximo exercício, os testes do Alicerce verificam se os **seus testes** detectam implementações erradas — isso se chama *mutation testing*.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e2-test-1`,kind:`code`,lang:`python`,prompt:'Escreva a função `testar(f)` que recebe uma implementação `f` de "valor absoluto" e devolve True se `f` passa\nnos **seus** casos de teste e False caso contrário. Os testes do Alicerce vão passar implementações corretas e\nerradas: seus casos precisam pegar as erradas (ex.: uma que esquece os negativos, outra que erra o zero).',difficulty:`avancado`,skills:[`py-testes`],hints:[`Que classes de entrada existem para valor absoluto?`,`Negativo, zero e positivo. Teste pelo menos um de cada.`,"Use `try/except` se uma implementação errada puder lançar erro, e devolva False nesse caso."],explanation:`Casos de teste bons cobrem as classes de equivalência e as bordas. Avaliar testes com implementações "mutantes" é exatamente como ferramentas de mutation testing medem a qualidade de uma suíte.`,starter:`def testar(f):
    return f(3) == 3
`,solution:`def testar(f):
    try:
        return f(-5) == 5 and f(0) == 0 and f(7) == 7 and f(-0.5) == 0.5
    except Exception:
        return False`,tests:[{name:`aceita a implementação correta`,code:`assert testar(abs) is True`},{name:`rejeita: esquece negativos`,code:`assert testar(lambda x: x) is False`},{name:`rejeita: erra o zero`,code:`assert testar(lambda x: abs(x) if x != 0 else 1) is False`},{name:`rejeita: só funciona com inteiros`,code:`assert testar(lambda x: x if x >= 0 else -int(x)) is False`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e2-test-desafio`,kind:`code`,lang:`python`,prompt:'Pratique TDD: os testes já estão escritos (veja nos resultados). Implemente `validar_senha(s)` que devolve uma **lista de problemas** (strings) ou lista vazia se a senha for válida. Regras: mínimo 8 caracteres ("curta"), ao menos um dígito ("sem dígito"), ao menos uma maiúscula ("sem maiúscula"). A ordem dos problemas é a das regras.',difficulty:`intermediario`,skills:[`py-testes`,`prog-strings`],hints:[`Rode primeiro: veja quais testes falham (vermelho).`,`Uma regra por vez: faça um teste passar, depois o próximo (verde).`],explanation:`Devolver a **lista de problemas** em vez de um simples bool dá feedback melhor ao usuário — um bom exemplo de como o design da função nasce dos testes.`,starter:`def validar_senha(s):
    return []
`,solution:`def validar_senha(s):
    problemas = []
    if len(s) < 8:
        problemas.append("curta")
    if not any(c.isdigit() for c in s):
        problemas.append("sem dígito")
    if not any(c.isupper() for c in s):
        problemas.append("sem maiúscula")
    return problemas`,tests:[{name:`senha válida`,code:`assert validar_senha("Alicerce2026") == []`},{name:`curta`,code:`assert validar_senha("Ab1") == ["curta"]`},{name:`todos os problemas`,code:`assert validar_senha("abc") == ["curta", "sem dígito", "sem maiúscula"]`},{name:`sem maiúscula`,code:`assert validar_senha("alicerce2026") == ["sem maiúscula"]`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Lista de tarefas (final)**: escreva testes com pytest para `modelo.py` (adicionar, concluir, remover, casos inválidos). Meta: todas as regras testadas. Projeto 2 concluído!"},{type:`project`,projectId:`p2-todo`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Testes automatizados verificam código continuamente.
- Casos: típico, bordas, classes de equivalência, inválidos.
- TDD: vermelho → verde → refatorar.
- pytest para projetos; unittest na biblioteca padrão.`}]}],cards:[{id:`l2-testes#1`,front:`Quais são as etapas do TDD?`,back:`Red (teste falhando), green (código mínimo para passar), refactor.`},{id:`l2-testes#2`,front:`O que são classes de equivalência?`,back:`Grupos de entradas que o programa deve tratar da mesma forma; testa-se um representante de cada.`},{id:`l2-testes#3`,front:`O que é uma regressão?`,back:`Um bug que reaparece após ter sido corrigido.`}]};export{e as default};
//# sourceMappingURL=l2-testes-h0q6-tix.js.map