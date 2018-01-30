
exports.up = function(knex, Promise) {
  return knex.schema.createTable('users_projects', (table) => {
    table.increments('user_project_id');
    table.integer('user_id').references('user_id').inTable('users').onDelete('cascade');
    table.integer('project_id').references('project_id').inTable('projects').onDelete('CASCADE');
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users_projects');
};
