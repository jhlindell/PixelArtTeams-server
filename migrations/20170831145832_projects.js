
exports.up = function(knex, Promise) {
  return knex.schema.createTable('projects', table => {
    table.increments('id');
    table.string('project_name').defaultTo('');
    table.text('grid').defaultTo('');
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('projects');
};
