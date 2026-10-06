import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_document():
    doc = docx.Document()

    # Page setup - 0.8 inch margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    # Palette
    NAVY = RGBColor(15, 23, 42)        # Slate 900
    TEAL = RGBColor(2, 132, 199)       # Sky 600
    EMERALD = RGBColor(5, 150, 105)    # Emerald 600
    DARK_GRAY = RGBColor(51, 65, 85)   # Slate 700
    LIGHT_GRAY = RGBColor(100, 116, 139) # Slate 500
    CODE_COLOR = RGBColor(30, 41, 59)  # Slate 800

    def set_cell_background(cell, hex_color):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def format_table(table, col_widths, header_bg="0F172A", alt_bg="F8FAFC"):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, row in enumerate(table.rows):
            # Prevent row splitting across pages
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            
            # Repeat header row
            if i == 0:
                trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

            for j, cell in enumerate(row.cells):
                if j < len(col_widths):
                    cell.width = Inches(col_widths[j])
                set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                if i == 0:
                    set_cell_background(cell, header_bg)
                elif i % 2 == 1:
                    set_cell_background(cell, alt_bg)
                else:
                    set_cell_background(cell, "FFFFFF")

    # Document Header / Hero Block
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    run_sub = title_p.add_run("QUANTCOPILOT AI • FULL-STACK DEPLOYMENT MANUAL\n")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(10)
    run_sub.font.bold = True
    run_sub.font.color.rgb = TEAL

    run_title = title_p.add_run("GitHub Clone, Setup & Quickstart Guide")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(4)
    sub_p.paragraph_format.space_after = Pt(14)
    run_desc = sub_p.add_run(
        "A fast, linear, copy-paste guide to clone, install dependencies, and launch QuantCopilot AI "
        "(FastAPI Gateway, Next.js 16 UI, PyTorch GNN Risk Engine, and Strategy Lab) in under 5 minutes."
    )
    run_desc.font.name = "Arial"
    run_desc.font.size = Pt(11)
    run_desc.font.color.rgb = DARK_GRAY

    # Metadata card / table
    meta_table = doc.add_table(rows=2, cols=4)
    meta_widths = [1.6, 1.8, 1.6, 1.8]
    format_table(meta_table, meta_widths, header_bg="1E293B", alt_bg="F1F5F9")
    
    headers = ["Repository URL", "Target Platform", "Supported OS", "Average Setup Time"]
    values = [
        "Sahityasahani1/Quantcopilot",
        "Full-Stack (Web + REST + ML)",
        "Windows / Linux / macOS",
        "~3 to 5 Minutes"
    ]
    for j, h in enumerate(headers):
        p = meta_table.cell(0, j).paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

        p2 = meta_table.cell(1, j).paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p2.add_run(values[j])
        r2.font.name = "Arial"
        r2.font.size = Pt(9.5)
        r2.font.bold = True
        r2.font.color.rgb = NAVY

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    def add_heading_1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(16)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(15)
        r.font.bold = True
        r.font.color.rgb = NAVY
        return h

    def add_heading_2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
        h.paragraph_format.keep_with_next = True
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(12.5)
        r.font.bold = True
        r.font.color.rgb = TEAL
        return h

    def add_body(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = "Arial"
            r_pre.font.size = Pt(10)
            r_pre.font.bold = True
            r_pre.font.color.rgb = NAVY
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10)
        r.font.color.rgb = DARK_GRAY
        return p

    def add_code_block(code_text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.8)
        set_cell_background(cell, "0F172A")
        set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.1
        r = p.add_run(code_text)
        r.font.name = "Consolas"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(56, 189, 248) # Cyan-400
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    def add_callout(text, title="NOTE", color="0284C7", bg="F0F9FF"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.8)
        set_cell_background(cell, bg)
        set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r_title = p.add_run(f"[{title}] ")
        r_title.font.name = "Arial"
        r_title.font.size = Pt(9.5)
        r_title.font.bold = True
        r_title.font.color.rgb = TEAL if color=="0284C7" else EMERALD
        r_text = p.add_run(text)
        r_text.font.name = "Arial"
        r_text.font.size = Pt(9.5)
        r_text.font.color.rgb = DARK_GRAY
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # SECTION 1: ARCHITECTURE & SETUP FLOWCHART
    # -------------------------------------------------------------
    add_heading_1("1. High-Level Installation Flow")
    add_body("The complete installation process flows in four quick linear steps from cloning to execution:")

    flow_box = (
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│  STEP 1: Clone Repository from GitHub                                 │\n"
        "│  git clone https://github.com/Sahityasahani1/Quantcopilot.git          │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│  STEP 2: Python Virtual Environment & ML Setup (.venv)                │\n"
        "│  python -m venv .venv  -->  pip install -r backend & ml_service reqs   │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│  STEP 3: Frontend Node Dependencies Setup (Next.js 16)                │\n"
        "│  cd frontend  -->  npm install                                         │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│  STEP 4: Run Application (Dual Microservices)                          │\n"
        "│  Windows: .\\run.ps1  |  Linux/Mac: ./run.sh                           │\n"
        "│  --> Backend: http://localhost:8000  •  Frontend: http://localhost:3000 │\n"
        "└────────────────────────────────────────────────────────────────────────┘"
    )
    add_code_block(flow_box)

    # -------------------------------------------------------------
    # SECTION 2: PREREQUISITES & SYSTEM REQUIREMENTS
    # -------------------------------------------------------------
    add_heading_1("2. System Prerequisites & Requirements")
    add_body("Ensure the following baseline software and dependencies are installed on your machine before setup:")

    req_table = doc.add_table(rows=6, cols=3)
    format_table(req_table, [2.0, 1.8, 3.0])
    
    headers_req = ["Software / Component", "Minimum Required", "Notes & Verification Command"]
    for j, h in enumerate(headers_req):
        p = req_table.cell(0, j).paragraphs[0]
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    req_data = [
        ("Git", "2.30+", "Verify with: git --version"),
        ("Python", "3.10, 3.11, or 3.12", "Verify with: python --version"),
        ("Node.js & npm", "Node 18.x or 20.x+ (npm 9+)", "Verify with: node -v && npm -v"),
        ("Memory (RAM)", "8 GB (16 GB recommended)", "Required for PyTorch GNN tensor calculations"),
        ("Disk Space", "~2.5 GB free space", "Accommodates PyTorch, node_modules, and market DB")
    ]
    for i, row in enumerate(req_data):
        for j, val in enumerate(row):
            p = req_table.cell(i+1, j).paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.font.color.rgb = NAVY if j == 0 else DARK_GRAY

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_callout(
        "QuantCopilot AI includes an automated SQLite historical market database (ml_service/data_cache/quantcopilot_history.db). "
        "PostgreSQL and Redis are optional: if not installed, the platform automatically runs in high-performance standalone mode!",
        title="STANDALONE READY",
        color="059669",
        bg="ECFDF5"
    )

    # -------------------------------------------------------------
    # SECTION 3: STEP-BY-STEP QUICK COMMANDS (COPY & PASTE)
    # -------------------------------------------------------------
    add_heading_1("3. Step-by-Step Installation Commands")
    
    add_heading_2("Step 1: Clone the GitHub Repository")
    add_body("Open PowerShell (Windows) or Terminal (Linux/macOS) and clone the repository:")
    add_code_block(
        "# Clone the repository to your local machine\n"
        "git clone https://github.com/Sahityasahani1/Quantcopilot.git\n\n"
        "# Navigate into the project root directory\n"
        "cd Quantcopilot"
    )

    add_heading_2("Step 2: Setup Python Virtual Environment (.venv) & Install Packages")
    add_body("Create an isolated Python environment and install the FastAPI and PyTorch machine learning dependencies:")
    add_code_block(
        "# 1. Create the virtual environment\n"
        "python -m venv .venv\n\n"
        "# 2. Activate the virtual environment:\n"
        "# Windows PowerShell:\n"
        ".\\.venv\\Scripts\\Activate.ps1\n"
        "# Linux / macOS Bash:\n"
        "# source .venv/bin/activate\n\n"
        "# 3. Upgrade pip and install all backend & ML requirements:\n"
        "pip install --upgrade pip\n"
        "pip install -r backend/requirements.txt\n"
        "pip install -r ml_service/requirements.txt"
    )

    add_heading_2("Step 3: Setup Frontend Dependencies (Next.js 16)")
    add_body("Navigate into the frontend directory and install the Node.js packages (Zustand, Tailwind, Lucide, Lightweight Charts):")
    add_code_block(
        "# Navigate into the frontend folder\n"
        "cd frontend\n\n"
        "# Install frontend dependencies\n"
        "npm install\n\n"
        "# Return back to the project root directory\n"
        "cd .."
    )

    add_heading_2("Step 4: Launch the Microservices")
    add_body("You can launch both the FastAPI backend and Next.js frontend simultaneously using the included startup script, or run them in separate terminals:")

    add_body("Option A: One-Click Quick Launch Script (Recommended)", bold_prefix="• ")
    add_code_block(
        "# On Windows (PowerShell):\n"
        ".\\run.ps1\n\n"
        "# On Linux / macOS (Bash):\n"
        "chmod +x run.sh\n"
        "./run.sh"
    )

    add_body("Option B: Manual Dual-Terminal Launch", bold_prefix="• ")
    add_body("If you prefer running the servers in separate windows to monitor live logs:")
    add_code_block(
        "# TERMINAL 1 (FastAPI Backend Server):\n"
        ".\\.venv\\Scripts\\Activate.ps1\n"
        "cd backend\n"
        "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload\n\n"
        "# TERMINAL 2 (Next.js Frontend Server):\n"
        "cd frontend\n"
        "npm run dev"
    )

    # -------------------------------------------------------------
    # SECTION 4: SERVICE URLS & PORTS TABLE
    # -------------------------------------------------------------
    add_heading_1("4. Access Endpoints & Network Topology")
    add_body("Once launched, the following services will be live and ready in your browser:")

    url_table = doc.add_table(rows=5, cols=3)
    format_table(url_table, [2.0, 2.2, 2.6])

    headers_url = ["Service", "URL / Protocol", "Description & Usage"]
    for j, h in enumerate(headers_url):
        p = url_table.cell(0, j).paragraphs[0]
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    url_data = [
        ("Web Frontend UI", "http://localhost:3000", "Interactive Trading Desk, Strategy Lab, GNN Risk Engine"),
        ("FastAPI Backend", "http://localhost:8000", "High-performance REST API gateway"),
        ("Swagger API Docs", "http://localhost:8000/docs", "Interactive OpenAPI documentation and live testing"),
        ("WebSocket Stream", "ws://localhost:8000/ws/live-feed", "Sub-15ms real-time tick and option Greek broadcast")
    ]
    for i, row in enumerate(url_data):
        for j, val in enumerate(row):
            p = url_table.cell(i+1, j).paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            if j == 1:
                r.font.bold = True
                r.font.color.rgb = TEAL
            elif j == 0:
                r.font.bold = True
                r.font.color.rgb = NAVY
            else:
                r.font.color.rgb = DARK_GRAY

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # SECTION 5: POST-LAUNCH VERIFICATION CHECKLIST
    # -------------------------------------------------------------
    add_heading_1("5. Feature Verification Checklist")
    add_body("To confirm the installation was 100% successful, open http://localhost:3000 and verify the four core tabs:")

    chk_table = doc.add_table(rows=5, cols=3)
    format_table(chk_table, [1.8, 2.4, 2.6])

    headers_chk = ["Platform Module", "Key Visuals to Check", "Verification Metric"]
    for j, h in enumerate(headers_chk):
        p = chk_table.cell(0, j).paragraphs[0]
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    chk_data = [
        ("F&O Trading Desk", "Option Chain matrix, Black-Scholes Greeks (Delta, Gamma, Vega, Theta), 5-Level Depth", "Live quotes updating via websocket"),
        ("Strategy Lab (DRL)", "Actor-Critic action badge (LONG/SHORT), Execution targets, 'Deploy Signal' button", "One-click order dispatch to portfolio"),
        ("Temporal Forecaster", "Multi-Horizon Quantile Fan Chart (SVG Cone) with 95% & 80% confidence envelopes", "20-period probabilistic price trajectory"),
        ("GNN Risk Engine", "Interactive What-If Contagion Simulator, Edge Sparsification Slider (Tau), Sector Bar", "Sub-15ms graph shock cascade diffusion")
    ]
    for i, row in enumerate(chk_data):
        for j, val in enumerate(row):
            p = chk_table.cell(i+1, j).paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.font.bold = (j == 0)
            r.font.color.rgb = NAVY if j == 0 else DARK_GRAY

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # SECTION 6: COMMON TROUBLESHOOTING & FAQS
    # -------------------------------------------------------------
    add_heading_1("6. Troubleshooting & FAQs")

    add_body("Problem 1: PowerShell script execution is disabled on Windows", bold_prefix="• ")
    add_body("Resolution: Open PowerShell as Administrator and run the following command to allow virtual environment activation:")
    add_code_block("Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass")

    add_body("Problem 2: Port 8000 or Port 3000 is already in use by another application", bold_prefix="• ")
    add_body("Resolution: Terminate existing processes on those ports before launching:")
    add_code_block(
        "# Find and terminate process on Port 8000 (Windows PowerShell):\n"
        "Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n\n"
        "# Find and terminate process on Port 3000 (Windows PowerShell):\n"
        "Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
    )

    add_body("Problem 3: Missing database warning in logs", bold_prefix="• ")
    add_body(
        "Resolution: QuantCopilot automatically connects to the bundled SQLite historical cache (quantcopilot_history.db). "
        "If you wish to use PostgreSQL, ensure your local postgres service is started on port 5432 with credentials in backend/app/config.py."
    )

    # Summary footer callout
    add_callout(
        "Congratulations! Your QuantCopilot AI Quantitative Terminal is now fully configured and running. "
        "For additional customizations or ML training adjustments, refer to ml_service/train_models.py.",
        title="READY TO TRADE",
        color="059669",
        bg="ECFDF5"
    )

    output_path = "QuantCopilot_Clone_and_Quickstart_Guide.docx"
    doc.save(output_path)
    print(f"Document saved successfully as: {output_path}")

if __name__ == "__main__":
    create_document()
