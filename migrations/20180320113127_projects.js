
exports.up = function(knex, Promise) {
  return knex.schema.table('projects', table => {
    table.bool('is_public').notNullable().defaultTo(false)
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('projects', table => {
    table.dropColumn('is_public');    
  });
};
