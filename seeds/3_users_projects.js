
exports.seed = function(knex, Promise) {
  let data = [
    {
      user_id: 1,
      project_id: 1
    },
    {
      user_id: 1,
      project_id: 2
    }
  ]

  return knex('users_projects').del()
    .then(() => {
      return knex('users_projects').insert(data);})
    .then(() => {
      return knex.raw("SELECT setval('users_projects_user_project_id_seq', (SELECT MAX(user_project_id) FROM users_projects))");
    });
};
