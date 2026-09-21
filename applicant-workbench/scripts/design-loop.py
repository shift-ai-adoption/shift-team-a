"""Compare two same-sized PNG exports in nine regions. No network calls."""
import argparse, json
from pathlib import Path
from PIL import Image, ImageChops
parser=argparse.ArgumentParser()
parser.add_argument('reference'); parser.add_argument('actual')
parser.add_argument('--tolerance',type=int,default=30)
parser.add_argument('--max-difference',type=float,default=0.05)
parser.add_argument('--output',default='artifacts/design-diff.json')
args=parser.parse_args()
reference=Image.open(args.reference).convert('RGB'); actual=Image.open(args.actual).convert('RGB')
if reference.size!=actual.size: raise SystemExit('Images must have identical export dimensions; do not compare the editor chrome with the app.')
diff=ImageChops.difference(reference,actual)
w,h=diff.size
regions=[]
for row in range(3):
 for col in range(3):
  pixels=list(diff.crop((col*w//3,row*h//3,(col+1)*w//3,(row+1)*h//3)).getdata())
  if not pixels: continue
  regions.append({'row':row,'column':col,'exactMatch':sum(max(p)==0 for p in pixels)/len(pixels),'withinTolerance':sum(max(p)<=args.tolerance for p in pixels)/len(pixels)})
pixels=list(diff.getdata()); ratio=sum(max(p)>args.tolerance for p in pixels)/len(pixels)
result={'size':[w,h],'tolerance':args.tolerance,'differenceRatio':ratio,'passed':ratio<=args.max_difference,'regions':regions}
output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(result,indent=2),encoding='utf-8');diff.save(output.with_suffix('.png'))
print(json.dumps(result));raise SystemExit(0 if result['passed'] else 1)
