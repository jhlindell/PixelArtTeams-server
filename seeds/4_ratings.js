
exports.seed = function(knex, Promise) {
  let data = [
    {
      user_id: 1,
      project_id: 2,
      rating: 3
    },
    {
      user_id: 2,
      project_id: 2,
      rating: 1
    }
  ];

  return knex('ratings').del()
    .then(() => {
      return knex('ratings').insert(data);})
    .then(() => {
      return knex.raw("SELECT setval('ratings_rating_id_seq', (SELECT MAX(rating_id) FROM ratings))");
    });
};
