import {assert} from 'chai';
import { getXrayTraces, parseXrayTrace, FunctionToActionsMap, getFunctionActionMapFromXray, 
    ResourceActionMap, createIAMPolicyDoc } from '../lib/xray-trace-fetcher';

// tslint:disable:max-line-length
// tslint:disable-next-line:no-var-requires
const TRACE1 = require('../../src/test/trace1.json'); 

describe('xray fetch tests', function() {

  this.timeout(60000);

  it('getXrayTraces should fetch 6 traces', async function() {
    const traces = await getXrayTraces({
      startTime: new Date(1515240998000),
      timeRangeMinutes: 300,
    });
    assert.isArray(traces);
    assert.equal(traces!.length, 6);
  });

  it('getXrayTraces large fetch test', async function() {
    const traces = await getXrayTraces({
      startTime: new Date(1515314999000),
      timeRangeMinutes: 300,
    });
    assert.isArray(traces);
    assert.isNotEmpty(traces);    
    console.log('getXrayTraces returned [%s] traces', traces!.length);
    assert.isAtLeast(traces!.length, 35);
  });

  it('getFunctionActionMapFromXray returns functions', async function() {
    const map = await getFunctionActionMapFromXray({
      startTime: new Date(1515314999000),
      timeRangeMinutes: 300,
    });
    assert.equal(map.size, 2);    
    for (const actionMap of map.values()) {
      for (const key of actionMap.keys()) {
        assert.isFalse(key.includes("undefined")); //make sure no undefined in arns
      }
    }
    console.log('getFunctionActionMapFromXray results: ', map);
  });

  it('parseXrayTrace should parse xray trace', function() {
    const map: FunctionToActionsMap = new Map();    
    const res = parseXrayTrace(TRACE1, map);
    assert.equal(res.size, 1);
    console.log("trace parse result: ", res);
  });

  it('createIAMPolicyDoc creates proper policy action', function() {
    const map: ResourceActionMap = new Map();
    map.set("arn:aws:s3:::test-bucket/*", new Set(['PutObjectTagging', 'GetObject', 'DeleteObject', 'PutObject']));
    map.set("arn:aws:s3:::test-again/*", new Set(['PutObjectTagging', 'GetObject', 'DeleteObject', 'PutObject']));
    map.set("arn:aws:dynamodb:us-east-1:*:table/test-it", new Set(['DeleteItem', 'PutItem', 'Scan', 'GetItem']));
    const doc = createIAMPolicyDoc(map, "arn:aws:lambda:us-east-1:11223344:function:test");
    assert.isNotEmpty(doc.Statement);
    assert.equal(doc.Statement!.length, 2);
    assert.isNotEmpty(doc.Statement![0].Action);
    assert.isTrue(doc.Statement![0].Action!.indexOf('s3:PutObjectTagging') >= 0);
    assert.isTrue(doc.Statement![0].Resource!.length === 2 || doc.Statement![1].Resource!.length === 2);
    console.log('createIAMPolicyDoc:\n%s', JSON.stringify(doc, undefined, 2));
  });

});