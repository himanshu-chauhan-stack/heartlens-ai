from pathlib import Path
import json, sys
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'apps/web/public/samples'
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEST
OUT.mkdir(parents=True, exist_ok=True)
PROFILES = [
    dict(label='Profile 01', descriptor='Complete baseline profile', age=42, sex=0, height=163, weight=62, ap_hi=118, ap_lo=76, cholesterol=1, gluc=1, smoke=0, alco=0, active=1),
    dict(label='Profile 02', descriptor='Elevated measurements profile', age=58, sex=1, height=175, weight=85, ap_hi=145, ap_lo=90, cholesterol=2, gluc=1, smoke=0, alco=0, active=1),
    dict(label='Profile 03', descriptor='Lifestyle and category variations', age=63, sex=1, height=170, weight=92, ap_hi=156, ap_lo=96, cholesterol=3, gluc=2, smoke=1, alco=1, active=0),
    dict(label='Profile 04', descriptor='Different adult measurements', age=49, sex=0, height=160, weight=68, ap_hi=126, ap_lo=80, cholesterol=1, gluc=2, smoke=0, alco=0, active=1),
]
GROUPS = [
    ('01  /  PROFILE & MEASUREMENTS', [('age','Age','years'),('sex','Dataset sex category','0 female / 1 male'),('height','Height','cm'),('weight','Weight','kg')]),
    ('02  /  BLOOD PRESSURE & REPORTED LAB CATEGORIES', [('ap_hi','Systolic blood pressure','mmHg'),('ap_lo','Diastolic blood pressure','mmHg'),('cholesterol','Reported cholesterol category','1 normal / 2 above / 3 well above'),('gluc','Reported glucose category','1 normal / 2 above / 3 well above')]),
    ('03  /  SELF-REPORTED LIFESTYLE', [('smoke','Current smoking','0 no / 1 yes'),('alco','Alcohol consumption','0 no / 1 yes'),('active','Physical activity','0 inactive / 1 active')]),
]
W,H=A4
for i,p in enumerate(PROFILES,1):
    name=f'heartlens-sample-{i:02d}.pdf'
    path=DEST/name
    c=canvas.Canvas(str(path),pagesize=A4)
    c.setTitle(f'HeartLens AI - Synthetic Lab Import - {p["label"]}')
    c.setAuthor('Himanshu Chauhan')
    c.setSubject('Synthetic educational sample, not a real patient or clinical laboratory result')
    c.setFillColor(HexColor('#F6F7F2'));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor('#142B20'));c.rect(0,H-148,W,148,fill=1,stroke=0)
    c.setFillColor(HexColor('#DDF58A'));c.setFont('Helvetica-Bold',12);c.drawString(36,H-36,'HeartLens AI')
    c.setFillColor(HexColor('#FFFFFF'));c.setFont('Helvetica-Bold',25);c.drawString(36,H-76,'Sample lab import report')
    c.setFont('Helvetica',11);c.drawString(36,H-101,f'{p["label"]}  /  {p["descriptor"]}')
    c.setFillColor(HexColor('#DDF58A'));c.setFont('Helvetica-Bold',9)
    c.drawString(36,H-128,'SYNTHETIC EDUCATIONAL SAMPLE - NOT A REAL PATIENT')
    y=H-176
    c.setFillColor(HexColor('#5D665E'));c.setFont('Helvetica',9)
    c.drawString(36,y,'Prepared for upload testing  |  19 October 2026  |  No hospital or clinician affiliation')
    y-=22
    c.setFont('Helvetica',9);c.drawString(36,y,'All values are fictional. This file is not a diagnosis, prescription or certified lab result.')
    y-=35
    for heading,rows in GROUPS:
        c.setFillColor(HexColor('#175C43'));c.setFont('Helvetica-Bold',9);c.drawString(36,y,heading)
        y-=12
        for key,label,unit in rows:
            c.setStrokeColor(HexColor('#D9DFD7'));c.line(36,y-31,W-36,y-31)
            c.setFillColor(HexColor('#5D665E'));c.setFont('Helvetica',8);c.drawString(36,y-9,label)
            c.setFillColor(HexColor('#161B17'));c.setFont('Helvetica-Bold',11);c.drawString(36,y-23,f'{key}: {p[key]}')
            c.setFillColor(HexColor('#5D665E'));c.setFont('Helvetica',8);c.drawRightString(W-36,y-9,unit)
            y-=35
        y-=24
    c.setFillColor(HexColor('#142B20'));c.roundRect(36,y-56,W-72,65,10,fill=1,stroke=0)
    c.setFillColor(HexColor('#DDF58A'));c.setFont('Helvetica-Bold',10);c.drawString(50,y-10,'Upload. Review. Request a genuine prediction.')
    c.setFillColor(HexColor('#FFFFFF'));c.setFont('Helvetica',9)
    c.drawString(50,y-27,'These samples are parsed locally. Confirm medical history in the review step.')
    c.drawString(50,y-41,'No model score is pre-filled or embedded in this report.')
    c.setFillColor(HexColor('#5D665E'));c.setFont('Helvetica',8)
    c.drawString(36,50,'Interface redesign and adaptation by Himanshu Chauhan')
    c.drawRightString(W-36,50,f'{i:02d} / 04')
    c.setFont('Helvetica',7);c.drawString(36,35,'HEARTLENS_SYNTHETIC_SAMPLE_V1')
    c.save()
    (OUT/name).write_bytes(path.read_bytes())
manifest=[dict(filename=f'heartlens-sample-{i:02d}.pdf',label=p['label'],description=p['descriptor'],inputs={k:v for k,v in p.items() if k not in ['label','descriptor']}) for i,p in enumerate(PROFILES,1)]
(DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'README.txt').write_text('HeartLens AI - synthetic lab import samples\n\nAll four PDFs are fictional educational test reports, not real patient records.\nOpen http://127.0.0.1:3000/assess and choose optional lab import.\nSelect a PDF. These marked sample files are parsed locally without Groq.\nReview every extracted field and complete medical history before prediction.\nGeneral personal report extraction still requires explicit external-processing consent and a configured Groq key.\n')
print('Created 4 one-page synthetic PDFs and expected-value manifest.')
