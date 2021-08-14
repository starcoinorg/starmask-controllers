import type { Draft, Patch } from 'immer';
import sinon from 'sinon';

import { BaseController, getAnonymizedState, getPersistentState } from './BaseControllerV2';
import { ControllerMessenger } from './ControllerMessenger';

type CountControllerState = {
  count: number;
};

type CountControllerEvent = {
  type: `CountController:stateChange`;
  payload: [CountControllerState, Patch[]];
};

const CountControllerStateMetadata = {
  count: {
    persist: true,
    anonymous: true,
  },
};

class MockController extends BaseController<'CountController', CountControllerState> {
  update(callback: (state: Draft<CountControllerState>) => void | CountControllerState) {
    super.update(callback);
  }

  destroy() {
    super.destroy();
  }
}

describe('BaseController', () => {
  it('should set initial state', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });

    expect(controller.state).toEqual({ count: 0 });
  });

  it('should set initial schema', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });

    expect(controller.metadata).toEqual(CountControllerStateMetadata);
  });

  it('should not allow mutating state directly', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });

    expect(() => {
      controller.state = { count: 1 };
    }).toThrow("Controller state cannot be directly mutated; use 'update' method instead.");
  });

  it('should allow updating state by modifying draft', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });

    controller.update((draft) => {
      draft.count += 1;
    });

    expect(controller.state).toEqual({ count: 1 });
  });

  it('should allow updating state by return a value', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });

    controller.update(() => {
      return { count: 1 };
    });

    expect(controller.state).toEqual({ count: 1 });
  });

  it('should throw an error if update callback modifies draft and returns value', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });

    expect(() => {
      controller.update((draft) => {
        draft.count += 1;
        return { count: 10 };
      });
    }).toThrow(
      '[Immer] An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.',
    );
  });

  it('should inform subscribers of state changes', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });
    const listener1 = sinon.stub();
    const listener2 = sinon.stub();

    controllerMessenger.subscribe('CountController:stateChange', listener1);
    controllerMessenger.subscribe('CountController:stateChange', listener2);
    controller.update(() => {
      return { count: 1 };
    });

    expect(listener1.callCount).toEqual(1);
    expect(listener1.firstCall.args).toEqual([{ count: 1 }, [{ op: 'replace', path: [], value: { count: 1 } }]]);
    expect(listener2.callCount).toEqual(1);
    expect(listener2.firstCall.args).toEqual([{ count: 1 }, [{ op: 'replace', path: [], value: { count: 1 } }]]);
  });

  it('should inform a subscriber of each state change once even after multiple subscriptions', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });
    const listener1 = sinon.stub();

    controllerMessenger.subscribe('CountController:stateChange', listener1);
    controllerMessenger.subscribe('CountController:stateChange', listener1);

    controller.update(() => {
      return { count: 1 };
    });

    expect(listener1.callCount).toEqual(1);
    expect(listener1.firstCall.args).toEqual([{ count: 1 }, [{ op: 'replace', path: [], value: { count: 1 } }]]);
  });

  it('should no longer inform a subscriber about state changes after unsubscribing', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });
    const listener1 = sinon.stub();

    controllerMessenger.subscribe('CountController:stateChange', listener1);
    controllerMessenger.unsubscribe('CountController:stateChange', listener1);
    controller.update(() => {
      return { count: 1 };
    });

    expect(listener1.callCount).toEqual(0);
  });

  it('should no longer inform a subscriber about state changes after unsubscribing once, even if they subscribed many times', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });
    const listener1 = sinon.stub();

    controllerMessenger.subscribe('CountController:stateChange', listener1);
    controllerMessenger.subscribe('CountController:stateChange', listener1);
    controllerMessenger.unsubscribe('CountController:stateChange', listener1);
    controller.update(() => {
      return { count: 1 };
    });

    expect(listener1.callCount).toEqual(0);
  });

  it('should throw when unsubscribing listener who was never subscribed', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });
    const listener1 = sinon.stub();

    expect(() => {
      controllerMessenger.unsubscribe('CountController:stateChange', listener1);
    }).toThrow("Subscription not found for event: 'CountController:stateChange'");
  });

  it('should no longer update subscribers after being destroyed', () => {
    const controllerMessenger = new ControllerMessenger<never, CountControllerEvent>();
    const controller = new MockController({
      messenger: controllerMessenger,
      name: 'CountController',
      state: { count: 0 },
      metadata: CountControllerStateMetadata,
    });
    const listener1 = sinon.stub();
    const listener2 = sinon.stub();

    controllerMessenger.subscribe('CountController:stateChange', listener1);
    controllerMessenger.subscribe('CountController:stateChange', listener2);
    controller.destroy();
    controller.update(() => {
      return { count: 1 };
    });

    expect(listener1.callCount).toEqual(0);
    expect(listener2.callCount).toEqual(0);
  });
});

describe('getAnonymizedState', () => {
  it('should return empty state', () => {
    expect(getAnonymizedState({}, {})).toEqual({});
  });

  it('should return empty state when no properties are anonymized', () => {
    const anonymizedState = getAnonymizedState({ count: 1 }, { count: { anonymous: false, persist: false } });
    expect(anonymizedState).toEqual({});
  });

  it('should return state that is already anonymized', () => {
    const anonymizedState = getAnonymizedState(
      {
        password: 'secret password',
        privateKey: '123',
        network: 'mainnet',
        tokens: ['DAI', 'USDC'],
      },
      {
        password: {
          anonymous: false,
          persist: false,
        },
        privateKey: {
          anonymous: false,
          persist: false,
        },
        network: {
          anonymous: true,
          persist: false,
        },
        tokens: {
          anonymous: true,
          persist: false,
        },
      },
    );
    expect(anonymizedState).toEqual({ network: 'mainnet', tokens: ['DAI', 'USDC'] });
  });

  it('should use anonymizing function to anonymize state', () => {
    const anonymizeTransactionHash = (hash: string) => {
      return hash.split('').reverse().join('');
    };

    const anonymizedState = getAnonymizedState(
      {
        transactionHash: '0x1234',
      },
      {
        transactionHash: {
          anonymous: anonymizeTransactionHash,
          persist: false,
        },
      },
    );

    expect(anonymizedState).toEqual({ transactionHash: '4321x0' });
  });

  it('should allow returning a partial object from an anonymizing function', () => {
    const anonymizeTxMeta = (txMeta: { hash: string; value: number }) => {
      return { value: txMeta.value };
    };

    const anonymizedState = getAnonymizedState(
      {
        txMeta: {
          hash: '0x123',
          value: 10,
        },
      },
      {
        txMeta: {
          anonymous: anonymizeTxMeta,
          persist: false,
        },
      },
    );

    expect(anonymizedState).toEqual({ txMeta: { value: 10 } });
  });

  it('should allow returning a nested partial object from an anonymizing function', () => {
    const anonymizeTxMeta = (txMeta: { hash: string; value: number; history: { hash: string; value: number }[] }) => {
      return {
        history: txMeta.history.map((entry) => {
          return { value: entry.value };
        }),
        value: txMeta.value,
      };
    };

    const anonymizedState = getAnonymizedState(
      {
        txMeta: {
          hash: '0x123',
          history: [
            {
              hash: '0x123',
              value: 9,
            },
          ],
          value: 10,
        },
      },
      {
        txMeta: {
          anonymous: anonymizeTxMeta,
          persist: false,
        },
      },
    );

    expect(anonymizedState).toEqual({ txMeta: { history: [{ value: 9 }], value: 10 } });
  });

  it('should allow transforming types in an anonymizing function', () => {
    const anonymizedState = getAnonymizedState(
      {
        count: '1',
      },
      {
        count: {
          anonymous: (count) => Number(count),
          persist: false,
        },
      },
    );

    expect(anonymizedState).toEqual({ count: 1 });
  });
});

describe('getPersistentState', () => {
  it('should return empty state', () => {
    expect(getPersistentState({}, {})).toEqual({});
  });

  it('should return empty state when no properties are persistent', () => {
    const persistentState = getPersistentState({ count: 1 }, { count: { anonymous: false, persist: false } });
    expect(persistentState).toEqual({});
  });

  it('should return persistent state', () => {
    const persistentState = getPersistentState(
      {
        password: 'secret password',
        privateKey: '123',
        network: 'mainnet',
        tokens: ['DAI', 'USDC'],
      },
      {
        password: {
          anonymous: false,
          persist: true,
        },
        privateKey: {
          anonymous: false,
          persist: true,
        },
        network: {
          anonymous: false,
          persist: false,
        },
        tokens: {
          anonymous: false,
          persist: false,
        },
      },
    );
    expect(persistentState).toEqual({ password: 'secret password', privateKey: '123' });
  });

  it('should use function to derive persistent state', () => {
    const normalizeTransacitonHash = (hash: string) => {
      return hash.toLowerCase();
    };

    const persistentState = getPersistentState(
      {
        transactionHash: '0X1234',
      },
      {
        transactionHash: {
          anonymous: false,
          persist: normalizeTransacitonHash,
        },
      },
    );

    expect(persistentState).toEqual({ transactionHash: '0x1234' });
  });

  it('should allow returning a partial object from a persist function', () => {
    const getPersistentTxMeta = (txMeta: { hash: string; value: number }) => {
      return { value: txMeta.value };
    };

    const persistentState = getPersistentState(
      {
        txMeta: {
          hash: '0x123',
          value: 10,
        },
      },
      {
        txMeta: {
          anonymous: false,
          persist: getPersistentTxMeta,
        },
      },
    );

    expect(persistentState).toEqual({ txMeta: { value: 10 } });
  });

  it('should allow returning a nested partial object from a persist function', () => {
    const getPersistentTxMeta = (txMeta: {
      hash: string;
      value: number;
      history: { hash: string; value: number }[];
    }) => {
      return {
        history: txMeta.history.map((entry) => {
          return { value: entry.value };
        }),
        value: txMeta.value,
      };
    };

    const persistentState = getPersistentState(
      {
        txMeta: {
          hash: '0x123',
          history: [
            {
              hash: '0x123',
              value: 9,
            },
          ],
          value: 10,
        },
      },
      {
        txMeta: {
          anonymous: false,
          persist: getPersistentTxMeta,
        },
      },
    );

    expect(persistentState).toEqual({ txMeta: { history: [{ value: 9 }], value: 10 } });
  });

  it('should allow transforming types in a persist function', () => {
    const persistentState = getPersistentState(
      {
        count: '1',
      },
      {
        count: {
          anonymous: false,
          persist: (count) => Number(count),
        },
      },
    );

    expect(persistentState).toEqual({ count: 1 });
  });
});
