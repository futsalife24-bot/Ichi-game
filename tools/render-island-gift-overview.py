"""島ごとの三つの小物を、確認用の一枚絵に並べる。"""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDER=os.path.join(ROOT,'assets-src','islands','bonus')
with open(os.path.join(FOLDER,'bonus-parts.json'),encoding='utf-8') as f:parts=json.load(f)['parts']
font_path='C:/Windows/Fonts/meiryo.ttc'
font=ImageFont.truetype(font_path,22) if os.path.exists(font_path) else ImageFont.load_default()
small=ImageFont.truetype(font_path,16) if os.path.exists(font_path) else ImageFont.load_default()
width,height=1380,8*372+100
canvas=Image.new('RGB',(width,height),'#f6f1e7');draw=ImageDraw.Draw(canvas)
draw.text((34,28),'八島の小さな部品　各島３点・計24点',fill='#3d352e',font=font)
for i,part in enumerate(parts):
    row,col=divmod(i,3);x=28+col*454;y=80+row*372
    draw.rounded_rectangle((x,y,x+438,y+356),radius=12,fill='white',outline='#d8d1c4',width=2)
    with Image.open(os.path.join(FOLDER,part['id']+'.png')) as image:
        preview=image.convert('RGB');preview.thumbnail((418,287),Image.Resampling.LANCZOS)
        canvas.paste(preview,(x+(438-preview.width)//2,y+8))
    draw.text((x+15,y+297),f'第{part["island"]}島　{part["name"]}',fill='#2e3b3c',font=font)
    draw.text((x+15,y+328),part['id'],fill='#66645e',font=small)
canvas.save(os.path.join(FOLDER,'overview.jpg'),quality=91,optimize=True)
print('24点の一覧画像を保存しました')
