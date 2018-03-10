/**
 * Copyright 2018 The Subscribe with Google Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ActivityPort,
  ActivityResult,
  ActivityResultCode} from 'web-activities/activity-ports';
import {
  acceptPortResult,
} from './../utils/activity-utils';
import {ConfiguredRuntime} from './runtime';
import {
  OffersFlow,
  SubscribeOptionFlow,
  AbbrvOfferFlow,
} from './offers-flow';
import {PageConfig} from '../model/page-config';
import {PayStartFlow} from './pay-flow';
import * as sinon from 'sinon';


describes.realWin('OffersFlow', {}, env => {
  let win;
  let offersFlow;
  let runtime;
  let activitiesMock;
  let callbacksMock;
  let pageConfig;
  let port;

  beforeEach(() => {
    win = env.win;
    pageConfig = new PageConfig('pub1:label1');
    runtime = new ConfiguredRuntime(win, pageConfig);
    activitiesMock = sandbox.mock(runtime.activities());
    callbacksMock = sandbox.mock(runtime.callbacks());
    offersFlow = new OffersFlow(runtime);
    port = new ActivityPort();
    port.onResizeRequest = () => {};
    port.onMessage = () => {};
    port.whenReady = () => Promise.resolve();
  });

  afterEach(() => {
    activitiesMock.verify();
    callbacksMock.verify();
  });

  it('should have valid OffersFlow constructed', () => {
    activitiesMock.expects('openIframe').withExactArgs(
        sinon.match(arg => arg.tagName == 'IFRAME'),
        '$frontend$/swg/_/ui/v1/offersiframe?_=_',
        {
          _client: 'SwG $internalRuntimeVersion$',
          publicationId: 'pub1',
          productId: 'pub1:label1',
          showNative: false,
        })
        .returns(Promise.resolve(port));
    return offersFlow.start();
  });

  it('should request native offers', () => {
    runtime.callbacks().setOnSubscribeRequest(function() {});
    activitiesMock.expects('openIframe').withExactArgs(
        sinon.match(arg => arg.tagName == 'IFRAME'),
        '$frontend$/swg/_/ui/v1/offersiframe?_=_',
        {
          _client: 'SwG $internalRuntimeVersion$',
          publicationId: 'pub1',
          productId: 'pub1:label1',
          showNative: true,
        })
        .returns(Promise.resolve(port));
    offersFlow = new OffersFlow(runtime);
    return offersFlow.start();
  });

  it('should activate pay, login and native offers', () => {
    let messageCallback;
    sandbox.stub(port, 'onMessage', callback => {
      messageCallback = callback;
    });
    const payStub = sandbox.stub(PayStartFlow.prototype, 'start');
    const loginStub = sandbox.stub(runtime.callbacks(), 'triggerLoginRequest');
    const nativeStub = sandbox.stub(
        runtime.callbacks(), 'triggerSubscribeRequest');
    activitiesMock.expects('openIframe').returns(Promise.resolve(port));
    return offersFlow.start().then(() => {
      // Unrlated message.
      messageCallback({});
      expect(payStub).to.not.be.called;
      expect(loginStub).to.not.be.called;
      expect(nativeStub).to.not.be.called;
      // Pay message.
      messageCallback({'sku': 'sku1'});
      expect(payStub).to.be.calledOnce;
      expect(loginStub).to.not.be.called;
      expect(nativeStub).to.not.be.called;
      // Login message.
      messageCallback({'alreadySubscribed': true});
      expect(loginStub).to.be.calledOnce
          .calledWithExactly({linkRequested: false});
      expect(payStub).to.be.calledOnce;  // Dind't change.
      expect(nativeStub).to.not.be.called;
      // Native message.
      messageCallback({'native': true});
      expect(nativeStub).to.be.calledOnce.calledWithExactly();
      expect(loginStub).to.be.calledOnce;  // Dind't change.
      expect(payStub).to.be.calledOnce;  // Dind't change.
    });
  });

  it('should activate login with linking', () => {
    let messageCallback;
    sandbox.stub(port, 'onMessage', callback => {
      messageCallback = callback;
    });
    const loginStub = sandbox.stub(runtime.callbacks(), 'triggerLoginRequest');
    activitiesMock.expects('openIframe').returns(Promise.resolve(port));
    return offersFlow.start().then(() => {
      messageCallback({
        'alreadySubscribed': true,
        'linkRequested': true,
      });
      expect(loginStub).to.be.calledOnce
          .calledWithExactly({linkRequested: true});
    });
  });
});


describes.realWin('SubscribeOptionFlow', {}, env => {
  let win;
  let offersFlow;
  let runtime;
  let activitiesMock;
  let callbacksMock;
  let pageConfig;
  let port;

  beforeEach(() => {
    win = env.win;
    pageConfig = new PageConfig('pub1:label1');
    runtime = new ConfiguredRuntime(win, pageConfig);
    activitiesMock = sandbox.mock(runtime.activities());
    callbacksMock = sandbox.mock(runtime.callbacks());
    offersFlow = new SubscribeOptionFlow(runtime);
    port = new ActivityPort();
    port.onResizeRequest = () => {};
    port.onMessage = () => {};
    port.whenReady = () => Promise.resolve();
  });

  afterEach(() => {
    activitiesMock.verify();
    callbacksMock.verify();
  });

  it('should have valid SubscribeOptionFlow constructed', () => {
    activitiesMock.expects('openIframe').withExactArgs(
        sinon.match(arg => arg.tagName == 'IFRAME'),
        '$frontend$/swg/_/ui/v1/optionsiframe?_=_',
        {
          _client: 'SwG $internalRuntimeVersion$',
          publicationId: 'pub1',
        })
        .returns(Promise.resolve(port));
    return offersFlow.start();
  });

  it('should trigger offers flow when accepted', () => {
    let messageCallback;
    sandbox.stub(port, 'onMessage', callback => {
      messageCallback = callback;
    });
    const offersStartStub = sandbox.stub(OffersFlow.prototype, 'start');
    activitiesMock.expects('openIframe').returns(Promise.resolve(port));
    expect(offersStartStub).to.not.be.called;
    return offersFlow.start().then(() => {
      // Unrelated message.
      messageCallback({});
      expect(offersStartStub).to.not.be.called;
      // Subscribe message.
      messageCallback({'subscribe': true});
      expect(offersStartStub).to.be.calledOnce;
    });
  });
});

describes.realWin('Abbrv Offer flow', {}, env => {
  let win;
  let runtime;
  let activitiesMock;
  let callbacksMock;
  let pageConfig;
  let abbrvOfferFlow;
  let port;

  beforeEach(() => {
    win = env.win;
    pageConfig = new PageConfig('pub1:label1');
    runtime = new ConfiguredRuntime(win, pageConfig);
    activitiesMock = sandbox.mock(runtime.activities());
    callbacksMock = sandbox.mock(runtime.callbacks());
    abbrvOfferFlow = new AbbrvOfferFlow(runtime);
    port = new ActivityPort();
    port.onResizeRequest = () => {};
    port.onMessage = () => {};
    port.acceptResult = () => Promise.resolve();
    port.whenReady = () => Promise.resolve();

  });

  afterEach(() => {
    activitiesMock.verify();
    callbacksMock.verify();
  });

  it('should have valid AbbrvOfferFlow constructed', () => {
    activitiesMock.expects('openIframe').withExactArgs(
        sinon.match(arg => arg.tagName == 'IFRAME'),
        '$frontend$/swg/_/ui/v1/abbrvofferiframe?_=_',
        {
          _client: 'SwG $internalRuntimeVersion$',
          publicationId: 'pub1',
          productId: 'pub1:label1',
        })
        .returns(Promise.resolve(port));
    return abbrvOfferFlow.start();
  });

  it('should trigger login flow for a subscribed user', () => {
    let messageCallback;
    sandbox.stub(port, 'onMessage', callback => {
      messageCallback = callback;
    });
    const loginStub = sandbox.stub(runtime.callbacks(), 'triggerLoginRequest');
    activitiesMock.expects('openIframe').returns(Promise.resolve(port));
    return abbrvOfferFlow.start().then(() => {
      messageCallback({'alreadySubscribed': true, 'loggedIn': false});
      expect(loginStub).to.be.calledOnce;
    });
    loginStub.restore();
  });

  it('should not trigger login flow for subscibed logged in user', () => {
    let messageCallback;
    sandbox.stub(port, 'onMessage', callback => {
      messageCallback = callback;
    });
    const loginStub = sandbox.stub(runtime.callbacks(), 'triggerLoginRequest');
    activitiesMock.expects('openIframe').returns(Promise.resolve(port));
    return abbrvOfferFlow.start().then(() => {
      messageCallback({'alreadySubscribed': true, 'loggedIn': true});
      expect(loginStub).to.not.be.called;
    });
    loginStub.restore();
  });

  it('should trigger offers flow when requested', () => {
    const offersStartStub = sandbox.stub(OffersFlow.prototype, 'start');
    activitiesMock.expects('openIframe').returns(Promise.resolve(port));
    expect(offersStartStub).to.not.be.called;
    const result = new ActivityResult('OK', {'viewOffers': true},
        'MODE', 'https://example.com', true, true);
    result.data = {'viewOffers': true};
    const resultPromise = Promise.resolve(result);
    sandbox.stub(port, 'acceptResult', () => resultPromise);
    return abbrvOfferFlow.start().then(() => {
      return resultPromise.then(() => {
        expect(offersStartStub).to.be.calledOnce;
      });
    });
    offersStartStub.restore();
  });

  it('should not trigger offers flow when cancelled', () => {
    const offersStartStub = sandbox.stub(OffersFlow.prototype, 'start');
    activitiesMock.expects('openIframe').returns(Promise.resolve(port));
    expect(offersStartStub).to.not.be.called;
    const error = new Error();
    error.name = 'AbortError';
    sandbox.stub(port, 'acceptResult', () => {
      return Promise.reject(error);
    });
    return abbrvOfferFlow.start().then(() => {
      return acceptPortResult(port, 'https://example.com', true, true).then(() => {
        throw new Error('must have failed');
      }, reason => {
        expect(reason.name).to.equal('AbortError');
      });
      expect(offersStartStub).to.not.be.called;
    });
    offersStartStub.restore();
  });
});

