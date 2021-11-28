import { setupTestServer } from './testServer';

const globalSetup = async () => {
  await setupTestServer();
};

export default globalSetup;
