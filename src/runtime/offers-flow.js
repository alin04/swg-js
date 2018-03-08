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


import {ActivityIframeView} from '../ui/activity-iframe-view';
import {PayStartFlow} from './pay-flow';

const OFFERS_URL =
    '$frontend$/swglib/offersiframe$frontendDebug$';

const OPTION_URL =
    '$frontend$/swglib/optionsiframe$frontendDebug$';


/**
 * The class for Offers flow.
 */
export class OffersFlow {

  /**
   * @param {!./deps.DepsDef} deps
   */
  constructor(deps) {

    /** @private @const {!./deps.DepsDef} */
    this.deps_ = deps;

    /** @private @const {!Window} */
    this.win_ = deps.win();

    /** @private @const {!web-activities/activity-ports.ActivityPorts} */
    this.activityPorts_ = deps.activities();

    /** @private @const {!../components/dialog-manager.DialogManager} */
    this.dialogManager_ = deps.dialogManager();

    /** @private @const {!ActivityIframeView} */
    this.activityIframeView_ = new ActivityIframeView(
        this.win_,
        this.activityPorts_,
        OFFERS_URL,
        {
          'productId': deps.pageConfig().getProductId(),
          'publicationId': deps.pageConfig().getPublicationId(),
          'showNative': deps.callbacks().hasSubscribeRequestCallback(),
        },
        /* shouldFadeBody */ true);
  }

  /**
   * Starts the offers flow or alreadySubscribed flow.
   * @return {!Promise}
   */
  start() {
    // If result is due to OfferSelection, redirect to payments.
    this.activityIframeView_.onMessage(result => {
      if (result['alreadySubscribed']) {
        this.deps_.callbacks().triggerLoginRequest({
          linkRequested: !!result['linkRequested'],
        });
        return;
      }
      if (result['sku']) {
        new PayStartFlow(
            this.deps_,
            /** @type {string} */ (result['sku']))
            .start();
        return;
      }
      if (result['native']) {
        this.deps_.callbacks().triggerSubscribeRequest();
        return;
      }
    });

    return this.dialogManager_.openView(this.activityIframeView_);
  }
}


/**
 * The class for subscribe option flow.
 */
export class SubscribeOptionFlow {

  /**
   * @param {!./deps.DepsDef} deps
   */
  constructor(deps) {

    /** @private @const {!./deps.DepsDef} */
    this.deps_ = deps;

    /** @private @const {!web-activities/activity-ports.ActivityPorts} */
    this.activityPorts_ = deps.activities();

    /** @private @const {!../components/dialog-manager.DialogManager} */
    this.dialogManager_ = deps.dialogManager();

    /** @private @const {!ActivityIframeView} */
    this.activityIframeView_ = new ActivityIframeView(
        deps.win(),
        this.activityPorts_,
        OPTION_URL,
        {
          'publicationId': deps.pageConfig().getPublicationId(),
        },
        /* shouldFadeBody */ false);
  }

  /**
   * Starts the offers flow or alreadySubscribed flow.
   * @return {!Promise}
   */
  start() {
    this.activityIframeView_.onMessage(data => {
      this.maybeOpenOffersFlow_(data);
    });
    this.activityIframeView_.acceptResult().then(result => {
      this.maybeOpenOffersFlow_(result.data);
    });
    return this.dialogManager_.openView(this.activityIframeView_);
  }

  /**
   * @param {*} data
   * @private
   */
  maybeOpenOffersFlow_(data) {
    if (data && data['subscribe']) {
      new OffersFlow(this.deps_).start();
    }
  }
}
