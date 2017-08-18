'use strict';

module.exports = {
  development: {
    client : 'pg',
    connection : 'postgres://localhost/drinking_buddies'
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL
  }
};
