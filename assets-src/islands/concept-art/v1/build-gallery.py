"""保存済みの原寸画像から、日本語の８島画像集を組み立てる。"""
import json
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]
OUTPUT = ROOT / "output/pdf/eight-islands-concept-art-v1.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
DATA = json.loads((BASE / "catalog.json").read_text(encoding="utf-8"))
pdfmetrics.registerFont(TTFont("Japanese", "C:/Windows/Fonts/meiryo.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("JapaneseBold", "C:/Windows/Fonts/meiryob.ttc", subfontIndex=0))
W, H = 960, 650
M = 30
c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
c.setTitle("キラキラアイランド ８島コンセプトアート")
c.setAuthor("キラキラアイランド 制作記録")
c.setSubject("国の自然と建築を手掛かりにした８島の景観基準。本人確認用。")

for row in DATA["islands"]:
    c.setFillColor(HexColor("#F9F7F0"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(HexColor("#1E454B"))
    c.setFont("JapaneseBold", 23)
    title = f'第{row["island"]}島　{row["name"]}'
    assert pdfmetrics.stringWidth(title, "JapaneseBold", 23) < 725
    c.drawString(M, H-38, title)
    c.setFont("Japanese", 12)
    c.drawRightString(W-M, H-36, row["country"]+"の着想")
    c.setFillColor(HexColor("#53656A"))
    c.setFont("Japanese", 11)
    c.drawString(M, H-60, row["galleryCaption"])
    img = ImageReader(str(BASE / row["file"]))
    iw, ih = img.getSize()
    draw_w = W-2*M
    draw_h = draw_w*ih/iw
    c.drawImage(img, M, H-77-draw_h, draw_w, draw_h, mask="auto")
    c.setFillColor(HexColor("#1E454B"))
    c.setFont("Japanese", 10.8)
    assert pdfmetrics.stringWidth(row["productionCaption"], "Japanese", 10.8) < W-2*M
    c.drawString(M, 47, row["productionCaption"])
    c.setStrokeColor(HexColor("#D5DCD7"))
    c.line(M, 33, W-M, 33)
    c.setFillColor(HexColor("#697675"))
    c.setFont("Japanese", 8.5)
    c.drawString(M, 17, "2026-10-13　景観の基準像・本人確認用　｜　３Ｄ制作はこの絵との照合を経て進める")
    c.drawRightString(W-M, 17, f'{row["island"]} / 8')
    c.bookmarkPage(str(row["island"]))
    c.addOutlineEntry(title, str(row["island"]), level=0)
    c.showPage()
c.save()
print(str(OUTPUT))
