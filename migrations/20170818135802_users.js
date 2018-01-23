
exports.up = function(knex, Promise) {
  return knex.schema.createTable('users', (table) => {
    table.increments('user_id');
    table.string('username').notNullable().defaultTo('').unique();
    table.string('email').notNullable().unique();
    table.specificType('hashed_password', 'char(60)').notNullable();
    table.boolean('isMod').notNullable().defaultTo(false);
    table.timestamps(true, true);
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users');
};
