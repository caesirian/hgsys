#!/usr/bin/env python3
"""Analiza cultivapp_export.json: clima + condiciones biológicas por sala (60 días).
Uso: python3 analizar_cultivapp.py cultivapp_export.json salida.md
"""
import json, math, sys, statistics as st
from collections import defaultdict
from datetime import datetime

src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else "informe.md"
D = json.load(open(src))

def vpd(t, h):  # kPa, hoja ~ aire (aprox.)
    es = 0.6108 * math.exp(17.27 * t / (t + 237.3))
    return es * (1 - h / 100)

def avg(m):
    if not m: return None
    if isinstance(m, dict) and m.get("count"): return m["sum"] / m["count"]
    return None

def series(resp):
    """-> lista de (clave, T, H, Tmin, Tmax, Hmin, Hmax)"""
    out = []
    for p in (resp or {}).get("puntos", []):
        m = p.get("metrics", {}); T = avg(m.get("tempAmb")); H = avg(m.get("humedad"))
        if T is None or H is None: continue
        g = lambda k, f: (m.get(k) or {}).get(f)
        out.append((p["clave"], T, H, g("tempAmb", "min"), g("tempAmb", "max"), g("humedad", "min"), g("humedad", "max")))
    return out

# Rangos de referencia (ambiente, luces encendidas) — ajustables
R = dict(T_alta=30, T_baja=18, T_critica=33, H_alta=70, H_alta_flor=60, H_baja=35, VPD_bajo=0.4, VPD_alto=1.6)

lines = []; P = lines.append
P(f"# Análisis clima y condiciones biológicas · {D.get('desde')} → {D.get('hasta')}\n")
cat = D.get("dispositivos", {}); cat = cat.get("dispositivos", cat)
resumen_sala = {}

for s, resp in D.get("sensores", {}).items():
    lugar = (cat.get(s) or {}).get("lugar", s)
    hs = series(resp.get("hora")); ds = series(resp.get("dia"))
    base = hs or ds
    P(f"\n## {lugar} (`{s}`)\n")
    if not base:
        P("Sin datos en el período (sensor offline o dispositivo reemplazado)."); continue
    nivel = "hora" if hs else "día"
    P(f"Resolución: **{nivel}** · puntos: {len(base)} · primer dato {base[0][0]} · último {base[-1][0]}\n")

    # cobertura (huecos)
    dias_con_datos = sorted({b[0][:10] for b in base})
    esperados = (datetime.fromisoformat(D["hasta"]) - datetime.fromisoformat(D["desde"])).days + 1
    P(f"Cobertura: {len(dias_con_datos)}/{esperados} días con lectura.\n")

    Ts = [b[1] for b in base]; Hs = [b[2] for b in base]; Vs = [vpd(b[1], b[2]) for b in base]
    P("| Métrica | Prom | Mín | Máx |\n|---|---|---|---|")
    P(f"| Temp (°C) | {st.mean(Ts):.1f} | {min(Ts):.1f} | {max(Ts):.1f} |")
    P(f"| Humedad (%) | {st.mean(Hs):.0f} | {min(Hs):.0f} | {max(Hs):.0f} |")
    P(f"| VPD (kPa) | {st.mean(Vs):.2f} | {min(Vs):.2f} | {max(Vs):.2f} |\n")

    n = len(base); pct = lambda c: 100 * c / n
    c_hot = sum(t > R["T_alta"] for t in Ts); c_crit = sum(t > R["T_critica"] for t in Ts)
    c_cold = sum(t < R["T_baja"] for t in Ts); c_hh = sum(h > R["H_alta"] for h in Hs)
    c_hl = sum(h < R["H_baja"] for h in Hs); c_vl = sum(v < R["VPD_bajo"] for v in Vs)
    c_vh = sum(v > R["VPD_alto"] for v in Vs)
    P(f"**% del tiempo fuera de rango** (sobre {nivel}s medidos):\n")
    P(f"- Temp > {R['T_alta']}°C: {pct(c_hot):.0f}% (> {R['T_critica']}°C: {pct(c_crit):.0f}%) · Temp < {R['T_baja']}°C: {pct(c_cold):.0f}%")
    P(f"- Humedad > {R['H_alta']}%: {pct(c_hh):.0f}% · Humedad < {R['H_baja']}%: {pct(c_hl):.0f}%")
    P(f"- VPD < {R['VPD_bajo']} kPa (transpiración frenada): {pct(c_vl):.0f}% · VPD > {R['VPD_alto']} kPa (estrés hídrico): {pct(c_vh):.0f}%\n")

    # por día
    por_dia = defaultdict(list)
    for b in base: por_dia[b[0][:10]].append(b)
    filas = []
    for d, bs in sorted(por_dia.items()):
        t = [x[1] for x in bs]; h = [x[2] for x in bs]; v = [vpd(x[1], x[2]) for x in bs]
        tmax = max([x[4] for x in bs if x[4] is not None] or [max(t)])
        hmax = max([x[6] for x in bs if x[6] is not None] or [max(h)])
        filas.append(dict(d=d, T=st.mean(t), H=st.mean(h), V=st.mean(v), Tmax=tmax, Hmax=hmax,
                          amp=max(t) - min(t), hr_hot=sum(x > R["T_alta"] for x in t) if nivel == "hora" else None,
                          hr_hum=sum(x > R["H_alta"] for x in h) if nivel == "hora" else None,
                          hr_vh=sum(x > R["VPD_alto"] for x in v) if nivel == "hora" else None))

    # semanal
    P("**Evolución semanal**\n\n| Semana desde | T prom | H prom | VPD prom | T máx | H máx |\n|---|---|---|---|---|---|")
    for i in range(0, len(filas), 7):
        w = filas[i:i + 7]
        P(f"| {w[0]['d']} | {st.mean(x['T'] for x in w):.1f} | {st.mean(x['H'] for x in w):.0f} | {st.mean(x['V'] for x in w):.2f} | {max(x['Tmax'] for x in w):.1f} | {max(x['Hmax'] for x in w):.0f} |")

    # eventos de riesgo
    def rachas(cond, minlen):
        out, cur = [], []
        for f in filas:
            if cond(f): cur.append(f)
            else:
                if len(cur) >= minlen: out.append((cur[0]["d"], cur[-1]["d"], len(cur)))
                cur = []
        if len(cur) >= minlen: out.append((cur[0]["d"], cur[-1]["d"], len(cur)))
        return out

    r_acaros = rachas(lambda f: f["T"] > 28 and f["H"] < 45, 3)       # calor+seco: ácaros/trips
    r_hongos = rachas(lambda f: f["H"] > 65 and f["T"] < 26, 3)       # húmedo+templado: oídio/botrytis
    r_vpdalto = rachas(lambda f: f["V"] > 1.5, 2)                      # estrés hídrico
    r_vpdbajo = rachas(lambda f: f["V"] < 0.5, 3)                      # transpiración frenada
    saltos = [(filas[i]["d"], filas[i]["V"] - filas[i - 1]["V"]) for i in range(1, len(filas)) if abs(filas[i]["V"] - filas[i - 1]["V"]) > 0.5]
    amp = [(f["d"], f["amp"]) for f in filas if f["amp"] > 10]

    P("\n**Ventanas de riesgo detectadas**\n")
    fmt = lambda r: ", ".join(f"{a}→{b} ({n} d)" for a, b, n in r) or "ninguna"
    P(f"- 🕷️ Calor + aire seco (T prom >28°C y H <45%, ≥3 días) → favorece ácaros/trips: {fmt(r_acaros)}")
    P(f"- 🍄 Húmedo + templado (H >65% y T <26°C, ≥3 días) → favorece oídio/botrytis/mosca del sustrato: {fmt(r_hongos)}")
    P(f"- 💧 VPD alto sostenido (>1.5 kPa, ≥2 días) → estrés hídrico: {fmt(r_vpdalto)}")
    P(f"- 🌫️ VPD bajo sostenido (<0.5 kPa, ≥3 días) → transpiración frenada, menor absorción de nutrientes (Ca/Mg): {fmt(r_vpdbajo)}")
    P(f"- ⚡ Saltos bruscos de VPD día a día (>0.5 kPa): {', '.join(f'{d} ({v:+.2f})' for d, v in saltos) or 'ninguno'}")
    P(f"- 🌡️ Amplitud térmica diaria >10°C: {', '.join(f'{d} ({a:.0f}°)' for d, a in amp[:12]) or 'ninguna'}{' …' if len(amp) > 12 else ''}")
    resumen_sala[lugar] = dict(acaros=r_acaros, hongos=r_hongos, vh=r_vpdalto, vl=r_vpdbajo, saltos=saltos)

# Cruce con eventos reales de las plantas
P("\n## Cruce con eventos y mediciones registrados en las plantas\n")
lug_nombre = {l["id"]: l.get("nombre", l["id"]) for l in D.get("lugares", [])}
hay = False
for p in D.get("plantas", []):
    evs = [e for e in p.get("eventos", []) if e.get("tipo") in ("plaga", "tratamiento", "poda", "trasplante", "riego", "fertilizacion", "problema", "nota", "foto")]
    if not evs and not p.get("mediciones"): continue
    hay = True
    P(f"### {p.get('nombre','?')} · {lug_nombre.get(p.get('lugarId'), p.get('lugarId'))} · fase {p.get('fase','?')}")
    for e in sorted(evs, key=lambda e: str(e.get("fecha", "")))[-15:]:
        P(f"- {str(e.get('fecha',''))[:10]} · {e.get('tipo')}: {e.get('titulo') or e.get('descripcion') or e.get('notas') or ''}".rstrip(": "))
    ecs = [(str(m.get("fecha", ""))[:10], m.get("ec"), m.get("ph")) for m in p.get("mediciones", []) if m.get("ec") or m.get("ph")]
    if ecs:
        P("- EC/pH: " + " · ".join(f"{d}: EC {e or '–'} / pH {h or '–'}" for d, e, h in sorted(ecs)[-8:]))
if not hay:
    P("Sin eventos ni mediciones en el export.")

P("\n---\n*Umbrales usados: ver diccionario `R` en el script. VPD calculado con temperatura de hoja ≈ aire (sin offset de hoja). Los promedios horarios/diarios suavizan picos: el VPD real instantáneo puede ser mayor.*")
open(dst, "w").write("\n".join(lines))
print("OK ->", dst)
