from pathlib import Path
import json
import httpx
import pdfplumber
root=Path.cwd()
manifest=json.loads((root/'apps/web/public/samples/manifest.json').read_text())
results=[]
with httpx.Client(base_url='http://127.0.0.1:3000',timeout=60) as c:
    for p in manifest:
        file=root/'apps/web/public/samples'/p['filename']
        with pdfplumber.open(file) as pdf:
            assert len(pdf.pages)==1
            text=pdf.pages[0].extract_text()
            assert 'NOT A REAL PATIENT' in text
        r=c.post('/api/extract',files={'file':(file.name,file.read_bytes(),'application/pdf')})
        assert r.status_code==200,(file.name,r.status_code,r.text)
        extraction=r.json()
        assert extraction['extracted_values']==p['inputs'],extraction
        assert extraction['sample_source']=='heartlens_synthetic_sample_v1'
        prediction=c.post('/api/predict',json=extraction['extracted_values'])
        assert prediction.status_code==200,prediction.text
        result=prediction.json()
        assert result['source']=='model'
        results.append(dict(file=file.name,extracted_values=extraction['extracted_values'],sample_source=extraction['sample_source'],model_version=result['model_version'],probability=result['probability'],risk_level=result['risk_level']))
(root/'docs/sample-import-verification.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
