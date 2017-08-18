exports.seed = function(knex, Promise) {
  let data = [
    {
      user_id: 1,
      username: 'jhl',
      hashed_password: '$2a$04$2okk.gGRneFIZIUKXKgoQ.CMyHXgMSsMg5Gmjh9Nbzo99S8UOIfgO',
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
