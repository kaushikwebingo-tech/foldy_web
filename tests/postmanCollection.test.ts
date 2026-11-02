import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildCollection } from '../src/lib/postmanCore.ts';

Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null }, configurable: true });
const collection = (endpoints: any[]) => buildCollection({ key: 'test', name: 'Test', endpoints });

test('public, app, admin and restricted session credentials remain separate', () => {
    const data = collection([
        { name: 'Login', method: 'POST', path: 'api/v1/auth/login' },
        { name: 'Admin', method: 'GET', path: 'api/admin/v1/users' },
        { name: 'Signup', method: 'POST', path: 'api/v1/signup/complete' },
        { name: 'Restore', method: 'POST', path: 'api/v1/auth/account/restore' },
        { name: 'First password', method: 'POST', path: 'api/v1/auth/password/first-set' },
        { name: 'Profile', method: 'GET', path: 'api/v1/user/profile' },
    ]);
    const auth = data.item.map((item: any) => item.request.auth);
    assert.deepEqual(auth.map((a: any) => a.type), ['noauth', 'bearer', 'noauth', 'bearer', 'bearer', 'bearer']);
    assert.equal(auth[1].bearer[0].value, '{{adminToken}}');
    assert.equal(auth[3].bearer[0].value, '{{restoreToken}}');
    assert.equal(auth[4].bearer[0].value, '{{setPasswordToken}}');
    assert.equal(auth[5].bearer[0].value, '{{token}}');
});

test('path parameters always have usable Postman variable bindings', () => {
    const data = collection([{ name: 'Detail', method: 'GET', path: 'api/v1/team/staff/:personId' }]);
    assert.deepEqual(data.item[0].request.url.variable, [{ key: 'personId', value: '{{personId}}', description: '' }]);
});

test('disabled optional queries stay out of raw URL and custom security headers survive', () => {
    const data = collection([{ name: 'Export', method: 'POST', path: 'api/v1/account/audit/export',
        headers: [{ key: 'X-Step-Up', value: '{{stepUpToken}}' }], body: {},
        query: [{ key: 'actor', value: '', disabled: true }, { key: 'area', value: 'a+b' }] }]);
    const request = data.item[0].request;
    assert.equal(request.url.raw, '{{baseUrl}}/api/v1/account/audit/export?area=a%2Bb');
    assert.equal(request.url.query[0].disabled, true);
    assert.ok(request.header.some((h: any) => h.key === 'X-Step-Up' && h.value === '{{stepUpToken}}'));
});

test('multipart files are selectable and do not force a broken JSON content type', () => {
    const request = collection([{ name: 'Upload', method: 'POST', path: 'api/v1/manual-uploads/upload',
        formdata: [{ key: 'file', type: 'file' }, { key: 'category', value: '{{categoryId}}' }] }]).item[0].request;
    assert.equal(request.body.mode, 'formdata');
    assert.deepEqual(request.body.formdata[0].src, []);
    assert.equal(request.header.some((h: any) => h.key === 'Content-Type'), false);
});

test('captures never overwrite saved values on a failed response', () => {
    const item = collection([{ name: 'Create', method: 'POST', path: 'api/v1/workspace',
        capture: { workspaceId: 'data.workspace.id' } }]).item[0];
    const script = item.event.find((e: any) => e.listen === 'test').script.exec.join('\n');
    const values: Record<string,string> = { workspaceId: 'before' };
    const context = (code: number, payload: any) => ({ pm: {
        response: { code, json: () => payload }, test: (_name: string, fn: () => void) => fn(),
        expect: (v: any) => ({ to: { be: { true: v === true, within: (lo: number, hi: number) => assert.ok(v >= lo && v <= hi), oneOf: (allowed: number[]) => assert.ok(allowed.includes(v)) } } }),
        collectionVariables: { set: (k: string, v: string) => { values[k] = v; } },
    } });
    vm.runInNewContext(script, context(200, { data: { workspace: { id: 'new' } } }));
    assert.equal(values.workspaceId, 'new');
    // The expected-status assertion may fail, but failed data is never captured.
    const failed = context(409, { data: { workspace: { id: 'wrong' } } });
    failed.pm.test = () => undefined;
    vm.runInNewContext(script, failed);
    assert.equal(values.workspaceId, 'new');
});
