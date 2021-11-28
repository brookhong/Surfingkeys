import { teardownTestServer } from './testServer';

const globalTeardown = async () => {
  await teardownTestServer();
};

export default globalTeardown;
