'use strict';

module.exports = {
  test: {
    client: 'pg',
    connection : 'postgres://localhost/pixelTest'
  },

  development: {
    client : 'pg',
    connection : 'postgres://localhost/teamPixels'
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL
  }
};
