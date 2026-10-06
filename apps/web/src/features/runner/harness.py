# Alicerce — harness de execução Python.
# Executado dentro do Pyodide (navegador) e pelo script scripts/verify-solutions.ts (CPython local),
# para que a correção de exercícios se comporte igual nos dois lugares.
import builtins
import io
import json
import reprlib
import sys
import traceback

USER_FILE = "main.py"
MAX_TRACE_STEPS = 400

_repr = reprlib.Repr()
_repr.maxstring = 60
_repr.maxother = 60
_repr.maxlist = 12
_repr.maxdict = 10


def _safe_repr(v):
    try:
        if callable(v) and hasattr(v, "__name__"):
            return f"<função {v.__name__}>"
        return _repr.repr(v)
    except Exception:
        return "<?>"


def _type_name(v):
    return type(v).__name__


def _user_frames(tb):
    """Mantém só os quadros do código do estudante (main.py / teste.py)."""
    frames = []
    for fs in traceback.extract_tb(tb):
        if fs.filename in (USER_FILE, "teste.py"):
            frames.append({"file": fs.filename, "line": fs.lineno, "func": fs.name, "code": fs.line or ""})
    return frames


def _error_info(exc):
    info = {"type": type(exc).__name__, "message": str(exc), "line": None, "frames": [], "traceback": ""}
    if isinstance(exc, SyntaxError):
        info["line"] = exc.lineno
        info["message"] = exc.msg
        info["offset"] = exc.offset
        info["code"] = (exc.text or "").rstrip("\n")
        info["traceback"] = "".join(traceback.format_exception_only(type(exc), exc))
        return info
    frames = _user_frames(exc.__traceback__)
    info["frames"] = frames
    if frames:
        info["line"] = frames[-1]["line"]
    lines = ["Traceback (most recent call last):\n"]
    for f in frames:
        lines.append(f'  File "{f["file"]}", line {f["line"]}, in {f["func"]}\n')
        if f["code"]:
            lines.append(f"    {f['code']}\n")
    lines.extend(traceback.format_exception_only(type(exc), exc))
    info["traceback"] = "".join(lines)
    return info


class _Input:
    def __init__(self, text, out):
        self.lines = text.split("\n") if text else []
        self.out = out

    def __call__(self, prompt=""):
        self.out.write(str(prompt))
        if not self.lines:
            raise EOFError("EOF when reading a line (o programa pediu mais entradas do que as fornecidas)")
        return self.lines.pop(0)


def run(user_code, tests_json="[]", stdin_text="", trace=False):
    tests = json.loads(tests_json)
    out = io.StringIO()
    ns = {"__name__": "__main__", "__builtins__": builtins}
    result = {"ok": True, "phase": "run", "stdout": "", "error": None, "tests": [], "steps": []}
    old_stdout, old_input = sys.stdout, builtins.input
    sys.stdout = out
    builtins.input = _Input(stdin_text, out)
    steps = []

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != USER_FILE:
            return None
        if event in ("line", "return") and len(steps) < MAX_TRACE_STEPS:
            stack = []
            f = frame
            while f is not None and f.f_code.co_filename == USER_FILE:
                name = f.f_code.co_name
                local_items = f.f_globals if name == "<module>" else f.f_locals
                vars_ = {
                    k: {"repr": _safe_repr(v), "type": _type_name(v)}
                    for k, v in list(local_items.items())
                    if not k.startswith("__") and _type_name(v) != "module"
                }
                stack.append({"func": "global" if name == "<module>" else name, "vars": vars_})
                f = f.f_back
            stack.reverse()
            step = {"line": frame.f_lineno, "event": event, "stack": stack, "stdout": out.getvalue()}
            if event == "return" and frame.f_code.co_name != "<module>":
                step["returned"] = _safe_repr(arg)
            steps.append(step)
        return tracer

    try:
        try:
            code = compile(user_code, USER_FILE, "exec")
        except SyntaxError as e:
            result.update(ok=False, phase="compile", error=_error_info(e))
            return json.dumps(result)
        try:
            if trace:
                sys.settrace(tracer)
            exec(code, ns)
        except BaseException as e:  # noqa: BLE001 — queremos reportar tudo, inclusive SystemExit
            sys.settrace(None)
            if isinstance(e, KeyboardInterrupt):
                result.update(ok=False, phase="run", error={"type": "Timeout", "message": "execução interrompida", "line": None, "frames": [], "traceback": ""})
            elif not (isinstance(e, SystemExit) and not e.code):
                result.update(ok=False, phase="run", error=_error_info(e))
        finally:
            sys.settrace(None)
        result["steps"] = steps
        if result["ok"] and tests:
            result["phase"] = "tests"
            for t in tests:
                ns["_output"] = out.getvalue()
                ns["_source"] = user_code
                entry = {"name": t["name"], "passed": True, "message": ""}
                saved = out.tell()
                try:
                    exec(compile(t["code"], "teste.py", "exec"), ns)
                except AssertionError as e:
                    entry.update(passed=False, message=str(e))
                except BaseException as e:  # noqa: BLE001
                    entry.update(passed=False, message=f"{type(e).__name__}: {e}", error=_error_info(e))
                # o que os testes imprimem não conta como saída do programa
                out.seek(saved)
                out.truncate()
                result["tests"].append(entry)
            result["ok"] = all(t["passed"] for t in result["tests"])
    finally:
        result["stdout"] = out.getvalue()
        sys.stdout, builtins.input = old_stdout, old_input
    return json.dumps(result)


def run_sql(setup, query, solution, ordered=True):
    """Executa a consulta do estudante e a de referência em bancos idênticos e compara os resultados."""
    import sqlite3

    def execute(sql):
        con = sqlite3.connect(":memory:")
        try:
            con.executescript(setup)
            cur = con.execute(sql)
            cols = [d[0] for d in cur.description] if cur.description else []
            rows = [list(r) for r in cur.fetchall()]
            return cols, rows
        finally:
            con.close()

    result = {"ok": False, "columns": [], "rows": [], "expectedColumns": [], "expectedRows": [], "error": None, "message": ""}
    exp_cols, exp_rows = execute(solution)
    result["expectedColumns"], result["expectedRows"] = exp_cols, exp_rows
    statements = [s for s in query.strip().rstrip(";").split(";") if s.strip()]
    if len(statements) != 1:
        result["message"] = "Envie exatamente uma consulta (um único SELECT)."
        return json.dumps(result)
    try:
        cols, rows = execute(statements[0])
    except sqlite3.Error as e:
        result["error"] = {"type": type(e).__name__, "message": str(e)}
        return json.dumps(result)
    result["columns"], result["rows"] = cols, rows

    def norm(rs):
        return [[round(v, 6) if isinstance(v, float) else v for v in r] for r in rs]

    a, b = norm(rows), norm(exp_rows)
    if len(cols) != len(exp_cols):
        result["message"] = f"Sua consulta devolveu {len(cols)} coluna(s); o esperado são {len(exp_cols)}: {', '.join(exp_cols)}."
    elif len(a) != len(b):
        result["message"] = f"Sua consulta devolveu {len(a)} linha(s); o esperado são {len(b)}. Revise os filtros (WHERE/HAVING) e os JOINs."
    elif ordered and a != b:
        if sorted(map(repr, a)) == sorted(map(repr, b)):
            result["message"] = "As linhas estão certas, mas a ordem não. Revise o ORDER BY."
        else:
            result["message"] = "Os valores não batem com o esperado. Compare as tabelas abaixo."
    elif not ordered and sorted(map(repr, a)) != sorted(map(repr, b)):
        result["message"] = "Os valores não batem com o esperado. Compare as tabelas abaixo."
    else:
        result["ok"] = True
        result["message"] = "Resultado correto!"
    return json.dumps(result)
