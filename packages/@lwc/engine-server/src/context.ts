import {
    createContextProviderWithRegister,
    WireAdapterConstructor,
    WireContextSubscriptionPayload,
    WireContextSubscriptionCallback,
} from '@lwc/engine-core';
import { isUndefined } from '@lwc/shared';
import {
    HostElement,
    HostNodeType,
    HostTypeKey,
    HostParentKey,
    HostParentNode,
    HostHostKey,
    HostContextProvidersKey,
} from './types';

export function createContextProvider(adapter: WireAdapterConstructor) {
    return createContextProviderWithRegister(adapter, registerContextProvider);
}

function registerContextProvider(
    elm: HostElement,
    adapterContextToken: string,
    onContextSubscription: WireContextSubscriptionCallback
) {
    elm[HostContextProvidersKey].set(adapterContextToken, onContextSubscription);
}

export function registerContextConsumer(
    elm: HostElement,
    adapterContextToken: string,
    subscriptionPayload: WireContextSubscriptionPayload
) {
    // Traverse element ancestors, looking for an element that can provide context
    // for the adapter identified by `adapterContextToken`. If found, register
    // to receive context updates from that provider.
    let currentNode: HostParentNode | null = elm;
    do {
        if (currentNode[HostTypeKey] === HostNodeType.Element) {
            const subscribeToProvider =
                currentNode[HostContextProvidersKey].get(adapterContextToken);
            if (!isUndefined(subscribeToProvider)) {
                subscribeToProvider(subscriptionPayload);
                // If we find a provider, we shouldn't continue traversing
                // looking for another provider.
                break;
            }
        }

        currentNode =
            currentNode[HostTypeKey] === HostNodeType.Element
                ? currentNode[HostParentKey]
                : currentNode[HostHostKey];
    } while (currentNode);
}
