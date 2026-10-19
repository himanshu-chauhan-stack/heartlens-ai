from pathlib import Path
from uuid import uuid4
import io,json,os,httpx,pdfplumber
root=Path.cwd()
inputs=json.loads((root/'apps/web/public/samples/manifest.json').read_text())[1]['inputs']
headers={}
base_url=os.environ.get('HEARTLENS_VERIFY_URL','http://127.0.0.1:3000')
with httpx.Client(base_url=base_url,timeout=60) as c:
    health=c.get('/api/health');assert health.status_code==200 and health.json()['model_loaded']
    prediction=c.post('/api/predict',json=inputs);assert prediction.status_code==200
    actual=prediction.json()
    assert actual['timestamp'].endswith('+00:00')
    email=f'heartlens-test-{uuid4().hex[:12]}@example.com'
    password=f'DemoOnly-{uuid4().hex}'
    registered=c.post('/api/auth/register',json={'email':email,'password':password});assert registered.status_code in (200,201),registered.text
    headers={'Authorization':'Bearer '+registered.json()['access_token']}
    assert c.get('/api/auth/me',headers=headers).status_code==200
    logged=c.post('/api/auth/login',json={'email':email,'password':password});assert logged.status_code==200
    save=c.post('/api/reports',headers=headers,json={'inputs':inputs,'note':'Synthetic educational integration test; not a real patient.','assumptions':['Input source: synthetic educational sample'],'displayed_model_version':actual['model_version']})
    assert save.status_code==201,save.text
    report=save.json();report_id=report['id']
    assert report['probability']==actual['probability']
    assert report['provenance']['model_version']==actual['model_version']
    assert report['assumptions']==['Input source: synthetic educational sample']
    assert report['created_at'].endswith('Z') or report['created_at'].endswith('+00:00')
    assert c.get('/api/reports',headers=headers).status_code==200
    assert c.get('/api/reports/'+report_id,headers=headers).status_code==200
    pdf=c.get('/api/reports/'+report_id+'/pdf',headers=headers);assert pdf.status_code==200 and pdf.content.startswith(b'%PDF')
    path=root/'work/saved-synthetic-report.pdf';path.write_bytes(pdf.content)
    with pdfplumber.open(io.BytesIO(pdf.content)) as doc:
        text='\n'.join(page.extract_text() or '' for page in doc.pages)
        assert 'HeartLens AI' in text and 'Himanshu Chauhan' in text
        assert actual['model_version'] in text and 'synthetic educational sample' in text
    other=c.post('/api/auth/register',json={'email':f'heartlens-other-{uuid4().hex[:12]}@example.com','password':f'DemoOnly-{uuid4().hex}'})
    assert other.status_code in (200,201)
    other_headers={'Authorization':'Bearer '+other.json()['access_token']}
    assert c.get('/api/reports/'+report_id,headers=other_headers).status_code==404
    assert c.get('/api/reports/'+report_id+'/pdf',headers=other_headers).status_code==404
    assert c.post('/api/model/reload').status_code==403
    assert c.get('/api/metrics').status_code==403
    assert c.post('/api/predict',json={**inputs,'ap_hi':80,'ap_lo':90}).status_code==422
    result={'health_model_loaded':True,'prediction_status':200,'artifact_version':actual['model_version'],'register_login_me':True,'save_list_detail':True,'recomputed_probability_matches':True,'assumptions_preserved':True,'utc_timestamps':True,'pdf_valid_text_and_provenance':True,'ownership_detail_pdf_404':True,'public_reload_and_metrics_403':True,'invalid_bp_422':True}
result['base_url']=base_url
(root/('docs/live-integration-evidence.json' if base_url.startswith('https://') else 'docs/local-integration-evidence.json')).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
