
exports.up = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.bool('is_verified').defaultTo(false);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('is_verified');
  });
};
