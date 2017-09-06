
exports.up = function(knex, Promise) {
  return knex.schema.createTable('projects', table => {
    table.increments('id');
    table.string('project_name').defaultTo('');
    table.text('grid').defaultTo('');
    table.integer('xsize').defaultTo(20);
    table.integer('ysize').defaultTo(20);
    table.boolean('is_finished').defaultTo(false);
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('projects');
};
