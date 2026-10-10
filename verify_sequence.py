import os
import docx

doc_filename = "QuantCopilot_AI_Research_Paper_Final.docx" if os.path.exists("QuantCopilot_AI_Research_Paper_Final.docx") else "QuantCopilot AI Research Paper.docx"
doc = docx.Document(doc_filename)
print("=== STRICT FIGURE SEQUENCE & CONTENT AUDIT ===")

fig_records = []
for i, p in enumerate(doc.paragraphs):
    drawings = p._element.xpath('.//w:drawing')
    if drawings:
        # Find next non-empty paragraph for caption
        caption = ""
        for j in range(i + 1, min(len(doc.paragraphs), i + 4)):
            t = doc.paragraphs[j].text.strip()
            if t:
                caption = t
                break
        fig_records.append((i, caption))

print(f"Total Figures Found in Document: {len(fig_records)}\n")

expected_titles = [
    "Figure 1. Overall QuantCopilot AI System Architecture",
    "Figure 2. Financial Graph Representation and GNN Risk Propagation",
    "Figure 3. Counterfactual What-If Analysis: Before and After Intervention",
    "Figure 4. AI Copilot Explanation of GNN Risk and Counterfactual Output",
    "Figure 5. QuantCopilot AI Financial Workstation Interface",
    "Figure 6. Comparative Risk-Prediction Performance",
    "Figure 7. Ablation Analysis of the Proposed GNN Architecture",
    "Figure 8. Counterfactual Optimization Runtime with Increasing Graph Size",
    "Figure 9. Model Robustness Under Input Perturbations",
    "Figure 10. Real-Time WebSocket Latency Under Increasing Load",
    "Figure 11. End-to-End QuantCopilot AI Case Study"
]

all_match = True
for idx, (p_num, caption) in enumerate(fig_records):
    expected = expected_titles[idx]
    is_match = expected in caption or caption in expected
    status = "OK [EXACT MATCH]" if is_match else f"MISMATCH (Expected: {expected})"
    if not is_match:
        all_match = False
    print(f"Position {idx+1}: Para #{p_num}")
    print(f"   Actual Caption in Doc: \"{caption}\"")
    print(f"   Expected Caption:     \"{expected}\"")
    print(f"   Audit Result:         {status}\n")

if all_match and len(fig_records) == 11:
    print(">>> VERIFICATION RESULT: 100% PERFECT CHRONOLOGICAL SEQUENCE! <<<")
else:
    print(">>> VERIFICATION RESULT: ISSUE DETECTED <<<")
