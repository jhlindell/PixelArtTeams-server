
exports.up = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.string('hash').defaultTo('');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('hash');
  });
};
