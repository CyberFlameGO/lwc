import { LightningElement } from 'lwc';
import { contextualizerA } from '../../../wire-adapter';

export default class ProviderComponent extends LightningElement {
    connectedCallback() {
        contextualizerA(this, {
            consumerConnectedCallback(consumer) {
                consumer.provide({
                    value: 'top-level'
                });
            }
        });
    }
}
