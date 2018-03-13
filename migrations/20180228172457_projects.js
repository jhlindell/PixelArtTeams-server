
exports.up = function(knex, Promise) {
  return knex.schema.table('projects', table => {
    table.timestamps(true, true);
    table.dateTime('finished_at');
    table.dateTime('started_at');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('projects', table => {
    table.dropColumn('created_at');
    table.dropColumn('updated_at');
    table.dropColumn('finished_at');
    table.dropColumn('started_at');
  });
};
