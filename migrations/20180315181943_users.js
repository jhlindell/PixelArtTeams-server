
exports.up = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('isMod');
    table.boolean('is_mod').notNullable().defaultTo(false);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('is_mod');
    table.boolean('isMod').notNullable().defaultTo(false);
  });
};
