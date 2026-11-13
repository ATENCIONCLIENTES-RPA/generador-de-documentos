# -*- coding: utf-8 -*-
"""
Script de generación del Manual Técnico y Funcional de Asistente Documental · ESSA.
Produce un documento Word (.docx) profesional, exhaustivo y con diseño editorial.
"""

import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_manual():
    doc = Document()

    # Configuración de márgenes estándar (1 pulgada / 2.54 cm)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.different_first_page_header_footer = True

        # Header (páginas siguientes)
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("ASISTENTE DOCUMENTAL · MANUAL TÉCNICO Y FUNCIONAL — ESSA")
        hrun.font.name = "Segoe UI"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(100, 116, 139)

        # Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Electrificadora de Santander S.A. E.S.P. · Grupo EPM — Documentación Técnica de Software")
        frun.font.name = "Segoe UI"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)

    # Paleta de Colores
    HEX_PRIMARY = "1664B0"      # Azul Institucional ESSA
    HEX_SECONDARY = "1E40AF"    # Azul Real
    HEX_ACCENT_RED = "D21624"   # Rojo ESSA
    HEX_DARK = "0F172A"         # Slate Oscuro para texto
    HEX_MUTED = "475569"        # Gris medio
    HEX_BG_LIGHT = "F8FAFC"     # Fondo suave
    HEX_BG_ALT = "F1F5F9"       # Fondo alterno tablas
    HEX_BORDER = "CBD5E1"       # Borde suave
    HEX_CALLOUT_BG = "EFF6FF"   # Azul muy suave callouts

    COLOR_PRIMARY = RGBColor(22, 100, 176)
    COLOR_SECONDARY = RGBColor(30, 64, 175)
    COLOR_ACCENT_RED = RGBColor(210, 22, 36)
    COLOR_DARK = RGBColor(15, 23, 42)
    COLOR_MUTED = RGBColor(71, 85, 105)

    # Helper de sombreado de celda
    def set_cell_shading(cell, hex_color):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    # Helper de bordes de celda
    def set_callout_border(cell, hex_border_color=HEX_PRIMARY):
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'  <w:left w:val="single" w:sz="36" w:space="0" w:color="{hex_border_color}"/>'
            f'  <w:top w:val="none"/>'
            f'  <w:right w:val="none"/>'
            f'  <w:bottom w:val="none"/>'
            f'</w:tcBorders>'
        )
        cell._tc.get_or_add_tcPr().append(borders)

    def set_table_borders(table, hex_border=HEX_BORDER):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'  <w:top w:val="single" w:sz="6" w:space="0" w:color="{hex_border}"/>'
            f'  <w:left w:val="none"/>'
            f'  <w:bottom w:val="single" w:sz="12" w:space="0" w:color="{HEX_PRIMARY}"/>'
            f'  <w:right w:val="none"/>'
            f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{hex_border}"/>'
            f'  <w:insideV w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'  <w:top w:w="{top}" w:type="dxa"/>'
            f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'  <w:left w:w="{left}" w:type="dxa"/>'
            f'  <w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
        tcPr.append(tcMar)

    # Estilos de títulos y párrafos
    def add_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(36)
        p.paragraph_format.space_after = Pt(10)
        run = p.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(28)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY
        return p

    def add_subtitle(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(24)
        run = p.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(13)
        run.font.color.rgb = COLOR_MUTED
        return p

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(22)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(17)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(13.5)
        run.font.bold = True
        run.font.color.rgb = COLOR_SECONDARY
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(11.5)
        run.font.bold = True
        run.font.color.rgb = COLOR_DARK
        return p

    def add_body(text, bold_prefix=None, space_after=6):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            br = p.add_run(bold_prefix)
            br.font.name = "Segoe UI"
            br.font.size = Pt(10)
            br.font.bold = True
            br.font.color.rgb = COLOR_DARK
        run = p.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(10)
        run.font.color.rgb = COLOR_DARK
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            br = p.add_run(bold_prefix)
            br.font.name = "Segoe UI"
            br.font.size = Pt(10)
            br.font.bold = True
            br.font.color.rgb = COLOR_DARK
        run = p.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(10)
        run.font.color.rgb = COLOR_DARK
        return p

    def add_callout(title, text, callout_type="info"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.5)

        hex_border = HEX_PRIMARY
        hex_bg = HEX_CALLOUT_BG
        title_color = COLOR_PRIMARY
        prefix_icon = "ℹ NOTA TÉCNICA: "

        if callout_type == "important":
            hex_border = HEX_ACCENT_RED
            hex_bg = "FFF1F2"
            title_color = COLOR_ACCENT_RED
            prefix_icon = "⚡ IMPORTANTE: "
        elif callout_type == "tip":
            hex_border = "059669"
            hex_bg = "ECFDF5"
            title_color = RGBColor(5, 150, 105)
            prefix_icon = "💡 CONSEJO PRÁCTICO: "
        elif callout_type == "warning":
            hex_border = "D97706"
            hex_bg = "FFFBEB"
            title_color = RGBColor(217, 119, 6)
            prefix_icon = "⚠ ADVERTENCIA: "

        set_cell_shading(cell, hex_bg)
        set_callout_border(cell, hex_border)
        set_cell_margins(cell, top=140, bottom=140, left=180, right=180)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        rt = p.add_run(prefix_icon + title)
        rt.font.name = "Segoe UI"
        rt.font.size = Pt(10.5)
        rt.font.bold = True
        rt.font.color.rgb = title_color

        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(0)
        p2.paragraph_format.line_spacing = 1.15
        rb = p2.add_run(text)
        rb.font.name = "Segoe UI"
        rb.font.size = Pt(9.5)
        rb.font.color.rgb = COLOR_DARK

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_before = Pt(0)
        p_space.paragraph_format.space_after = Pt(4)

    def add_code_block(title, code_content, lang="Mermaid"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.5)

        set_cell_shading(cell, "0F172A") # Fondo oscuro slate terminal
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'  <w:left w:val="single" w:sz="18" w:space="0" w:color="{HEX_PRIMARY}"/>'
            f'  <w:top w:val="single" w:sz="6" w:space="0" w:color="1E293B"/>'
            f'  <w:right w:val="single" w:sz="6" w:space="0" w:color="1E293B"/>'
            f'  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1E293B"/>'
            f'</w:tcBorders>'
        )
        cell._tc.get_or_add_tcPr().append(borders)
        set_cell_margins(cell, top=140, bottom=140, left=180, right=180)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        rt = p.add_run(f"[{lang.upper()}] {title}")
        rt.font.name = "Consolas"
        rt.font.size = Pt(9)
        rt.font.bold = True
        rt.font.color.rgb = RGBColor(96, 165, 250)

        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(0)
        p2.paragraph_format.line_spacing = 1.05
        rb = p2.add_run(code_content)
        rb.font.name = "Consolas"
        rb.font.size = Pt(8.5)
        rb.font.color.rgb = RGBColor(241, 245, 249)

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_before = Pt(0)
        p_space.paragraph_format.space_after = Pt(4)

    def add_styled_table(headers, rows, col_widths=None):
        tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(tbl)

        # Encabezado
        hdr_row = tbl.rows[0]
        trPr = hdr_row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

        for i, h_text in enumerate(headers):
            c = hdr_row.cells[i]
            if col_widths and i < len(col_widths):
                c.width = Inches(col_widths[i])
            set_cell_shading(c, HEX_PRIMARY)
            set_cell_margins(c, top=100, bottom=100, left=120, right=120)
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(h_text)
            run.font.name = "Segoe UI"
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

        # Filas de datos
        for r_idx, r_data in enumerate(rows):
            row = tbl.rows[r_idx + 1]
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            bg_color = HEX_BG_ALT if (r_idx % 2 == 1) else "FFFFFF"

            for c_idx, val in enumerate(r_data):
                c = row.cells[c_idx]
                if col_widths and c_idx < len(col_widths):
                    c.width = Inches(col_widths[c_idx])
                if bg_color != "FFFFFF":
                    set_cell_shading(c, bg_color)
                set_cell_margins(c, top=80, bottom=80, left=120, right=120)
                p = c.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.15
                run = p.add_run(str(val))
                run.font.name = "Segoe UI"
                run.font.size = Pt(9)
                run.font.color.rgb = COLOR_DARK

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_before = Pt(0)
        p_space.paragraph_format.space_after = Pt(4)

    # ---------------------------------------------------------------------------
    # PORTADA
    # ---------------------------------------------------------------------------
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_before = Pt(40)
    p_meta.paragraph_format.space_after = Pt(8)
    rmeta = p_meta.add_run("ELECTRIFICADORA DE SANTANDER S.A. E.S.P. · GRUPO EPM\nDIRECCIÓN COMERCIAL · ATENCIÓN CLIENTES")
    rmeta.font.name = "Segoe UI"
    rmeta.font.size = Pt(11)
    rmeta.font.bold = True
    rmeta.font.color.rgb = COLOR_SECONDARY

    add_title("ASISTENTE DOCUMENTAL")
    add_subtitle("MANUAL INTEGRAL TÉCNICO Y FUNCIONAL\nArquitectura Client-Side, Procesamiento Documental Automatizado y Módulos de Operación")

    tbl_cover = doc.add_table(rows=6, cols=2)
    tbl_cover.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_cover)
    cover_data = [
        ("Proyecto", "Asistente Documental · ESSA (Versión 2.0.0-fase1 / Shell v32)"),
        ("Tipo de Aplicación", "Single Page Application (SPA) / Local-First Browser App"),
        ("Entorno de Ejecución", "100 % en el Navegador (Edge / Chrome / Navegadores modernos)"),
        ("Área Propietaria", "Equipo de Soporte y Gestión de Clientes · ESSA"),
        ("Tecnologías Centrales", "TypeScript, Vite, Zustand, IndexedDB, Web Workers, docxtemplater"),
        ("Fecha de Documentación", "Noviembre de 2026")
    ]
    for i, (k, v) in enumerate(cover_data):
        c1, c2 = tbl_cover.rows[i].cells[0], tbl_cover.rows[i].cells[1]
        c1.width = Inches(2.2)
        c2.width = Inches(4.3)
        set_cell_shading(c1, HEX_BG_ALT)
        set_cell_margins(c1, 80, 80, 100, 100)
        set_cell_margins(c2, 80, 80, 100, 100)
        p1 = c1.paragraphs[0]; r1 = p1.add_run(k); r1.font.name = "Segoe UI"; r1.font.bold = True; r1.font.size = Pt(9.5); r1.font.color.rgb = COLOR_PRIMARY
        p2 = c2.paragraphs[0]; r2 = p2.add_run(v); r2.font.name = "Segoe UI"; r2.font.size = Pt(9.5); r2.font.color.rgb = COLOR_DARK

    doc.add_page_break()

    # ---------------------------------------------------------------------------
    # TABLA DE CONTENIDO RESUMIDA
    # ---------------------------------------------------------------------------
    add_h1("Índice General del Documento")
    toc_items = [
        ("1. Introducción y Propósito del Proyecto", "Contexto, objetivos, problemas resueltos y filosofía técnica"),
        ("2. Arquitectura General del Sistema", "Patrón Shell + Iframes, desacoplamiento, estado global y puente de integración"),
        ("3. Estructura Detallada del Proyecto", "Análisis exhaustivo del repositorio, directorios, módulos y archivos clave"),
        ("4. Especificación Funcional de Módulos", "Recursos, Cuadro de Mando, Generación Documental y Extractor CREG"),
        ("5. Pila Tecnológica y Dependencias", "Lenguajes, frameworks, librerías cliente, workers y utilidades"),
        ("6. Modelo de Datos y Almacenamiento Local", "Estrategia Local-First: IndexedDB, localStorage y File System Access API"),
        ("7. APIs, Comunicación e Integraciones", "Protocolo de mensajería inter-módulos, workers e integraciones externas"),
        ("8. Flujo Integral de Procesamiento Documental", "Ciclo de vida completo del trámite: ingesta, control, redacción y evacuación"),
        ("9. Guía de Instalación y Puesta en Marcha", "Requisitos de sistema, ejecución mediante INICIAR.bat y comandos CLI"),
        ("10. Diagramas de Arquitectura y Procesos (Mermaid)", "Representación gráfica de arquitectura, flujos, base de datos y algoritmos"),
        ("11. Guía de Mantenimiento y Extensibilidad", "Modificaciones, nuevas plantillas, nuevos campos, reglas legales y backlog"),
        ("12. Glosario Técnico y de Negocio", "Definición clara de conceptos técnicos, regulatorios y normativos de ESSA")
    ]
    add_styled_table(["Sección / Capítulo", "Alcance y Temas Principales"], toc_items, [2.5, 4.0])

    add_callout(
        "Objetivo para Nuevos Desarrolladores y Analistas",
        "Este manual ha sido elaborado para que cualquier ingeniero, desarrollador o analista que se incorpore "
        "al equipo de ESSA pueda entender en profundidad cómo funciona el Asistente Documental, ejecutarlo localmente "
        "en minutos, modificar sus reglas de negocio y extender sus módulos sin requerir asistencia continua de terceros.",
        "tip"
    )

    # ---------------------------------------------------------------------------
    # SECCIÓN 1: INTRODUCCIÓN
    # ---------------------------------------------------------------------------
    add_h1("1. Introducción y Propósito del Proyecto")

    add_h2("1.1. ¿Qué es el Asistente Documental?")
    add_body(
        "El Asistente Documental · ESSA es una solución de software de escritorio ejecutada 100 % en el navegador web "
        "(arquitectura client-side / local-first) diseñada específicamente para la Electrificadora de Santander S.A. E.S.P. "
        "(filial del Grupo EPM). Su misión central es dotar a los equipos de Atención al Cliente, Peticiones, Quejas, "
        "Reclamos y Recursos (PQRSD) de un entorno unificado para gestionar el ciclo de vida completo de las solicitudes, "
        "controlar los tiempos legales de vencimiento normativo y automatizar la redacción y exportación masiva de resoluciones "
        "y oficios en formato Microsoft Word (.docx)."
    )
    add_body(
        "A diferencia de los sistemas tradicionales basados en servidores centralizados que requieren infraestructura de backend "
        "compleja y autenticación en la nube, el Asistente Documental opera directamente sobre la máquina local del analista. "
        "Aprovecha las capacidades modernas de HTML5, TypeScript, Web Workers, IndexedDB y la API de Sistema de Archivos "
        "(File System Access API) para procesar volúmenes masivos de registros sin que ningún dato sensible de los clientes "
        "abandone el entorno de trabajo del usuario."
    )

    add_h2("1.2. Objetivo Central")
    add_body(
        "El objetivo primordial del sistema es eliminar la fricción operativa, reducir a cero el riesgo de vencimientos legales "
        "y estandarizar la calidad formal y sustancial de las respuestas emitidas a los usuarios del servicio público de energía "
        "eléctrica en los departamentos de Santander, Cesar, Bolívar y Norte de Santander."
    )

    add_h2("1.3. Problemas Críticos que Resuelve")
    add_bullet(
        "Riesgo de Silencio Administrativo Positivo (SAP) y Sanciones SSPD: De acuerdo con la Ley 142 de 1994 (Régimen de Servicios "
        "Públicos Domiciliarios) y el Código de Procedimiento Administrativo y de lo Contencioso Administrativo (CPACA), las empresas "
        "prestadoras disponen de un término perentorio de quince (15) días hábiles para responder de fondo las peticiones y recursos. "
        "El Asistente Documental implementa un motor de calendario con la Ley Emiliani y cálculo de Pascua que calcula con precisión "
        "matemática el día de vencimiento exacto, alertando con antelación visual crítica los trámites próximos a expirar.",
        "Control Legal de Términos: "
    )
    add_bullet(
        "Diligenciamiento Manual Lento y Propenso a Errores: Anteriormente, los analistas debían copiar y pegar manualmente desde "
        "múltiples pantallas de SAP IS-U o Excel hacia documentos Word datos como: número de cuenta, radicado, número de proceso, "
        "nombre completo del solicitante, dirección, valor reclamado, transformador y medidor. Este proceso repetitivo consumía "
        "hasta 20 minutos por documento. Con el Asistente Documental, la fusión de datos se realiza en milisegundos mediante un clic.",
        "Automatización Documental: "
    )
    add_bullet(
        "Desconexión entre SAC y Mercurio: La empresa utiliza dos sistemas neurálgicos: el SAC (Sistema de Atención a Clientes en SAP) "
        "donde se registran los procesos de reclamación, y Mercurio, donde se radican las comunicaciones oficiales. El Asistente "
        "Documental cruza en tiempo real ambas fuentes de datos, identificando de inmediato radicados sin trámite o trámites sin radicado.",
        "Cruce Operativo Biespectral: "
    )
    add_bullet(
        "Complejidad en la Liquidación de Resoluciones CREG: La Resolución CREG 101-028 (incentivo al ahorro y cobro por consumo meta "
        "por fenómeno de El Niño) exige una formulación aritmética rigurosa para liquidar cobros adicionales o descuentos según el estrato, "
        "días facturados y meta diaria. El módulo Extractor CREG del Asistente realiza el cálculo matemático exacto y extrae los datos "
        "de la factura mediante OCR directamente desde una imagen o captura de pantalla.",
        "Cálculos Regulatorios CREG: "
    )
    add_bullet(
        "Privacidad de Datos y Cumplimiento de Habeas Data: Al no enviar la información a servidores externos, no existe riesgo de "
        "fuga de información confidencial de suscriptores ni requerimientos de servidores adicionales o costos de mantenimiento de nube.",
        "Seguridad y Soberanía Local: "
    )

    # ---------------------------------------------------------------------------
    # SECCIÓN 2: ARQUITECTURA DEL SISTEMA
    # ---------------------------------------------------------------------------
    add_h1("2. Arquitectura General del Sistema")

    add_h2("2.1. Patrón Arquitectónico: Host Shell + Microfrontends en Iframes Aislados")
    add_body(
        "El Asistente Documental utiliza un patrón arquitectónico híbrido de vanguardia denominado 'Shell Host con Módulos "
        "Embebidos en Iframes Aislados'. Este enfoque ofrece lo mejor de dos mundos: la experiencia fluida de una SPA con "
        "navegación por pestañas y la robustez del aislamiento de estilos CSS y contextos de ejecución de cada módulo."
    )
    add_body(
        "La aplicación se divide en cuatro capas claramente delimitadas:",
        "Capas de la Arquitectura: "
    )
    add_bullet(
        "Orquesta la interfaz global, la barra superior fija, los accesos directos de teclado (Alt+1, Alt+2, Alt+3), el control "
        "de tema visual claro/oscuro, el Dock de herramientas auxiliares y el componente TaskRunner que gestiona las transiciones "
        "asíncronas con barras de progreso animadas.",
        "1. Capa Shell (Host / Ventana Principal): "
    )
    add_bullet(
        "Implementada mediante los repositorios globales DocStore y DataRepository, junto con un store ligero en Zustand. Mantiene "
        "en memoria compartida el estado de los archivos cargados, las filas de Excel parseadas, la colección de plantillas Word y "
        "las notas de gestión del usuario, sincronizándose automáticamente contra IndexedDB y el sistema de archivos.",
        "2. Capa de Estado y Persistencia: "
    )
    add_bullet(
        "Cada funcionalidad principal (Recursos, Cuadro de Mando, Documentos y Extractor) vive en su propio documento HTML "
        "independiente montado en un iframe dentro del elemento contenedor #adStage. Esta separación garantiza que el CSS "
        "complejo de cada módulo no contamine a los demás ni afecte el rendimiento del Shell.",
        "3. Capa de Módulos (Viewports Embebidos): "
    )
    add_bullet(
        "Módulos secundarios que corren fuera del hilo principal de la interfaz para evitar congelamientos (freezes). Incluye el "
        "Web Worker de procesamiento XLSX (xlsx.worker.ts) para la descompresión ZIP64 y el motor Tesseract.js para reconocimiento óptico.",
        "4. Capa de Workers de Fondo: "
    )

    add_h2("2.2. Puente de Comunicación Inter-Módulos (ModuleBridge)")
    add_body(
        "Dado que los módulos residen en iframes, la comunicación entre ellos y el Shell principal se realiza a través de un puente "
        "seguro expuesto en la ventana global. El script src/modules/shared/module-bridge.ts detecta automáticamente el contexto de "
        "ejecución y resuelve la referencia a window.parent.AsistenteDocumental, asignándola localmente como window.AD."
    )
    add_body(
        "A través de window.AD, cualquier módulo embebido puede:",
        "Capacidades de window.AD: "
    )
    add_bullet("Consultar el estado de los recursos cargados y obtener sus filas procesadas (AD.store.getRows('sac')).")
    add_bullet("Acceder al repositorio de almacenamiento persistente local (AD.data.getItem / AD.data.setItem).")
    add_bullet("Navegar hacia otro módulo pasando parámetros contextuales de forma asíncrona (AD.navigate('documentos', { radicado: '...' })).")
    add_bullet("Sincronizar el tema visual con el Shell principal (AD.theme.get() / AD.theme.subscribe()).")
    add_bullet("Disparar eventos de mantenimiento global y emitir alertas de revisión técnica hacia la barra superior.")

    # ---------------------------------------------------------------------------
    # SECCIÓN 3: ESTRUCTURA DEL PROYECTO
    # ---------------------------------------------------------------------------
    add_h1("3. Estructura Detallada del Proyecto")
    add_body(
        "A continuación se presenta el árbol de directorios del repositorio con la responsabilidad técnica de cada componente:"
    )

    structure_table = [
        ("index.html", "Punto de entrada de la aplicación host (Shell). Declara la cabecera, navegación, dock y escenario de iframes."),
        ("vite.config.ts", "Configuración de Vite: rollup multipágina, target ES2022, manualChunks (zustand, xlsx) y servidor dev."),
        ("package.json", "Manifiesto del proyecto, scripts de compilación, typecheck, lint y dependencias del sistema."),
        ("tsconfig.json", "Configuración de TypeScript estricto con paths alias y resolución de módulos Node."),
        ("INICIAR.bat", "Script de inicio automático en Windows: verifica Node.js, instala módulos, libera puerto 4173 y lanza el navegador."),
        ("src/main.ts", "Bootstrap del Shell: importa hojas de estilo de fuentes y shell, inicializa globals y ejecuta startShell()."),
        ("src/app/shell.ts", "Cerebro del Shell: orquesta pestañas, hash routing (#/recursos, #/cuadro, #/documentos), tema y host."),
        ("src/app/module-host.ts", "Administrador de ciclo de vida de los iframes: montaje perezoso (lazy-mount), precarga y recarga."),
        ("src/app/task-runner.ts", "Controlador de transiciones animadas de tareas entre módulos con pasos, temporizador y fallback."),
        ("src/app/module-tools.ts", "Enlace entre los botones del Dock (Matrices, CIIU, Calendario, Revisiones) y eventos CustomEvent."),
        ("src/app/tab-status.ts", "Evaluador reactivo del estado de cada pestaña (busy, ok, pend, err) según los recursos disponibles."),
        ("src/app/tabs.ts", "Componente visual de pestañas con cursor deslizante de tinta (ink bar) e interacciones táctiles/teclado."),
        ("src/app/theme.ts", "API de gestión de temas (claro/oscuro) con persistencia en localStorage y sincronización a iframes."),
        ("src/repositories/doc-store.ts", "Almacén reactivo de archivos operativos (SAC, Plantillas, Mercurio) persistido en IndexedDB 'essa-modulo1'."),
        ("src/repositories/data-repository.ts", "Repositorio de configuración y notas locales en IndexedDB 'essa_cm', localStorage y File System API."),
        ("src/services/xlsx/xlsx-lite.ts", "Parser propietario ligero de XLSX y ZIP64 usando DecompressionStream nativo del navegador."),
        ("src/services/xlsx/xlsx-reader.ts", "Fachada de lectura de Excel que delega al Web Worker o al hilo principal con manejo de errores."),
        ("src/workers/xlsx.worker.ts", "Web Worker para procesar archivos de Excel en segundo plano sin congelar la interfaz de usuario."),
        ("src/services/person-name.ts", "Algoritmo de parsing y normalización de nombres colombianos para tratamientos de redacción formal."),
        ("src/stores/shell-store.ts", "Store reactivo liviano basado en Zustand (vanilla) para ruta actual, tema, busy y estado de pestañas."),
        ("src/modules/recursos/", "Código fuente del Módulo 1 (Carga, validación de archivos, carpetas de plantillas y perfil de usuario)."),
        ("src/modules/cuadro/", "Código fuente del Módulo 2 (Cuadro de control, matriz de vencimientos, cruce SAC-Mercurio, calendario)."),
        ("src/modules/documentos/", "Código fuente del Módulo 3 (Generador documental, fusión de variables, vista previa docx y empaquetado zip)."),
        ("src/modules/extractor/", "Código fuente de la herramienta CREG (OCR de facturas con Tesseract, cálculo de consumo meta y observaciones)."),
        ("src/components/guided-tour/", "Componente de onboarding interactivo con globos de ayuda paso a paso para usuarios novatos."),
        ("public/consultas/ciiu.html", "Visor especializado del clasificador de actividades económicas CIIU (Decreto 2860 de 2013)."),
        ("public/consultas/matriz-arbol.html", "Matriz interactiva de Requisitos ZPSAC001 y Árbol de Transacciones ZPSAC003."),
        ("public/vendor/", "Librerías empaquetadas locales: docxtemplater, easy-template-x, docx-preview, jszip, pizzip."),
        ("tools/parity/storage_compat.py", "Script de prueba automatizado con Playwright que verifica compatibilidad de datos entre versiones.")
    ]
    add_styled_table(["Archivo / Módulo", "Descripción y Responsabilidad Técnica"], structure_table, [2.3, 4.2])

    # ---------------------------------------------------------------------------
    # SECCIÓN 4: FUNCIONALIDADES DETALLADAS
    # ---------------------------------------------------------------------------
    add_h1("4. Especificación Funcional de Módulos")

    add_h2("4.1. Módulo 1: Recursos (Configuración y Gestión de Fuentes)")
    add_body(
        "El módulo de Recursos constituye la puerta de entrada de los insumos de información requeridos por el sistema. "
        "Gestiona tres recursos principales y el perfil del analista:"
    )
    add_bullet(
        "Es el archivo principal exportado desde SAP IS-U con la relación completa de reclamaciones. El módulo valida "
        "que el formato sea .xlsx (bloqueando archivos obsoletos .xls de Excel 97-2003) y comprueba la presencia de columnas "
        "clave como NUMERO_PROCESO y RADICADO_ENTRADA, así como más de 70 columnas accesorias (datos del suscriptor, medidor, "
        "tarifas, municipio y lecturas).",
        "1. SAC Trámite Excel (Obligatorio): "
    )
    add_bullet(
        "Colección de documentos base en formato Microsoft Word (.docx) que contienen las cláusulas y etiquetas de reemplazo "
        "(placeholders). El sistema permite arrastrar carpetas enteras mediante input webkitdirectory o agregar archivos individuales. "
        "Las plantillas se agrupan por carpetas virtuales y se almacenan como Blobs en IndexedDB.",
        "2. Plantillas Word (Obligatorio): "
    )
    add_bullet(
        "Planilla de control de radicación y correspondencia oficial. Contiene columnas como No. Radicado, Fecha Radicación, "
        "Referencia del Documento, Gestor y Estado. Es consumido por el Cuadro de Mando para cruzar tiempos de radicación.",
        "3. Mercurio Trámite Excel (Opcional): "
    )
    add_bullet(
        "Permite al analista registrar su nombre, cédula, cargo, correo electrónico y cargar una imagen con su firma manuscrita "
        "(en formato base64 PNG/JPG). Esta información se inyecta automáticamente en los documentos generados, evitando la "
        "firma manual posterior de cada oficio.",
        "4. Perfil del Analista y Firma Digital: "
    )
    add_bullet(
        "Botones de enlace directo para descargar las versiones más recientes de las bases desde las carpetas oficiales de SharePoint "
        "de ESSA, selector de carpeta local del disco duro para autoguardado continuo (File System Access API), y utilidades de "
        "exportación/importación de copias de seguridad en formato JSON.",
        "5. Respaldos y Enlaces a SharePoint: "
    )

    add_h2("4.2. Módulo 2: Cuadro de Mando (Control Operativo y Vencimientos)")
    add_body(
        "El Cuadro de Mando es el centro de control táctico para la gestión de PQRSD. Transforma las filas planas de Excel en un "
        "tablero visual inteligente de toma de decisiones:"
    )
    add_bullet(
        "Implementa un algoritmo riguroso que calcula los 15 días hábiles legales excluyendo fines de semana (sábados y domingos) "
        "y todos los días festivos nacionales de Colombia calculados dinámicamente mediante el algoritmo de Pascua y la Ley Emiliani.",
        "Escalera de Vencimientos: "
    )
    add_bullet(
        "Clasifica los trámites en: Críticos (≤ 2 días hábiles restantes), Próximos a vencer (3 a 5 días), En término normal, "
        "y Vencidos (superaron los 15 días hábiles). Permite filtrar por analista responsable, tipo de trámite y medio de recepción.",
        "Semáforo de Alertas: "
    )
    add_bullet(
        "Identifica automáticamente diferencias entre la fecha de radicación en Mercurio y la fecha de creación en SAC, alertando "
        "cuando un trámite fue radicado por correo electrónico o página web pero demoró en ingresar al flujo operativo.",
        "Cruce SAC vs. Mercurio: "
    )
    add_bullet(
        "Permite a los analistas asociar marcas de colores visuales a cada trámite, registrar notas de gestión privadas, marcar "
        "procesos como 'Evacuados' y registrar constancias de notificación con soporte fotográfico o actas.",
        "Gestión de Marcas y Notas: "
    )
    add_bullet(
        "Ofrece un calendario mensual con visualización de días hábiles, festivos, notas de equipo y cumpleaños registrados.",
        "Calendario de Gestión: "
    )
    add_bullet(
        "Monitorea las órdenes de servicio técnico y revisiones de medidores en terreno asociadas a reclamaciones por cobros indebidos "
        "o desviación significativa de consumos.",
        "Bandeja de Revisiones Pendientes: "
    )
    add_bullet(
        "Al hacer clic en el botón de redactar sobre cualquier fila, el sistema invoca al TaskRunner, transfiriendo todos los datos "
        "del cliente hacia el Módulo de Documentos sin perder el contexto.",
        "Traspaso Rápido a Documentos: "
    )

    add_h2("4.3. Módulo 3: Generación Documental (Redacción y Fusión Automatizada)")
    add_body(
        "El generador documental automatiza la producción física de las respuestas legales a los suscriptores:"
    )
    add_bullet(
        "Indexa en memoria miles de registros de SAC en fragmentos de microsegundos mediante yield al hilo principal (evitando tirones "
        "en la UI). Permite buscar instantáneamente por número de radicado, cuenta, cédula, nombre o número de proceso.",
        "Buscador Inteligente Indexado: "
    )
    add_bullet(
        "Extrae de forma robusta el primer nombre de pila del solicitante (ej. 'María' en 'De la Espriella Martínez María del Carmen'), "
        "permitiendo redactar saludos cordiales naturales ('Apreciada María:') en lugar de fórmulas rígidas con nombres y apellidos invertidos.",
        "Algoritmo PersonName: "
    )
    add_bullet(
        "Renderiza el documento Word seleccionado directamente en el navegador mediante canvas y SVG con docx-preview, permitiendo al "
        "analista verificar la estructura y apariencia del documento antes de generarlo.",
        "Visor Previo DOCX Integrado: "
    )
    add_bullet(
        "Soporta tanto docxtemplater como easy-template-x. Reemplaza etiquetas como {NUMERO_CUENTA}, {NOMBRE_SOLICITANTE}, {DIRECCION}, "
        "{RADICADO_ENTRADA}, {FECHA_SOLICITUD}, e inserta dinámicamente la firma manuscrita digitalizada del analista.",
        "Motores de Fusión de Plantillas: "
    )
    add_bullet(
        "Permite descargar el documento individual generado de forma inmediata o generar múltiples documentos a la vez empaquetándolos "
        "en un único archivo comprimido .zip listo para radicar.",
        "Exportación Individual y Masiva (.zip): "
    )

    add_h2("4.4. Módulo Satélite: Extractor de Resoluciones CREG 101-028")
    add_body(
        "Herramienta técnica de alta especialización orientada a la liquidación de ajustes tarifarios por consumo meta durante "
        "periodos de sequía o contingencia energética nacional:"
    )
    add_bullet(
        "El usuario puede arrastrar una imagen o simplemente pegarla desde el portapapeles con Ctrl+V tras tomar una captura de pantalla "
        "de la factura de energía.",
        "Ingesta Visual de Facturas: "
    )
    add_bullet(
        "Utiliza Tesseract.js optimizado con recorte de regiones de interés (ROI) y binarización para leer de forma automática: "
        "número de cuenta, consumo registrado en kWh, días del ciclo facturado, costo unitario (CU), estrato/clase y cobro actual.",
        "Motor OCR Client-Side: "
    )
    add_bullet(
        "Modela en código TypeScript el comportamiento exacto de la hoja oficial de cálculo de ESSA: cálculo de meta del periodo, "
        "bandas de tolerancia del 90 % y 110 %, tope de ahorro del 30 %, factor de contribución según estrato (0.3 a 0.7), liquidación "
        "del valor de ajuste y determinación de si procede cobro adicional o descuento.",
        "Motor de Cálculo Matemático CREG: "
    )
    add_bullet(
        "Genera de forma automática el párrafo técnico-legal motivado exigido por la Superintendencia de Servicios Públicos para ser "
        "insertado textualmente en la resolución que resuelve el reclamo del usuario.",
        "Generador de Texto de Observación: "
    )

    # ---------------------------------------------------------------------------
    # SECCIÓN 5: TECNOLOGÍAS UTILIZADAS
    # ---------------------------------------------------------------------------
    add_h1("5. Pila Tecnológica y Dependencias")
    add_body(
        "El sistema ha sido construido bajo un estándar de desarrollo moderno, seguro y optimizado para funcionar con cero dependencias "
        "de servidores en tiempo de ejecución:"
    )

    tech_table = [
        ("Lenguaje Principal", "TypeScript (~5.9.3)", "Tipado estricto, contratos de interfaces e inferencia para evitar errores en tiempo de ejecución."),
        ("Empaquetador / Bundler", "Vite (^8.0.16) + esbuild", "Compilación ultrarrápida, servidor de desarrollo HMR y optimización de chunks para producción."),
        ("Gestor de Estado", "Zustand (^5.0.8 / vanilla)", "Estado global liviano sin acoplamiento a frameworks UI pesados; alta velocidad de suscripción."),
        ("Motor de Hilos de Fondo", "Web Workers API nativa", "Procesamiento de libros Excel pesados en segundo plano con transferencia de búferes zero-copy."),
        ("Lector XLSX Nativo", "XLSXLite (Propietario)", "Motor propio que descomprime ZIP64 y parsea XML de hojas de cálculo usando DecompressionStream."),
        ("Fusión de Plantillas Word", "docxtemplater / easy-template-x", "Sustitución semántica de etiquetas en formato OpenXML (.docx) y control de bucles y condicionales."),
        ("Visor Previo Word", "docx-preview", "Renderizado cliente de archivos .docx a HTML/Canvas para previsualización sin Microsoft Office."),
        ("Manejo de Compresión", "JSZip / PizZip", "Lectura, modificación interna y empaquetado masivo de archivos comprimidos .zip en memoria."),
        ("Reconocimiento OCR", "Tesseract.js (^5.1.1)", "Motor OCR WebAssembly para reconocimiento de texto en imágenes de facturas en español."),
        ("Persistencia Local", "IndexedDB API", "Base de datos transaccional del navegador para almacenar megabytes de datos y blobs de archivos."),
        ("Persistencia de Archivos", "File System Access API", "showDirectoryPicker para enlace directo bidireccional con carpetas del disco duro local."),
        ("Linter y Calidad", "ESLint (^9.0.0) + ts-eslint", "Garantía de calidad de código y adherencia a las mejores prácticas de desarrollo web.")
    ]
    add_styled_table(["Componente", "Tecnología / Versión", "Función y Justificación Técnica"], tech_table, [1.8, 1.8, 2.9])

    # ---------------------------------------------------------------------------
    # SECCIÓN 6: BASE DE DATOS Y PERSISTENCIA
    # ---------------------------------------------------------------------------
    add_h1("6. Base de Datos y Modelos de Persistencia")
    add_body(
        "Al ser una aplicación Local-First, la persistencia se gestiona en tres capas complementarias dentro del entorno del navegador:"
    )

    add_h2("6.1. Bases de Datos IndexedDB")
    add_body(
        "El sistema utiliza dos bases de datos IndexedDB independientes con responsabilidades separadas:",
        "Bases de Datos Locales: "
    )
    add_bullet(
        "Almacena los archivos pesados cargados por el usuario. Contiene el Object Store 'recursos' con keyPath 'key'. "
        "Almacena los registros: 'sac' (Blob del Excel, filas leídas, conteo de filas, metadatos), 'plantillas' (colección de Blobs .docx, "
        "árbol de carpetas y metadatos de tamaño y modificación), y 'mercurio' (Blob del Excel de radicación y filas leídas).",
        "1. Base de Datos 'essa-modulo1' (Versión 1): "
    )
    add_bullet(
        "Almacena la configuración operativa, marcas de seguimiento, notas privadas y respaldos del Cuadro de Mando. Contiene el "
        "Object Store 'h' (clave-valor). Sus claves principales son: 'app-data-v2' (paquete JSON unificado con schema 'essa-app-data', "
        "revisión incremental y datos del usuario) y 'dir' (handle del directorio del sistema de archivos vinculado para sincronización).",
        "2. Base de Datos 'essa_cm' (Versión 1): "
    )

    add_h2("6.2. Capa Reactiva de localStorage")
    add_body(
        "El módulo DataRepository intercepta de forma transparente Storage.prototype.setItem y removeItem para capturar cualquier "
        "cambio en claves con prefijo 'essa_' o 'essa-'. Cada mutación actualiza una marca de tiempo ('essa__stamp') y programa "
        "un guardado en diferido (debounced) hacia IndexedDB y hacia el archivo físico en disco.",
        "Intercepción Reactiva: "
    )

    add_h2("6.3. Diccionario de Claves del Sistema")
    keys_table = [
        ("essa_fechas_correo", "Mapeo JSON de fechas reales de recepción para trámites ingresados por correo electrónico."),
        ("essa_marcas", "Diccionario de marcas de seguimiento: asignación de color visual (#hex) y notas de texto por proceso."),
        ("essa_evacuados", "Registro de trámites respondidos formalmente con fecha de salida y analista responsable."),
        ("essa_expedientes", "Mapeo de expedientes agrupados y trámites consolidados en un único expediente legal."),
        ("essa_constancias", "Constancias de evacuación y notificación con observaciones y soporte fotográfico asociado."),
        ("essa_historial", "Historial cronológico de cambios de estado y acciones ejecutadas sobre cada solicitud."),
        ("essa_calendario", "Estructura de notas de gestión, cumpleaños de analistas y recordatorios por fecha."),
        ("essa_rutas", "Lista de nombres de rutas de Mercurio configuradas o excluidas del análisis operativo."),
        ("essa_equipo", "Catálogo de analistas y gestores del equipo para filtros y asignación rápida."),
        ("essa-perfil", "Datos del analista activo (nombre, cédula, cargo, correo y firma manuscrita en base64)."),
        ("essa-theme / essa_cm_theme", "Preferencia de modo visual del usuario ('light' o 'dark').")
    ]
    add_styled_table(["Clave en Almacenamiento", "Propósito y Contenido Almacenado"], keys_table, [2.2, 4.3])

    # ---------------------------------------------------------------------------
    # SECCIÓN 7: APIS, COMUNICACIÓN E INTEGRACIONES
    # ---------------------------------------------------------------------------
    add_h1("7. APIs, Comunicación e Integraciones")
    add_body(
        "Dado el diseño cliente puro del Asistente Documental, no existen endpoints REST o GraphQL externos a los que el sistema "
        "consulte. Toda la comunicación es inter-componente e inter-hilo:"
    )
    add_bullet(
        "El Shell inyecta en cada iframe cargado el objeto de API AsistenteDocumentalApi. Los módulos notifican cambios de "
        "conteo de alertas mediante CustomEvent('ad-rev-count') y reciben órdenes de apertura de herramientas mediante "
        "CustomEvent('ad-cuadro-tool'). Las transiciones de módulo con parámetros invocan el método window.__AD_ON_NAVIGATE.",
        "Comunicación Shell ↔ Iframes: "
    )
    add_bullet(
        "El servicio xlsx-reader.ts envía el ArrayBuffer del archivo Excel al Worker xlsx.worker.ts usando la lista de transferencia "
        "postMessage(message, [buffer]). Esto transfiere la propiedad del bloque de memoria instantáneamente (zero-copy), permitiendo "
        "descomprimir libros de decenas de megabytes sin consumir el doble de RAM.",
        "Comunicación Hilo Principal ↔ Web Worker: "
    )
    add_bullet(
        "El Módulo de Recursos incluye hipervínculos estructurados hacia los repositorios oficiales de SharePoint en Microsoft 365 "
        "de la empresa, facilitando a los analistas la descarga del SAC compartido y las carpetas maestras de plantillas.",
        "Integración con SharePoint (Microsoft 365): "
    )
    add_bullet(
        "El módulo Extractor carga de forma perezosa la librería Tesseract.js v5.1.1 desde un CDN seguro únicamente cuando el usuario "
        "solicita procesar una imagen de factura. Una vez descargado el script y el modelo de idioma español, el motor queda en caché.",
        "Integración bajo demanda con Tesseract OCR: "
    )

    # ---------------------------------------------------------------------------
    # SECCIÓN 8: FLUJO DE PROCESAMIENTO DOCUMENTAL
    # ---------------------------------------------------------------------------
    add_h1("8. Flujo Integral de Procesamiento Documental")
    add_body(
        "El procesamiento documental dentro del Asistente sigue un ciclo de vida cerrado de ocho etapas perfectamente coordinadas:"
    )
    add_bullet(
        "El analista accede a la pestaña 'Recursos' y carga el archivo SAC Trámite Excel del día, junto con la carpeta de plantillas "
        "Word oficiales. El sistema valida encabezados y almacena los blobs en IndexedDB.",
        "Etapa 1: Ingesta y Validación de Recursos: "
    )
    add_bullet(
        "El Web Worker procesa el libro de Excel en segundo plano. Convierte fechas, sanitiza cadenas y genera un arreglo de registros "
        "normalizados en memoria. La pestaña 'Cuadro' y 'Documentos' se activan automáticamente.",
        "Etapa 2: Indexación y Distribución: "
    )
    add_bullet(
        "El analista consulta el Cuadro de Mando. El sistema evalúa los vencimientos contra la fecha actual y la matriz de festivos. "
        "Los trámites en estado crítico (1 o 2 días restantes) aparecen en rojo en la parte superior.",
        "Etapa 3: Priorización Operativa en Cuadro de Mando: "
    )
    add_bullet(
        "El analista selecciona un trámite crítico y pulsa 'Redactar respuesta'. El Shell toma el control mediante TaskRunner, "
        "mostrando una animación de sincronización mientras carga el Módulo de Documentos con los datos del trámite seleccionado.",
        "Etapa 4: Traspaso Contextual al Generador Documental: "
    )
    add_bullet(
        "El generador analiza el nombre del solicitante mediante el algoritmo PersonName, determina el tratamiento respetuoso adecuado, "
        "y pre-selecciona la plantilla Word más acorde según el tipo de proceso de la reclamación.",
        "Etapa 5: Normalización de Datos y Mapeo: "
    )
    add_bullet(
        "El analista verifica la información en pantalla y revisa la vista previa interactiva del documento Word (.docx) renderizada "
        "por docx-preview en el panel lateral.",
        "Etapa 6: Vista Previa y Edición: "
    )
    add_bullet(
        "Al presionar 'Generar Documento', docxtemplater sustituye los marcadores por los datos reales del cliente e inserta la firma "
        "del analista. El archivo .docx final se descarga al disco local o se empaqueta en un .zip.",
        "Etapa 7: Fusión e Inyección de Firma: "
    )
    add_bullet(
        "El sistema ofrece la opción de marcar el trámite como 'Evacuado' en el Cuadro de Mando, registrando la fecha de salida, el "
        "número de radicado y la constancia de notificación para el seguimiento histórico del equipo.",
        "Etapa 8: Cierre y Registro de Constancia: "
    )

    # ---------------------------------------------------------------------------
    # SECCIÓN 9: GUÍA DE INSTALACIÓN Y PUESTA EN MARCHA
    # ---------------------------------------------------------------------------
    add_h1("9. Guía de Instalación y Puesta en Marcha")

    add_h2("9.1. Requisitos Previos del Sistema")
    add_bullet("Sistema Operativo: Windows 10, Windows 11 o distribuciones modernas de Linux / macOS.")
    add_bullet("Node.js: Versión 20.19.0 LTS o superior (requerido para ejecutar Vite y compilar el proyecto).")
    add_bullet("Navegador Web: Microsoft Edge o Google Chrome (versión 100+ recomendada para soporte de File System Access API).")
    add_bullet("Memoria RAM: Mínimo 4 GB (Recomendado 8 GB para procesar libros Excel de más de 50.000 filas).")

    add_h2("9.2. Método de Inicio Rápido para Usuarios Finales (INICIAR.bat)")
    add_body(
        "El proyecto incluye un script de automatización completo para entornos Windows (INICIAR.bat) que simplifica al máximo "
        "la ejecución sin necesidad de interactuar con la consola de comandos:",
        "Puesta en Marcha con un Clic: "
    )
    add_bullet("Paso 1: Abrir la carpeta del proyecto en el Explorador de Windows.")
    add_bullet("Paso 2: Hacer doble clic sobre el archivo INICIAR.bat.")
    add_bullet(
        "Paso 3: El script ejecuta automáticamente las siguientes tareas:\n"
        "  a) Verifica si Node.js está disponible en el PATH o en la carpeta local runtime\\node.exe.\n"
        "  b) Si no existe la carpeta node_modules\\vite, ejecuta silenciosamente 'npm install'.\n"
        "  c) Identifica si el puerto 4173 está ocupado por otra sesión anterior y lo libera mediante PowerShell.\n"
        "  d) Detecta la dirección IP local de la tarjeta de red (LAN IP) para permitir el acceso desde otros equipos o celulares.\n"
        "  e) Inicia el servidor de desarrollo Vite con 'npm run dev -- --port 4173 --strictPort --host'.\n"
        "  f) Espera 3 segundos y abre automáticamente el navegador en http://localhost:4173/."
    )

    add_h2("9.3. Método de Instalación y Comandos CLI para Desarrolladores")
    add_body(
        "Para los ingenieros de software que deseen clonar, inspeccionar, depurar o compilar el proyecto desde una terminal "
        "PowerShell, CMD o Bash, los comandos oficiales son:",
        "Guía de Consola: "
    )

    cli_code = (
        "# 1. Clonar el repositorio y acceder a la carpeta raíz\n"
        "cd \"c:\\Users\\MSI KATANA\\Videos\\ASISTENTE DOCUMENTAL\"\n\n"
        "# 2. Instalar todas las dependencias del proyecto\n"
        "npm install\n\n"
        "# 3. Iniciar el servidor local de desarrollo con recarga en vivo (HMR)\n"
        "npm run dev\n\n"
        "# 4. Verificar tipos en TypeScript sin emitir archivos\n"
        "npm run typecheck\n\n"
        "# 5. Ejecutar análisis estático de código con ESLint\n"
        "npm run lint\n\n"
        "# 6. Compilar el proyecto para producción (genera la carpeta dist/)\n"
        "npm run build\n\n"
        "# 7. Previsualizar la compilación de producción en un servidor estático\n"
        "npm run preview\n\n"
        "# 8. Ejecutar pruebas de paridad y compatibilidad de almacenamiento (Python + Playwright)\n"
        "npm run parity:storage"
    )
    add_code_block("Comandos CLI de Gestión del Proyecto", cli_code, "PowerShell / Bash")

    # ---------------------------------------------------------------------------
    # SECCIÓN 10: DIAGRAMAS DE ARQUITECTURA Y FLUJOS (MERMAID)
    # ---------------------------------------------------------------------------
    add_h1("10. Diagramas de Arquitectura y Flujos (Mermaid)")
    add_body(
        "A continuación se representan formalmente mediante diagramas Mermaid los componentes estructurales, flujos de datos "
        "y algoritmos más relevantes del Asistente Documental:"
    )

    add_h2("10.1. Diagrama de Arquitectura Global del Sistema")
    diagram_arch = (
        "graph TD\n"
        "  subgraph NAVEGADOR [Navegador Web / Host]\n"
        "    subgraph SHELL [Shell Principal (src/app/shell.ts)]\n"
        "      BAR[Top Navigation Bar & adInk]\n"
        "      DOCK[Tools Dock: Matrices, CIIU, Calendario, Revisiones]\n"
        "      TASK[TaskRunner: Transiciones Asíncronas]\n"
        "      STORE[ShellStore: Estado Global Zustand]\n"
        "      THEME[Theme Manager: Modo Claro / Oscuro]\n"
        "    end\n"
        "    subgraph REPOSITORIOS [Capa de Datos y Estado Global]\n"
        "      DOCSTORE[DocStore: Memoria de SAC, Plantillas y Mercurio]\n"
        "      DATAREPO[DataRepository: Gestor de Persistencia y Sync]\n"
        "    end\n"
        "    subgraph IFRAMES [Stage de Módulos Aislados (Iframes)]\n"
        "      M1[Módulo 1: Recursos (modules/recursos.html)]\n"
        "      M2[Módulo 2: Cuadro de Mando (modules/cuadro.html)]\n"
        "      M3[Módulo 3: Generación Documentos (modules/documentos.html)]\n"
        "      M4[Módulo Satélite: Extractor CREG (modules/extractor.html)]\n"
        "    end\n"
        "    subgraph WORKERS [Workers en Segundo Plano]\n"
        "      XLSX_W[xlsx.worker.ts: Descompresión ZIP64 y Parser XLSX]\n"
        "      TESS_W[Tesseract.js Worker: Reconocimiento OCR de Facturas]\n"
        "    end\n"
        "    subgraph PERSISTENCIA [Almacenamiento Local del Navegador]\n"
        "      IDB1[(IndexedDB: essa-modulo1)]\n"
        "      IDB2[(IndexedDB: essa_cm)]\n"
        "      LS[(localStorage: marcas, notas, perfil)]\n"
        "      FS[(File System Access API: disco local)]\n"
        "    end\n"
        "  end\n"
        "  SHELL --> IFRAMES\n"
        "  IFRAMES <-->|ModuleBridge / window.AD| REPOSITORIOS\n"
        "  REPOSITORIOS --> WORKERS\n"
        "  DOCSTORE <--> IDB1\n"
        "  DATAREPO <--> IDB2\n"
        "  DATAREPO <--> LS\n"
        "  DATAREPO <--> FS"
    )
    add_code_block("Arquitectura Global: Shell, Microfrontends, Repositorios y Workers", diagram_arch, "Mermaid")

    add_h2("10.2. Diagrama de Flujo del Procesamiento Documental")
    diagram_flow = (
        "sequenceDiagram\n"
        "  autonumber\n"
        "  actor Analista as Analista de PQRSD\n"
        "  participant Rec as Módulo Recursos\n"
        "  participant Store as DocStore / Worker\n"
        "  participant Cuadro as Cuadro de Mando\n"
        "  participant Shell as Shell TaskRunner\n"
        "  participant Docs as Generación Documental\n"
        "  participant IDB as IndexedDB / Disco Local\n\n"
        "  Analista->>Rec: Carga SAC.xlsx y Carpeta de Plantillas .docx\n"
        "  Rec->>Store: load('sac', files)\n"
        "  Store->>IDB: Guarda Blobs en IndexedDB ('essa-modulo1')\n"
        "  Store-->>Rec: Notifica estado 'READY' y filas leídas\n"
        "  Analista->>Cuadro: Abre Cuadro de Mando\n"
        "  Cuadro->>Cuadro: Calcula días hábiles, festivos y alertas críticas\n"
        "  Analista->>Cuadro: Selecciona reclamación crítica y pulsa 'Redactar'\n"
        "  Cuadro->>Shell: AD.navigate('documentos', { radicado, cuenta })\n"
        "  Shell->>Docs: __AD_ON_NAVIGATE(params, ctl)\n"
        "  Docs->>Docs: Normaliza nombres con PersonName y precarga variables\n"
        "  Docs->>Analista: Muestra vista previa DOCX renderizada\n"
        "  Analista->>Docs: Confirma y presiona 'Generar Documento'\n"
        "  Docs->>Docs: Fusión con docxtemplater + inyección de firma\n"
        "  Docs-->>Analista: Descarga archivo .docx o empaquetado .zip"
    )
    add_code_block("Secuencia Operativa: Desde la Ingesta de Archivos hasta el Documento Word", diagram_flow, "Mermaid")

    add_h2("10.3. Diagrama del Algoritmo de Cálculo de Días Hábiles (Cuadro de Mando)")
    diagram_calendar = (
        "flowchart TD\n"
        "  Inicio([Inicio: Trámite Recibido en Fecha D]) --> CheckMedio{¿Medio de Solicitud\nes Correo o Web?}\n"
        "  CheckMedio -- Sí --> FechaAjuste[Tomar Fecha de Radicación Real en Mercurio]\n"
        "  CheckMedio -- No --> FechaBase[Tomar FECHA_SOLICITUD de SAC]\n"
        "  FechaAjuste --> ValidarHabil{¿Fecha Base es\nDía Hábil?}\n"
        "  FechaBase --> ValidarHabil\n"
        "  ValidarHabil -- No --> SiguienteHabil[Avanzar al siguiente día hábil]\n"
        "  ValidarHabil -- Sí --> InitContador[Iniciar contador n = 1]\n"
        "  SiguienteHabil --> InitContador\n"
        "  InitContador --> LoopDias[Avanzar 1 día calendario]\n"
        "  LoopDias --> CheckFestivo{¿Es Sábado, Domingo\no Festivo de Colombia?}\n"
        "  CheckFestivo -- Sí (Inhabil) --> LoopDias\n"
        "  CheckFestivo -- No (Habil) --> Incrementa[n = n + 1]\n"
        "  Incrementa --> Check15{¿n = 15 días hábiles?}\n"
        "  Check15 -- No --> LoopDias\n"
        "  Check15 -- Sí --> FechaVence[Fecha de Vencimiento Calculada]\n"
        "  FechaVence --> EvaluaHoy{Diferencia vs HOY}\n"
        "  EvaluaHoy -- Dif < 0 --> Vencido[Estado: VENCIDO - Alerta Máxima]\n"
        "  EvaluaHoy -- 0 <= Dif <= 2 --> Critico[Estado: CRÍTICO - Vence en <= 2 días]\n"
        "  EvaluaHoy -- 3 <= Dif <= 5 --> Proximo[Estado: PRÓXIMO - Vence en <= 5 días]\n"
        "  EvaluaHoy -- Dif > 5 --> EnTermino[Estado: EN TÉRMINO NORMAL]"
    )
    add_code_block("Flujo de Decisión: Cálculo de Términos Legales (15 Días Hábiles CPACA)", diagram_calendar, "Mermaid")

    # ---------------------------------------------------------------------------
    # SECCIÓN 11: GUÍA DE MANTENIMIENTO Y EXTENSIBILIDAD
    # ---------------------------------------------------------------------------
    add_h1("11. Guía de Mantenimiento y Extensibilidad")
    add_body(
        "Esta sección detalla cómo los desarrolladores pueden adaptar, actualizar y hacer crecer el sistema a medida que cambien "
        "los requisitos de la Electrificadora de Santander:"
    )

    add_h2("11.1. Cómo Agregar una Nueva Plantilla Word o Nuevos Campos")
    add_bullet(
        "Para agregar una nueva plantilla Word, basta con diseñar el archivo en Microsoft Word e incluir etiquetas de reemplazo "
        "delimitadas por llaves simples, por ejemplo: {NUMERO_CUENTA}, {NOMBRE_SOLICITANTE}, {DIRECCION_SUSCRIPTOR}, {NUMERO_PROCESO}. "
        "Luego se copia el archivo .docx a la carpeta de plantillas y se carga en el Módulo de Recursos.",
        "Nuevas Plantillas: "
    )
    add_bullet(
        "Si ESSA agrega una nueva columna al informe de SAC (por ejemplo, TIPO_TENSION o CODIGO_SUBESTACION): \n"
        "  1. Abrir src/repositories/doc-store.ts.\n"
        "  2. Incorporar el nombre exacto de la columna en la constante COLS_SAC.\n"
        "  3. Abrir src/modules/documentos/main.ts e incluir la nueva clave en la función de mapeo de campos sacValue().\n"
        "  4. La nueva variable estará disponible inmediatamente para ser usada en cualquier plantilla Word como {CODIGO_SUBESTACION}.",
        "Nuevos Campos de SAC: "
    )

    add_h2("11.2. Cómo Modificar las Reglas de Días Hábiles o Festivos")
    add_bullet(
        "Si una nueva disposición legal modifica el plazo de 15 días hábiles a otro valor, basta con editar la constante "
        "diasHabiles en el objeto CFG dentro de src/modules/cuadro/main.ts.",
        "Plazo Legal: "
    )
    add_bullet(
        "Si el Gobierno Nacional decreta un nuevo día cívico no hábil de carácter permanente o extraordinario, se puede registrar "
        "en la función festivos(y) de src/modules/cuadro/main.ts dentro del arreglo F, o gestionarlo dinámicamente como fecha inhábil "
        "desde la configuración del módulo.",
        "Días Festivos: "
    )

    add_h2("11.3. Funcionalidades Incompletas y Aspectos No Verificables Identificados")
    add_callout(
        "Hallazgos Técnicos de la Fase 1 y Hoja de Ruta para Fase 2",
        "Durante el análisis exhaustivo del código fuente se identificaron los siguientes aspectos técnicos a tener en cuenta:\n\n"
        "1. Módulo Extractor CREG: Actualmente se abre como una ventana/pestaña externa independiente mediante target='_blank' "
        "desde un botón en documentos.html (href='extractor.html'). En la fase 2 se proyecta integrarlo como una cuarta pestaña nativa "
        "del Shell orquestada por shell.ts.\n\n"
        "2. Directivas @ts-nocheck en Código Legado: Módulos como cuadro/main.ts, documentos/main.ts, data-repository.ts y doc-store.ts "
        "fueron heredados y estabilizados para la versión 2.0.0-fase1 con la directiva @ts-nocheck para preservar el 100 % del "
        "comportamiento operativo probado en producción. La fase 2 contempla la refactorización a TypeScript estricto de estos módulos.\n\n"
        "3. Compatibilidad de File System Access API: El guardado directo en carpetas del disco local requiere navegadores basados "
        "en Chromium (Edge o Chrome). En Mozilla Firefox, la API no está soportada de forma nativa por el navegador, degradando "
        "correctamente hacia la exportación/descarga manual de respaldos en formato JSON.",
        "warning"
    )

    # ---------------------------------------------------------------------------
    # SECCIÓN 12: GLOSARIO DE TÉRMINOS
    # ---------------------------------------------------------------------------
    add_h1("12. Glosario Técnico y de Negocio")
    add_body(
        "A continuación se definen con claridad los principales términos técnicos, legales y operativos utilizados en el proyecto:"
    )

    glossary_items = [
        ("ESSA", "Electrificadora de Santander S.A. E.S.P., empresa de servicios públicos de energía en el nororiente colombiano."),
        ("Grupo EPM", "Grupo empresarial multiservicios al cual pertenece ESSA como filial de distribución y comercialización."),
        ("PQRSD", "Sigla de Peticiones, Quejas, Reclamos, Sugerencias y Denuncias; marco legal de atención al usuario de servicios públicos."),
        ("SAC", "Sistema de Atención a Clientes: módulo de SAP IS-U donde se radican y tramitan las reclamaciones operativas de ESSA."),
        ("Mercurio", "Sistema de gestión documental y correspondencia oficial utilizado para registrar radicados de entrada y salida."),
        ("Silencio Administrativo Positivo (SAP)", "Efecto jurídico mediante el cual, si la empresa no responde en 15 días hábiles, se entiende aceptada la petición."),
        ("SSPD", "Superintendencia de Servicios Públicos Domiciliarios; entidad gubernamental encargada de vigilar y sancionar a ESSA."),
        ("CREG", "Comisión de Regulación de Energía y Gas; órgano regulador de tarifas y resoluciones técnicas en Colombia."),
        ("Resolución CREG 101-028", "Regulación que define el esquema de cobro y ahorro por consumo meta durante periodos de contingencia climática."),
        ("CIIU", "Clasificación Industrial Internacional Uniforme; código que clasifica las actividades económicas según el Decreto 2860 de 2013."),
        ("ZPSAC001 / ZPSAC003", "Transacciones estándar de SAP IS-U utilizadas en ESSA para consulta de requisitos y árboles de decisión de trámites."),
        ("Local-First Architecture", "Filosofía de software donde los datos se almacenan y procesan en el dispositivo del usuario antes de cualquier sincronización."),
        ("IndexedDB", "Base de datos NoSQL transaccional orientada a objetos embebida en los navegadores web modernos para almacenar datos pesados."),
        ("Web Worker", "Hilo de procesamiento secundario en JavaScript que permite ejecutar cálculos matemáticos sin congelar la pantalla del usuario."),
        ("ZIP64", "Extensión del estándar de compresión ZIP que permite procesar archivos y hojas de cálculo de más de 4 GB o 65.535 registros."),
        ("Zero-Copy Transfer", "Técnica de alto rendimiento donde la propiedad de un búfer de memoria se transfiere sin duplicar su tamaño en la RAM."),
        ("DecompressionStream", "API moderna nativa del navegador para descomprimir flujos de datos gzip y deflate en milisegundos."),
        ("docxtemplater", "Motor de sustitución de etiquetas y bucles en archivos OpenXML (.docx) sin requerir tener instalado Microsoft Word."),
        ("Tesseract.js", "Puerto WebAssembly del motor de reconocimiento óptico de caracteres de código abierto Tesseract de Google / HP."),
        ("File System Access API", "API moderna del navegador que permite a una aplicación web leer y escribir directamente en una carpeta del disco."),
        ("Ley Emiliani (Ley 51 de 1983)", "Ley colombiana que traslada la mayoría de los días festivos religiosos al día lunes siguiente."),
        ("Algoritmo de Pascua", "Fórmula matemática utilizada para calcular la fecha del Domingo de Resurrección y derivar los festivos móviles."),
        ("Antroponimia", "Disciplina que estudia los nombres de personas. Aplicada en el proyecto mediante el algoritmo PersonName."),
        ("Single Page Application (SPA)", "Aplicación web que carga una única página HTML y actualiza su contenido dinámicamente sin recargar.")
    ]
    add_styled_table(["Término / Sigla", "Definición y Explicación en Palabras Sencillas"], glossary_items, [2.3, 4.2])

    # Guardar documento
    output_path = os.path.abspath("Manual_Tecnico_y_Funcional_Asistente_Documental.docx")
    doc.save(output_path)
    print(f"Manual generado con éxito en: {output_path}")

if __name__ == "__main__":
    create_manual()
