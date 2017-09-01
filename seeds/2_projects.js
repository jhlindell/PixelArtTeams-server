
exports.seed = function(knex, Promise) {

  let data = [{
    id:1,
    project_name: "Project 1",
    grid:'[["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#000","#FFF","#FFF","#FFF","#FFF","#000","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#000","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#000","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#000","#FFF","#FFF","#FFF","#FFF","#000","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#000","#000","#000","#000","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"],["#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF","#FFF"]]'
  }];

  return knex('projects').del()
    .then(() => {
      return knex('projects').insert(data);})
    .then(() => {
      return knex.raw("SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects))");
    });
};
