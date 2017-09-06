const knex = require('../knex');

function getProjects(id){
  let query = knex('projects')
    .select();

    if(id){
      query.where('id', id);
    }

    return query;
  }

module.exports = {
  getProjects,
};
