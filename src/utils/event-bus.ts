import mitt from 'mitt';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Events = {
  clickTopic: Event;
};

export const emitter = mitt<Events>();
