const { spawn } = require('child_process');

export const setupTestServer = async () => {
    spawn('npm', [
        'run',
        'build:testdata'
    ]);
};

export const teardownTestServer = async () => {
};
