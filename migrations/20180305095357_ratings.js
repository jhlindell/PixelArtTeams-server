
exports.up = function(knex, Promise) {
  return knex.schema.createTable('ratings', table => {
    table.increments('rating_id');
    table.integer('user_id').references('user_id').inTable('users').onDelete('cascade');
    table.integer('project_id').references('project_id').inTable('projects').onDelete('cascade');
    table.integer('rating').defaultTo(null);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('ratings');
};
