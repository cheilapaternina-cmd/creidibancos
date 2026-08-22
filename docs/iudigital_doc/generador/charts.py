# -*- coding: utf-8 -*-
"""Genera los graficos del documento de arquitectura de CreditSmart."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch
import numpy as np
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(OUT, exist_ok=True)

# Paleta exacta del proyecto (assets/css/02-tokens.css)
BLUE700, BLUE600, BLUE100, BLUE50 = '#1d4ed8', '#2563eb', '#dbeafe', '#eff6ff'
EMERALD, VIOLET, AMBER, ROSE = '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e'
TEAL = '#14b8a6'
GRAY900, GRAY700, GRAY500, GRAY300, GRAY200, GRAY100, GRAY50 = (
    '#111827', '#374151', '#6b7280', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb')

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Segoe UI', 'Arial', 'DejaVu Sans'],
    'font.size': 9,
    'axes.edgecolor': GRAY300,
    'axes.labelcolor': GRAY700,
    'text.color': GRAY900,
    'xtick.color': GRAY500,
    'ytick.color': GRAY700,
    'figure.dpi': 200,
    'savefig.dpi': 200,
    'savefig.bbox': 'tight',
    'savefig.facecolor': 'white',
})

PRODUCTS = [
    (u'Libre Inversión', 18.5, 1000000, 30000000, 60, BLUE700),
    (u'Vehículo', 14.2, 5000000, 120000000, 84, EMERALD),
    (u'Vivienda', 11.8, 20000000, 500000000, 240, VIOLET),
    (u'Educativo', 10.5, 500000, 50000000, 72, AMBER),
    (u'Empresarial', 16.0, 10000000, 1000000000, 120, ROSE),
    (u'Libranza', 13.5, 1000000, 80000000, 96, TEAL),
]


def strip_axes(ax, keep_left=True):
    for s in ('top', 'right'):
        ax.spines[s].set_visible(False)
    if not keep_left:
        ax.spines['left'].set_visible(False)
    ax.spines['bottom'].set_color(GRAY300)


def miles(n):
    return '{:,.0f}'.format(n).replace(',', '.')


# ---------------------------------------------------------------- 1. tasas
def chart_tasas():
    fig, ax = plt.subplots(figsize=(6.4, 3.0))
    names = [p[0] for p in PRODUCTS][::-1]
    rates = [p[1] for p in PRODUCTS][::-1]
    colors = [p[5] for p in PRODUCTS][::-1]
    bars = ax.barh(names, rates, color=colors, height=0.62, zorder=3)
    for b, r in zip(bars, rates):
        ax.text(b.get_width() + 0.35, b.get_y() + b.get_height() / 2,
                (u'%.1f %%' % r).replace('.', ','), va='center', ha='left',
                fontsize=9, fontweight='bold', color=GRAY700)
    ax.set_xlim(0, 21)
    ax.set_xticks([0, 5, 10, 15, 20])
    ax.set_xlabel(u'Tasa efectiva anual (%)')
    ax.xaxis.grid(True, color=GRAY100, zorder=0)
    ax.set_axisbelow(True)
    strip_axes(ax, keep_left=False)
    ax.tick_params(axis='y', length=0)
    ax.set_title(u'Tasa efectiva anual por producto de crédito',
                 fontsize=10.5, fontweight='bold', color=BLUE700, loc='left', pad=10)
    fig.savefig(os.path.join(OUT, 'chart-tasas.png'))
    plt.close(fig)


# ---------------------------------------------------------------- 2. rangos
def chart_rangos():
    fig, ax = plt.subplots(figsize=(6.4, 3.2))
    for i, prod in enumerate(PRODUCTS[::-1]):
        name, _r, mn, mx, _t, color = prod
        ax.plot([mn, mx], [i, i], color=color, linewidth=7,
                solid_capstyle='round', zorder=3)
        for x in (mn, mx):
            ax.plot([x], [i], 'o', color='white', markersize=4,
                    markeredgecolor=color, markeredgewidth=1.6, zorder=4)
        ax.text(mx * 1.35, i, u'$%s M' % miles(mx / 1000000.0),
                va='center', fontsize=8, color=GRAY700, fontweight='bold')
        low = (u'%.1f' % (mn / 1000000.0)).replace('.0', '').replace('.', ',')
        ax.text(mn * 0.72, i, u'$%s M' % low,
                va='center', ha='right', fontsize=7.5, color=GRAY500)
    ax.set_yticks(range(len(PRODUCTS)))
    ax.set_yticklabels([p[0] for p in PRODUCTS][::-1])
    ax.set_xscale('log')
    ax.set_xlim(1.2e5, 6e9)
    ax.set_xlabel(u'Monto en pesos colombianos (escala logarítmica)')
    ax.set_xticks([1e6, 1e7, 1e8, 1e9])
    ax.set_xticklabels([u'$1 M', u'$10 M', u'$100 M', u'$1.000 M'])
    ax.xaxis.grid(True, color=GRAY100, zorder=0)
    ax.set_axisbelow(True)
    strip_axes(ax, keep_left=False)
    ax.tick_params(axis='y', length=0)
    ax.set_title(u'Rango de montos admitido por cada producto',
                 fontsize=10.5, fontweight='bold', color=BLUE700, loc='left', pad=10)
    fig.savefig(os.path.join(OUT, 'chart-rangos.png'))
    plt.close(fig)


# ---------------------------------------------------------------- 3. plazos
def chart_plazos():
    fig, ax = plt.subplots(figsize=(6.6, 2.5))
    names = [p[0] for p in PRODUCTS]
    terms = [p[4] for p in PRODUCTS]
    colors = [p[5] for p in PRODUCTS]
    bars = ax.bar(names, terms, color=colors, width=0.56, zorder=3)
    for b, t in zip(bars, terms):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 6,
                str(t), ha='center', fontsize=9, fontweight='bold', color=GRAY700)
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 26,
                u'%d años' % (t // 12), ha='center', fontsize=7, color=GRAY500)
    ax.set_ylim(0, 300)
    ax.set_ylabel(u'Plazo máximo (meses)')
    ax.yaxis.grid(True, color=GRAY100, zorder=0)
    ax.set_axisbelow(True)
    strip_axes(ax)
    ax.set_title(u'Plazo máximo de financiación por producto',
                 fontsize=10.5, fontweight='bold', color=BLUE700, loc='left', pad=10)
    fig.savefig(os.path.join(OUT, 'chart-plazos.png'))
    plt.close(fig)


# ---------------------------------------------------------------- 4. capas (donut)
def chart_capas():
    fig, ax = plt.subplots(figsize=(4.8, 3.3))
    labels = [u'Dominio\n23 archivos', u'Presentación\n22 archivos',
              u'Aplicación\n12 archivos', u'Infraestructura\n11 archivos',
              u'Configuración\n5 archivos']
    sizes = [23, 22, 12, 11, 5]
    colors = [BLUE700, EMERALD, VIOLET, AMBER, GRAY500]
    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels, colors=colors, startangle=90,
        autopct=lambda p: u'%.0f %%' % p, pctdistance=0.78,
        wedgeprops=dict(width=0.42, edgecolor='white', linewidth=2),
        textprops=dict(fontsize=8, color=GRAY700))
    for t in autotexts:
        t.set_color('white')
        t.set_fontweight('bold')
        t.set_fontsize(8)
    ax.text(0, 0, u'73\narchivos\nJS', ha='center', va='center',
            fontsize=11, fontweight='bold', color=BLUE700)
    ax.set_title(u'Distribución del código fuente por capa',
                 fontsize=10.5, fontweight='bold', color=BLUE700, pad=6)
    fig.savefig(os.path.join(OUT, 'chart-capas.png'))
    plt.close(fig)


# ---------------------------------------------------------------- 5. cascada CSS
def chart_css():
    fig, ax = plt.subplots(figsize=(6.4, 2.7))
    files = ['01-reset', '02-tokens', '03-base', '04-layout',
             '05-components', '06-pages', '07-responsive']
    lines = [175, 197, 81, 98, 541, 282, 78]
    colors = [GRAY500, BLUE700, BLUE600, '#3b82f6', EMERALD, VIOLET, AMBER]
    bars = ax.bar(files, lines, color=colors, width=0.6, zorder=3)
    for b, v in zip(bars, lines):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 12, str(v),
                ha='center', fontsize=8.5, fontweight='bold', color=GRAY700)
    ax.set_ylim(0, 620)
    ax.set_ylabel(u'Líneas de CSS')
    ax.yaxis.grid(True, color=GRAY100, zorder=0)
    ax.set_axisbelow(True)
    strip_axes(ax)
    plt.setp(ax.get_xticklabels(), rotation=18, ha='right', fontsize=8)
    ax.set_title(u'Cascada de estilos: 1.452 líneas en 7 archivos por especificidad creciente',
                 fontsize=10, fontweight='bold', color=BLUE700, loc='left', pad=10)
    fig.savefig(os.path.join(OUT, 'chart-css.png'))
    plt.close(fig)


# ---------------------------------------------------------------- 6. responsive
def chart_responsive():
    fig, ax = plt.subplots(figsize=(6.6, 2.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 34)
    ax.axis('off')

    devices = [
        (u'Móvil', u'< 640 px', 1, 2.0, 21.0, BLUE700),
        (u'Tablet', u'640 – 1023 px', 2, 28.0, 28.0, EMERALD),
        (u'Escritorio', u'≥ 1024 px', 3, 61.0, 37.0, VIOLET),
    ]
    for name, width_label, cols, x0, w, color in devices:
        ax.add_patch(Rectangle((x0, 3), w, 26, facecolor='white',
                               edgecolor=color, linewidth=1.8, zorder=2))
        ax.text(x0 + w / 2, 30.6, name, ha='center', fontsize=9.5,
                fontweight='bold', color=color)
        ax.text(x0 + w / 2, 0.6, width_label, ha='center', fontsize=8, color=GRAY500)
        pad, gap = 1.6, 1.2
        cw = (w - 2 * pad - gap * (cols - 1)) / cols
        for c in range(cols):
            cx = x0 + pad + c * (cw + gap)
            ax.add_patch(Rectangle((cx, 15.5), cw, 10, facecolor=BLUE50,
                                   edgecolor=color, linewidth=0.8, zorder=3))
            ax.add_patch(Rectangle((cx, 6.0), cw, 8, facecolor=GRAY50,
                                   edgecolor=GRAY200, linewidth=0.8, zorder=3))
        sufijo = u'columnas' if cols > 1 else u'columna'
        ax.text(x0 + w / 2, 26.8, u'grid-products: %d %s' % (cols, sufijo),
                ha='center', fontsize=7.0, color=GRAY700, fontweight='bold')

    for x in (24.0, 57.0):
        ax.add_patch(FancyArrowPatch((x, 16), (x + 3.6, 16),
                                     arrowstyle='-|>', mutation_scale=13,
                                     color=GRAY500, linewidth=1.2))
    ax.set_title(u'Diseño responsive mobile-first: dos breakpoints, tres presentaciones',
                 fontsize=10, fontweight='bold', color=BLUE700, loc='left', pad=6)
    fig.savefig(os.path.join(OUT, 'chart-responsive.png'))
    plt.close(fig)


# ---------------------------------------------------------------- 7. hexagono
def chart_hexagono():
    fig, ax = plt.subplots(figsize=(6.5, 4.3))
    ax.set_xlim(-1.62, 1.62)
    ax.set_ylim(-1.30, 1.30)
    ax.axis('off')

    def hexagon(radius, **kw):
        ang = np.linspace(np.pi / 6, 2 * np.pi + np.pi / 6, 7)
        ax.fill(radius * np.cos(ang), radius * np.sin(ang) * 0.92, **kw)

    hexagon(1.0, facecolor=BLUE50, edgecolor=BLUE600, linewidth=1.6, zorder=2)
    hexagon(0.62, facecolor=BLUE100, edgecolor=BLUE700, linewidth=1.6, zorder=3)
    ax.text(0, 0.12, u'DOMINIO', ha='center', fontsize=10, fontweight='bold',
            color=BLUE700, zorder=5)
    ax.text(0, -0.12, u'2 entidades · 8 value objects\n1 servicio · 1 criterio · 7 puertos',
            ha='center', fontsize=6.8, color=GRAY700, zorder=5)
    ax.text(0, 0.70, u'APLICACIÓN · 5 casos de uso', ha='center', fontsize=8,
            fontweight='bold', color=BLUE600, zorder=6,
            bbox=dict(boxstyle='round,pad=0.20', facecolor=BLUE50,
                      edgecolor='none'))

    outside = [
        (-1.58, 0.62, u'Navegador\n(DOM · History API)', EMERALD, 'left'),
        (1.58, 0.62, u'localStorage\n(persistencia)', AMBER, 'right'),
        (-1.58, 0.00, u'Datos estáticos\n(catálogo)', VIOLET, 'left'),
        (1.58, 0.00, u'Intl · crypto · Date\n(APIs del navegador)', ROSE, 'right'),
        (-1.58, -0.62, u'Consola\n(logging)', GRAY500, 'left'),
        (1.58, -0.62, u'Notificaciones\n(toasts)', BLUE700, 'right'),
    ]
    for x, y, label, color, ha in outside:
        ax.text(x, y, label, ha=ha, va='center', fontsize=7.2, color=GRAY700,
                bbox=dict(boxstyle='round,pad=0.34', facecolor='white',
                          edgecolor=color, linewidth=1.2), zorder=5)
        side = -1.0 if x < 0 else 1.0          # el adaptador entra por SU lado
        x_ini = x - side * 0.40                 # borde interior de su caja
        x_fin = side * 0.74                     # borde del hexágono del dominio
        ax.add_patch(FancyArrowPatch((x_ini, y), (x_fin, y * 0.72),
                                     arrowstyle='-|>', mutation_scale=11,
                                     color=color, linewidth=1.1, zorder=4,
                                     connectionstyle='arc3,rad=0.0'))
    ax.text(0, -1.21, u'Cada flecha entra por un PUERTO declarado en el núcleo; '
                      u'el adaptador es sustituible',
            ha='center', fontsize=7, color=GRAY500, style='italic')
    ax.set_title(u'Arquitectura hexagonal: núcleo aislado, adaptadores intercambiables',
                 fontsize=10.5, fontweight='bold', color=BLUE700, pad=4)
    fig.savefig(os.path.join(OUT, 'chart-hexagono.png'))
    plt.close(fig)


# ---------------------------------------------------------------- 8. capas y dependencia
def chart_capas_dependencia():
    fig, ax = plt.subplots(figsize=(6.5, 3.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 64)
    ax.axis('off')
    CENTER_Y = 35
    rings = [
        (1, 98, 56, '#fffbeb', AMBER,
         u'INFRAESTRUCTURA — adaptadores: memoria, localStorage, Intl, crypto, DOM'),
        (9, 82, 44, '#eef2ff', BLUE600,
         u'PRESENTACIÓN — vistas, controladores, componentes, router'),
        (18, 64, 32, BLUE50, BLUE600,
         u'APLICACIÓN — casos de uso, DTOs, mappers, Result'),
        (25, 50, 20, BLUE100, BLUE700,
         u'DOMINIO — entidades, value objects, puertos'),
    ]
    for x, w, h, fc, ec, label in rings:
        y = CENTER_Y - h / 2
        ax.add_patch(Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec,
                               linewidth=1.4, zorder=2))
        ax.text(x + 2.2, y + h - 3.2, label, fontsize=7.4, fontweight='bold',
                color=ec, zorder=4)
    ax.text(50, 31, u'NÚCLEO · cero dependencias', ha='center', va='center',
            fontsize=8.2, fontweight='bold', color=BLUE700, zorder=5)
    ax.add_patch(FancyArrowPatch((6, 12), (46, 28), arrowstyle='-|>',
                                 mutation_scale=15, color=ROSE, linewidth=1.8,
                                 zorder=6, connectionstyle='arc3,rad=-0.16'))
    ax.text(1, 2.2, u'Regla de dependencia: las flechas SIEMPRE apuntan hacia dentro. '
                    u'La infraestructura depende del dominio; el dominio no depende de nadie.',
            fontsize=7.2, color=ROSE, fontweight='bold')
    ax.set_title(u'Clean Architecture: capas concéntricas y una sola dirección de dependencia',
                 fontsize=10.2, fontweight='bold', color=BLUE700, loc='left', pad=4)
    fig.savefig(os.path.join(OUT, 'chart-capas-dependencia.png'))
    plt.close(fig)


for fn in (chart_tasas, chart_rangos, chart_plazos, chart_capas, chart_css,
           chart_responsive, chart_hexagono, chart_capas_dependencia):
    fn()
    print('ok', fn.__name__)
print('graficos en', OUT)
