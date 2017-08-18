exports.seed = function(knex, Promise) {
  let data = [
    {
      user_id: 1,
      username: 'jhl',
      hashed_password: '$2a$04$cCQ/G69RvaOjTpTO66vGoe9AjJB6Gk3qIdTbU0RwAp3CkeqgqY6iW',
      email: 'jon@lindell.com',
      isMod: true
    }
  ]

  return knex('users').del()
    .then(() => {
      return knex('users').insert(data);})
    .then(() => {
      return knex.raw("SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users))");
    });
};
