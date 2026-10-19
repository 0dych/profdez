"""Integration checks against a disposable local copy, never production."""
import argparse
import copy
import http.cookiejar
import json
from pathlib import Path
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--url', required=True)
parser.add_argument('--root', type=Path, required=True)
args = parser.parse_args()
if not args.url.startswith('http://127.0.0.1:') or not args.root.name.startswith('nemyo-admin-test-'):
    raise SystemExit('Use only a disposable nemyo-admin-test-* copy on localhost.')
cookies = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))

def request(path, payload=None, body=None, headers=None):
    hdr = dict(headers or {})
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        hdr['Content-Type'] = 'application/json'
    req = urllib.request.Request(args.url + path, data=body, headers=hdr)
    try:
        with client.open(req) as response:
            return response.status, response.read(), response.headers
    except urllib.error.HTTPError as error:
        return error.code, error.read(), error.headers

def expect(path, status, payload=None, **kwargs):
    code, body, headers = request(path, payload, **kwargs)
    assert code == status, (path, status, code, body[:200])
    return json.loads(body) if body else None

expect('/admin/api/orders.php', 401)
expect('/admin/api/save.php', 401, {})
expect('/admin/api/upload.php', 401, body=b'')
expect('/admin/api/auth.php', 401, {'pin':'000000'})
assert expect('/admin/api/auth.php', 200, {'pin':'916284'})['success']
expect('/admin/api/save.php', 403, {}, headers={'Origin':'https://untrusted.invalid'})
data = json.loads((args.root/'data/content.json').read_text(encoding='utf-8'))
assert expect('/admin/api/save.php', 200, data)['success']
invalid = copy.deepcopy(data)
invalid['services'][1]['id'] = invalid['services'][0]['id']
expect('/admin/api/save.php', 422, invalid)
invalid = copy.deepcopy(data)
invalid['services'][0]['detail'] = {'texts':[], 'images':[], 'gallery':[{'src':'javascript:alert(1)', 'alt':''}]}
expect('/admin/api/save.php', 422, invalid)
media = copy.deepcopy(data)
media['certificates'] = {'title':'Test documents','description':'Test description','items':[{'src':'sert1.jpg','alt':'Test certificate','title':'Test title','label':'Test standard','specialty':'Test specialty','issuer':'Test issuer','reference':'Test reference'}]}
media['homeCases'] = {'tag':'Test','title':'Test cases','subtitle':'Test subtitle','items':[{'template':0,'name':'Test case','location':'Test city','tag':'Test category','kpis':['Test KPI'],'taskLabel':'Task','task':'Test task','resultLabel':'Result','result':'Test result'}]}
media['homeSlides'] = [{'src':'img/works/work-fogger.jpg','alt':'Test photo','tag':'Test','caption':'Test caption'}]
media['products'][0]['photos'] = [{'src':'img/products/bait-station.jpg','alt':'Test product'}]
assert expect('/admin/api/save.php', 200, media)['success']
assert json.loads((args.root/'data/content.json').read_text(encoding='utf-8'))['homeSlides'] == media['homeSlides']
invalid = copy.deepcopy(media)
invalid['certificates']['items'][0]['src'] = 'javascript:alert(1)'
expect('/admin/api/save.php', 422, invalid)
invalid = copy.deepcopy(media)
invalid['homeCases']['items'][0]['kpis'] = 'invalid'
expect('/admin/api/save.php', 422, invalid)
for key in ['homeSlides', 'productPhotos']:
    invalid = copy.deepcopy(media)
    photos = [{'src':'javascript:alert(1)','alt':''}]
    if key == 'homeSlides': invalid[key] = photos
    else: invalid['products'][0]['photos'] = photos
    expect('/admin/api/save.php', 422, invalid)
expect('/admin/api/save.php', 200, data)
order = expect('/admin/api/orders.php', 200, {'phone':'+380000000000','name':'Disposable API test','service':'Test'})
assert order['success'] and not order['telegramSent']
orders = expect('/admin/api/orders.php', 200)
order_id = orders[0]['id']
expect('/admin/api/orders.php', 200, {'action':'update_status','id':order_id,'status':'done'})
assert expect('/admin/api/orders.php', 200)[0]['status'] == 'done'
expect('/admin/api/orders.php', 422, {'action':'update_status','id':order_id,'status':'invalid'})
expect('/admin/api/orders.php', 200, {'action':'delete','id':order_id})

def upload(content, filename, mime):
    boundary = 'NemyoAuditBoundary'
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
            + content + f'\r\n--{boundary}--\r\n'.encode())
    return request('/admin/api/upload.php', body=body, headers={'Content-Type':f'multipart/form-data; boundary={boundary}'})

code, body, _ = upload((args.root/'logo.png').read_bytes(), 'logo.png', 'image/png')
assert code == 200, body
image_path = json.loads(body)['path']
assert (args.root/image_path).is_file()
code, body, _ = upload(b'<?php echo "test"; ?>', 'fake.png', 'image/png')
assert code == 422, body
expect('/admin/api/telegram.php', 422, {'token':'123456:'+'A'*30,'chatId':'bad'})
assert expect('/admin/api/telegram.php', 200, {'token':'123456:'+'A'*30,'chatId':'-1001234567890'})['success']
state = expect('/admin/api/telegram.php', 200)
assert state['configured'] and 'token' not in state
expect('/admin/api/auth.php', 200, {'action':'change_pin','newPin':'926384'})
expect('/admin/api/auth.php', 200, {'action':'logout'})
expect('/admin/api/orders.php', 401)
expect('/admin/api/auth.php', 401, {'pin':'916284'})
expect('/admin/api/auth.php', 200, {'pin':'926384'})
expect('/admin/api/auth.php', 200, {'action':'change_pin','newPin':'916284'})
expect('/admin/api/auth.php', 200, {'action':'logout'})
# No Telegram messages were sent: config was added after the order test.
(args.root/'admin/private/telegram-config.php').unlink()
print('PASS: authentication, server save, validation, orders, photo upload, Telegram config and PIN rotation; disposable copy only.')
