/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { isUndefined, ArrayPush } from '@lwc/shared';
import { guid } from './utils';
import { VM, getAssociatedVMIfPresent } from './vm';
import { WireAdapterConstructor, ContextValue, WireDef } from './wiring';

export type WireContextSubscriptionCallback = (
    subscriptionPayload: WireContextSubscriptionPayload
) => void;

export interface WireContextSubscriptionPayload {
    setNewContext(newContext: ContextValue): void;
    setDisconnectedCallback(disconnectCallback: () => void): void;
}

export interface ContextConsumer {
    provide(newContext: ContextValue): void;
}

export interface ContextProviderOptions {
    consumerConnectedCallback: (consumer: ContextConsumer) => void;
    consumerDisconnectedCallback?: (consumer: ContextConsumer) => void;
}

export type ContextProvider = (
    elmOrComponent: EventTarget,
    options: ContextProviderOptions
) => void;

const AdapterToTokenMap: Map<WireAdapterConstructor, string> = new Map();

export function createContextProvider(adapter: WireAdapterConstructor): ContextProvider {
    let adapterContextToken = AdapterToTokenMap.get(adapter);
    if (!isUndefined(adapterContextToken)) {
        throw new Error(`Adapter already has a context provider.`);
    }
    adapterContextToken = guid();
    AdapterToTokenMap.set(adapter, adapterContextToken);
    const providers = new WeakSet<EventTarget>();

    return (elmOrComponent: EventTarget, options: ContextProviderOptions) => {
        if (providers.has(elmOrComponent)) {
            throw new Error(`Adapter was already installed on ${elmOrComponent}.`);
        }

        const vm = getAssociatedVMIfPresent(elmOrComponent);
        if (isUndefined(vm)) {
            throw new Error(`Unable to find associated VM for ${elmOrComponent}.`);
        }
        providers.add(elmOrComponent);

        const {
            elm,
            renderer: { registerContextProvider },
        } = vm;

        const { consumerConnectedCallback, consumerDisconnectedCallback } = options;

        registerContextProvider(
            elm,
            adapterContextToken!,
            (subscriptionPayload: WireContextSubscriptionPayload) => {
                const { setNewContext, setDisconnectedCallback } = subscriptionPayload;
                const consumer: ContextConsumer = {
                    provide(newContext) {
                        setNewContext(newContext);
                    },
                };
                const disconnectCallback = () => {
                    if (!isUndefined(consumerDisconnectedCallback)) {
                        consumerDisconnectedCallback(consumer);
                    }
                };
                setDisconnectedCallback(disconnectCallback);

                consumerConnectedCallback(consumer);
            }
        );
    };
}

export function createContextWatcher(
    vm: VM,
    wireDef: WireDef,
    callbackWhenContextIsReady: (newContext: ContextValue) => void
) {
    const { adapter } = wireDef;
    const adapterContextToken = AdapterToTokenMap.get(adapter);
    if (isUndefined(adapterContextToken)) {
        return; // no provider found, nothing to be done
    }
    const {
        elm,
        context: { wiredConnecting, wiredDisconnecting },
        renderer: { registerContextConsumer },
    } = vm;
    // waiting for the component to be connected to formally request the context via the token
    ArrayPush.call(wiredConnecting, () => {
        // This will attempt to connect the current element with one of its anscestors
        // that can provide context for the given wire adapter. This relationship is
        // keyed on the secret & internal value of `adapterContextToken`, which is unique
        // to a given wire adapter.
        //
        // Depending on the runtime environment, this connection is made using either DOM
        // events (in the browser) or a custom traversal (on the server).
        registerContextConsumer(elm, adapterContextToken, {
            setNewContext(newContext: ContextValue) {
                // eslint-disable-next-line @lwc/lwc-internal/no-invalid-todo
                // TODO: dev-mode validation of config based on the adapter.contextSchema
                callbackWhenContextIsReady(newContext);
            },
            setDisconnectedCallback(disconnectCallback: () => void) {
                // adds this callback into the disconnect bucket so it gets disconnected from parent
                // the the element hosting the wire is disconnected
                ArrayPush.call(wiredDisconnecting, disconnectCallback);
            },
        });
    });
}
